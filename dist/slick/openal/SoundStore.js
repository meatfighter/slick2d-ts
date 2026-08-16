import { ResourceLoader } from "../util/ResourceLoader.js";
import { SlickException } from "../SlickException.js";
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
        this.inited = true;
        const context = this.getAudioContext();
        if (context) {
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
        const handles = Array.from(this.activeHandles);
        for (const handle of handles) {
            if (!this.musicHandles.has(handle)) {
                handle.stop();
            }
        }
    }
    /** Browser/PWA helper: stops active music and sound effects without clearing decoded buffers. */
    stopAllPlayback() {
        const handles = Array.from(this.activeHandles);
        for (const handle of handles) {
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
        const normalized = Math.max(1, Math.trunc(max));
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
        try {
            this.context = new Ctor();
        }
        catch {
            return null;
        }
        this.soundBus = this.context.createGain();
        this.musicBus = this.context.createGain();
        this.soundBus.gain.value = 1;
        this.musicBus.gain.value = this.musicVolume;
        this.soundBus.connect(this.context.destination);
        this.musicBus.connect(this.context.destination);
        return this.context;
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
    loadAudioBuffer(ref) {
        const existing = this.buffers.get(ref);
        if (existing) {
            return existing;
        }
        this.init();
        const context = this.getAudioContext();
        if (!context || !this.soundWorksFlag) {
            return Promise.reject(new Error("Web Audio API is not available"));
        }
        const promise = ResourceLoader.loadResource(ref)
            .then((bytes) => context.decodeAudioData(bytes.slice(0)))
            .catch((error) => {
            this.buffers.delete(ref);
            throw new SlickException(`Failed to load audio: ${ref}`, error);
        });
        this.buffers.set(ref, promise);
        return promise;
    }
    /** Browser parity helper: queues audio decode work into ResourceLoader.waitForAll(). */
    preloadAudioBuffer(ref) {
        const tracked = ResourceLoader.track(this.loadAudioBuffer(ref).then(() => undefined), ref);
        void tracked.catch(() => undefined);
        return tracked;
    }
    /** Browser/PWA helper: queues and tracks a deduplicated batch of audio decodes. */
    async preloadAudioBuffers(refs, onProgress) {
        const uniqueRefs = Array.from(new Set(refs));
        const total = uniqueRefs.length;
        let loaded = 0;
        if (total === 0) {
            return;
        }
        await Promise.all(uniqueRefs.map(async (ref) => {
            try {
                await this.preloadAudioBuffer(ref);
                loaded++;
                onProgress?.({ ref, loaded, total });
            }
            catch (error) {
                throw error instanceof SlickException ? error : new SlickException(`Failed to preload audio: ${ref}`, error);
            }
        }));
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
        let sourceGain = 0;
        let playing = true;
        let stopped = false;
        let requestedStop = false;
        const handle = {
            sourceId,
            stop: () => {
                stopped = true;
                requestedStop = true;
                if (source) {
                    const stoppedSource = source;
                    source = null;
                    try {
                        stoppedSource.stop();
                    }
                    catch {
                        // Ignore duplicate stop calls; Web Audio throws when a source is already stopped.
                    }
                }
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
            const gain = context.createGain();
            source = context.createBufferSource();
            source.buffer = buffer;
            source.loop = loop;
            source.playbackRate.value = Math.max(0.25, Math.min(4, pitch));
            sourceGain = Math.max(0, volume * this.soundVolume);
            gain.gain.value = sourceGain;
            source.connect(gain);
            this.connectPositionedSource(context, gain, bus, position);
            source.onended = () => {
                if (requestedStop || source?.loop) {
                    return;
                }
                source = null;
                playing = false;
                this.activeHandles.delete(handle);
                this.musicHandles.delete(handle);
                this.releaseSoundSource(sourceId, handle);
                onEnded?.();
            };
            source.start();
        })
            .catch((error) => {
            playing = false;
            this.activeHandles.delete(handle);
            this.musicHandles.delete(handle);
            this.releaseSoundSource(sourceId, handle);
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