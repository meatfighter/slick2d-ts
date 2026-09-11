import type { MusicListener } from "./MusicListener.js";
import { type MusicPlaybackSnapshot, type MusicTransportState } from "./MusicPlaybackState.js";
/** Java Slick2D Music, with logical transport independent of disposable Web Audio nodes. */
export declare class Music {
    private static currentMusic;
    private readonly ref;
    private readonly readyPromise;
    private readonly listeners;
    private source;
    private sourceContext;
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
    private generationDetached;
    private stopRequested;
    private endPending;
    private startToken;
    private handle;
    constructor(ref: string);
    constructor(ref: string, streamingHint: boolean);
    constructor(url: URL);
    constructor(url: URL, streamingHint: boolean);
    constructor(input: ArrayBuffer | Blob, ref: string);
    /** Only the accepted gameplay clock advances transport, fades, and completion delivery. */
    static poll(delta: number): void;
    static resetPlaybackState(): void;
    ready(): Promise<void>;
    load(): Promise<void>;
    addListener(listener: MusicListener): void;
    removeListener(listener: MusicListener): void;
    play(): void;
    play(pitch: number, volume: number): void;
    loop(): void;
    loop(pitch: number, volume: number): void;
    pause(): void;
    stop(): void;
    resume(): void;
    playing(): boolean;
    getTransportState(): MusicTransportState;
    isCompletionPending(): boolean;
    /** A detached graph or an explicit pause must not make a Song advance to its next part. */
    isTransportActive(): boolean;
    setVolume(volume: number): void;
    getVolume(): number;
    isLooped(): boolean;
    isPaused(): boolean;
    getPlaybackRate(): number;
    getDuration(): number | null;
    setPosition(position: number): boolean;
    getPosition(): number;
    fade(duration: number, endVolume: number, stopAfterFade: boolean): void;
    /** Capture durable logical state without manufacturing or resuming a context. */
    capturePlaybackState(): MusicPlaybackSnapshot;
    /**
     * Atomically import transport only. This never plays a source, queues a timer,
     * changes global preferences, or delivers a Music listener notification.
     * Playback attachment belongs to the shell's accepted start transaction.
     */
    restorePlaybackState(snapshot: MusicPlaybackSnapshot): void;
    /** Attach the imported/live transport only to the currently accepted playback generation. */
    attachPlaybackGeneration(): Promise<void>;
    private start;
    private requestAttach;
    private poll;
    private loadBuffer;
    private stopForSwap;
    private resetLogicalState;
    private finishEnded;
    private stopSource;
    private cleanupSourceGraph;
    private startSource;
    private sanitizeOffset;
    private normalizeOffset;
    private suspendForMusicOff;
    private resumeForMusicOn;
    private detachPlaybackGeneration;
    private ensureHandle;
    private clearHandle;
}
//# sourceMappingURL=Music.d.ts.map