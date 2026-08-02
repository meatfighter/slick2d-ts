import { ResourceLoader } from "../util/ResourceLoader.js";
import { SlickException } from "../SlickException.js";
import { Log } from "../util/Log.js";

type WebAudioGlobal = typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

/**
 * Browser Web Audio playback handle.
 */
export interface AudioPlaybackHandle {
    /** Stops playback if the source has started. */
    stop(): void;
    /** Pauses playback when supported by the handle. */
    pause?(): void;
    /** Resumes playback when supported by the handle. */
    resume?(): void;
    /** Returns true while the source is active. */
    playing(): boolean;
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.openal.SoundStore.
 *
 * Browser Web Audio subsystem singleton and compatibility state holder.
 */
export class SoundStore {
    private static readonly instance = new SoundStore();
    private deferredLoading = false;
    private musicEnabled = true;
    private soundsEnabled = true;
    private musicVolume = 1;
    private soundVolume = 1;
    private context: AudioContext | null = null;
    private soundBus: GainNode | null = null;
    private musicBus: GainNode | null = null;
    private buffers = new Map<string, Promise<AudioBuffer>>();
    private activeHandles = new Set<AudioPlaybackHandle>();
    private musicHandles = new Set<AudioPlaybackHandle>();

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
    }

    /** Java Slick2D counterpart: SoundStore.disable(). */
    public disable(): void {
        this.musicEnabled = false;
        this.soundsEnabled = false;
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
        this.musicEnabled = music;
        for (const handle of Array.from(this.musicHandles)) {
            if (music) {
                handle.resume?.();
            } else {
                handle.pause?.();
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
        this.soundVolume = Math.max(0, Math.min(1, volume));
        if (this.soundBus) {
            this.soundBus.gain.value = this.soundVolume;
        }
    }

    /** Java Slick2D counterpart: SoundStore.getSoundVolume(). */
    public getSoundVolume(): number {
        return this.soundVolume;
    }

    /** Java Slick2D counterpart: SoundStore.setSoundsOn(boolean). */
    public setSoundsOn(sounds: boolean): void {
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
        return this.getAudioContext() !== null;
    }

    /** Java Slick2D counterpart: SoundStore.init(). */
    public init(): void {
        this.getAudioContext();
    }

    /** Java Slick2D counterpart: SoundStore.poll(int). */
    public poll(_delta: number): void {
    }

    /** Java Slick2D counterpart: SoundStore.isMusicPlaying(). */
    public isMusicPlaying(): boolean {
        return Array.from(this.musicHandles).some((handle) => handle.playing());
    }

    /** Java Slick2D counterpart: SoundStore.stopSoundEffect(int). */
    public stopSoundEffect(_id: number): void {
    }

    /** Java Slick2D counterpart: SoundStore.getSourceCount(). */
    public getSourceCount(): number {
        return this.activeHandles.size;
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
        this.context = new Ctor();
        this.soundBus = this.context.createGain();
        this.musicBus = this.context.createGain();
        this.soundBus.gain.value = this.soundVolume;
        this.musicBus.gain.value = this.musicVolume;
        this.soundBus.connect(this.context.destination);
        this.musicBus.connect(this.context.destination);
        return this.context;
    }

    /** Browser parity helper: returns the global sound-effect gain bus. */
    public getSoundBus(): GainNode | null {
        this.getAudioContext();
        return this.soundBus;
    }

    /** Browser parity helper: returns the global music gain bus. */
    public getMusicBus(): GainNode | null {
        this.getAudioContext();
        return this.musicBus;
    }

    /** Browser parity helper: loads and decodes an audio buffer through Web Audio. */
    public loadAudioBuffer(ref: string): Promise<AudioBuffer> {
        const existing = this.buffers.get(ref);
        if (existing) {
            return existing;
        }
        const context = this.getAudioContext();
        if (!context) {
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
    public playSound(ref: string, pitch: number, volume: number, loop: boolean, onEnded?: () => void): AudioPlaybackHandle | null {
        if (!this.soundsEnabled) {
            return null;
        }
        const context = this.getAudioContext();
        const bus = this.getSoundBus();
        if (!context || !bus) {
            return null;
        }
        let source: AudioBufferSourceNode | null = null;
        let playing = true;
        let stopped = false;
        const handle: AudioPlaybackHandle = {
            stop: () => {
                stopped = true;
                if (source) {
                    try {
                        source.stop();
                    } catch {
                        // Ignore duplicate stop calls; Web Audio throws when a source is already stopped.
                    }
                }
                playing = false;
                this.activeHandles.delete(handle);
                this.musicHandles.delete(handle);
            },
            playing: () => playing
        };
        this.activeHandles.add(handle);
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
            gain.gain.value = Math.max(0, Math.min(1, volume));
            source.connect(gain);
            gain.connect(bus);
            source.onended = () => {
                if (!source?.loop) {
                    playing = false;
                    this.activeHandles.delete(handle);
                    this.musicHandles.delete(handle);
                    onEnded?.();
                }
            };
            source.start();
        }).catch((error) => {
            playing = false;
            this.activeHandles.delete(handle);
            this.musicHandles.delete(handle);
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
}
