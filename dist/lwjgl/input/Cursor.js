/**
 * Java LWJGL counterpart: org.lwjgl.input.Cursor.
 *
 * Browser cursor value object holding pixel data and hotspot metadata.
 */
export class Cursor {
    width;
    height;
    xHotspot;
    yHotspot;
    numImages;
    images;
    delays;
    /**
     * Java LWJGL counterpart: Cursor(int, int, int, int, int, IntBuffer, IntBuffer).
     *
     * Stores cursor data for Mouse.setNativeCursor.
     */
    constructor(width, height, xHotspot, yHotspot, numImages, images, delays) {
        this.width = width;
        this.height = height;
        this.xHotspot = xHotspot;
        this.yHotspot = yHotspot;
        this.numImages = numImages;
        this.images = images;
        this.delays = delays;
    }
}
//# sourceMappingURL=Cursor.js.map