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
    private static readonly instance = new BrowserAudioLifecycle();
    private installed = false;

    public static get(): BrowserAudioLifecycle {
        return BrowserAudioLifecycle.instance;
    }

    public install(): void {
        if (this.installed || typeof document === "undefined" || typeof window === "undefined") {
            return;
        }
        this.installed = true;
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
        window.addEventListener("pagehide", this.handlePageHide);
        window.addEventListener("pageshow", this.handlePageShow);
    }

    public async resume(): Promise<boolean> {
        this.install();
        const context = SoundStore.get().getAudioContext();
        return context === null ? false : AudioContextLifecycle.resume(context);
    }

    public async suspend(): Promise<boolean> {
        const context = SoundStore.get().getAudioContext();
        return context === null ? true : AudioContextLifecycle.suspend(context);
    }

    private readonly handleVisibilityChange = (): void => {
        if (document.visibilityState === "visible") {
            void this.resume();
            return;
        }
        this.scheduleSuspendAfterApplicationHandlers();
    };

    private readonly handlePageHide = (): void => {
        this.scheduleSuspendAfterApplicationHandlers();
    };

    private readonly handlePageShow = (): void => {
        if (document.visibilityState === "visible") {
            void this.resume();
        }
    };

    private scheduleSuspendAfterApplicationHandlers(): void {
        queueMicrotask(() => {
            if (document.visibilityState !== "visible") {
                void this.suspend();
            }
        });
    }
}
