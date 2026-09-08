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

    public static resume(context: AudioContext): Promise<boolean> {
        return AudioContextLifecycle.enqueue(context, "running");
    }

    public static suspend(context: AudioContext): Promise<boolean> {
        return AudioContextLifecycle.enqueue(context, "suspended");
    }

    public static isRunning(context: AudioContext): boolean {
        return String(context.state) === "running";
    }

    public static isSuspended(context: AudioContext): boolean {
        return String(context.state) === "suspended";
    }

    private static enqueue(context: AudioContext, desired: DesiredAudioContextState): Promise<boolean> {
        let state = AudioContextLifecycle.states.get(context);
        if (state === undefined) {
            state = { tail: null };
            AudioContextLifecycle.states.set(context, state);
        }

        const transition =
            state.tail === null
                ? AudioContextLifecycle.apply(context, desired)
                : state.tail.then(
                      () => AudioContextLifecycle.apply(context, desired),
                      () => AudioContextLifecycle.apply(context, desired)
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

    private static async apply(context: AudioContext, desired: DesiredAudioContextState): Promise<boolean> {
        const current = String(context.state);
        if (current === "closed") {
            return false;
        }
        if (current === desired) {
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
