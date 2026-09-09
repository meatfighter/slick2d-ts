const AUDIO_CONTEXT_TRANSITION_TIMEOUT_MS = 2000;
/**
 * Browser Web Audio lifecycle helper.
 *
 * Ordinary transitions are serialized, but every logical wait is bounded so a
 * browser Promise that never settles cannot poison later recovery. A real
 * user-gesture resume bypasses an older pending transition and reaches the
 * browser synchronously. Late stale native transitions are reconciled back to
 * the newest desired state when they eventually settle.
 */
export class AudioContextLifecycle {
    static states = new WeakMap();
    /** Normal playback/lifecycle resume: avoid a redundant native resume while already running. */
    static resume(context) {
        return AudioContextLifecycle.enqueue(context, "running", false, false);
    }
    /**
     * User-gesture resume: always call the browser's native resume() immediately,
     * even if another transition is still pending or the context reports running.
     * This preserves a fresh WebKit recovery attempt inside the activation event.
     */
    static resumeFromUserGesture(context) {
        return AudioContextLifecycle.enqueue(context, "running", true, true);
    }
    static suspend(context) {
        return AudioContextLifecycle.enqueue(context, "suspended", false, false);
    }
    static isRunning(context) {
        return String(context.state) === "running";
    }
    static isSuspended(context) {
        return String(context.state) === "suspended";
    }
    static getState(context) {
        let state = AudioContextLifecycle.states.get(context);
        if (state === undefined) {
            state = { tail: null, desired: null, generation: 0 };
            AudioContextLifecycle.states.set(context, state);
        }
        return state;
    }
    static enqueue(context, desired, forceNativeCall, bypassPending) {
        const state = AudioContextLifecycle.getState(context);
        if (state.desired !== desired || bypassPending) {
            state.desired = desired;
            state.generation++;
        }
        const generation = state.generation;
        const start = () => {
            if (generation !== state.generation || state.desired !== desired) {
                return Promise.resolve(String(context.state) === desired);
            }
            return AudioContextLifecycle.apply(context, state, desired, forceNativeCall, generation);
        };
        const transition = bypassPending || state.tail === null ? start() : state.tail.then(start, start);
        const tail = transition.then(() => undefined, () => undefined);
        state.tail = tail;
        void tail.finally(() => {
            if (state.tail === tail) {
                state.tail = null;
            }
        });
        return transition;
    }
    static async apply(context, state, desired, forceNativeCall, generation) {
        const current = String(context.state);
        if (current === "closed") {
            return false;
        }
        if (current === desired && !forceNativeCall) {
            return true;
        }
        let nativeTransition;
        try {
            nativeTransition = Promise.resolve(desired === "running" ? context.resume() : context.suspend());
        }
        catch {
            return false;
        }
        void nativeTransition.then(() => AudioContextLifecycle.reconcileAfterStaleSettlement(context, state, generation), () => AudioContextLifecycle.reconcileAfterStaleSettlement(context, state, generation));
        const settled = await AudioContextLifecycle.waitForNativeTransition(nativeTransition);
        if (!settled) {
            return String(context.state) === desired;
        }
        return String(context.state) === desired;
    }
    static waitForNativeTransition(nativeTransition) {
        return new Promise((resolve) => {
            let finished = false;
            const finish = (result) => {
                if (finished) {
                    return;
                }
                finished = true;
                clearTimeout(timer);
                resolve(result);
            };
            const timer = setTimeout(() => finish(false), AUDIO_CONTEXT_TRANSITION_TIMEOUT_MS);
            void nativeTransition.then(() => finish(true), () => finish(false));
        });
    }
    static reconcileAfterStaleSettlement(context, state, generation) {
        if (generation === state.generation) {
            return;
        }
        const reconcile = () => {
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
//# sourceMappingURL=AudioContextLifecycle.js.map