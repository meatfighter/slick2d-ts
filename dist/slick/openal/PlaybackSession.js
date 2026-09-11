import { PwaAudioManager } from "./PwaAudioManager.js";
/**
 * One PWA's activation transaction. Native context creation happens synchronously
 * in begin(); no old context is resumed. Cancellation cannot retire a replacement.
 */
export class PlaybackSession {
    manager;
    timeoutMs;
    serial = 0;
    active = null;
    beginning = false;
    cleanupError = null;
    constructor(manager = PwaAudioManager.get(), timeoutMs = 3000) {
        this.manager = manager;
        this.timeoutMs = timeoutMs;
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
            throw new RangeError("Playback startup timeout must be positive and finite.");
        }
        manager.install();
    }
    /** Call directly from the New Game/Continue activation, before any await. */
    begin() {
        const id = ++this.serial;
        if (this.beginning || this.cleanupError !== null) {
            return Object.freeze({ id, ready: Promise.resolve(false) });
        }
        try {
            this.cancelActive();
        }
        catch {
            // A failed retirement is terminal, not permission to create new output.
            return Object.freeze({ id, ready: Promise.resolve(false) });
        }
        // Teardown hooks may synchronously start a replacement. Never overwrite it.
        if (id !== this.serial || this.cleanupError !== null) {
            return Object.freeze({ id, ready: Promise.resolve(false) });
        }
        let resolveReady;
        let cancel;
        const ready = new Promise((resolve) => {
            resolveReady = resolve;
        });
        const cancelled = new Promise((resolve) => {
            cancel = resolve;
        });
        const attempt = Object.freeze({ id, ready });
        const record = {
            attempt,
            generation: this.manager.getGeneration(),
            phase: "preparing",
            cancelled,
            cancel,
            resolveReady,
            commitPromise: null
        };
        this.active = record;
        this.beginning = true;
        let activation;
        try {
            activation = Promise.resolve(this.manager.beginPlaybackGeneration(true));
        }
        catch (error) {
            activation = Promise.reject(error);
        }
        finally {
            this.beginning = false;
        }
        record.generation = this.manager.getGeneration();
        // A synchronous departure during native construction cancelled the attempt
        // before its new generation was known. Retire that generation now, once.
        if (this.active !== record) {
            this.retire(record);
        }
        void this.prepare(record, activation).catch((error) => this.fail(record, error));
        return attempt;
    }
    isCurrent(attempt) {
        const record = this.active;
        return (this.cleanupError === null &&
            record !== null &&
            record.attempt === attempt &&
            record.phase !== "cancelled" &&
            record.generation === this.manager.getGeneration());
    }
    /** Failed cleanup remains observable even after the active attempt is detached. */
    assertRetirementSafe() {
        if (this.cleanupError !== null) {
            throw this.cleanupError;
        }
    }
    /** Logical restoration must be complete before commit is called. */
    commit(attempt) {
        const record = this.active;
        if (record === null || record.attempt !== attempt || !this.isCurrent(attempt)) {
            return Promise.resolve(false);
        }
        if (record.commitPromise !== null) {
            return record.commitPromise;
        }
        if (record.phase !== "prepared") {
            return Promise.resolve(false);
        }
        record.phase = "committing";
        let resolveCommit;
        record.commitPromise = new Promise((resolve) => {
            resolveCommit = resolve;
        });
        // Publish completion before invoking a manager hook that might reenter commit.
        void this.completeCommit(record).then(resolveCommit, (error) => {
            this.fail(record, error);
            resolveCommit(false);
        });
        return record.commitPromise;
    }
    /**
     * Detach ownership synchronously; native close and resume are never awaited.
     * Throws on unsafe retirement, including repeated cancellation after failure.
     * The writer-lock owner must not interpret a detached attempt as safe cleanup.
     */
    cancel() {
        // An explicit departure must invalidate even a begin that is currently
        // retiring its predecessor and has not published a new active record yet.
        this.serial++;
        this.cancelActive();
    }
    cancelActive() {
        const record = this.active;
        this.active = null;
        if (record !== null) {
            record.phase = "cancelled";
            record.cancel();
            record.resolveReady(false);
            if (this.cleanupError === null) {
                this.retire(record);
            }
        }
        this.assertRetirementSafe();
    }
    setInterruptionHandler(handler) {
        this.manager.setInterruptionHandler(handler === null
            ? null
            : (reason, generation) => {
                const record = this.active;
                if (record !== null &&
                    this.isCurrent(record.attempt) &&
                    record.generation === generation &&
                    (record.phase === "committing" || record.phase === "committed")) {
                    handler(reason);
                }
            });
    }
    async completeCommit(record) {
        const result = await this.withDeadline(record, () => this.manager.commitPlaybackGeneration(record.generation));
        if (!this.isCurrent(record.attempt) || result === "cancelled") {
            return false;
        }
        if (result === "failed" || result === "timed-out") {
            // A fulfilled false already represents an accepted silent clock.
            // Only failures need one fallback, with a fresh token but no new context.
            if (!this.retireForFallback(record)) {
                return false;
            }
            const fallback = await this.withDeadline(record, () => this.manager.commitPlaybackGeneration(record.generation));
            if (!this.isCurrent(record.attempt) || fallback === "cancelled") {
                return false;
            }
            // Resolved false is the manager's successful silent-clock contract.
            // Rejection/timeout is not successful silent initialization.
            if (fallback !== "ready" && fallback !== "unavailable") {
                this.cancelAfterFailure();
                return false;
            }
        }
        record.phase = "committed";
        return true;
    }
    async prepare(record, activation) {
        const result = await this.withDeadline(record, () => activation);
        if (!this.isCurrent(record.attempt) || result === "cancelled") {
            record.resolveReady(false);
            return;
        }
        if (result !== "ready" && !this.retireForFallback(record)) {
            record.resolveReady(false);
            return;
        }
        record.phase = "prepared";
        record.resolveReady(true);
    }
    retireForFallback(record) {
        if (!this.isCurrent(record.attempt) || !this.retire(record)) {
            if (this.active === record) {
                this.cancelAfterFailure();
            }
            return false;
        }
        if (this.active !== record) {
            return false;
        }
        record.generation = this.manager.getGeneration();
        return true;
    }
    retire(record) {
        try {
            this.manager.endPlaybackGeneration(record.generation);
            return true;
        }
        catch (error) {
            // Latch the original failure: later no-op cleanup cannot clear it.
            this.cleanupError ??= new Error("Playback retirement failed; reload is required before another start.", { cause: error });
            console.error(this.cleanupError.message, error);
            return false;
        }
    }
    cancelAfterFailure() {
        try {
            this.cancel();
        }
        catch {
            // Async preparation/commit still settles false. Synchronous exit and
            // assertRetirementSafe expose the latched failure to the shell owner.
        }
    }
    fail(record, error) {
        record.resolveReady(false);
        if (this.active === record) {
            console.error("Playback transaction failed.", error);
            this.cancelAfterFailure();
        }
    }
    async withDeadline(record, operation) {
        let timer;
        try {
            let pending;
            try {
                // Invoke now, not in a later microtask: begin must retain activation.
                pending = Promise.resolve(operation());
            }
            catch (error) {
                pending = Promise.reject(error);
            }
            return await Promise.race([
                pending.then((ready) => (ready ? "ready" : "unavailable"), (error) => {
                    if (this.active === record) {
                        console.warn("Playback operation failed.", error);
                    }
                    return "failed";
                }),
                record.cancelled.then(() => "cancelled"),
                new Promise((resolve) => {
                    timer = setTimeout(() => resolve("timed-out"), this.timeoutMs);
                })
            ]);
        }
        finally {
            clearTimeout(timer);
        }
    }
}
//# sourceMappingURL=PlaybackSession.js.map