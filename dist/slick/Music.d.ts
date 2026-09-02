import type { MusicListener } from "./MusicListener.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.Music.
 *
 * Longer music track wrapper with play, loop, fade, and seek support.
 */
export declare class Music {
    private static currentMusic;
    private static readonly active;
    private readonly ref;
    private readonly readyPromise;
    private readonly listeners;
    private source;
    private gain;
    private buffer;
    private volume;
    private fadeState;
    private looped;
    private playbackRate;
    private positionOffset;
    private startedAt;
    private paused;
    private playingFlag;
    private globallySuspended;
    private stopRequested;
    private startToken;
    private handle;
    constructor(ref: string);
    constructor(ref: string, streamingHint: boolean);
    constructor(url: URL);
    constructor(url: URL, streamingHint: boolean);
    constructor(input: ArrayBuffer | Blob, ref: string);
    /** Java Slick2D counterpart: Music.poll(int). */
    static poll(delta: number): void;
    /** Browser parity helper: waits for constructor-queued audio decode. */
    ready(): Promise<void>;
    /** Browser parity helper: Java-style explicit load alias. */
    load(): Promise<void>;
    /** Java Slick2D counterpart: Music.addListener(MusicListener). */
    addListener(listener: MusicListener): void;
    /** Java Slick2D counterpart: Music.removeListener(MusicListener). */
    removeListener(listener: MusicListener): void;
    /** Java Slick2D counterpart: Music.play(). */
    play(): void;
    /** Java Slick2D counterpart: Music.play(float, float). */
    play(pitch: number, volume: number): void;
    /** Java Slick2D counterpart: Music.loop(). */
    loop(): void;
    /** Java Slick2D counterpart: Music.loop(float, float). */
    loop(pitch: number, volume: number): void;
    /** Java Slick2D counterpart: Music.pause(). */
    pause(): void;
    /** Java Slick2D counterpart: Music.stop(). */
    stop(): void;
    /** Java Slick2D counterpart: Music.resume(). */
    resume(): void;
    /** Java Slick2D counterpart: Music.playing(). */
    playing(): boolean;
    /** Java Slick2D counterpart: Music.setVolume(float). */
    setVolume(volume: number): void;
    /** Java Slick2D counterpart: Music.getVolume(). */
    getVolume(): number;
    /** Browser parity helper: reports whether the current playback mode loops. */
    isLooped(): boolean;
    /** Browser parity helper: reports whether playback is explicitly paused. */
    isPaused(): boolean;
    /** Browser parity helper: reports the pitch/playback-rate used by play/loop. */
    getPlaybackRate(): number;
    /** Browser parity helper: reports the decoded track duration when available. */
    getDuration(): number | null;
    /** Java Slick2D counterpart: Music.setPosition(float). */
    setPosition(position: number): boolean;
    /** Java Slick2D counterpart: Music.getPosition(). */
    getPosition(): number;
    /** Java Slick2D counterpart: Music.fade(int, float, boolean). */
    fade(duration: number, endVolume: number, stopAfterFade: boolean): void;
    private start;
    private poll;
    private loadBuffer;
    private stopForSwap;
    private stopSource;
    private startSource;
    private sanitizeOffset;
    private normalizeOffset;
    private suspendForMusicOff;
    private resumeForMusicOn;
    private ensureHandle;
    private clearHandle;
}
//# sourceMappingURL=Music.d.ts.map