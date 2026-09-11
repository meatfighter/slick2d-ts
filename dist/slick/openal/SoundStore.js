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
    /** Constructor and native resume execute before returning to the activation handler. */
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
    /** Accept a prepared generation, attach logical music, and then open its output gate. */
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
            return false; // Explicit silent gameplay; Music.poll owns the logical clock.
        }
        const context = this.context;
        if (String(context.state) !== "running") {
            this.discardUnusablePlayback();
            return false;
        }
        const results = await Promise.allSettled(Array.from(this.musicHandles, (handle) => {
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
        attempt(() => this.detachMusic());
        attempt(() => this.stopSoundEffects());
        this.playbackGeneration++;
        attempt(() => this.retirePlaybackContext());
        attempt(() => this.resetSoundSources());
        if (failures.length !== 0) {
            this.playbackRetirementFailure ??= new AggregateError(failures, "Unable to retire the playback generation safely.");
        }
        if (this.playbackRetirementFailure !== null) {
            throw this.playbackRetirementFailure;
        }
    }
    detachMusic() {
        const failures = [];
        for (const handle of Array.from(this.musicHandles)) {
            try {
                handle.detachPlaybackGeneration?.();
            }
            catch (error) {
                failures.push(error);
            }
        }
        if (failures.length !== 0) {
            throw new AggregateError(failures, "Unable to detach every music graph.");
        }
    }
    clear() {
        this.stopAllPlayback();
        this.clearDecodedBuffers();
    }
    destroy() {
        this.endPlaybackGeneration();
        this.stopAllPlayback();
        this.clearDecodedBuffers();
        this.decoderPool = { context: null, active: 0, batches: 0 };
        this.inited = false;
        this.musicEnabled = false;
        this.soundsEnabled = false;
    }
    destroyPreservingAudioCache() {
        this.endPlaybackGeneration();
        this.stopAllPlayback();
        // User preferences and decoded buffers belong to the page, not the retired game.
    }
    disable() {
        this.ensureLogicalInitialization();
        this.musicEnabled = false;
        this.soundsEnabled = false;
        this.endPlaybackGeneration();
        this.clear();
    }
    setDeferredLoading(deferred) {
        this.deferredLoading = deferred;
    }
    isDeferredLoading() {
        return this.deferredLoading;
    }
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
    setSoundsOn(sounds) {
        this.ensureLogicalInitialization();
        this.soundsEnabled = sounds;
    }
    soundsOn() {
        return this.soundsEnabled;
    }
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
    poll(_delta) { }
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
                    this.releaseEffect(handle);
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
    playSound(ref, pitch, volume, loop, onEnded, position) {
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
        const handle = new EffectPlayback(this, sourceId, this.playbackGeneration, context, bus, pitch, volume * this.soundVolume, loop, position, onEnded);
        this.activeHandles.add(handle);
        this.soundSources[sourceId] = handle;
        void this.loadAudioBuffer(ref).then((buffer) => handle.start(buffer), (error) => handle.fail(error, ref));
        return handle;
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
        if (id !== undefined && this.soundSources[id] === handle) {
            this.soundSources[id] = null;
        }
    }
    getPlaybackDiagnostics() {
        return {
            generation: this.playbackGeneration,
            ownedContext: this.hasPlaybackGeneration(),
            committed: this.playbackCommitted,
            silent: this.isSilentPlaybackActive(),
            effects: this.activeHandles.size - this.musicHandles.size,
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
        for (const operation of [() => this.detachMusic(), () => this.stopSoundEffects(), () => this.retirePlaybackContext()]) {
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
/** A stopped handle retains no context, bus, source, gain, or panner. */
class EffectPlayback {
    store;
    sourceId;
    generation;
    context;
    bus;
    pitch;
    volume;
    loop;
    position;
    onEnded;
    source = null;
    gain = null;
    panner = null;
    active = true;
    sourceGain = 0;
    constructor(store, sourceId, generation, context, bus, pitch, volume, loop, position, onEnded) {
        this.store = store;
        this.sourceId = sourceId;
        this.generation = generation;
        this.context = context;
        this.bus = bus;
        this.pitch = pitch;
        this.volume = volume;
        this.loop = loop;
        this.position = position;
        this.onEnded = onEnded;
    }
    playing() {
        return this.active;
    }
    getGain() {
        return this.sourceGain;
    }
    stop() {
        this.dispose(true);
    }
    start(buffer) {
        if (!this.isCurrent() || !this.store.soundsOn()) {
            this.stop();
            return;
        }
        const context = this.context;
        const bus = this.bus;
        if (context === null || bus === null) {
            this.stop();
            return;
        }
        try {
            this.source = context.createBufferSource();
            this.gain = context.createGain();
            this.source.buffer = buffer;
            this.source.loop = this.loop;
            this.source.playbackRate.value = Number.isFinite(this.pitch) ? Math.max(0.25, Math.min(4, this.pitch)) : 1;
            this.sourceGain = Number.isFinite(this.volume) ? Math.max(0, this.volume) : 0;
            this.gain.gain.value = this.sourceGain;
            this.source.connect(this.gain);
            this.connectPosition(context, this.gain, bus);
            this.source.onended = () => {
                const notify = this.isCurrent() && !this.loop ? this.onEnded : undefined;
                this.dispose(false);
                this.notify(notify);
            };
            this.source.start();
        }
        catch (error) {
            this.fail(error, "sound graph");
        }
    }
    fail(error, ref) {
        const current = this.isCurrent();
        const notify = current ? this.onEnded : undefined;
        this.dispose(true);
        if (current) {
            Log.error(`Failed to play sound: ${ref}`, error);
            this.notify(notify);
        }
    }
    isCurrent() {
        return (this.active &&
            this.context !== null &&
            this.store.isPlaybackGenerationCurrent(this.generation, this.context) &&
            this.store.isPlaybackCommitted() &&
            String(this.context.state) === "running");
    }
    connectPosition(context, gain, bus) {
        if (this.position === undefined || typeof context.createPanner !== "function") {
            gain.connect(bus);
            return;
        }
        try {
            const panner = context.createPanner();
            this.panner = panner;
            panner.panningModel = "equalpower";
            panner.distanceModel = "inverse";
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            if ("positionX" in panner) {
                panner.positionX.value = this.position.x;
                panner.positionY.value = this.position.y;
                panner.positionZ.value = this.position.z;
            }
            else {
                const legacy = panner;
                legacy.setPosition(this.position.x, this.position.y, this.position.z);
            }
            gain.connect(panner);
            panner.connect(bus);
        }
        catch {
            SoundStore.disconnect(gain);
            SoundStore.disconnect(this.panner);
            this.panner = null;
            gain.connect(bus);
        }
    }
    dispose(stopSource) {
        const source = this.source;
        const gain = this.gain;
        const panner = this.panner;
        this.active = false;
        this.source = null;
        this.gain = null;
        this.panner = null;
        this.context = null;
        this.bus = null;
        this.onEnded = undefined;
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
        this.store.releaseEffect(this);
    }
    notify(callback) {
        try {
            callback?.();
        }
        catch (error) {
            Log.error("Sound completion callback failed", error);
        }
    }
}
//# sourceMappingURL=SoundStore.js.map