/**
 * Tracks renderer batch boundaries.
 *
 * The renderer owns the reusable vertex buffers; this class records whether
 * queued work has crossed a Slick flush boundary.
 */
export class WebGLBatch {
    pending = false;
    /** Marks that drawing work has been submitted since the last flush. */
    markDirty() {
        this.pending = true;
    }
    /** Flushes queued work for parity boundaries. */
    flush() {
        this.pending = false;
    }
    /** Returns whether the batch has pending work. */
    isDirty() {
        return this.pending;
    }
}
//# sourceMappingURL=WebGLBatch.js.map