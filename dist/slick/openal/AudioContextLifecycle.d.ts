/**
 * Browser Web Audio lifecycle helper.
 *
 * Ordinary transitions are serialized, but every logical wait is bounded so a
 * browser Promise that never settles cannot poison later recovery. A real
 * user-gesture resume bypasses an older pending transition and reaches the
 * browser synchronously. Late stale native transitions are reconciled back to
 * the newest desired state when they eventually settle.
 */
export declare class AudioContextLifecycle {
    private static readonly states;
    /** Normal playback/lifecycle resume: avoid a redundant native resume while already running. */
    static resume(context: AudioContext): Promise<boolean>;
    /**
     * User-gesture resume: always call the browser's native resume() immediately,
     * even if another transition is still pending or the context reports running.
     * This preserves a fresh WebKit recovery attempt inside the activation event.
     */
    static resumeFromUserGesture(context: AudioContext): Promise<boolean>;
    static suspend(context: AudioContext): Promise<boolean>;
    static isRunning(context: AudioContext): boolean;
    static isSuspended(context: AudioContext): boolean;
    private static getState;
    private static enqueue;
    private static apply;
    private static waitForNativeTransition;
    private static reconcileAfterStaleSettlement;
}
//# sourceMappingURL=AudioContextLifecycle.d.ts.map