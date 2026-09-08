type DesiredAudioContextState = "running" | "suspended";

type ContextTransitionState = {
    tail: Promise<void> | null;
};

/**
 * Browser Web Audio lifecycle helper.
 *
 * Starts the first transition synchronously so a user-gesture resume reaches the
 * browser immediately, then serializes later suspend/resume requests behind it.
 */
export class AudioContextLifecycle {
    private static readonly states = new WeakMap<AudioContext, ContextTransitionState>();

    /** Normal playback/lifecycle resume: avoid a redundant native resume while already running. */
    public static resume(context: AudioContext): Promise<boolean> {
        return AudioContextLifecycle.enqueue(context, "running", false);
    }

    /**
     * User-gesture resume: always call the browser's native resume(), even if the
     * context reports running. This preserves an explicit recovery poke for WebKit
     * contexts that can report running while audio output is still silent.
     */
    public static resumeFromUserGesture(context: AudioContext): Promise<boolean> {
        return AudioContextLifecycle.enqueue(context, "running", true);
    }

    public static suspend(context: AudioContext): Promise<boolean> {
        return AudioContextLifecycle.enqueue(context, "suspended", false);
    }

    public static isRunning(context: AudioContext): boolean {
        return String(context.state) === "running";
    }

    public static isSuspended(context: AudioContext): boolean {
        return String(context.state) === "suspended";
    }

    private static enqueue(context: AudioContext, desired: DesiredAudioContextState, forceNativeCall: boolean): Promise<boolean> {
        let state = AudioContextLifecycle.states.get(context);
        if (state === undefined) {
            state = { tail: null };
            AudioContextLifecycle.states.set(context, state);
        }

        const transition =
            state.tail === null
                ? AudioContextLifecycle.apply(context, desired, forceNativeCall)
                : state.tail.then(
                      () => AudioContextLifecycle.apply(context, desired, forceNativeCall),
                      () => AudioContextLifecycle.apply(context, desired, forceNativeCall)
                  );
        const tail = transition.then(
            () => undefined,
            () => undefined
        );
        state.tail = tail;
        void tail.finally(() => {
            if (state.tail === tail) {
                state.tail = null;
            }
        });
        return transition;
    }

    private static async apply(context: AudioContext, desired: DesiredAudioContextState, forceNativeCall: boolean): Promise<boolean> {
        const current = String(context.state);
        if (current === "closed") {
            return false;
        }
        if (current === desired && !forceNativeCall) {
            return true;
        }
        try {
            if (desired === "running") {
                await context.resume();
            } else {
                await context.suspend();
            }
        } catch {
            return false;
        }
        return String(context.state) === desired;
    }
}
