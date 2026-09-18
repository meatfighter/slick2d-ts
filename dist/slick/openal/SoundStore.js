import { isSoundVoicePlaybackSnapshot } from "../SoundPlaybackState.js";
import { ResourceLoadException, ResourceLoader } from "../util/ResourceLoader.js";
import { runSettledBatch } from "../util/BatchLoader.js";
import { Log } from "../util/Log.js";
/** Page-lifetime assets/preferences plus one explicitly owned playback generation. */
export class SoundStore {
    static instance = new SoundStore();
    deferredLoading = false;
    inited = false;
    soundWorksFlag = false;
    musicEnabled = false;
    soundsEnabled = false;
    musicVolume = 1;
    soundVolume = 1;
    maxSources = 64;
    context = null;
    soundBus = null;
    musicBus = null;
    outputGate = null;
    contextStateListener = null;
    buffers = new Map();
    decodedBuffers = new Map();
    audioLoads = new Map();
    decoderPool = { context: null, active: 0, batches: 0 };
    activeHandles = new Set();
    musicHandles = new Set();
    soundSources = new Array(64).fill(null);
    explicitPlaybackGenerationMode = false;
    playbackGeneration = 0;
    playbackRetirementFailure = null;
    playbackCommitted = false;
    logicalPlaybackActive = false;
    interruptionHandler = null;
    contextsCreated = 0;
    contextsRetired = 0;
    closesSettled = 0;
    static get() {
        return SoundStore.instance;
    }
    enableExplicitPlaybackGenerations() {
        this.ensureLogicalInitialization();
        if (!this.explicitPlaybackGenerationMode) {
            this.explicitPlaybackGenerationMode = true;
            if (this.context !== null) {
                this.endPlaybackGeneration();
            }
            this.logicalPlaybackActive = false;
            this.playbackCommitted = false;
        }
    }
    isUsingExplicitPlaybackGenerations() {
        return this.explicitPlaybackGenerationMode;
    }
    getPlaybackGeneration() {
        return this.playbackGeneration;
    }
    hasPlaybackGeneration() {
        return this.context !== null && String(this.context.state) !== "closed";
    }
    isPlaybackGenerationCurrent(generation, context) {
        return generation === this.playbackGeneration && this.hasPlaybackGeneration() && (context === undefined || context === this.context);
    }
    isPlaybackCommitted() {
        return !this.explicitPlaybackGenerationMode || this.playbackCommitted;
    }
    isLogicalPlaybackActive() {
        return !this.explicitPlaybackGenerationMode || this.logicalPlaybackActive;
    }
    isSilentPlaybackActive() {
        return this.explicitPlaybackGenerationMode && this.logicalPlaybackActive && this.playbackCommitted && this.context === null;
    }
    setPlaybackInterruptionHandler(handler) {
        this.interruptionHandler = handler;
    }
    reportPlaybackInterruption(reason) {
        if (!this.explicitPlaybackGenerationMode || !this.logicalPlaybackActive || !this.playbackCommitted) {
            return;
        }
        try {
            this.interruptionHandler?.(reason, this.playbackGeneration);
        }
        catch (error) {
            Log.error("Playback interruption handler failed", error);
            this.endPlaybackGeneration();
        }
    }
    /**
     * Constructor and native resume execute before returning to the activation handler.
     * Playback generations replace disposable browser output only. They deliberately
     * preserve the application-level music/sound enable preferences.
     */
    beginPlaybackGenerationFromUserGesture(deferPlayback = false) {
        this.enableExplicitPlaybackGenerations();
        this.endPlaybackGeneration();
        this.ensureLogicalInitialization();
        const generation = ++this.playbackGeneration;
        const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Ctor) {
            return Promise.resolve(false);
        }
        let context = null;
        let soundBus = null;
        let musicBus = null;
        let outputGate = null;
        try {
            context = new Ctor();
            this.contextsCreated++;
            outputGate = context.createGain();
            outputGate.gain.value = 0;
            soundBus = context.createGain();
            musicBus = context.createGain();
            soundBus.gain.value = 1;
            musicBus.gain.value = this.musicVolume;
            soundBus.connect(outputGate);
            musicBus.connect(outputGate);
            outputGate.connect(context.destination);
        }
        catch {
            SoundStore.disconnect(soundBus);
            SoundStore.disconnect(musicBus);
            SoundStore.disconnect(outputGate);
            this.closeContext(context);
            return Promise.resolve(false);
        }
        this.context = context;
        this.soundBus = soundBus;
        this.musicBus = musicBus;
        this.outputGate = outputGate;
        const ownedContext = context;
        this.contextStateListener = () => {
            if (this.playbackGeneration === generation && this.context === ownedContext && String(ownedContext.state) !== "running") {
                this.reportPlaybackInterruption("audio-context-interrupted");
            }
        };
        context.addEventListener?.("statechange", this.contextStateListener);
        let activation;
        try {
            activation = Promise.resolve(context.resume());
        }
        catch (error) {
            activation = Promise.reject(error);
        }
        return activation.then(async () => {
            if (!this.isPlaybackGenerationCurrent(generation, ownedContext)) {
                return false;
            }
            if (String(ownedContext.state) !== "running") {
                this.retirePlaybackContext();
                return false;
            }
            this.soundWorksFlag = true;
            return deferPlayback ? true : this.commitPlaybackGeneration(generation);
        }, () => {
            if (this.context === ownedContext && this.playbackGeneration === generation) {
                this.retirePlaybackContext();
            }
            return false;
        });
    }
    /** Accept a prepared generation, attach every logical transport, and then open its output gate. */
    async commitPlaybackGeneration(generation) {
        if (this.playbackRetirementFailure !== null) {
            throw this.playbackRetirementFailure;
        }
        if (generation !== this.playbackGeneration) {
            return false;
        }
        this.ensureLogicalInitialization();
        this.playbackCommitted = true;
        this.logicalPlaybackActive = true;
        if (this.context === null) {
            return false; // Explicit silent gameplay; Music.poll/SoundStore.poll own logical clocks.
        }
        const context = this.context;
        if (String(context.state) !== "running") {
            this.discardUnusablePlayback();
            return false;
        }
        const handles = Array.from(this.activeHandles);
        const results = await Promise.allSettled(handles.map((handle) => {
            try {
                return Promise.resolve(handle.attachPlaybackGeneration?.());
            }
            catch (error) {
                return Promise.reject(error);
            }
        }));
        if (generation !== this.playbackGeneration || context !== this.context) {
            return false;
        }
        const failure = results.find((result) => result.status === "rejected");
        if (failure !== undefined || String(context.state) !== "running") {
            this.discardUnusablePlayback();
            if (failure?.status === "rejected") {
                Log.error("Unable to attach playback; continuing with the logical silent clock", failure.reason);
            }
            return false;
        }
        if (this.outputGate !== null) {
            this.outputGate.gain.value = 1;
        }
        return true;
    }
    /** Conditional retirement cannot tear down a replacement generation. */
    endPlaybackGeneration(expectedGeneration) {
        if (expectedGeneration !== undefined && expectedGeneration !== this.playbackGeneration) {
            return;
        }
        this.logicalPlaybackActive = false;
        this.playbackCommitted = false;
        const failures = [];
        const attempt = (operation) => {
            try {
                operation();
            }
            catch (error) {
                failures.push(error);
            }
        };
        attempt(() => this.detachPlaybackHandles());
        this.playbackGeneration++;
        attempt(() => this.retirePlaybackContext());
        if (failures.length !== 0) {
            this.playbackRetirementFailure ??= new AggregateError(failures, "Unable to retire the playback generation safely.");
        }
        if (this.playbackRetirementFailure !== null) {
            throw this.playbackRetirementFailure;
        }
    }
    detachPlaybackHandles() {
        const failures = [];
        for (const handle of Array.from(this.activeHandles)) {
            try {
                if (handle.detachPlaybackGeneration !== undefined) {
                    handle.detachPlaybackGeneration();
                }
                else {
                    // Unknown legacy handles cannot safely retain a graph tied to the old context.
                    handle.stop();
                }
            }
            catch (error) {
                failures.push(error);
            }
        }
        if (failures.length !== 0) {
            throw new AggregateError(failures, "Unable to detach every playback graph.");
        }
    }
    clear() {
        this.stopAllPlayback();
        this.clearDecodedBuffers();
    }
    destroy() {
        let retirementFailure = null;
        try {
            this.endPlaybackGeneration();
        }
        catch (error) {
            retirementFailure = error;
        }
        this.stopAllPlayback();
        this.clearDecodedBuffers();
        this.decoderPool = { context: null, active: 0, batches: 0 };
        this.inited = false;
        this.musicEnabled = false;
        this.soundsEnabled = false;
        if (retirementFailure !== null) {
            throw retirementFailure;
        }
    }
    destroyPreservingAudioCache() {
        let retirementFailure = null;
        try {
            this.endPlaybackGeneration();
        }
        catch (error) {
            retirementFailure = error;
        }
        this.stopAllPlayback();
        // User preferences and decoded buffers belong to the page, not the retired game.
        if (retirementFailure !== null) {
            throw retirementFailure;
        }
    }
    disable() {
        this.ensureLogicalInitialization();
        this.musicEnabled = false;
        this.soundsEnabled = false;
        let retirementFailure = null;
        try {
            this.endPlaybackGeneration();
        }
        catch (error) {
            retirementFailure = error;
        }
        this.clear();
        if (retirementFailure !== null) {
            throw retirementFailure;
        }
    }
    setDeferredLoading(deferred) {
        this.deferredLoading = deferred;
    }
    isDeferredLoading() {
        return this.deferredLoading;
    }
    /**
     * Set the application-wide Music enable preference.
     *
     * This is not an individual Music transport pause control. The preference
     * intentionally survives playback-generation retirement and
     * destroyPreservingAudioCache(). Games that need to freeze one logical track
     * should use Music.pause()/resume() and persist that transport state instead.
     */
    setMusicOn(music) {
        this.ensureLogicalInitialization();
        this.musicEnabled = music;
        for (const handle of Array.from(this.musicHandles)) {
            if (music) {
                handle.resume?.();
            }
            else if (handle.suspend !== undefined) {
                handle.suspend();
            }
            else {
                handle.pause?.();
            }
        }
    }
    /** Return the application-wide Music enable preference. */
    isMusicOn() {
        return this.musicEnabled;
    }
    setMusicVolume(volume) {
        this.musicVolume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
        if (this.musicBus !== null) {
            this.musicBus.gain.value = this.musicVolume;
        }
    }
    getMusicVolume() {
        return this.musicVolume;
    }
    setSoundVolume(volume) {
        this.soundVolume = Number.isFinite(volume) ? Math.max(0, volume) : 0;
    }
    getSoundVolume() {
        return this.soundVolume;
    }
    /**
     * Set the application-wide Sound enable preference.
     *
     * Disabling Sounds is intentionally non-retroactive: existing logical voices
     * are not destroyed merely because future Sound starts are disabled. This
     * preference survives playback-generation retirement and should not be used
     * as a serialized substitute for exact SoundPlaybackSnapshot state.
     */
    setSoundsOn(sounds) {
        this.ensureLogicalInitialization();
        this.soundsEnabled = sounds;
    }
    /** Return the application-wide Sound enable preference. */
    soundsOn() {
        return this.soundsEnabled;
    }
    /** Return the application-wide Music enable preference. */
    musicOn() {
        return this.musicEnabled;
    }
    soundWorks() {
        return this.soundWorksFlag;
    }
    init() {
        if (this.playbackRetirementFailure !== null) {
            throw this.playbackRetirementFailure;
        }
        this.ensureLogicalInitialization();
        if (!this.explicitPlaybackGenerationMode && this.context === null) {
            this.createOrdinaryContainerContext();
        }
        this.soundWorksFlag = this.context !== null && String(this.context.state) === "running";
    }
    /** Advance detached SFX only while accepted gameplay itself is advancing silently. */
    poll(delta) {
        if (this.explicitPlaybackGenerationMode && !this.logicalPlaybackActive) {
            return;
        }
        for (const handle of Array.from(this.activeHandles)) {
            if (!this.musicHandles.has(handle) && isSoundPlaybackHandle(handle)) {
                handle.pollLogicalPlayback(delta);
            }
        }
    }
    isMusicPlaying() {
        return Array.from(this.musicHandles).some((handle) => handle.playing());
    }
    stopSoundEffect(id) {
        this.soundSources[Math.trunc(id)]?.stop();
    }
    stopSoundEffects() {
        for (const handle of Array.from(this.activeHandles)) {
            if (!this.musicHandles.has(handle)) {
                try {
                    handle.stop();
                }
                catch (error) {
                    if (isSoundPlaybackHandle(handle)) {
                        this.releaseEffect(handle);
                    }
                    else {
                        this.activeHandles.delete(handle);
                    }
                    Log.error("Unable to stop a sound-effect handle", error);
                }
            }
        }
    }
    stopAllPlayback() {
        for (const handle of Array.from(this.activeHandles)) {
            try {
                handle.stop();
            }
            catch (error) {
                Log.error("Unable to stop a playback handle", error);
            }
        }
        this.resetPlaybackState();
    }
    resetPlaybackState() {
        this.activeHandles.clear();
        this.musicHandles.clear();
        this.resetSoundSources();
    }
    clearDecodedBuffers() {
        for (const load of this.audioLoads.values()) {
            load.abandoned = true;
            if (load.abort !== null) {
                load.signal?.removeEventListener("abort", load.abort);
            }
        }
        this.audioLoads.clear();
        this.buffers.clear();
        this.decodedBuffers.clear();
    }
    getDecodedAudioBuffer(ref) {
        return this.decodedBuffers.get(ref) ?? null;
    }
    getSourceCount() {
        return this.maxSources;
    }
    setMaxSources(max) {
        if (!Number.isSafeInteger(max) || max <= 0) {
            throw new RangeError("Maximum source count must be a positive safe integer");
        }
        if (max === this.maxSources) {
            return;
        }
        const limit = Math.max(1, max - 1);
        for (let i = limit; i < this.soundSources.length; i++) {
            this.soundSources[i]?.stop();
        }
        const sources = new Array(max).fill(null);
        for (let i = 1; i < Math.min(limit, this.soundSources.length); i++) {
            sources[i] = this.soundSources[i] ?? null;
        }
        this.maxSources = max;
        this.soundSources = sources;
    }
    getAudioContext() {
        if (!this.explicitPlaybackGenerationMode && this.context === null) {
            this.init();
        }
        return this.hasPlaybackGeneration() ? this.context : null;
    }
    /** Explicit activation only. Ordinary playback never resumes an old context implicitly. */
    unlock() {
        return this.beginPlaybackGenerationFromUserGesture();
    }
    getSoundBus() {
        if (!this.explicitPlaybackGenerationMode) {
            this.init();
        }
        return this.hasPlaybackGeneration() ? this.soundBus : null;
    }
    getMusicBus() {
        if (!this.explicitPlaybackGenerationMode) {
            this.init();
        }
        return this.hasPlaybackGeneration() ? this.musicBus : null;
    }
    loadAudioBuffer(ref, options = {}) {
        try {
            SoundStore.throwIfAborted(options.signal, ref);
        }
        catch (error) {
            return Promise.reject(error);
        }
        const existing = this.buffers.get(ref);
        if (existing !== undefined) {
            return SoundStore.waitForAudioPromise(existing, options.signal, ref);
        }
        const load = { promise: Promise.resolve(null), abandoned: false, abort: null, signal: options.signal };
        const pool = this.decoderPool;
        const forget = () => {
            load.abandoned = true;
            if (this.audioLoads.get(ref) === load) {
                this.audioLoads.delete(ref);
                if (this.buffers.get(ref) === load.promise) {
                    this.buffers.delete(ref);
                }
            }
        };
        load.abort = forget;
        const operation = this.explicitPlaybackGenerationMode
            ? this.loadAudioBufferOffline(ref, options, pool)
            : this.loadAudioBufferForOrdinaryContainer(ref, options);
        load.promise = operation
            .then((buffer) => {
            if (load.abandoned) {
                throw SoundStore.abortException(ref, options.signal?.reason);
            }
            if (this.audioLoads.get(ref) === load) {
                this.decodedBuffers.set(ref, buffer);
            }
            return buffer;
        })
            .catch((error) => {
            if (this.buffers.get(ref) === load.promise) {
                this.buffers.delete(ref);
            }
            throw error;
        })
            .finally(() => {
            if (load.abort !== null) {
                options.signal?.removeEventListener("abort", load.abort);
            }
            if (this.audioLoads.get(ref) === load) {
                this.audioLoads.delete(ref);
            }
        });
        this.audioLoads.set(ref, load);
        this.buffers.set(ref, load.promise);
        options.signal?.addEventListener("abort", forget, { once: true });
        if (options.signal?.aborted) {
            forget();
        }
        void load.promise.catch(() => undefined);
        return SoundStore.waitForAudioPromise(load.promise, options.signal, ref);
    }
    preloadAudioBuffer(ref, options = {}) {
        const result = ResourceLoader.track(this.loadAudioBuffer(ref, options).then(() => undefined), ref);
        void result.catch(() => undefined);
        return result;
    }
    async preloadAudioBuffers(refs, onProgressOrOptions) {
        const options = typeof onProgressOrOptions === "function" ? { onProgress: onProgressOrOptions } : (onProgressOrOptions ?? {});
        SoundStore.throwIfAborted(options.signal, "audio manifest");
        const unique = Array.from(new Set(refs));
        const pool = this.decoderPool;
        pool.batches++;
        let loaded = 0;
        try {
            const results = await runSettledBatch(unique, options.concurrency, async (ref) => {
                await this.preloadAudioBuffer(ref, options);
                options.onProgress?.({ ref, loaded: ++loaded, total: unique.length });
            });
            const failure = results.find((result) => result.status === "rejected");
            if (failure !== undefined) {
                throw failure.reason;
            }
        }
        finally {
            pool.batches--;
            SoundStore.releaseDecoderIfIdle(pool);
        }
    }
    playSound(ref, pitch, volume, loop, onEnded, position, onDisposed) {
        this.init();
        const context = this.getAudioContext();
        const bus = this.getSoundBus();
        if (!this.soundWorksFlag || !this.soundsEnabled || !this.isPlaybackCommitted() || context === null || bus === null) {
            return null;
        }
        const sourceId = this.findFreeSoundSource();
        if (sourceId < 0) {
            return null;
        }
        const handle = new EffectPlayback(this, ref, sourceId, pitch, volume * this.soundVolume, loop, position, onEnded, onDisposed, 0, this.getDecodedAudioBuffer(ref));
        this.activeHandles.add(handle);
        this.soundSources[sourceId] = handle;
        void handle.attachPlaybackGeneration().catch((error) => handle.failInitial(error));
        return handle;
    }
    /**
     * Replace one Sound owner's complete logical voice set without touching browser playback.
     * Existing source slots owned by the replaced voices may be reused transactionally.
     */
    replaceSoundPlaybacks(ref, existing, snapshots, onDisposed) {
        this.ensureLogicalInitialization();
        for (const snapshot of snapshots) {
            if (!isSoundVoicePlaybackSnapshot(snapshot)) {
                throw new TypeError("Invalid sound voice playback snapshot");
            }
        }
        const decoded = this.getDecodedAudioBuffer(ref);
        const shouldRestore = snapshots.map((snapshot) => !(decoded !== null && !snapshot.looped && snapshot.positionSeconds >= decoded.duration));
        const required = shouldRestore.filter(Boolean).length;
        const replaceable = new Set(existing);
        const sourceIds = this.findReplacementSoundSourceIds(replaceable, required);
        if (sourceIds === null) {
            throw new RangeError("Insufficient sound-effect source capacity to restore playback state");
        }
        let sourceIndex = 0;
        const planned = snapshots.map((snapshot, index) => {
            if (!shouldRestore[index]) {
                return null;
            }
            const sourceId = sourceIds[sourceIndex++];
            if (sourceId === undefined) {
                throw new Error("Sound source restoration plan is incomplete");
            }
            return new EffectPlayback(this, ref, sourceId, snapshot.playbackRate, snapshot.gain, snapshot.looped, snapshot.spatialPosition === null ? undefined : { ...snapshot.spatialPosition }, undefined, onDisposed, snapshot.positionSeconds, decoded);
        });
        for (const handle of existing) {
            handle.stop();
        }
        for (const handle of planned) {
            if (handle === null) {
                continue;
            }
            this.activeHandles.add(handle);
            this.soundSources[handle.sourceId] = handle;
        }
        return planned;
    }
    track(handle) {
        this.activeHandles.add(handle);
        this.musicHandles.add(handle);
    }
    untrack(handle) {
        this.activeHandles.delete(handle);
        this.musicHandles.delete(handle);
    }
    /** Internal SFX owner hook; source slots are released only by their current handle. */
    releaseEffect(handle) {
        this.activeHandles.delete(handle);
        const id = handle.sourceId;
        if (this.soundSources[id] === handle) {
            this.soundSources[id] = null;
        }
    }
    getPlaybackDiagnostics() {
        let logicalEffects = 0;
        let effects = 0;
        for (const handle of this.activeHandles) {
            if (this.musicHandles.has(handle) || !handle.playing()) {
                continue;
            }
            logicalEffects++;
            if (handle.isPlaybackGenerationAttached?.() ?? true) {
                effects++;
            }
        }
        return {
            generation: this.playbackGeneration,
            ownedContext: this.hasPlaybackGeneration(),
            committed: this.playbackCommitted,
            silent: this.isSilentPlaybackActive(),
            effects,
            logicalEffects,
            musicHandles: this.musicHandles.size,
            decodedBuffers: this.decodedBuffers.size,
            contextsCreated: this.contextsCreated,
            contextsRetired: this.contextsRetired,
            closesSettled: this.closesSettled
        };
    }
    ensureLogicalInitialization() {
        if (!this.inited) {
            this.inited = true;
            this.musicEnabled = true;
            this.soundsEnabled = true;
        }
    }
    retirePlaybackContext() {
        const context = this.context;
        const listener = this.contextStateListener;
        const outputGate = this.outputGate;
        const nodes = [this.soundBus, this.musicBus, outputGate];
        this.context = null;
        this.soundBus = null;
        this.musicBus = null;
        this.outputGate = null;
        this.contextStateListener = null;
        this.soundWorksFlag = false;
        const failures = [];
        if (listener !== null) {
            try {
                context?.removeEventListener?.("statechange", listener);
            }
            catch (error) {
                // This callback is fenced by both context identity and generation.
                Log.error("Unable to remove a retired audio listener", error);
            }
        }
        try {
            if (outputGate !== null) {
                try {
                    outputGate.gain.value = 0;
                }
                catch (error) {
                    failures.push(error);
                }
            }
            for (const node of nodes) {
                try {
                    node?.disconnect();
                }
                catch (error) {
                    failures.push(error);
                }
            }
        }
        finally {
            // Native close settlement is independent of synchronous ownership exit.
            this.closeContext(context);
        }
        if (failures.length !== 0) {
            this.playbackRetirementFailure ??= new AggregateError(failures, "Unable to disconnect the retired audio output safely.");
        }
        if (this.playbackRetirementFailure !== null) {
            throw this.playbackRetirementFailure;
        }
    }
    closeContext(context) {
        if (context === null) {
            return;
        }
        this.contextsRetired++;
        const settled = () => {
            this.closesSettled++;
        };
        try {
            void Promise.resolve(context.close()).then(settled, settled);
        }
        catch {
            settled();
        }
    }
    createOrdinaryContainerContext() {
        const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Ctor) {
            return;
        }
        try {
            this.context = new Ctor();
            this.contextsCreated++;
            this.soundBus = this.context.createGain();
            this.musicBus = this.context.createGain();
            this.soundBus.gain.value = 1;
            this.musicBus.gain.value = this.musicVolume;
            this.soundBus.connect(this.context.destination);
            this.musicBus.connect(this.context.destination);
            this.playbackGeneration++;
        }
        catch {
            this.retirePlaybackContext();
        }
    }
    async loadAudioBufferForOrdinaryContainer(ref, options) {
        this.init();
        const context = this.getAudioContext();
        if (context === null) {
            throw this.audioDecodeUnavailable(ref, "Web Audio is not available");
        }
        const bytes = await ResourceLoader.loadResource(ref, options);
        SoundStore.throwIfAborted(options.signal, ref);
        try {
            const buffer = await SoundStore.decodeAudioData(context, bytes.slice(0));
            SoundStore.throwIfAborted(options.signal, ref);
            return buffer;
        }
        catch (error) {
            if (error instanceof ResourceLoadException) {
                throw error;
            }
            if (options.signal?.aborted) {
                throw SoundStore.abortException(ref, options.signal.reason);
            }
            throw this.audioDecodeUnavailable(ref, "Audio data could not be decoded", error);
        }
    }
    async loadAudioBufferOffline(ref, options, pool) {
        SoundStore.throwIfAborted(options.signal, ref);
        const bytes = await ResourceLoader.loadResource(ref, options);
        SoundStore.throwIfAborted(options.signal, ref);
        const decoder = this.acquireOfflineDecoder(ref, pool);
        try {
            const buffer = await SoundStore.decodeAudioData(decoder, bytes.slice(0));
            SoundStore.throwIfAborted(options.signal, ref);
            return buffer;
        }
        catch (error) {
            if (error instanceof ResourceLoadException) {
                throw error;
            }
            if (options.signal?.aborted) {
                throw SoundStore.abortException(ref, options.signal.reason);
            }
            throw this.audioDecodeUnavailable(ref, "Audio data could not be decoded", error);
        }
        finally {
            pool.active--;
            SoundStore.releaseDecoderIfIdle(pool);
        }
    }
    acquireOfflineDecoder(ref, pool) {
        if (pool.context === null) {
            const Ctor = globalThis.OfflineAudioContext ?? globalThis.webkitOfflineAudioContext;
            if (!Ctor) {
                throw this.audioDecodeUnavailable(ref, "OfflineAudioContext is not available");
            }
            try {
                pool.context = new Ctor(2, 1, 44100);
            }
            catch (error) {
                throw this.audioDecodeUnavailable(ref, "OfflineAudioContext could not be created", error);
            }
        }
        pool.active++;
        return pool.context;
    }
    static releaseDecoderIfIdle(pool) {
        if (pool.active === 0 && pool.batches === 0) {
            pool.context = null;
        }
    }
    audioDecodeUnavailable(ref, detail, cause) {
        return new ResourceLoadException(`Failed to decode audio ${ref}: ${detail}`, {
            ref,
            url: ResourceLoader.getResource(ref)?.href ?? null,
            kind: "decode",
            phase: "decode",
            cause
        });
    }
    resetSoundSources() {
        this.soundSources = new Array(this.maxSources).fill(null);
    }
    findFreeSoundSource() {
        for (let i = 1; i < this.maxSources - 1; i++) {
            if (!this.soundSources[i]?.playing()) {
                return i;
            }
        }
        return -1;
    }
    findReplacementSoundSourceIds(replaceable, count) {
        const ids = [];
        for (let i = 1; i < this.maxSources - 1 && ids.length < count; i++) {
            const handle = this.soundSources[i] ?? null;
            if (handle === null || !handle.playing() || replaceable.has(handle)) {
                ids.push(i);
            }
        }
        return ids.length === count ? ids : null;
    }
    static disconnect(node) {
        try {
            node?.disconnect();
        }
        catch {
            // Partial and repeated graph retirement is best-effort.
        }
    }
    static waitForAudioPromise(promise, signal, ref) {
        if (signal === undefined) {
            return promise;
        }
        if (signal.aborted) {
            return Promise.reject(SoundStore.abortException(ref, signal.reason));
        }
        return new Promise((resolve, reject) => {
            const abort = () => {
                signal.removeEventListener("abort", abort);
                reject(SoundStore.abortException(ref, signal.reason));
            };
            signal.addEventListener("abort", abort, { once: true });
            void promise.then((buffer) => {
                signal.removeEventListener("abort", abort);
                resolve(buffer);
            }, (error) => {
                signal.removeEventListener("abort", abort);
                reject(error);
            });
        });
    }
    static decodeAudioData(context, bytes) {
        return new Promise((resolve, reject) => {
            try {
                const operation = context.decodeAudioData(bytes, resolve, reject);
                if (operation && typeof operation.then === "function") {
                    void operation.then(resolve, reject);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
    static throwIfAborted(signal, ref) {
        if (signal?.aborted) {
            throw SoundStore.abortException(ref, signal.reason);
        }
    }
    static abortException(ref, cause) {
        return new ResourceLoadException(`Resource load aborted: ${ref}`, {
            ref,
            url: ResourceLoader.getResource(ref)?.href ?? null,
            kind: "abort",
            phase: "decode",
            cause
        });
    }
    discardUnusablePlayback() {
        const failures = [];
        for (const operation of [() => this.detachPlaybackHandles(), () => this.retirePlaybackContext()]) {
            try {
                operation();
            }
            catch (error) {
                failures.push(error);
            }
        }
        if (failures.length !== 0) {
            this.playbackRetirementFailure ??= new AggregateError(failures, "Unable to discard an unusable playback graph safely.");
        }
        if (this.playbackRetirementFailure !== null) {
            this.logicalPlaybackActive = false;
            this.playbackCommitted = false;
            throw this.playbackRetirementFailure;
        }
    }
}
/** A logical SFX voice survives playback-generation retirement; only its native graph is disposable. */
class EffectPlayback {
    store;
    ref;
    sourceId;
    loop;
    onEnded;
    onDisposed;
    source = null;
    sourceContext = null;
    gain = null;
    panner = null;
    buffer;
    active = true;
    sourceGain;
    playbackRate;
    positionOffset;
    startedAt = 0;
    startToken = 0;
    disposedNotified = false;
    completionPending = false;
    spatialPosition;
    constructor(store, ref, sourceId, pitch, volume, loop, position, onEnded, onDisposed, offset, buffer) {
        this.store = store;
        this.ref = ref;
        this.sourceId = sourceId;
        this.loop = loop;
        this.onEnded = onEnded;
        this.onDisposed = onDisposed;
        this.playbackRate = Number.isFinite(pitch) ? Math.max(0.25, Math.min(4, pitch)) : 1;
        this.sourceGain = Number.isFinite(volume) ? Math.max(0, volume) : 0;
        this.spatialPosition = position === undefined ? undefined : { ...position };
        this.buffer = buffer;
        this.positionOffset = buffer === null ? this.sanitizeOffset(offset) : this.normalizeOffset(buffer, offset);
    }
    playing() {
        return this.active;
    }
    getGain() {
        return this.sourceGain;
    }
    isPlaybackGenerationAttached() {
        return this.active && this.source !== null && this.sourceContext !== null;
    }
    capturePlaybackState() {
        return {
            looped: this.loop,
            playbackRate: this.playbackRate,
            positionSeconds: this.getPosition(),
            gain: this.sourceGain,
            spatialPosition: this.spatialPosition === undefined ? null : { ...this.spatialPosition }
        };
    }
    stop() {
        this.dispose(true, false);
    }
    detachPlaybackGeneration() {
        if (!this.active) {
            return;
        }
        this.startToken++;
        this.positionOffset = this.getPosition();
        if (!this.loop && this.buffer !== null && this.positionOffset >= this.buffer.duration) {
            this.completionPending = true;
        }
        this.stopSourceGraph(true);
    }
    attachPlaybackGeneration() {
        if (!this.active) {
            return Promise.resolve();
        }
        const store = this.store;
        if (store.isUsingExplicitPlaybackGenerations() && !store.isPlaybackCommitted()) {
            return Promise.resolve();
        }
        const context = store.getAudioContext();
        const bus = store.getSoundBus();
        if (context === null || bus === null || String(context.state) !== "running") {
            return Promise.resolve();
        }
        if (this.source !== null && this.sourceContext === context) {
            return Promise.resolve();
        }
        const generation = store.getPlaybackGeneration();
        const token = ++this.startToken;
        const attach = (buffer) => {
            if (token !== this.startToken ||
                !this.active ||
                (store.isUsingExplicitPlaybackGenerations() && (!store.isPlaybackGenerationCurrent(generation, context) || !store.isPlaybackCommitted()))) {
                return;
            }
            this.buffer = buffer;
            this.positionOffset = this.normalizeOffset(buffer, this.positionOffset);
            if (!this.loop && this.positionOffset >= buffer.duration) {
                // Retirement must never deliver completion from inside the audio commit
                // transaction. Preserve it until the first accepted game-clock poll.
                this.completionPending = true;
                return;
            }
            this.completionPending = false;
            this.startSource(buffer, context, bus, generation);
        };
        try {
            const cached = this.buffer ?? store.getDecodedAudioBuffer(this.ref);
            if (cached !== null) {
                attach(cached);
                return Promise.resolve();
            }
            return store.loadAudioBuffer(this.ref).then(attach);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }
    pollLogicalPlayback(delta) {
        if (!this.active) {
            return;
        }
        if (this.completionPending) {
            this.dispose(false, true);
            return;
        }
        if (this.source !== null || !this.store.isSilentPlaybackActive()) {
            return;
        }
        const buffer = this.buffer ?? this.store.getDecodedAudioBuffer(this.ref);
        if (buffer === null) {
            return;
        }
        this.buffer = buffer;
        const elapsed = Number.isFinite(delta) ? Math.max(0, delta) : 0;
        const raw = this.positionOffset + (elapsed / 1000) * this.playbackRate;
        if (!this.loop && raw >= buffer.duration) {
            this.positionOffset = Math.max(0, buffer.duration);
            this.dispose(false, true);
            return;
        }
        this.positionOffset = this.normalizeOffset(buffer, raw);
    }
    failInitial(error) {
        if (!this.active) {
            return;
        }
        const ended = this.onEnded;
        this.dispose(true, false);
        Log.error(`Failed to play sound: ${this.ref}`, error);
        this.notifyEnded(ended);
    }
    getPosition() {
        const context = this.sourceContext;
        if (context === null || this.source === null) {
            return this.positionOffset;
        }
        const position = this.positionOffset + Math.max(0, context.currentTime - this.startedAt) * this.playbackRate;
        return this.buffer === null ? this.sanitizeOffset(position) : this.normalizeOffset(this.buffer, position);
    }
    startSource(buffer, context, bus, generation) {
        if (this.store.isUsingExplicitPlaybackGenerations() && !this.store.isPlaybackGenerationCurrent(generation, context)) {
            return;
        }
        this.stopSourceGraph(true);
        let source = null;
        let gain = null;
        let panner = null;
        try {
            source = context.createBufferSource();
            gain = context.createGain();
            source.buffer = buffer;
            source.loop = this.loop;
            source.playbackRate.value = this.playbackRate;
            gain.gain.value = this.sourceGain;
            source.connect(gain);
            panner = this.connectPosition(context, gain, bus);
            this.positionOffset = this.normalizeOffset(buffer, this.positionOffset);
            this.startedAt = context.currentTime;
            this.completionPending = false;
            this.source = source;
            this.sourceContext = context;
            this.gain = gain;
            this.panner = panner;
            const startedSource = source;
            source.onended = () => {
                if (!this.active || this.source !== startedSource || this.sourceContext !== context) {
                    return;
                }
                this.positionOffset = Math.max(0, buffer.duration);
                this.clearCurrentSource(false);
                if (!this.loop) {
                    this.dispose(false, true);
                }
            };
            source.start(0, this.positionOffset);
        }
        catch (error) {
            if (this.source === source) {
                this.source = null;
                this.sourceContext = null;
                this.gain = null;
                this.panner = null;
            }
            this.cleanupSourceGraph(source, gain, panner, true);
            throw error;
        }
    }
    connectPosition(context, gain, bus) {
        if (this.spatialPosition === undefined || typeof context.createPanner !== "function") {
            gain.connect(bus);
            return null;
        }
        let panner = null;
        try {
            panner = context.createPanner();
            panner.panningModel = "equalpower";
            panner.distanceModel = "inverse";
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            if ("positionX" in panner) {
                panner.positionX.value = this.spatialPosition.x;
                panner.positionY.value = this.spatialPosition.y;
                panner.positionZ.value = this.spatialPosition.z;
            }
            else {
                const legacy = panner;
                legacy.setPosition(this.spatialPosition.x, this.spatialPosition.y, this.spatialPosition.z);
            }
            gain.connect(panner);
            panner.connect(bus);
            return panner;
        }
        catch {
            SoundStore.disconnect(gain);
            SoundStore.disconnect(panner);
            gain.connect(bus);
            return null;
        }
    }
    stopSourceGraph(stopSource) {
        const source = this.source;
        const gain = this.gain;
        const panner = this.panner;
        this.source = null;
        this.sourceContext = null;
        this.gain = null;
        this.panner = null;
        this.cleanupSourceGraph(source, gain, panner, stopSource);
    }
    clearCurrentSource(stopSource) {
        this.stopSourceGraph(stopSource);
    }
    cleanupSourceGraph(source, gain, panner, stopSource) {
        if (source !== null) {
            source.onended = null;
            if (stopSource) {
                try {
                    source.stop();
                }
                catch {
                    // The source may have failed before start or already ended.
                }
            }
        }
        SoundStore.disconnect(source);
        SoundStore.disconnect(gain);
        SoundStore.disconnect(panner);
    }
    dispose(stopSource, notifyEnded) {
        if (!this.active) {
            return;
        }
        this.startToken++;
        this.active = false;
        this.stopSourceGraph(stopSource);
        this.store.releaseEffect(this);
        const disposed = this.onDisposed;
        const ended = notifyEnded ? this.onEnded : undefined;
        this.onDisposed = undefined;
        this.onEnded = undefined;
        if (!this.disposedNotified) {
            this.disposedNotified = true;
            this.notifyDisposed(disposed);
        }
        this.notifyEnded(ended);
    }
    notifyDisposed(callback) {
        try {
            callback?.(this);
        }
        catch (error) {
            Log.error("Sound disposal callback failed", error);
        }
    }
    notifyEnded(callback) {
        try {
            callback?.();
        }
        catch (error) {
            Log.error("Sound completion callback failed", error);
        }
    }
    sanitizeOffset(offset) {
        return Number.isFinite(offset) ? Math.max(0, offset) : 0;
    }
    normalizeOffset(buffer, offset) {
        const value = this.sanitizeOffset(offset);
        const duration = buffer.duration;
        if (!Number.isFinite(duration)) {
            return value;
        }
        return duration <= 0 ? 0 : this.loop ? value % duration : Math.min(value, duration);
    }
}
function isSoundPlaybackHandle(handle) {
    return (typeof handle.sourceId === "number" &&
        typeof handle.capturePlaybackState === "function" &&
        typeof handle.pollLogicalPlayback === "function");
}
//# sourceMappingURL=SoundStore.js.map