import { AudioContextLifecycle } from "./AudioContextLifecycle.js";
import { SoundStore } from "./SoundStore.js";

/**
 * Browser/PWA bridge for the shared Web Audio context.
 *
 * The active game owns source/music suspension. This bridge waits until the end
 * of a hide/pagehide event turn before suspending the AudioContext so application
 * lifecycle handlers can first capture music position and stop active sources.
 * On return it begins automatic recovery immediately and also arms the first real
 * pointer/keyboard gesture as a forced WebKit recovery opportunity.
 */
export class BrowserAudioLifecycle {
    private static readonly instance = new BrowserAudioLifecycle();
    private installed = false;
    private recoveryArmed = false;

    public static get(): BrowserAudioLifecycle {
        return BrowserAudioLifecycle.instance;
    }

    public install(): void {
        if (this.installed || typeof document === "undefined" || typeof window === "undefined") {
            return;
        }
        this.installed = true;
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
        document.addEventListener("pointerdown", this.handleRecoveryGesture, true);
        document.addEventListener("keydown", this.handleRecoveryGesture, true);
        window.addEventListener("pagehide", this.handlePageHide);
        window.addEventListener("pageshow", this.handlePageShow);
    }

    /** Arms the next visible pointer/keyboard gesture as a forced Web Audio retry. */
    public armRecovery(): void {
        this.install();
        if (SoundStore.get().soundWorks()) {
            this.recoveryArmed = true;
        }
    }

    public async resume(): Promise<boolean> {
        this.install();
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            return true;
        }
        const context = store.getAudioContext();
        if (context === null) {
            return false;
        }
        const resumed = await AudioContextLifecycle.resume(context);
        if (resumed && store.musicOn()) {
            // Re-run Music's logical resume hook without restarting an already
            // healthy source. This recovers music left waiting on Web Audio.
            store.setMusicOn(true);
        }
        return resumed;
    }

    public async resumeFromUserGesture(): Promise<boolean> {
        this.install();
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            this.recoveryArmed = false;
            return true;
        }
        const context = store.getAudioContext();
        if (context === null) {
            return false;
        }
        const resumed = await AudioContextLifecycle.resumeFromUserGesture(context);
        if (!resumed) {
            return false;
        }
        this.recoveryArmed = false;
        if (store.musicOn()) {
            // A WebKit context can claim to be running while its existing graph
            // remains silent. Recreate the current music source at its preserved
            // logical position after a successful real-user-gesture recovery.
            store.setMusicOn(false);
            store.setMusicOn(true);
        }
        return true;
    }

    public async suspend(): Promise<boolean> {
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            return true;
        }
        const context = store.getAudioContext();
        return context === null ? true : AudioContextLifecycle.suspend(context);
    }

    private readonly handleVisibilityChange = (): void => {
        if (document.visibilityState === "visible") {
            void this.resume();
            return;
        }
        this.armRecovery();
        this.scheduleSuspendAfterApplicationHandlers(false);
    };

    private readonly handlePageHide = (): void => {
        this.armRecovery();
        // pagehide is the fallback lifecycle signal. Do not require a matching
        // visibilityState transition before honoring it.
        this.scheduleSuspendAfterApplicationHandlers(true);
    };

    private readonly handlePageShow = (): void => {
        if (document.visibilityState === "visible") {
            void this.resume();
        }
    };

    private readonly handleRecoveryGesture = (): void => {
        if (!this.recoveryArmed || document.visibilityState !== "visible") {
            return;
        }
        // Calling the async method starts AudioContext.resume() synchronously
        // before its first await, preserving this DOM user-activation event.
        void this.resumeFromUserGesture();
    };

    private scheduleSuspendAfterApplicationHandlers(force: boolean): void {
        queueMicrotask(() => {
            if (force || document.visibilityState !== "visible") {
                void this.suspend();
            }
        });
    }
}
