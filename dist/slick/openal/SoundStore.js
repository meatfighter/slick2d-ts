import { ResourceLoadException, ResourceLoader } from "../util/ResourceLoader.js";
import { runSettledBatch } from "../util/BatchLoader.js";
import { Log } from "../util/Log.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.openal.SoundStore.
 *
 * Browser Web Audio subsystem singleton and compatibility state holder.
 */
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
    buffers = new Map();
    activeHandles = new Set();
    musicHandles = new Set();
    soundSources = new Array(64).fill(null);
    /** Java Slick2D counterpart: SoundStore.get(). */
    static get() {
        return SoundStore.instance;
    }
    /** Java Slick2D counterpart: SoundStore.clear(). */
    clear() {
        this.stopAllPlayback();
        this.clearDecodedBuffers();
    }
    /** Browser parity helper: resets the Web Audio/OpenAL lifecycle for AL.destroy(). */
    destroy() {
        this.clear();
        void this.context?.close?.().catch(() => undefined);
        this.context = null;
        this.soundBus = null;
        this.musicBus = null;
        this.inited = false;
        this.soundWorksFlag = false;
        this.musicEnabled = false;
        this.soundsEnabled = false;
    }
    /** Browser/PWA helper: resets playback and flags while preserving decoded buffers and the AudioContext. */
    destroyPreservingAudioCache() {
        this.stopAllPlayback();
        this.inited = false;
        this.soundWorksFlag = false;
        this.musicEnabled = false;
        this.soundsEnabled = false;
    }
    /** Java Slick2D counterpart: SoundStore.disable(). */
    disable() {
        this.musicEnabled = false;
        this.soundsEnabled = false;
        this.soundWorksFlag = false;
        this.inited = true;
        this.clear();
    }
    /** Java Slick2D counterpart: SoundStore.setDeferredLoading(boolean). */
    setDeferredLoading(deferred) {
        this.deferredLoading = deferred;
    }
    /** Java Slick2D counterpart: SoundStore.isDeferredLoading(). */
    isDeferredLoading() {
        return this.deferredLoading;
    }
    /** Java Slick2D counterpart: SoundStore.setMusicOn(boolean). */
    setMusicOn(music) {
        if (!this.soundWorksFlag) {
            return;
        }
        this.musicEnabled = music;
        for (const handle of this.musicHandles) {
            if (music) {
                handle.resume?.();
            }
            else {
                if (handle.suspend) {
                    handle.suspend();
                }
                else {
                    handle.pause?.();
                }
            }
        }
    }
    /** Java Slick2D counterpart: SoundStore.isMusicOn(). */
    isMusicOn() {
        return this.musicEnabled;
    }
    /** Java Slick2D counterpart: SoundStore.setMusicVolume(float). */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicBus) {
            this.musicBus.gain.value = this.musicVolume;
        }
    }
    /** Java Slick2D counterpart: SoundStore.getMusicVolume(). */
    getMusicVolume() {
        return this.musicVolume;
    }
    /** Java Slick2D counterpart: SoundStore.setSoundVolume(float). */
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, volume);
    }
    /** Java Slick2D counterpart: SoundStore.getSoundVolume(). */
    getSoundVolume() {
        return this.soundVolume;
    }
    /** Java Slick2D counterpart: SoundStore.setSoundsOn(boolean). */
    setSoundsOn(sounds) {
        if (!this.soundWorksFlag) {
            return;
        }
        this.soundsEnabled = sounds;
    }
    /** Java Slick2D counterpart: SoundStore.soundsOn(). */
    soundsOn() {
        return this.soundsEnabled;
    }
    /** Java Slick2D counterpart: SoundStore.musicOn(). */
    musicOn() {
        return this.musicEnabled;
    }
    /** Java Slick2D counterpart: SoundStore.soundWorks(). */
    soundWorks() {
        return this.soundWorksFlag;
    }
    /** Java Slick2D counterpart: SoundStore.init(). */
    init() {
        if (this.inited) {
            return;
        }
        const context = this.getAudioContext();
        if (context) {
            this.inited = true;
            this.soundWorksFlag = true;
            this.soundsEnabled = true;
            this.musicEnabled = true;
            this.resetSoundSources();
        }
        else {
            this.soundWorksFlag = false;
            this.soundsEnabled = false;
            this.musicEnabled = false;
        }
    }
    /** Java Slick2D counterpart: SoundStore.poll(int). */
    poll(_delta) { }
    /** Java Slick2D counterpart: SoundStore.isMusicPlaying(). */
    isMusicPlaying() {
        for (const handle of this.musicHandles) {
            if (handle.playing()) {
                return true;
            }
        }
        return false;
    }
    /** Java Slick2D counterpart: SoundStore.stopSoundEffect(int). */
    stopSoundEffect(id) {
        const sourceId = Math.trunc(id);
        this.soundSources[sourceId]?.stop();
    }
    /** Browser/PWA helper: stops active sound effects without clearing music or decoded buffers. */
    stopSoundEffects() {
        for (const handle of this.activeHandles) {
            if (!this.musicHandles.has(handle)) {
                handle.stop();
            }
        }
    }
    /** Browser/PWA helper: stops active music and sound effects without clearing decoded buffers. */
    stopAllPlayback() {
        for (const handle of this.activeHandles) {
            handle.stop();
        }
        this.resetPlaybackState();
    }
    /** Browser/PWA helper: clears playback bookkeeping without clearing decoded buffers. */
    resetPlaybackState() {
        this.activeHandles.clear();
        this.musicHandles.clear();
        this.resetSoundSources();
    }
    /** Browser/PWA helper: clears decoded Web Audio buffers without changing the AudioContext. */
    clearDecodedBuffers() {
        this.buffers.clear();
    }
    /** Java Slick2D counterpart: SoundStore.getSourceCount(). */
    getSourceCount() {
        return this.maxSources;
    }
    /** Java Slick2D counterpart: SoundStore.setMaxSources(int). */
    setMaxSources(max) {
        if (!Number.isSafeInteger(max) || max <= 0) {
            throw new RangeError("Maximum source count must be a positive safe integer");
        }
        const normalized = max;
        if (normalized === this.maxSources) {
            return;
        }
        const firstUnavailableEffectSource = Math.max(1, normalized - 1);
        for (let index = firstUnavailableEffectSource; index < this.soundSources.length; index++) {
            this.soundSources[index]?.stop();
        }
        const nextSources = new Array(normalized).fill(null);
        const limit = Math.min(firstUnavailableEffectSource, this.soundSources.length);
        for (let index = 1; index < limit; index++) {
            const handle = this.soundSources[index];
            if (handle?.playing()) {
                nextSources[index] = handle;
            }
        }
        this.maxSources = normalized;
        this.soundSources = nextSources;
    }
    /** Browser parity helper: returns the lazily-created AudioContext. */
    getAudioContext() {
        if (this.context) {
            if (this.context.state !== "closed") {
                return this.context;
            }
            this.context = null;
            this.soundBus = null;
            this.musicBus = null;
        }
        const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Ctor) {
            return null;
        }
        let context = null;
        let soundBus = null;
        let musicBus = null;
        try {
            context = new Ctor();
            soundBus = context.createGain();
            musicBus = context.createGain();
            soundBus.gain.value = 1;
            musicBus.gain.value = this.musicVolume;
            soundBus.connect(context.destination);
            musicBus.connect(context.destination);
        }
        catch {
            try {
                soundBus?.disconnect();
            }
            catch {
                // Ignore cleanup failures while rolling back partial Web Audio initialization.
            }
            try {
                musicBus?.disconnect();
            }
            catch {
                // Ignore cleanup failures while rolling back partial Web Audio initialization.
            }
            if (context) {
                try {
                    void context.close().catch(() => undefined);
                }
                catch {
                    // Ignore AudioContext close failures during rollback.
                }
            }
            return null;
        }
        this.context = context;
        this.soundBus = soundBus;
        this.musicBus = musicBus;
        return context;
    }
    /** Browser parity helper: resumes Web Audio from a user gesture before gameplay playback. */
    async unlock() {
        const context = this.getAudioContext();
        if (!context) {
            this.soundWorksFlag = false;
            this.soundsEnabled = false;
            this.musicEnabled = false;
            return false;
        }
        const shouldInitializeAudioState = !this.soundWorksFlag;
        this.inited = true;
        this.soundWorksFlag = true;
        if (shouldInitializeAudioState) {
            this.soundsEnabled = true;
            this.musicEnabled = true;
            this.resetSoundSources();
        }
        try {
            await context.resume?.();
            return context.state !== "closed";
        }
        catch (error) {
            Log.warn("Unable to unlock Web Audio", error);
            return false;
        }
    }
    /** Browser parity helper: returns the global sound-effect gain bus. */
    getSoundBus() {
        this.init();
        return this.soundBus;
    }
    /** Browser parity helper: returns the global music gain bus. */
    getMusicBus() {
        this.init();
        return this.musicBus;
    }
    /** Browser parity helper: loads and decodes an audio buffer through Web Audio. */
    loadAudioBuffer(ref, options = {}) {
        const existing = this.buffers.get(ref);
        if (existing) {
            return SoundStore.waitForAudioPromise(existing, options.signal, ref);
        }
        this.init();
        const context = this.getAudioContext();
        if (!context || !this.soundWorksFlag) {
            return Promise.reject(new ResourceLoadException(`Failed to decode audio ${ref}: Web Audio API is not available`, {
                ref,
                url: ResourceLoader.getResource(ref)?.href ?? null,
                kind: "decode",
                phase: "decode"
            }));
        }
        const promise = (async () => {
            const bytes = await ResourceLoader.loadResource(ref, options);
            SoundStore.throwIfAborted(options.signal, ref);
            try {
                const buffer = await context.decodeAudioData(bytes);
                SoundStore.throwIfAborted(options.signal, ref);
                return buffer;
            }
            catch (error) {
                if (error instanceof ResourceLoadException) {
                    throw error;
                }
                if (SoundStore.isAbortError(error) || options.signal?.aborted) {
                    throw SoundStore.abortException(ref, options.signal?.reason ?? error);
                }
                throw new ResourceLoadException(`Failed to load audio: ${ref}`, {
                    ref,
                    url: ResourceLoader.getResource(ref)?.href ?? null,
                    kind: "decode",
                    phase: "decode",
                    cause: error
                });
            }
        })().catch((error) => {
            if (this.buffers.get(ref) === promise) {
                this.buffers.delete(ref);
            }
            throw error;
        });
        this.buffers.set(ref, promise);
        return promise;
    }
    /** Browser parity helper: queues audio decode work into ResourceLoader.waitForAll(). */
    preloadAudioBuffer(ref, options = {}) {
        const tracked = ResourceLoader.track(this.loadAudioBuffer(ref, options).then(() => undefined), ref);
        void tracked.catch(() => undefined);
        return tracked;
    }
    /** Browser/PWA helper: queues and tracks a deduplicated batch of audio decodes. */
    async preloadAudioBuffers(refs, onProgressOrOptions) {
        const options = typeof onProgressOrOptions === "function" ? { onProgress: onProgressOrOptions } : (onProgressOrOptions ?? {});
        SoundStore.throwIfAborted(options.signal, "audio manifest");
        const uniqueRefs = Array.from(new Set(refs));
        const total = uniqueRefs.length;
        let loaded = 0;
        if (total === 0) {
            return;
        }
        const settled = await runSettledBatch(uniqueRefs, options.concurrency, async (ref) => {
            await this.preloadAudioBuffer(ref, options);
            loaded++;
            options.onProgress?.({ ref, loaded, total });
        });
        const failure = settled.find((entry) => entry.status === "rejected");
        if (failure) {
            throw failure.reason;
        }
    }
    static async waitForAudioPromise(promise, signal, ref) {
        if (!signal) {
            return promise;
        }
        SoundStore.throwIfAborted(signal, ref);
        return new Promise((resolve, reject) => {
            const abort = () => {
                signal.removeEventListener("abort", abort);
                reject(SoundStore.abortException(ref, signal.reason));
            };
            signal.addEventListener("abort", abort, { once: true });
            void promise.then((value) => {
                signal.removeEventListener("abort", abort);
                resolve(value);
            }, (error) => {
                signal.removeEventListener("abort", abort);
                reject(error);
            });
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
    static isAbortError(error) {
        return ((typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
            (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"));
    }
    /** Browser parity helper: plays a decoded sound effect through Web Audio. */
    playSound(ref, pitch, volume, loop, onEnded, position) {
        this.init();
        if (!this.soundWorksFlag || !this.soundsEnabled) {
            return null;
        }
        const context = this.getAudioContext();
        const bus = this.getSoundBus();
        if (!context || !bus) {
            return null;
        }
        const sourceId = this.findFreeSoundSource();
        if (sourceId < 0) {
            return null;
        }
        let source = null;
        let gain = null;
        let sourceGain = 0;
        let playing = true;
        let stopped = false;
        let requestedStop = false;
        const cleanupGraph = (targetSource, targetGain, stopSource) => {
            if (targetSource) {
                targetSource.onended = null;
                if (stopSource) {
                    try {
                        targetSource.stop();
                    }
                    catch {
                        // Ignore duplicate stop calls; Web Audio throws when a source is already stopped.
                    }
                }
                try {
                    targetSource.disconnect();
                }
                catch {
                    // A source can already be disconnected during repeated teardown.
                }
            }
            try {
                targetGain?.disconnect();
            }
            catch {
                // A gain node can already be disconnected during repeated teardown.
            }
        };
        const handle = {
            sourceId,
            stop: () => {
                stopped = true;
                requestedStop = true;
                const stoppedSource = source;
                const stoppedGain = gain;
                source = null;
                gain = null;
                cleanupGraph(stoppedSource, stoppedGain, true);
                playing = false;
                this.activeHandles.delete(handle);
                this.musicHandles.delete(handle);
                this.releaseSoundSource(sourceId, handle);
            },
            playing: () => playing,
            getGain: () => sourceGain
        };
        this.activeHandles.add(handle);
        this.soundSources[sourceId] = handle;
        void this.loadAudioBuffer(ref)
            .then((buffer) => {
            if (stopped) {
                return;
            }
            void context.resume().catch(() => undefined);
            gain = context.createGain();
            source = context.createBufferSource();
            source.buffer = buffer;
            source.loop = loop;
            source.playbackRate.value = Math.max(0.25, Math.min(4, pitch));
            sourceGain = Math.max(0, volume * this.soundVolume);
            gain.gain.value = sourceGain;
            source.connect(gain);
            this.connectPositionedSource(context, gain, bus, position);
            const startedSource = source;
            const startedGain = gain;
            source.onended = () => {
                cleanupGraph(startedSource, startedGain, false);
                if (source !== startedSource) {
                    return;
                }
                const wasLooping = startedSource.loop;
                source = null;
                gain = null;
                if (requestedStop || wasLooping) {
                    return;
                }
                playing = false;
                this.activeHandles.delete(handle);
                this.musicHandles.delete(handle);
                this.releaseSoundSource(sourceId, handle);
                onEnded?.();
            };
            source.start();
        })
            .catch((error) => {
            const failedSource = source;
            const failedGain = gain;
            source = null;
            gain = null;
            cleanupGraph(failedSource, failedGain, true);
            playing = false;
            this.activeHandles.delete(handle);
            this.musicHandles.delete(handle);
            this.releaseSoundSource(sourceId, handle);
            onEnded?.();
            Log.error(`Failed to play sound: ${ref}`, error);
        });
        return handle;
    }
    /** Browser parity helper: tracks an externally-created Web Audio handle. */
    track(handle) {
        this.activeHandles.add(handle);
        this.musicHandles.add(handle);
    }
    /** Browser parity helper: stops tracking an externally-created Web Audio handle. */
    untrack(handle) {
        this.activeHandles.delete(handle);
        this.musicHandles.delete(handle);
    }
    resetSoundSources() {
        this.soundSources = new Array(this.maxSources).fill(null);
    }
    findFreeSoundSource() {
        for (let index = 1; index < this.maxSources - 1; index++) {
            const handle = this.soundSources[index];
            if (!handle || !handle.playing()) {
                this.soundSources[index] = null;
                return index;
            }
        }
        return -1;
    }
    releaseSoundSource(sourceId, handle) {
        if (this.soundSources[sourceId] === handle) {
            this.soundSources[sourceId] = null;
        }
    }
    connectPositionedSource(context, gain, bus, position) {
        if (!position || typeof context.createPanner !== "function") {
            gain.connect(bus);
            return;
        }
        try {
            const panner = context.createPanner();
            panner.panningModel = "equalpower";
            panner.distanceModel = "inverse";
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            const legacyPanner = panner;
            if ("positionX" in panner) {
                panner.positionX.value = position.x;
                panner.positionY.value = position.y;
                panner.positionZ.value = position.z;
            }
            else if (typeof legacyPanner.setPosition === "function") {
                legacyPanner.setPosition.call(panner, position.x, position.y, position.z);
            }
            gain.connect(panner);
            panner.connect(bus);
        }
        catch {
            gain.connect(bus);
        }
    }
}
//# sourceMappingURL=SoundStore.js.map