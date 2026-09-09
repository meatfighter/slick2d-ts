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
    static instance = new BrowserAudioLifecycle();
    installed = false;
    recoveryArmed = false;
    rememberedContext = null;
    static get() {
        return BrowserAudioLifecycle.instance;
    }
    install() {
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
    /** Observes the already-created active context without creating Web Audio. */
    observeActiveContext() {
        this.install();
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            return;
        }
        this.remember(store.getAudioContext());
    }
    /** Arms the next visible pointer/keyboard gesture as a forced Web Audio retry. */
    armRecovery() {
        this.install();
        if (SoundStore.get().soundWorks()) {
            this.recoveryArmed = true;
        }
    }
    async resume() {
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
            // Re-run Music's logical resume hook without restarting an already
            // healthy source. This recovers music left waiting on Web Audio.
            store.setMusicOn(true);
        }
        return resumed;
    }
    async resumeFromUserGesture() {
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
            // A WebKit context can claim to be running while its existing graph
            // remains silent. Recreate the current music source at its preserved
            // logical position after a successful real-user-gesture recovery.
            store.setMusicOn(false);
            store.setMusicOn(true);
        }
        return true;
    }
    async suspend() {
        const store = SoundStore.get();
        const context = store.soundWorks() ? this.remember(store.getAudioContext()) : this.getRememberedContext();
        return context === null ? true : AudioContextLifecycle.suspend(context);
    }
    remember(context) {
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
    setRememberedContext(context) {
        if (this.rememberedContext === context) {
            return;
        }
        this.rememberedContext?.removeEventListener("statechange", this.handleContextStateChange);
        this.rememberedContext = context;
        this.rememberedContext?.addEventListener("statechange", this.handleContextStateChange);
    }
    getRememberedContext() {
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
    handleContextStateChange = () => {
        const context = this.getRememberedContext();
        if (context === null || typeof document === "undefined" || document.visibilityState !== "visible") {
            return;
        }
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            // Cache-preserving teardown intentionally leaves an idle context but
            // clears active-audio state. Do not arm recovery for that suspension.
            return;
        }
        if (String(context.state) !== "running") {
            // WebKit can enter a non-standard `interrupted` state while visible.
            // Preserve the next real activation event as a forced recovery chance.
            this.recoveryArmed = true;
            return;
        }
        if (store.musicOn()) {
            // A context may return to running without the application's pending
            // Music handle having rebuilt its source yet.
            store.setMusicOn(true);
        }
    };
    handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            void this.resume();
            return;
        }
        this.armRecovery();
        this.scheduleSuspendAfterApplicationHandlers(false);
    };
    handlePageHide = () => {
        this.armRecovery();
        // pagehide is the fallback lifecycle signal. Do not require a matching
        // visibilityState transition before honoring it.
        this.scheduleSuspendAfterApplicationHandlers(true);
    };
    handlePageShow = () => {
        if (document.visibilityState === "visible") {
            void this.resume();
        }
    };
    handleRecoveryGesture = () => {
        if (!this.recoveryArmed || document.visibilityState !== "visible") {
            return;
        }
        // Calling the async method starts AudioContext.resume() synchronously
        // before its first await, preserving this DOM user-activation event.
        void this.resumeFromUserGesture();
    };
    scheduleSuspendAfterApplicationHandlers(force) {
        queueMicrotask(() => {
            if (force || document.visibilityState !== "visible") {
                void this.suspend();
            }
        });
    }
}
//# sourceMappingURL=BrowserAudioLifecycle.js.map