/**
 * Browser/PWA bridge for the shared Web Audio context.
 *
 * The active game owns source/music suspension. This bridge waits until the end
 * of a hide/pagehide event turn before suspending the AudioContext so application
 * lifecycle handlers can first capture music position and stop active sources.
 * On return it begins automatic recovery immediately and also arms the first real
 * pointer/keyboard gesture as a forced WebKit recovery opportunity.
 */
export declare class BrowserAudioLifecycle {
    private static readonly instance;
    private installed;
    private recoveryArmed;
    private rememberedContext;
    static get(): BrowserAudioLifecycle;
    install(): void;
    /** Arms the next visible pointer/keyboard gesture as a forced Web Audio retry. */
    armRecovery(): void;
    resume(): Promise<boolean>;
    resumeFromUserGesture(): Promise<boolean>;
    suspend(): Promise<boolean>;
    private remember;
    private getRememberedContext;
    private readonly handleVisibilityChange;
    private readonly handlePageHide;
    private readonly handlePageShow;
    private readonly handleRecoveryGesture;
    private scheduleSuspendAfterApplicationHandlers;
}
//# sourceMappingURL=BrowserAudioLifecycle.d.ts.map