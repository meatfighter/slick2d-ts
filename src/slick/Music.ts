import type { MusicListener } from "./MusicListener.js";
import { SlickException } from "./SlickException.js";
import { AudioPlaybackHandle, SoundStore } from "./openal/SoundStore.js";
import { Log } from "./util/Log.js";
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
    private static currentMusic: Music | null = null;
    private readonly ref: string;
    private readonly readyPromise: Promise<void>;
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
    private playingFlag = false;
    private globallySuspended = false;
    private stopRequested = false;
    private endPending = false;
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
            this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
        } else if (refOrUrlOrInput instanceof URL) {
            this.ref = refOrUrlOrInput.toString();
            this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
        } else {
            this.ref = typeof streamingOrRef === "string" ? streamingOrRef : "music";
            if (refOrUrlOrInput instanceof ArrayBuffer) {
                ResourceLoader.registerResource(this.ref, refOrUrlOrInput);
                this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
            } else {
                const registered = refOrUrlOrInput.arrayBuffer().then((bytes) => {
                    ResourceLoader.registerResource(this.ref, bytes);
                });
                this.readyPromise = ResourceLoader.track(
                    registered.then(() => SoundStore.get().loadAudioBuffer(this.ref)).then(() => undefined),
                    this.ref
                );
                void this.readyPromise.catch(() => undefined);
            }
        }
    }

    /** Java Slick2D counterpart: Music.poll(int). */
    public static poll(delta: number): void {
        const current = Music.currentMusic;
        if (!current) {
            return;
        }
        SoundStore.get().poll(delta);
        if (current.endPending) {
            Music.currentMusic = null;
            current.finishEnded();
            return;
        }
        current.poll(delta);
    }

    /** Browser lifecycle helper: clears static Music playback state without firing listeners. */
    public static resetPlaybackState(): void {
        const current = Music.currentMusic;
        Music.currentMusic = null;
        if (!current) {
            return;
        }
        current.startToken++;
        current.stopSource(true);
        current.positionOffset = 0;
        current.paused = false;
        current.playingFlag = false;
        current.globallySuspended = false;
        current.stopRequested = false;
        current.endPending = false;
        current.fadeState = null;
    }

    /** Browser parity helper: waits for constructor-queued audio decode. */
    public ready(): Promise<void> {
        return this.readyPromise;
    }

    /** Browser parity helper: Java-style explicit load alias. */
    public load(): Promise<void> {
        return this.ready();
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
    public play(pitch: number = 1, volume: number = 1): void {
        this.start(false, pitch, volume);
    }

    /** Java Slick2D counterpart: Music.loop(). */
    public loop(): void;
    /** Java Slick2D counterpart: Music.loop(float, float). */
    public loop(pitch: number, volume: number): void;
    public loop(pitch: number = 1, volume: number = 1): void {
        this.start(true, pitch, volume);
    }

    /** Java Slick2D counterpart: Music.pause(). */
    public pause(): void {
        if (Music.currentMusic !== this || (!this.source && !this.playingFlag)) {
            return;
        }
        this.startToken++;
        this.positionOffset = this.getPosition();
        this.stopSource(true, true);
        this.paused = true;
        this.playingFlag = false;
        this.globallySuspended = false;
    }

    /** Java Slick2D counterpart: Music.stop(). */
    public stop(): void {
        this.startToken++;
        this.stopSource(true);
        this.positionOffset = 0;
        this.paused = false;
        this.playingFlag = false;
        this.globallySuspended = false;
        this.fadeState = null;
        this.endPending = Music.currentMusic === this;
    }

    /** Java Slick2D counterpart: Music.resume(). */
    public resume(): void {
        if (this.paused) {
            this.start(this.looped, this.playbackRate, this.volume, this.positionOffset, false);
        } else if (this.globallySuspended && SoundStore.get().musicOn()) {
            this.resumeForMusicOn();
        }
    }

    /** Java Slick2D counterpart: Music.playing(). */
    public playing(): boolean {
        return Music.currentMusic === this && this.playingFlag;
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

    /** Browser parity helper: reports whether the current playback mode loops. */
    public isLooped(): boolean {
        return this.looped;
    }

    /** Browser parity helper: reports whether playback is explicitly paused. */
    public isPaused(): boolean {
        return this.paused;
    }

    /** Browser parity helper: reports the pitch/playback-rate used by play/loop. */
    public getPlaybackRate(): number {
        return this.playbackRate;
    }

    /** Browser parity helper: reports the decoded track duration when available. */
    public getDuration(): number | null {
        const duration = this.buffer?.duration;
        return typeof duration === "number" && Number.isFinite(duration) && duration >= 0 ? duration : null;
    }

    /** Java Slick2D counterpart: Music.setPosition(float). */
    public setPosition(position: number): boolean {
        this.positionOffset = this.buffer ? this.normalizeOffset(this.buffer, position, this.looped) : this.sanitizeOffset(position);
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
        const position = this.positionOffset + (context.currentTime - this.startedAt) * this.playbackRate;
        return this.buffer ? this.normalizeOffset(this.buffer, position, this.looped) : this.sanitizeOffset(position);
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
        const oldMusic = Music.currentMusic;
        if (oldMusic && oldMusic !== this) {
            oldMusic.stopForSwap(this);
        } else if (oldMusic === this) {
            this.stopSource(true);
        }
        Music.currentMusic = this;
        this.looped = loop;
        this.playbackRate = Math.max(0.25, Math.min(4, pitch));
        this.positionOffset = this.buffer ? this.normalizeOffset(this.buffer, offset, loop) : this.sanitizeOffset(offset);
        this.setVolume(volume);
        this.paused = false;
        this.playingFlag = true;
        this.globallySuspended = !SoundStore.get().musicOn();
        this.ensureHandle();
        const token = ++this.startToken;
        void this.readyPromise
            .then(() => this.loadBuffer())
            .then((buffer) => {
                if (token !== this.startToken || Music.currentMusic !== this || !this.playingFlag) {
                    return;
                }
                this.buffer = buffer;
                this.positionOffset = this.normalizeOffset(buffer, this.positionOffset, loop);
                if (!SoundStore.get().musicOn()) {
                    this.globallySuspended = true;
                    return;
                }
                this.globallySuspended = false;
                this.startSource(buffer, loop, this.positionOffset);
            })
            .catch((error) => {
                if (token === this.startToken && Music.currentMusic === this) {
                    this.playingFlag = false;
                    this.globallySuspended = false;
                    Music.currentMusic = null;
                    this.clearHandle();
                }
                Log.error(`Failed to start music: ${this.ref}`, error);
            });
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

    private stopForSwap(newMusic: Music): void {
        this.startToken++;
        this.stopSource(true);
        this.playingFlag = false;
        this.paused = false;
        this.globallySuspended = false;
        this.fadeState = null;
        Music.active.delete(this);
        if (Music.currentMusic === this) {
            Music.currentMusic = null;
        }
        for (const listener of this.listeners) {
            listener.musicSwapped(this, newMusic);
        }
    }

    private stopSource(requested: boolean, keepHandle = false): void {
        if (!this.source) {
            if (!keepHandle) {
                this.clearHandle();
            }
            return;
        }
        this.stopRequested = requested;
        const source = this.source;
        const gain = this.gain;
        this.source = null;
        this.gain = null;
        if (!keepHandle) {
            this.clearHandle();
        }
        source.onended = null;
        try {
            source.stop();
        } catch {
            // Ignore duplicate stop calls; Web Audio throws when a source is already stopped.
        }
        try {
            source.disconnect();
        } catch {
            // A source can already be disconnected during repeated teardown.
        }
        try {
            gain?.disconnect();
        } catch {
            // A gain node can already be disconnected during repeated teardown.
        }
    }

    private startSource(buffer: AudioBuffer, loop: boolean, offset: number): void {
        const context = SoundStore.get().getAudioContext();
        const bus = SoundStore.get().getMusicBus();
        if (!context || !bus) {
            throw new SlickException("Music playback requires Web Audio API");
        }
        this.stopSource(true);
        this.ensureHandle();
        void context.resume().catch(() => undefined);
        const source = context.createBufferSource();
        this.source = source;
        const gain = context.createGain();
        this.gain = gain;
        source.buffer = buffer;
        source.loop = loop;
        source.playbackRate.value = this.playbackRate;
        gain.gain.value = this.volume;
        source.connect(gain);
        gain.connect(bus);
        this.positionOffset = this.normalizeOffset(buffer, offset, loop);
        this.startedAt = context.currentTime;
        this.stopRequested = false;
        source.onended = () => {
            source.onended = null;
            try {
                source.disconnect();
            } catch {
                // The source may already have been disconnected by explicit teardown.
            }
            try {
                gain.disconnect();
            } catch {
                // The gain may already have been disconnected by explicit teardown.
            }
            if (this.source !== source) {
                return;
            }
            const requested = this.stopRequested;
            this.source = null;
            this.gain = null;
            if (!requested && !loop) {
                this.clearHandle();
                this.playingFlag = false;
                this.globallySuspended = false;
                this.positionOffset = 0;
                Music.active.delete(this);
                if (Music.currentMusic === this) {
                    Music.currentMusic = null;
                }
                for (const listener of this.listeners) {
                    listener.musicEnded(this);
                }
            }
        };
        source.start(0, this.positionOffset);
        Music.active.add(this);
    }

    private sanitizeOffset(offset: number): number {
        return Number.isFinite(offset) ? Math.max(0, offset) : 0;
    }

    private normalizeOffset(buffer: AudioBuffer, offset: number, loop: boolean): number {
        const sanitized = this.sanitizeOffset(offset);
        const duration = buffer.duration;
        if (!Number.isFinite(duration)) {
            return sanitized;
        }
        if (duration <= 0) {
            return 0;
        }
        if (loop) {
            return sanitized % duration;
        }
        return Math.min(sanitized, duration);
    }

    private suspendForMusicOff(): void {
        if (Music.currentMusic !== this || !this.playingFlag || this.globallySuspended) {
            return;
        }
        this.positionOffset = this.getPosition();
        this.globallySuspended = true;
        this.stopSource(true, true);
    }

    private resumeForMusicOn(): void {
        if (Music.currentMusic !== this || !this.playingFlag || this.paused || !this.globallySuspended) {
            return;
        }
        this.globallySuspended = false;
        this.start(this.looped, this.playbackRate, this.volume, this.positionOffset);
    }

    private ensureHandle(): void {
        if (this.handle) {
            SoundStore.get().track(this.handle);
            return;
        }
        this.handle = {
            stop: () => this.stop(),
            pause: () => this.pause(),
            suspend: () => this.suspendForMusicOff(),
            resume: () => this.resumeForMusicOn(),
            playing: () => this.playing()
        };
        SoundStore.get().track(this.handle);
    }

    private clearHandle(): void {
        if (!this.handle) {
            return;
        }
        SoundStore.get().untrack(this.handle);
        this.handle = null;
    }
}
