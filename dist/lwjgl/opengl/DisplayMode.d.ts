/**
 * Java LWJGL counterpart: org.lwjgl.opengl.DisplayMode.
 *
 * Immutable display mode value used by copied Slick2D display-selection code.
 */
export declare class DisplayMode {
    private readonly width;
    private readonly height;
    private readonly bitsPerPixel;
    private readonly frequency;
    constructor(width: number, height: number);
    constructor(width: number, height: number, bitsPerPixel: number);
    /** Java LWJGL counterpart: DisplayMode.getWidth(). */
    getWidth(): number;
    /** Java LWJGL counterpart: DisplayMode.getHeight(). */
    getHeight(): number;
    /** Java LWJGL counterpart: DisplayMode.getBitsPerPixel(). */
    getBitsPerPixel(): number;
    /** Java LWJGL counterpart: DisplayMode.getFrequency(). */
    getFrequency(): number;
    /** Java counterpart: Object.toString(). */
    toString(): string;
}
//# sourceMappingURL=DisplayMode.d.ts.map