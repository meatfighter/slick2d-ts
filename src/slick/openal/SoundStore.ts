import { ResourceLoader } from "../util/ResourceLoader.js";
import { SlickException } from "../SlickException.js";
import { Log } from "../util/Log.js";

type WebAudioGlobal = typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

type AudioPosition = {
    x: number;
    y: number;
    z: number;
};

/**
 * Browser Web Audio playback handle.
 */
export interface AudioPlaybackHandle {
    /** Browser parity helper: logical OpenAL source slot, when this handle owns one. */
    readonly sourceId?: number;
    /** Stops playback if the source has started. */
    stop(): void;
    /** Pauses playback when supported by the handle. */
    pause?(): void;
    /** Suspends audible playback for global music-off without changing public Music.pause() state. */
    suspend?(): void;
    /** Resumes playback when supported by the handle. */
    resume?(): void;
    /** Returns true while the source is active. */
    playing(): boolean;
    /** Browser parity helper: returns the fixed per-source gain assigned when playback started. */
    getGain?(): number;
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.openal.SoundStore.
 *
 * Browser Web Audio subsystem singleton and compatibility state holder.
 */
export class SoundStore {
    private static readonly instance = new SoundStore();
    private deferredLoading = false;
    private inited = false;
    private soundWorksFlag = false;
    private musicEnabled = false;
    private soundsEnabled = false;
    private musicVolume = 1;
    private soundVolume = 1;
    private maxSources = 64;
    private context: AudioContext | null = null;
    private soundBus: GainNode | null = null;
    private musicBus: GainNode | null = null;
    private buffers = new Map<string, Promise<AudioBuffer>>();
    private activeHandles = new Set<AudioPlaybackHandle>();
    private musicHandles = new Set<AudioPlaybackHandle>();
    private soundSources: Array<AudioPlaybackHandle | null> = new Array<AudioPlaybackHandle | null>(64).fill(null);

    /** Java Slick2D counterpart: SoundStore.get(). */
    public static get(): SoundStore {
        return SoundStore.instance;
    }

    /** Java Slick2D counterpart: SoundStore.clear(). */
    public clear(): void {
        for (const handle of Array.from(this.activeHandles)) {
            handle.stop();
        }
        this.activeHandles.clear();
        this.musicHandles.clear();
        this.buffers.clear();
        this.resetSoundSources();
    }

    /** Browser parity helper: resets the Web Audio/OpenAL lifecycle for AL.destroy(). */
    public destroy(): void {
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

    /** Java Slick2D counterpart: SoundStore.disable(). */
    public disable(): void {
        this.musicEnabled = false;
        this.soundsEnabled = false;
        this.soundWorksFlag = false;
        this.inited = true;
        this.clear();
    }

    /** Java Slick2D counterpart: SoundStore.setDeferredLoading(boolean). */
    public setDeferredLoading(deferred: boolean): void {
        this.deferredLoading = deferred;
    }

    /** Java Slick2D counterpart: SoundStore.isDeferredLoading(). */
    public isDeferredLoading(): boolean {
        return this.deferredLoading;
    }

    /** Java Slick2D counterpart: SoundStore.setMusicOn(boolean). */
    public setMusicOn(music: boolean): void {
        if (!this.soundWorksFlag) {
            return;
        }
        this.musicEnabled = music;
        for (const handle of Array.from(this.musicHandles)) {
            if (music) {
                handle.resume?.();
            } else {
                if (handle.suspend) {
                    handle.suspend();
                } else {
                    handle.pause?.();
                }
            }
        }
    }

    /** Java Slick2D counterpart: SoundStore.isMusicOn(). */
    public isMusicOn(): boolean {
        return this.musicEnabled;
    }

    /** Java Slick2D counterpart: SoundStore.setMusicVolume(float). */
    public setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicBus) {
            this.musicBus.gain.value = this.musicVolume;
        }
    }

    /** Java Slick2D counterpart: SoundStore.getMusicVolume(). */
    public getMusicVolume(): number {
        return this.musicVolume;
    }

    /** Java Slick2D counterpart: SoundStore.setSoundVolume(float). */
    public setSoundVolume(volume: number): void {
        this.soundVolume = Math.max(0, volume);
    }

    /** Java Slick2D counterpart: SoundStore.getSoundVolume(). */
    public getSoundVolume(): number {
        return this.soundVolume;
    }

    /** Java Slick2D counterpart: SoundStore.setSoundsOn(boolean). */
    public setSoundsOn(sounds: boolean): void {
        if (!this.soundWorksFlag) {
            return;
        }
        this.soundsEnabled = sounds;
    }

    /** Java Slick2D counterpart: SoundStore.soundsOn(). */
    public soundsOn(): boolean {
        return this.soundsEnabled;
    }

    /** Java Slick2D counterpart: SoundStore.musicOn(). */
    public musicOn(): boolean {
        return this.musicEnabled;
    }

    /** Java Slick2D counterpart: SoundStore.soundWorks(). */
    public soundWorks(): boolean {
        return this.soundWorksFlag;
    }

    /** Java Slick2D counterpart: SoundStore.init(). */
    public init(): void {
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
        } else {
            this.soundWorksFlag = false;
            this.soundsEnabled = false;
            this.musicEnabled = false;
        }
    }

    /** Java Slick2D counterpart: SoundStore.poll(int). */
    public poll(_delta: number): void {
    }

    /** Java Slick2D counterpart: SoundStore.isMusicPlaying(). */
    public isMusicPlaying(): boolean {
        return Array.from(this.musicHandles).some((handle) => handle.playing());
    }

    /** Java Slick2D counterpart: SoundStore.stopSoundEffect(int). */
    public stopSoundEffect(id: number): void {
        const sourceId = Math.trunc(id);
        this.soundSources[sourceId]?.stop();
    }

    /** Java Slick2D counterpart: SoundStore.getSourceCount(). */
    public getSourceCount(): number {
        return this.maxSources;
    }

    /** Java Slick2D counterpart: SoundStore.setMaxSources(int). */
    public setMaxSources(max: number): void {
        const normalized = Math.max(1, Math.trunc(max));
        if (normalized === this.maxSources) {
            return;
        }
        const firstUnavailableEffectSource = Math.max(1, normalized - 1);
        for (let index = firstUnavailableEffectSource; index < this.soundSources.length; index++) {
            this.soundSources[index]?.stop();
        }
        const nextSources = new Array<AudioPlaybackHandle | null>(normalized).fill(null);
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
    public getAudioContext(): AudioContext | null {
        if (this.context) {
            return this.context;
        }
        const Ctor = globalThis.AudioContext ?? (globalThis as WebAudioGlobal).webkitAudioContext;
        if (!Ctor) {
            return null;
        }
        try {
            this.context = new Ctor();
        } catch {
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

    /** Browser parity helper: returns the global sound-effect gain bus. */
    public getSoundBus(): GainNode | null {
        this.init();
        return this.soundBus;
    }

    /** Browser parity helper: returns the global music gain bus. */
    public getMusicBus(): GainNode | null {
        this.init();
        return this.musicBus;
    }

    /** Browser parity helper: loads and decodes an audio buffer through Web Audio. */
    public loadAudioBuffer(ref: string): Promise<AudioBuffer> {
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
    public preloadAudioBuffer(ref: string): Promise<void> {
        const tracked = ResourceLoader.track(this.loadAudioBuffer(ref).then(() => undefined));
        void tracked.catch(() => undefined);
        return tracked;
    }

    /** Browser parity helper: plays a decoded sound effect through Web Audio. */
    public playSound(ref: string, pitch: number, volume: number, loop: boolean, onEnded?: () => void, position?: AudioPosition): AudioPlaybackHandle | null {
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
        let source: AudioBufferSourceNode | null = null;
        let sourceGain = 0;
        let playing = true;
        let stopped = false;
        let requestedStop = false;
        const handle: AudioPlaybackHandle = {
            sourceId,
            stop: () => {
                stopped = true;
                requestedStop = true;
                if (source) {
                    const stoppedSource = source;
                    source = null;
                    try {
                        stoppedSource.stop();
                    } catch {
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
        void this.loadAudioBuffer(ref).then((buffer) => {
            if (stopped) {
                return;
            }
            void context.resume().catch(() => undefined);
            const gain = context.createGain();
            source = context.createBufferSource();
            source.buffer = buffer;
            source.loop = loop;
            source.playbackRate.value = Math.max(0.25, Math.min(4, pitch));
            sourceGain = Math.max(0.001, Math.max(0, volume * this.soundVolume));
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
        }).catch((error) => {
            playing = false;
            this.activeHandles.delete(handle);
            this.musicHandles.delete(handle);
            this.releaseSoundSource(sourceId, handle);
            Log.error(`Failed to play sound: ${ref}`, error);
        });
        return handle;
    }

    /** Browser parity helper: tracks an externally-created Web Audio handle. */
    public track(handle: AudioPlaybackHandle): void {
        this.activeHandles.add(handle);
        this.musicHandles.add(handle);
    }

    /** Browser parity helper: stops tracking an externally-created Web Audio handle. */
    public untrack(handle: AudioPlaybackHandle): void {
        this.activeHandles.delete(handle);
        this.musicHandles.delete(handle);
    }

    private resetSoundSources(): void {
        this.soundSources = new Array<AudioPlaybackHandle | null>(this.maxSources).fill(null);
    }

    private findFreeSoundSource(): number {
        for (let index = 1; index < this.maxSources - 1; index++) {
            const handle = this.soundSources[index];
            if (!handle || !handle.playing()) {
                this.soundSources[index] = null;
                return index;
            }
        }
        return -1;
    }

    private releaseSoundSource(sourceId: number, handle: AudioPlaybackHandle): void {
        if (this.soundSources[sourceId] === handle) {
            this.soundSources[sourceId] = null;
        }
    }

    private connectPositionedSource(context: AudioContext, gain: GainNode, bus: GainNode, position?: AudioPosition): void {
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
            const legacyPanner = panner as unknown as { setPosition?: (x: number, y: number, z: number) => void };
            if ("positionX" in panner) {
                panner.positionX.value = position.x;
                panner.positionY.value = position.y;
                panner.positionZ.value = position.z;
            } else if (typeof legacyPanner.setPosition === "function") {
                legacyPanner.setPosition.call(panner, position.x, position.y, position.z);
            }
            gain.connect(panner);
            panner.connect(bus);
        } catch {
            gain.connect(bus);
        }
    }
}
