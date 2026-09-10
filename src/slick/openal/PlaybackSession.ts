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
};

type DeadlineResult = "ready" | "unavailable" | "cancelled";

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
            resolveReady
        };
        this.active = record;
        let activation: Promise<boolean>;
        try {
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

    /** Logical restoration must be complete before commit is called. */
    public async commit(attempt: PlaybackAttempt): Promise<boolean> {
        const record = this.active;
        if (record === null || record.attempt !== attempt || !this.isCurrent(attempt)) {
            return false;
        }
        if (record.phase === "committed") {
            return true;
        }
        if (record.phase !== "prepared") {
            return false;
        }
        record.phase = "committing";
        const result = await this.withDeadline(record, this.manager.commitPlaybackGeneration(record.generation));
        if (!this.isCurrent(attempt) || result === "cancelled") {
            return false;
        }
        if (result === "unavailable") {
            // Stop any partially attached graph. The new current token below owns
            // a deliberate silent session, not a retry of the retired context.
            this.manager.endPlaybackGeneration(record.generation);
            record.generation = this.manager.getGeneration();
            await this.manager.commitPlaybackGeneration(record.generation);
            if (!this.isCurrent(attempt)) {
                return false;
            }
        }
        record.phase = "committed";
        return true;
    }

    /** Synchronous ownership detachment; neither context.close nor native resume is awaited. */
    public cancel(): void {
        const record = this.active;
        this.active = null;
        if (record === null) {
            return;
        }
        record.phase = "cancelled";
        record.cancel();
        record.resolveReady(false);
        this.manager.endPlaybackGeneration(record.generation);
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

    private async prepare(record: AttemptRecord, activation: Promise<boolean>): Promise<void> {
        const result = await this.withDeadline(record, activation);
        if (!this.isCurrent(record.attempt) || result === "cancelled") {
            record.resolveReady(false);
            return;
        }
        if (result === "unavailable") {
            this.manager.endPlaybackGeneration(record.generation);
            record.generation = this.manager.getGeneration();
        }
        record.phase = "prepared";
        record.resolveReady(true);
    }

    private async withDeadline(record: AttemptRecord, operation: Promise<boolean>): Promise<DeadlineResult> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            return await Promise.race([
                operation.then<DeadlineResult, DeadlineResult>(
                    (ready) => (ready ? "ready" : "unavailable"),
                    (error) => {
                        if (this.active === record) {
                            console.warn("Playback operation failed; the current session may run silently.", error);
                        }
                        return "unavailable";
                    }
                ),
                record.cancelled.then<DeadlineResult>(() => "cancelled"),
                new Promise<DeadlineResult>((resolve) => {
                    timer = setTimeout(() => resolve("unavailable"), this.timeoutMs);
                })
            ]);
        } finally {
            clearTimeout(timer);
        }
    }
}
