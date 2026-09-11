import { PwaAudioManager } from "./PwaAudioManager.js";

export type PlaybackAttempt = Readonly<{
    id: number;
    /** True means preparation completed for this attempt, not that audio is audible. */
    ready: Promise<boolean>;
}>;

/** Narrow ownership contract keeps transaction tests independent of audio hardware. */
export interface PlaybackSessionManager {
    install(): void;
    getGeneration(): number;
    beginPlaybackGeneration(deferPlayback?: boolean): Promise<boolean>;
    commitPlaybackGeneration(generation: number): Promise<boolean>;
    endPlaybackGeneration(expectedGeneration?: number): void;
    setInterruptionHandler(handler: ((reason: string, generation: number) => void) | null): void;
}

type AttemptRecord = {
    attempt: PlaybackAttempt;
    generation: number;
    phase: "preparing" | "prepared" | "committing" | "committed" | "cancelled";
    cancelled: Promise<void>;
    cancel: () => void;
    resolveReady: (current: boolean) => void;
    commitPromise: Promise<boolean> | null;
};

type DeadlineResult = "ready" | "unavailable" | "failed" | "timed-out" | "cancelled";

/**
 * One PWA's activation transaction. Native context creation happens synchronously
 * in begin(); no old context is resumed. Cancellation cannot retire a replacement.
 */
export class PlaybackSession {
    private serial = 0;
    private active: AttemptRecord | null = null;
    private beginning = false;
    private cleanupFailed = false;

    public constructor(
        private readonly manager: PlaybackSessionManager = PwaAudioManager.get(),
        private readonly timeoutMs = 3000
    ) {
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
            throw new RangeError("Playback startup timeout must be positive and finite.");
        }
        manager.install();
    }

    /** Call directly from the New Game/Continue activation, before any await. */
    public begin(): PlaybackAttempt {
        const id = ++this.serial;
        if (this.beginning || this.cleanupFailed) {
            return Object.freeze({ id, ready: Promise.resolve(false) });
        }
        this.cancel();
        // Teardown hooks may synchronously start a replacement. Never overwrite it.
        if (id !== this.serial || this.cleanupFailed) {
            return Object.freeze({ id, ready: Promise.resolve(false) });
        }
        let resolveReady!: (current: boolean) => void;
        let cancel!: () => void;
        const ready = new Promise<boolean>((resolve) => {
            resolveReady = resolve;
        });
        const cancelled = new Promise<void>((resolve) => {
            cancel = resolve;
        });
        const attempt: PlaybackAttempt = Object.freeze({ id, ready });
        const record: AttemptRecord = {
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
        let activation: Promise<boolean>;
        try {
            activation = Promise.resolve(this.manager.beginPlaybackGeneration(true));
        } catch (error) {
            activation = Promise.reject(error);
        } finally {
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

    public isCurrent(attempt: PlaybackAttempt): boolean {
        const record = this.active;
        return (
            !this.cleanupFailed &&
            record !== null &&
            record.attempt === attempt &&
            record.phase !== "cancelled" &&
            record.generation === this.manager.getGeneration()
        );
    }

    /** Logical restoration must be complete before commit is called. */
    public commit(attempt: PlaybackAttempt): Promise<boolean> {
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
        let resolveCommit!: (accepted: boolean) => void;
        record.commitPromise = new Promise<boolean>((resolve) => {
            resolveCommit = resolve;
        });
        // Publish completion before invoking a manager hook that might reenter commit.
        void this.completeCommit(record).then(resolveCommit, (error: unknown) => {
            this.fail(record, error);
            resolveCommit(false);
        });
        return record.commitPromise;
    }

    /** Detach ownership synchronously; native close and resume are never awaited. */
    public cancel(): void {
        const record = this.active;
        this.active = null;
        if (record === null) {
            return;
        }
        record.phase = "cancelled";
        record.cancel();
        record.resolveReady(false);
        if (!this.cleanupFailed) {
            this.retire(record);
        }
    }

    public setInterruptionHandler(handler: ((reason: string) => void) | null): void {
        this.manager.setInterruptionHandler(
            handler === null
                ? null
                : (reason, generation) => {
                      const record = this.active;
                      if (
                          record !== null &&
                          this.isCurrent(record.attempt) &&
                          record.generation === generation &&
                          (record.phase === "committing" || record.phase === "committed")
                      ) {
                          handler(reason);
                      }
                  }
        );
    }

    private async completeCommit(record: AttemptRecord): Promise<boolean> {
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
                this.cancel();
                return false;
            }
        }
        record.phase = "committed";
        return true;
    }

    private async prepare(record: AttemptRecord, activation: Promise<boolean>): Promise<void> {
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

    private retireForFallback(record: AttemptRecord): boolean {
        if (!this.isCurrent(record.attempt) || !this.retire(record)) {
            if (this.active === record) {
                this.cancel();
            }
            return false;
        }
        if (this.active !== record) {
            return false;
        }
        record.generation = this.manager.getGeneration();
        return true;
    }

    private retire(record: AttemptRecord): boolean {
        try {
            this.manager.endPlaybackGeneration(record.generation);
            return true;
        } catch (error) {
            // Do not claim a safe menu/new start when physical retirement failed.
            this.cleanupFailed = true;
            console.error("Playback retirement failed; reload is required before another start.", error);
            return false;
        }
    }

    private fail(record: AttemptRecord, error: unknown): void {
        record.resolveReady(false);
        if (this.active === record) {
            console.error("Playback transaction failed.", error);
            this.cancel();
        }
    }

    private async withDeadline(record: AttemptRecord, operation: () => Promise<boolean>): Promise<DeadlineResult> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            let pending: Promise<boolean>;
            try {
                // Invoke now, not in a later microtask: begin must retain activation.
                pending = Promise.resolve(operation());
            } catch (error) {
                pending = Promise.reject(error);
            }
            return await Promise.race([
                pending.then<DeadlineResult, DeadlineResult>(
                    (ready) => (ready ? "ready" : "unavailable"),
                    (error) => {
                        if (this.active === record) {
                            console.warn("Playback operation failed.", error);
                        }
                        return "failed";
                    }
                ),
                record.cancelled.then<DeadlineResult>(() => "cancelled"),
                new Promise<DeadlineResult>((resolve) => {
                    timer = setTimeout(() => resolve("timed-out"), this.timeoutMs);
                })
            ]);
        } finally {
            clearTimeout(timer);
        }
    }
}
