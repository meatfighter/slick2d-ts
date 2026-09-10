import { AudioContextLifecycle } from "./AudioContextLifecycle.js";
import { SoundStore } from "./SoundStore.js";

/**
 * Legacy browser bridge for persistent Web Audio contexts.
 *
 * Explicit PWA playback-generation mode deliberately bypasses this class: losing
 * page control returns the application to its menu, retires the old context, and
 * requires New Game/Continue to create a fresh context from user activation.
 */
export class BrowserAudioLifecycle {
    private static readonly instance = new BrowserAudioLifecycle();
    private installed = false;
    private recoveryArmed = false;
    private rememberedContext: AudioContext | null = null;

    public static get(): BrowserAudioLifecycle {
        return BrowserAudioLifecycle.instance;
    }

    public install(): void {
        if (this.usesExplicitPlaybackGenerations() || this.installed || typeof document === "undefined" || typeof window === "undefined") {
            return;
        }
        this.installed = true;
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
        document.addEventListener("pointerdown", this.handleRecoveryGesture, true);
        document.addEventListener("keydown", this.handleRecoveryGesture, true);
        window.addEventListener("pagehide", this.handlePageHide);
        window.addEventListener("pageshow", this.handlePageShow);
    }

    /** Observes the already-created active context without creating Web Audio. */
    public observeActiveContext(): void {
        if (this.usesExplicitPlaybackGenerations()) {
            return;
        }
        this.install();
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            return;
        }
        this.remember(store.getAudioContext());
    }

    /** Arms the next visible pointer/keyboard gesture as a forced legacy Web Audio retry. */
    public armRecovery(): void {
        if (this.usesExplicitPlaybackGenerations()) {
            return;
        }
        this.install();
        if (SoundStore.get().soundWorks()) {
            this.recoveryArmed = true;
        }
    }

    public async resume(): Promise<boolean> {
        if (this.usesExplicitPlaybackGenerations()) {
            return true;
        }
        this.install();
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            return true;
        }
        const context = this.remember(store.getAudioContext());
        if (context === null) {
            return false;
        }
        const resumed = await AudioContextLifecycle.resume(context);
        if (resumed && store.musicOn()) {
            store.setMusicOn(true);
        }
        return resumed;
    }

    public async resumeFromUserGesture(): Promise<boolean> {
        if (this.usesExplicitPlaybackGenerations()) {
            return true;
        }
        this.install();
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            this.recoveryArmed = false;
            return true;
        }
        const context = this.remember(store.getAudioContext());
        if (context === null) {
            return false;
        }
        const resumed = await AudioContextLifecycle.resumeFromUserGesture(context);
        if (!resumed) {
            return false;
        }
        this.recoveryArmed = false;
        if (store.musicOn()) {
            store.setMusicOn(false);
            store.setMusicOn(true);
        }
        return true;
    }

    public async suspend(): Promise<boolean> {
        if (this.usesExplicitPlaybackGenerations()) {
            return true;
        }
        const store = SoundStore.get();
        const context = store.soundWorks() ? this.remember(store.getAudioContext()) : this.getRememberedContext();
        return context === null ? true : AudioContextLifecycle.suspend(context);
    }

    private usesExplicitPlaybackGenerations(): boolean {
        return SoundStore.get().isUsingExplicitPlaybackGenerations();
    }

    private remember(context: AudioContext | null): AudioContext | null {
        if (context === null) {
            return null;
        }
        if (String(context.state) === "closed") {
            if (this.rememberedContext === context) {
                this.setRememberedContext(null);
            }
            return null;
        }
        this.setRememberedContext(context);
        return context;
    }

    private setRememberedContext(context: AudioContext | null): void {
        if (this.rememberedContext === context) {
            return;
        }
        this.rememberedContext?.removeEventListener("statechange", this.handleContextStateChange);
        this.rememberedContext = context;
        this.rememberedContext?.addEventListener("statechange", this.handleContextStateChange);
    }

    private getRememberedContext(): AudioContext | null {
        const context = this.rememberedContext;
        if (context === null) {
            return null;
        }
        if (String(context.state) === "closed") {
            this.setRememberedContext(null);
            return null;
        }
        return context;
    }

    private readonly handleContextStateChange = (): void => {
        if (this.usesExplicitPlaybackGenerations()) {
            return;
        }
        const context = this.getRememberedContext();
        if (context === null || typeof document === "undefined" || document.visibilityState !== "visible") {
            return;
        }
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            return;
        }
        if (String(context.state) !== "running") {
            this.recoveryArmed = true;
            return;
        }
        if (store.musicOn()) {
            store.setMusicOn(true);
        }
    };

    private readonly handleVisibilityChange = (): void => {
        if (this.usesExplicitPlaybackGenerations()) {
            return;
        }
        if (document.visibilityState === "visible") {
            void this.resume();
            return;
        }
        this.armRecovery();
        this.scheduleSuspendAfterApplicationHandlers(false);
    };

    private readonly handlePageHide = (): void => {
        if (this.usesExplicitPlaybackGenerations()) {
            return;
        }
        this.armRecovery();
        this.scheduleSuspendAfterApplicationHandlers(true);
    };

    private readonly handlePageShow = (): void => {
        if (!this.usesExplicitPlaybackGenerations() && document.visibilityState === "visible") {
            void this.resume();
        }
    };

    private readonly handleRecoveryGesture = (): void => {
        if (this.usesExplicitPlaybackGenerations() || !this.recoveryArmed || document.visibilityState !== "visible") {
            return;
        }
        void this.resumeFromUserGesture();
    };

    private scheduleSuspendAfterApplicationHandlers(force: boolean): void {
        queueMicrotask(() => {
            if (!this.usesExplicitPlaybackGenerations() && (force || document.visibilityState !== "visible")) {
                void this.suspend();
            }
        });
    }
}
