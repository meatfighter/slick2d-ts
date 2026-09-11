export type PlaybackAttempt = Readonly<{
    id: number;
    /** True means preparation completed for this attempt, not that audio is audible. */
    ready: Promise<boolean>;
}>;
/** Narrow ownership contract keeps transaction tests independent of audio hardware. */
export interface PlaybackSessionManager {
    install(): void;
    getGeneration(): number;
    beginPlaybackGeneration(deferPlayback?: boolean): Promise<boolean>;
    commitPlaybackGeneration(generation: number): Promise<boolean>;
    endPlaybackGeneration(expectedGeneration?: number): void;
    setInterruptionHandler(handler: ((reason: string, generation: number) => void) | null): void;
}
/**
 * One PWA's activation transaction. Native context creation happens synchronously
 * in begin(); no old context is resumed. Cancellation cannot retire a replacement.
 */
export declare class PlaybackSession {
    private readonly manager;
    private readonly timeoutMs;
    private serial;
    private active;
    private beginning;
    private cleanupError;
    constructor(manager?: PlaybackSessionManager, timeoutMs?: number);
    /** Call directly from the New Game/Continue activation, before any await. */
    begin(): PlaybackAttempt;
    isCurrent(attempt: PlaybackAttempt): boolean;
    /** Failed cleanup remains observable even after the active attempt is detached. */
    assertRetirementSafe(): void;
    /** Logical restoration must be complete before commit is called. */
    commit(attempt: PlaybackAttempt): Promise<boolean>;
    /**
     * Detach ownership synchronously; native close and resume are never awaited.
     * Throws on unsafe retirement, including repeated cancellation after failure.
     * The writer-lock owner must not interpret a detached attempt as safe cleanup.
     */
    cancel(): void;
    private cancelActive;
    setInterruptionHandler(handler: ((reason: string) => void) | null): void;
    private completeCommit;
    private prepare;
    private retireForFallback;
    private retire;
    private cancelAfterFailure;
    private fail;
    private withDeadline;
}
//# sourceMappingURL=PlaybackSession.d.ts.map