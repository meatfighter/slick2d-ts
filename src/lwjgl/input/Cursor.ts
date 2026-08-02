/**
 * Java LWJGL counterpart: org.lwjgl.input.Cursor.
 *
 * Browser cursor value object holding pixel data and hotspot metadata.
 */
export class Cursor {
    public readonly width: number;
    public readonly height: number;
    public readonly xHotspot: number;
    public readonly yHotspot: number;
    public readonly numImages: number;
    public readonly images: unknown;
    public readonly delays: unknown;

    /**
     * Java LWJGL counterpart: Cursor(int, int, int, int, int, IntBuffer, IntBuffer).
     *
     * Stores cursor data for Mouse.setNativeCursor.
     */
    public constructor(width: number, height: number, xHotspot: number, yHotspot: number, numImages: number, images: unknown, delays: unknown) {
        this.width = width;
        this.height = height;
        this.xHotspot = xHotspot;
        this.yHotspot = yHotspot;
        this.numImages = numImages;
        this.images = images;
        this.delays = delays;
    }
}
