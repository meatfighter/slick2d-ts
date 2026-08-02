import type { MusicListener } from "./MusicListener.js";
import { SlickException } from "./SlickException.js";
import { AudioPlaybackHandle, SoundStore } from "./openal/SoundStore.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

type FadeState = {
    duration: number;
    elapsed: number;
    startVolume: number;
    endVolume: number;
    stopAfterFade: boolean;
};

/**
 * Java Slick2D counterpart: org.newdawn.slick.Music.
 *
 * Longer music track wrapper with play, loop, fade, and seek support.
 */
export class Music {
    private static readonly active = new Set<Music>();
    private readonly ref: string;
    private readonly listeners: MusicListener[] = [];
    private source: AudioBufferSourceNode | null = null;
    private gain: GainNode | null = null;
    private buffer: AudioBuffer | null = null;
    private volume = 1;
    private fadeState: FadeState | null = null;
    private looped = false;
    private playbackRate = 1;
    private positionOffset = 0;
    private startedAt = 0;
    private paused = false;
    private stopRequested = false;
    private startToken = 0;
    private handle: AudioPlaybackHandle | null = null;

    public constructor(ref: string);
    public constructor(ref: string, streamingHint: boolean);
    public constructor(url: URL);
    public constructor(url: URL, streamingHint: boolean);
    public constructor(input: ArrayBuffer | Blob, ref: string);
    /**
     * Java Slick2D counterpart: Music constructors.
     *
     * Stores a resource reference and queues browser loading when possible.
     */
    public constructor(refOrUrlOrInput: string | URL | ArrayBuffer | Blob, streamingOrRef?: boolean | string) {
        if (typeof refOrUrlOrInput === "string") {
            this.ref = refOrUrlOrInput;
            void ResourceLoader.loadResource(this.ref).catch(() => undefined);
        } else if (refOrUrlOrInput instanceof URL) {
            this.ref = refOrUrlOrInput.toString();
        } else {
            this.ref = typeof streamingOrRef === "string" ? streamingOrRef : "music";
            if (refOrUrlOrInput instanceof ArrayBuffer) {
                ResourceLoader.registerResource(this.ref, refOrUrlOrInput);
            } else {
                void ResourceLoader.track(refOrUrlOrInput.arrayBuffer().then((bytes) => {
                    ResourceLoader.registerResource(this.ref, bytes);
                }));
            }
        }
    }

    /** Java Slick2D counterpart: Music.poll(int). */
    public static poll(delta: number): void {
        for (const music of Array.from(Music.active)) {
            music.poll(delta);
        }
    }

    /** Java Slick2D counterpart: Music.addListener(MusicListener). */
    public addListener(listener: MusicListener): void {
        if (!this.listeners.includes(listener)) {
            this.listeners.push(listener);
        }
    }

    /** Java Slick2D counterpart: Music.removeListener(MusicListener). */
    public removeListener(listener: MusicListener): void {
        const index = this.listeners.indexOf(listener);
        if (index >= 0) {
            this.listeners.splice(index, 1);
        }
    }

    /** Java Slick2D counterpart: Music.play(). */
    public play(): void;
    /** Java Slick2D counterpart: Music.play(float, float). */
    public play(pitch: number, volume: number): void;
    public play(pitch: number = 1, volume: number = this.volume): void {
        this.start(false, pitch, volume);
    }

    /** Java Slick2D counterpart: Music.loop(). */
    public loop(): void;
    /** Java Slick2D counterpart: Music.loop(float, float). */
    public loop(pitch: number, volume: number): void;
    public loop(pitch: number = 1, volume: number = this.volume): void {
        this.start(true, pitch, volume);
    }

    /** Java Slick2D counterpart: Music.pause(). */
    public pause(): void {
        if (!this.source) {
            return;
        }
        this.positionOffset = this.getPosition();
        this.stopSource(true);
        this.paused = true;
        Music.active.delete(this);
    }

    /** Java Slick2D counterpart: Music.stop(). */
    public stop(): void {
        this.stopSource(true);
        this.positionOffset = 0;
        this.paused = false;
        Music.active.delete(this);
        this.fadeState = null;
    }

    /** Java Slick2D counterpart: Music.resume(). */
    public resume(): void {
        if (this.paused) {
            this.start(this.looped, this.playbackRate, this.volume, this.positionOffset);
        }
    }

    /** Java Slick2D counterpart: Music.playing(). */
    public playing(): boolean {
        return this.source !== null;
    }

    /** Java Slick2D counterpart: Music.setVolume(float). */
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.gain) {
            this.gain.gain.value = this.volume;
        }
    }

    /** Java Slick2D counterpart: Music.getVolume(). */
    public getVolume(): number {
        return this.volume;
    }

    /** Java Slick2D counterpart: Music.setPosition(float). */
    public setPosition(position: number): boolean {
        this.positionOffset = Math.max(0, position);
        if (this.source) {
            this.start(this.looped, this.playbackRate, this.volume, this.positionOffset);
        }
        return true;
    }

    /** Java Slick2D counterpart: Music.getPosition(). */
    public getPosition(): number {
        const context = SoundStore.get().getAudioContext();
        if (!context || !this.source) {
            return this.positionOffset;
        }
        return this.positionOffset + (context.currentTime - this.startedAt) * this.playbackRate;
    }

    /** Java Slick2D counterpart: Music.fade(int, float, boolean). */
    public fade(duration: number, endVolume: number, stopAfterFade: boolean): void {
        this.fadeState = {
            duration: Math.max(1, duration),
            elapsed: 0,
            startVolume: this.volume,
            endVolume: Math.max(0, Math.min(1, endVolume)),
            stopAfterFade
        };
        Music.active.add(this);
    }

    private start(loop: boolean, pitch: number, volume: number, offset: number = 0): void {
        if (!SoundStore.get().musicOn()) {
            return;
        }
        this.looped = loop;
        this.playbackRate = Math.max(0.25, Math.min(4, pitch));
        this.setVolume(volume);
        this.paused = false;
        const token = ++this.startToken;
        void this.loadBuffer().then((buffer) => {
            if (token !== this.startToken) {
                return;
            }
            const context = SoundStore.get().getAudioContext();
            const bus = SoundStore.get().getMusicBus();
            if (!context || !bus) {
                throw new SlickException("Music playback requires Web Audio API");
            }
            this.stopSource(true);
            void context.resume().catch(() => undefined);
            this.source = context.createBufferSource();
            this.gain = context.createGain();
            this.buffer = buffer;
            this.source.buffer = buffer;
            this.source.loop = loop;
            this.source.playbackRate.value = this.playbackRate;
            this.gain.gain.value = this.volume;
            this.source.connect(this.gain);
            this.gain.connect(bus);
            this.positionOffset = Math.max(0, Math.min(offset, buffer.duration));
            this.startedAt = context.currentTime;
            this.stopRequested = false;
            this.source.onended = () => {
                const requested = this.stopRequested;
                this.source = null;
                this.gain = null;
                if (this.handle) {
                    SoundStore.get().untrack(this.handle);
                    this.handle = null;
                }
                if (!requested && !loop) {
                    this.positionOffset = 0;
                    Music.active.delete(this);
                    for (const listener of this.listeners) {
                        listener.musicEnded(this);
                    }
                }
            };
            this.source.start(0, this.positionOffset);
            this.handle = {
                stop: () => this.stop(),
                playing: () => this.playing()
            };
            SoundStore.get().track(this.handle);
            Music.active.add(this);
        }).catch(() => undefined);
    }

    private poll(delta: number): void {
        if (!this.fadeState) {
            return;
        }
        const fade = this.fadeState;
        fade.elapsed += delta;
        const t = Math.min(1, fade.elapsed / fade.duration);
        this.setVolume(fade.startVolume + (fade.endVolume - fade.startVolume) * t);
        if (t >= 1) {
            this.fadeState = null;
            if (fade.stopAfterFade) {
                this.stop();
            }
        }
    }

    private async loadBuffer(): Promise<AudioBuffer> {
        if (this.buffer) {
            return this.buffer;
        }
        this.buffer = await SoundStore.get().loadAudioBuffer(this.ref);
        return this.buffer;
    }

    private stopSource(requested: boolean): void {
        if (!this.source) {
            return;
        }
        this.stopRequested = requested;
        try {
            this.source.stop();
        } catch {
            // Ignore duplicate stop calls; Web Audio throws when a source is already stopped.
        }
    }
}
