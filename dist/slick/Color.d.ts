/**
 * Java Slick2D counterpart: org.newdawn.slick.Color.
 *
 * Mutable RGBA color value with Slick-compatible packed integer construction.
 */
export declare class Color {
    static readonly transparent: Color;
    static readonly white: Color;
    static readonly yellow: Color;
    static readonly red: Color;
    static readonly blue: Color;
    static readonly green: Color;
    static readonly black: Color;
    static readonly gray: Color;
    static readonly cyan: Color;
    static readonly darkGray: Color;
    static readonly lightGray: Color;
    static readonly pink: Color;
    static readonly orange: Color;
    static readonly magenta: Color;
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r: number, g: number, b: number);
    constructor(r: number, g: number, b: number, a: number);
    constructor(packedInteger: number);
    constructor(color: Color);
    /** Java Slick2D counterpart: Color(int, int, int, int). */
    static fromInts(r: number, g: number, b: number, a?: number): Color;
    /** Java Slick2D counterparts: Color(float, float, float) and Color(float, float, float, float). */
    static fromFloats(r: number, g: number, b: number, a?: number): Color;
    /**
     * Java Slick2D counterpart: Color.decode(String).
     *
     * Decodes decimal, octal, `0x`, `0X`, and `#` integer strings.
     */
    static decode(nm: string): Color;
    /**
     * Java Slick2D counterpart: Color.bind().
     *
     * Applies this color to the active renderer if one exists.
     */
    bind(): void;
    /**
     * Java Slick2D counterpart: Color.add(Color).
     *
     * Adds another color into this color.
     */
    add(c: Color): void;
    /**
     * Java Slick2D counterpart: Color.scale(float).
     *
     * Multiplies this color in place by a scalar.
     */
    scale(value: number): void;
    /**
     * Java Slick2D counterpart: Color.multiply(Color).
     *
     * Returns a new component-wise multiplied color.
     */
    multiply(c: Color): Color;
    /**
     * Java Slick2D counterpart: Color.brighter().
     *
     * Returns a brighter copy.
     */
    brighter(scale?: number): Color;
    /**
     * Java Slick2D counterpart: Color.darker().
     *
     * Returns a darker copy.
     */
    darker(scale?: number): Color;
    /**
     * Java Slick2D counterpart: Color.toString().
     *
     * Returns a diagnostic string.
     */
    toString(): string;
    /**
     * Java Slick2D counterpart: Color.hashCode().
     *
     * Returns Slick2D's legacy hash based on truncated component sum.
     */
    hashCode(): number;
    /**
     * Java Slick2D counterpart: Color.equals(Object).
     *
     * Compares RGBA components exactly.
     */
    equals(other: unknown): boolean;
    /**
     * Java Slick2D counterpart: Color.copy().
     *
     * Returns an independent mutable copy.
     */
    copy(): Color;
    /** Java Slick2D counterpart: Color.getRed(). */
    getRed(): number;
    /** Java Slick2D counterpart: Color.getGreen(). */
    getGreen(): number;
    /** Java Slick2D counterpart: Color.getBlue(). */
    getBlue(): number;
    /** Java Slick2D counterpart: Color.getAlpha(). */
    getAlpha(): number;
    /** Java Slick2D counterpart: Color.getRedByte(). */
    getRedByte(): number;
    /** Java Slick2D counterpart: Color.getGreenByte(). */
    getGreenByte(): number;
    /** Java Slick2D counterpart: Color.getBlueByte(). */
    getBlueByte(): number;
    /** Java Slick2D counterpart: Color.getAlphaByte(). */
    getAlphaByte(): number;
    /** Java Slick2D counterpart: Color.addToCopy(Color). */
    addToCopy(c: Color): Color;
    /** Java Slick2D counterpart: Color.scaleCopy(float). */
    scaleCopy(value: number): Color;
    /**
     * Java Slick2D counterpart: packed color conversion support.
     *
     * Returns 0xAARRGGBB using rounded 8-bit channels.
     */
    toInt(): number;
    private static createRaw;
}
//# sourceMappingURL=Color.d.ts.map