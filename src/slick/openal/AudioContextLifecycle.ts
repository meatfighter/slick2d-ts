type DesiredAudioContextState = "running" | "suspended";

type ContextTransitionState = {
    tail: Promise<void>;
};

/**
 * Browser Web Audio lifecycle helper.
 *
 * Serializes AudioContext suspend/resume transitions so browser lifecycle events,
 * user-gesture activation, music, and sound-effect playback cannot race each other.
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
            state = { tail: Promise.resolve() };
            AudioContextLifecycle.states.set(context, state);
        }
        const transition = state.tail.then(
            () => AudioContextLifecycle.apply(context, desired),
            () => AudioContextLifecycle.apply(context, desired)
        );
        state.tail = transition.then(
            () => undefined,
            () => undefined
        );
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
