/**
 * Java LWJGL counterpart: org.lwjgl.opengl.DisplayMode.
 *
 * Immutable display mode value used by copied Slick2D display-selection code.
 */
export class DisplayMode {
    width;
    height;
    bitsPerPixel;
    frequency;
    /**
     * Java LWJGL counterpart: DisplayMode(int, int, int).
     *
     * Browser refresh rate is not portable, so frequency is fixed at 60 Hz.
     */
    constructor(width, height, bitsPerPixel = 32) {
        this.width = width;
        this.height = height;
        this.bitsPerPixel = bitsPerPixel;
        this.frequency = 60;
    }
    /** Java LWJGL counterpart: DisplayMode.getWidth(). */
    getWidth() {
        return this.width;
    }
    /** Java LWJGL counterpart: DisplayMode.getHeight(). */
    getHeight() {
        return this.height;
    }
    /** Java LWJGL counterpart: DisplayMode.getBitsPerPixel(). */
    getBitsPerPixel() {
        return this.bitsPerPixel;
    }
    /** Java LWJGL counterpart: DisplayMode.getFrequency(). */
    getFrequency() {
        return this.frequency;
    }
    /** Java counterpart: Object.toString(). */
    toString() {
        return `${this.width} x ${this.height} x ${this.bitsPerPixel} @${this.frequency}Hz`;
    }
}
//# sourceMappingURL=DisplayMode.js.map