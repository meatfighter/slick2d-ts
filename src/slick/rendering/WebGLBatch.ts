/**
 * Tracks renderer batch boundaries.
 *
 * The renderer owns the reusable vertex buffers; this class records whether
 * queued work has crossed a Slick flush boundary.
 */
export class WebGLBatch {
    private pending = false;

    /** Marks that drawing work has been submitted since the last flush. */
    public markDirty(): void {
        this.pending = true;
    }

    /** Flushes queued work for parity boundaries. */
    public flush(): void {
        this.pending = false;
    }

    /** Returns whether the batch has pending work. */
    public isDirty(): boolean {
        return this.pending;
    }
}
