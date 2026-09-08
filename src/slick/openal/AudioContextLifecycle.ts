type DesiredAudioContextState = "running" | "suspended";

type ContextTransitionState = {
    desired: DesiredAudioContextState;
    transition: Promise<boolean> | null;
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
        return AudioContextLifecycle.setDesired(context, "running");
    }

    public static suspend(context: AudioContext): Promise<boolean> {
        return AudioContextLifecycle.setDesired(context, "suspended");
    }

    public static isRunning(context: AudioContext): boolean {
        return String(context.state) === "running";
    }

    public static isSuspended(context: AudioContext): boolean {
        return String(context.state) === "suspended";
    }

    private static setDesired(context: AudioContext, desired: DesiredAudioContextState): Promise<boolean> {
        let state = AudioContextLifecycle.states.get(context);
        if (state === undefined) {
            state = { desired, transition: null };
            AudioContextLifecycle.states.set(context, state);
        } else {
            state.desired = desired;
        }
        return AudioContextLifecycle.reconcile(context, state);
    }

    private static reconcile(context: AudioContext, state: ContextTransitionState): Promise<boolean> {
        if (state.transition !== null) {
            return state.transition;
        }
        const transition = AudioContextLifecycle.runTransitions(context, state);
        state.transition = transition;
        void transition.finally(() => {
            if (state.transition === transition) {
                state.transition = null;
            }
        });
        return transition;
    }

    private static async runTransitions(context: AudioContext, state: ContextTransitionState): Promise<boolean> {
        for (;;) {
            const desired = state.desired;
            const current = String(context.state);
            if (current === "closed") {
                return false;
            }
            if (AudioContextLifecycle.matches(current, desired)) {
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
            if (desired !== state.desired) {
                continue;
            }
            return AudioContextLifecycle.matches(String(context.state), desired);
        }
    }

    private static matches(current: string, desired: DesiredAudioContextState): boolean {
        return current === desired;
    }
}
