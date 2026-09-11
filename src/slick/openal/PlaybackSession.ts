import { PwaAudioManager } from "./PwaAudioManager.js";

export type PlaybackAttempt = Readonly<{
    id: number;
    /** True means the attempt may continue, including deliberately silent playback. */
    ready: Promise<boolean>;
}>;

type AttemptRecord = {
    attempt: PlaybackAttempt;
    generation: number;
    phase: "preparing" | "prepared" | "committing" | "committed" | "cancelled";
    cancelled: Promise<void>;
    cancel: () => void;
    resolveReady: (current: boolean) => void;
    commitPromise: Promise<boolean> | null;
};

type DeadlineResult = "ready" | "unavailable" | "failed" | "timeout" | "cancelled";

/**
 * One PWA's activation transaction. Native context creation happens synchronously
 * in begin(); no old context is resumed. A cancelled owner can never retire the
 * replacement owner's context, unmute its output, or resume its game.
 */
export class PlaybackSession {
    private serial = 0;
    private active: AttemptRecord | null = null;

    public constructor(
        private readonly manager = PwaAudioManager.get(),
        private readonly timeoutMs = 3000
    ) {
        if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
            throw new RangeError("Playback startup timeout must be positive and finite.");
        }
        manager.install();
    }

    /** Call directly from the New Game/Continue activation, before any await. */
    public begin(): PlaybackAttempt {
        this.cancel();
        let resolveReady!: (current: boolean) => void;
        let cancel!: () => void;
        const ready = new Promise<boolean>((resolve) => {
            resolveReady = resolve;
        });
        const cancelled = new Promise<void>((resolve) => {
            cancel = resolve;
        });
        const attempt: PlaybackAttempt = Object.freeze({ id: ++this.serial, ready });
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
        let activation: Promise<boolean>;
        try {
            // Do not move this call behind Promise.then or an await: it owns user activation.
            activation = this.manager.beginPlaybackGeneration(true);
        } catch (error) {
            console.warn("Fresh playback context could not be created.", error);
            activation = Promise.resolve(false);
        }
        record.generation = this.manager.getGeneration();
        void this.prepare(record, activation);
        return attempt;
    }

    public isCurrent(attempt: PlaybackAttempt): boolean {
        const record = this.active;
        return record !== null && record.attempt === attempt && record.phase !== "cancelled" && record.generation === this.manager.getGeneration();
    }

    /** Logical restoration must be complete before commit is called. Concurrent commits share one result. */
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
        // Publish the shared completion before invoking a manager hook.
        void this.completeCommit(record).then(resolveCommit, (error: unknown) => {
            console.warn("Playback commit could not finish safely.", error);
            this.cancelRecord(record);
            resolveCommit(false);
        });
        return record.commitPromise;
    }

    /** Synchronous ownership detachment; neither context.close nor native resume is awaited. */
    public cancel(): void {
        const record = this.active;
        if (record !== null) {
            this.cancelRecord(record);
        }
    }

    public setInterruptionHandler(handler: ((reason: string) => void) | null): void {
        this.manager.setInterruptionHandler(
            handler === null
                ? null
                : (reason, generation) => {
                      const record = this.active;
                      if (record !== null && record.generation === generation && (record.phase === "committing" || record.phase === "committed")) {
                          handler(reason);
                      }
                  }
        );
    }

    private async completeCommit(record: AttemptRecord): Promise<boolean> {
        let result = await this.withDeadline(record, () => this.manager.commitPlaybackGeneration(record.generation));
        if (!this.isCurrent(record.attempt) || result === "cancelled") {
            return false;
        }
        // A fulfilled false is the manager's normal silent-session result. A
        // rejection/timeout is different: retire once, then bound the fallback too.
        if (result === "failed" || result === "timeout") {
            if (!this.retireForSilentPlayback(record)) {
                return false;
            }
            result = await this.withDeadline(record, () => this.manager.commitPlaybackGeneration(record.generation));
            if (!this.isCurrent(record.attempt) || result === "cancelled") {
                return false;
            }
        }
        if (result !== "ready" && result !== "unavailable") {
            this.cancelRecord(record);
            return false;
        }
        record.phase = "committed";
        return true;
    }

    private async prepare(record: AttemptRecord, activation: Promise<boolean>): Promise<void> {
        try {
            const result = await this.withDeadline(record, () => activation);
            if (!this.isCurrent(record.attempt) || result === "cancelled") {
                record.resolveReady(false);
                return;
            }
            if (result !== "ready" && !this.retireForSilentPlayback(record)) {
                return;
            }
            record.phase = "prepared";
            record.resolveReady(true);
        } catch (error) {
            console.warn("Playback preparation could not finish safely.", error);
            this.cancelRecord(record);
        }
    }

    private retireForSilentPlayback(record: AttemptRecord): boolean {
        if (!this.isCurrent(record.attempt)) {
            record.resolveReady(false);
            return false;
        }
        try {
            this.manager.endPlaybackGeneration(record.generation);
        } catch (error) {
            console.warn("Unable to retire playback safely; cancelling this attempt.", error);
            this.cancelRecord(record);
            return false;
        }
        if (this.active !== record || record.phase === "cancelled") {
            record.resolveReady(false);
            return false;
        }
        record.generation = this.manager.getGeneration();
        return true;
    }

    private cancelRecord(record: AttemptRecord): void {
        if (this.active === record) {
            this.active = null;
        }
        record.phase = "cancelled";
        record.cancel();
        record.resolveReady(false);
        try {
            // Conditional retirement is safe even when a newer attempt is active.
            this.manager.endPlaybackGeneration(record.generation);
        } catch (error) {
            // The shell must still reach MENU; native teardown is the manager's responsibility.
            console.warn("Playback retirement reported an error.", error);
        }
    }

    private async withDeadline(record: AttemptRecord, invoke: () => Promise<boolean>): Promise<DeadlineResult> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            let operation: Promise<boolean>;
            try {
                operation = Promise.resolve(invoke());
            } catch (error) {
                operation = Promise.reject(error);
            }
            return await Promise.race([
                operation.then<DeadlineResult, DeadlineResult>(
                    (ready) => (ready ? "ready" : "unavailable"),
                    (error) => {
                        if (this.active === record) {
                            console.warn("Playback operation failed; the current session may run silently.", error);
                        }
                        return "failed";
                    }
                ),
                record.cancelled.then<DeadlineResult>(() => "cancelled"),
                new Promise<DeadlineResult>((resolve) => {
                    timer = setTimeout(() => resolve("timeout"), this.timeoutMs);
                })
            ]);
        } finally {
            clearTimeout(timer);
        }
    }
}
