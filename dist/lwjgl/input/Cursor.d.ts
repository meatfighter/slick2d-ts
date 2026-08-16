/**
 * Java LWJGL counterpart: org.lwjgl.input.Cursor.
 *
 * Browser cursor value object holding pixel data and hotspot metadata.
 */
export declare class Cursor {
    readonly width: number;
    readonly height: number;
    readonly xHotspot: number;
    readonly yHotspot: number;
    readonly numImages: number;
    readonly images: unknown;
    readonly delays: unknown;
    /**
     * Java LWJGL counterpart: Cursor(int, int, int, int, int, IntBuffer, IntBuffer).
     *
     * Stores cursor data for Mouse.setNativeCursor.
     */
    constructor(width: number, height: number, xHotspot: number, yHotspot: number, numImages: number, images: unknown, delays: unknown);
}
//# sourceMappingURL=Cursor.d.ts.map