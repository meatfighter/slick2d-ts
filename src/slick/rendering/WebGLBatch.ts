/**
 * Internal WebGL batch placeholder.
 *
 * The phase-one renderer submits immediate quads, but this class preserves the
 * documented file boundary and central flush hook.
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
