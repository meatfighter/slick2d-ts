import { AudioContextLifecycle } from "./AudioContextLifecycle.js";
import { SoundStore } from "./SoundStore.js";
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
export class BrowserAudioLifecycle {
    static instance = new BrowserAudioLifecycle();
    installed = false;
    static get() {
        return BrowserAudioLifecycle.instance;
    }
    install() {
        if (this.installed || typeof document === "undefined" || typeof window === "undefined") {
            return;
        }
        this.installed = true;
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
        window.addEventListener("pagehide", this.handlePageHide);
        window.addEventListener("pageshow", this.handlePageShow);
    }
    async resume() {
        this.install();
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            return true;
        }
        const context = store.getAudioContext();
        return context === null ? false : AudioContextLifecycle.resume(context);
    }
    async suspend() {
        const store = SoundStore.get();
        if (!store.soundWorks()) {
            return true;
        }
        const context = store.getAudioContext();
        return context === null ? true : AudioContextLifecycle.suspend(context);
    }
    handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            void this.resume();
            return;
        }
        this.scheduleSuspendAfterApplicationHandlers();
    };
    handlePageHide = () => {
        this.scheduleSuspendAfterApplicationHandlers();
    };
    handlePageShow = () => {
        if (document.visibilityState === "visible") {
            void this.resume();
        }
    };
    scheduleSuspendAfterApplicationHandlers() {
        queueMicrotask(() => {
            if (document.visibilityState !== "visible") {
                void this.suspend();
            }
        });
    }
}
//# sourceMappingURL=BrowserAudioLifecycle.js.map