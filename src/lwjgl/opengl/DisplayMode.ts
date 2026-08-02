/**
 * Java LWJGL counterpart: org.lwjgl.opengl.DisplayMode.
 *
 * Immutable display mode value used by copied Slick2D display-selection code.
 */
export class DisplayMode {
    private readonly width: number;
    private readonly height: number;
    private readonly bitsPerPixel: number;
    private readonly frequency: number;

    public constructor(width: number, height: number);
    public constructor(width: number, height: number, bitsPerPixel: number);
    /**
     * Java LWJGL counterpart: DisplayMode(int, int, int).
     *
     * Browser refresh rate is not portable, so frequency is fixed at 60 Hz.
     */
    public constructor(width: number, height: number, bitsPerPixel: number = 32) {
        this.width = width;
        this.height = height;
        this.bitsPerPixel = bitsPerPixel;
        this.frequency = 60;
    }

    /** Java LWJGL counterpart: DisplayMode.getWidth(). */
    public getWidth(): number {
        return this.width;
    }

    /** Java LWJGL counterpart: DisplayMode.getHeight(). */
    public getHeight(): number {
        return this.height;
    }

    /** Java LWJGL counterpart: DisplayMode.getBitsPerPixel(). */
    public getBitsPerPixel(): number {
        return this.bitsPerPixel;
    }

    /** Java LWJGL counterpart: DisplayMode.getFrequency(). */
    public getFrequency(): number {
        return this.frequency;
    }

    /** Java counterpart: Object.toString(). */
    public toString(): string {
        return `${this.width} x ${this.height} x ${this.bitsPerPixel} @${this.frequency}Hz`;
    }
}
