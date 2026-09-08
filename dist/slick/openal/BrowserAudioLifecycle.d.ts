/**
 * Browser/PWA bridge for the shared Web Audio context.
 *
 * The active game owns source/music suspension. This bridge deliberately waits
 * until the end of a hide/pagehide event turn before suspending the AudioContext,
 * so application lifecycle handlers can first capture music position and stop
 * their active sources. On return it begins context recovery immediately; Music
 * and Sound also share the serialized transition and therefore defer playback
 * until recovery completes.
 */
export declare class BrowserAudioLifecycle {
    private static readonly instance;
    private installed;
    static get(): BrowserAudioLifecycle;
    install(): void;
    resume(): Promise<boolean>;
    suspend(): Promise<boolean>;
    private readonly handleVisibilityChange;
    private readonly handlePageHide;
    private readonly handlePageShow;
    private scheduleSuspendAfterApplicationHandlers;
}
//# sourceMappingURL=BrowserAudioLifecycle.d.ts.map