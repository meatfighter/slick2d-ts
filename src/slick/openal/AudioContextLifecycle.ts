type DesiredAudioContextState = "running" | "suspended";

type ContextTransitionState = {
    tail: Promise<void> | null;
    desired: DesiredAudioContextState | null;
    generation: number;
};

const AUDIO_CONTEXT_TRANSITION_TIMEOUT_MS = 2000;

/**
 * Browser Web Audio lifecycle helper.
 *
 * Same-direction transitions are serialized, but every logical wait is bounded
 * so a browser Promise that never settles cannot poison later recovery. A real
 * user-gesture resume and an opposite desired-state transition both supersede an
 * older pending transition. Late stale native transitions are reconciled back to
 * the newest desired state when they eventually settle.
 */
export class AudioContextLifecycle {
    private static readonly states = new WeakMap<AudioContext, ContextTransitionState>();

    /** Normal playback/lifecycle resume: avoid a redundant native resume while already running. */
    public static resume(context: AudioContext): Promise<boolean> {
        return AudioContextLifecycle.enqueue(context, "running", false, false);
    }

    /**
     * User-gesture resume: always call the browser's native resume() immediately,
     * even if another transition is still pending or the context reports running.
     * This preserves a fresh WebKit recovery attempt inside the activation event.
     */
    public static resumeFromUserGesture(context: AudioContext): Promise<boolean> {
        return AudioContextLifecycle.enqueue(context, "running", true, true);
    }

    public static suspend(context: AudioContext): Promise<boolean> {
        return AudioContextLifecycle.enqueue(context, "suspended", false, false);
    }

    public static isRunning(context: AudioContext): boolean {
        return String(context.state) === "running";
    }

    public static isSuspended(context: AudioContext): boolean {
        return String(context.state) === "suspended";
    }

    private static getState(context: AudioContext): ContextTransitionState {
        let state = AudioContextLifecycle.states.get(context);
        if (state === undefined) {
            state = { tail: null, desired: null, generation: 0 };
            AudioContextLifecycle.states.set(context, state);
        }
        return state;
    }

    private static enqueue(context: AudioContext, desired: DesiredAudioContextState, forceNativeCall: boolean, bypassPending: boolean): Promise<boolean> {
        const state = AudioContextLifecycle.getState(context);
        const desiredChanged = state.desired !== desired;
        if (desiredChanged || bypassPending) {
            state.desired = desired;
            state.generation++;
        }
        const generation = state.generation;

        const start = (): Promise<boolean> => {
            if (generation !== state.generation || state.desired !== desired) {
                return Promise.resolve(String(context.state) === desired);
            }
            return AudioContextLifecycle.apply(context, state, desired, forceNativeCall, generation);
        };

        // A browser lifecycle reversal must not wait behind a native Promise for
        // the state we no longer want. Generations make the older settlement stale
        // and reconcile it if it eventually completes out of order.
        const supersedePending = desiredChanged || bypassPending;
        const transition = supersedePending || state.tail === null ? start() : state.tail.then(start, start);
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

    private static async apply(
        context: AudioContext,
        state: ContextTransitionState,
        desired: DesiredAudioContextState,
        forceNativeCall: boolean,
        generation: number
    ): Promise<boolean> {
        const current = String(context.state);
        if (current === "closed") {
            return false;
        }
        if (current === desired && !forceNativeCall) {
            return true;
        }

        let nativeTransition: Promise<void>;
        try {
            nativeTransition = Promise.resolve(desired === "running" ? context.resume() : context.suspend());
        } catch {
            return false;
        }

        void nativeTransition.then(
            () => AudioContextLifecycle.reconcileAfterStaleSettlement(context, state, generation),
            () => AudioContextLifecycle.reconcileAfterStaleSettlement(context, state, generation)
        );

        await AudioContextLifecycle.waitForNativeTransition(nativeTransition);
        return String(context.state) === desired;
    }

    private static waitForNativeTransition(nativeTransition: Promise<void>): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            let finished = false;
            const finish = (result: boolean): void => {
                if (finished) {
                    return;
                }
                finished = true;
                clearTimeout(timer);
                resolve(result);
            };
            const timer = setTimeout(() => finish(false), AUDIO_CONTEXT_TRANSITION_TIMEOUT_MS);
            void nativeTransition.then(
                () => finish(true),
                () => finish(false)
            );
        });
    }

    private static reconcileAfterStaleSettlement(context: AudioContext, state: ContextTransitionState, generation: number): void {
        if (generation === state.generation) {
            return;
        }
        const reconcile = (): void => {
            const desired = state.desired;
            if (desired === null || String(context.state) === "closed" || String(context.state) === desired) {
                return;
            }
            void AudioContextLifecycle.enqueue(context, desired, false, false);
        };
        const tail = state.tail;
        if (tail === null) {
            queueMicrotask(reconcile);
            return;
        }
        void tail.finally(() => queueMicrotask(reconcile));
    }
}
