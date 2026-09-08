/**
 * Browser Web Audio lifecycle helper.
 *
 * Starts the first transition synchronously so a user-gesture resume reaches the
 * browser immediately, then serializes later suspend/resume requests behind it.
 */
export class AudioContextLifecycle {
    static states = new WeakMap();
    /** Normal playback/lifecycle resume: avoid a redundant native resume while already running. */
    static resume(context) {
        return AudioContextLifecycle.enqueue(context, "running", false);
    }
    /**
     * User-gesture resume: always call the browser's native resume(), even if the
     * context reports running. This preserves an explicit recovery poke for WebKit
     * contexts that can report running while audio output is still silent.
     */
    static resumeFromUserGesture(context) {
        return AudioContextLifecycle.enqueue(context, "running", true);
    }
    static suspend(context) {
        return AudioContextLifecycle.enqueue(context, "suspended", false);
    }
    static isRunning(context) {
        return String(context.state) === "running";
    }
    static isSuspended(context) {
        return String(context.state) === "suspended";
    }
    static enqueue(context, desired, forceNativeCall) {
        let state = AudioContextLifecycle.states.get(context);
        if (state === undefined) {
            state = { tail: null };
            AudioContextLifecycle.states.set(context, state);
        }
        const transition = state.tail === null
            ? AudioContextLifecycle.apply(context, desired, forceNativeCall)
            : state.tail.then(() => AudioContextLifecycle.apply(context, desired, forceNativeCall), () => AudioContextLifecycle.apply(context, desired, forceNativeCall));
        const tail = transition.then(() => undefined, () => undefined);
        state.tail = tail;
        void tail.finally(() => {
            if (state.tail === tail) {
                state.tail = null;
            }
        });
        return transition;
    }
    static async apply(context, desired, forceNativeCall) {
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
            }
            else {
                await context.suspend();
            }
        }
        catch {
            return false;
        }
        return String(context.state) === desired;
    }
}
//# sourceMappingURL=AudioContextLifecycle.js.map