/**
 * Tracks renderer batch boundaries.
 *
 * The renderer owns the reusable vertex buffers; this class records whether
 * queued work has crossed a Slick flush boundary.
 */
export declare class WebGLBatch {
    private pending;
    /** Marks that drawing work has been submitted since the last flush. */
    markDirty(): void;
    /** Flushes queued work for parity boundaries. */
    flush(): void;
    /** Returns whether the batch has pending work. */
    isDirty(): boolean;
}
//# sourceMappingURL=WebGLBatch.d.ts.map