/**
 * Browser Web Audio lifecycle helper.
 *
 * Starts the first transition synchronously so a user-gesture resume reaches the
 * browser immediately, then serializes later suspend/resume requests behind it.
 */
export declare class AudioContextLifecycle {
    private static readonly states;
    /** Normal playback/lifecycle resume: avoid a redundant native resume while already running. */
    static resume(context: AudioContext): Promise<boolean>;
    /**
     * User-gesture resume: always call the browser's native resume(), even if the
     * context reports running. This preserves an explicit recovery poke for WebKit
     * contexts that can report running while audio output is still silent.
     */
    static resumeFromUserGesture(context: AudioContext): Promise<boolean>;
    static suspend(context: AudioContext): Promise<boolean>;
    static isRunning(context: AudioContext): boolean;
    static isSuspended(context: AudioContext): boolean;
    private static enqueue;
    private static apply;
}
//# sourceMappingURL=AudioContextLifecycle.d.ts.map