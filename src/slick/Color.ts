import { Renderer } from "./opengl/renderer/Renderer.js";

function clamp01(value: number): number {
    if (Number.isNaN(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}

function normalizeChannel(value: number): number {
    return value > 1 ? value / 255 : Math.min(value, 1);
}

function decodeInteger(value: string): number {
    let text = value.trim();
    let sign = 1;
    if (text.startsWith("-")) {
        sign = -1;
        text = text.substring(1);
    } else if (text.startsWith("+")) {
        text = text.substring(1);
    }

    let radix = 10;
    if (text.startsWith("0x") || text.startsWith("0X")) {
        radix = 16;
        text = text.substring(2);
    } else if (text.startsWith("#")) {
        radix = 16;
        text = text.substring(1);
    } else if (text.startsWith("0") && text.length > 1) {
        radix = 8;
        text = text.substring(1);
    }

    const parsed = Number.parseInt(text, radix);
    if (Number.isNaN(parsed)) {
        throw new Error(`For input string: "${value}"`);
    }
    return sign * parsed;
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.Color.
 *
 * Mutable RGBA color value with Slick-compatible packed integer construction.
 */
export class Color {
    public static readonly transparent = new Color(0, 0, 0, 0);
    public static readonly white = new Color(1, 1, 1, 1);
    public static readonly yellow = new Color(1, 1, 0, 1);
    public static readonly red = new Color(1, 0, 0, 1);
    public static readonly blue = new Color(0, 0, 1, 1);
    public static readonly green = new Color(0, 1, 0, 1);
    public static readonly black = new Color(0, 0, 0, 1);
    public static readonly gray = new Color(0.5, 0.5, 0.5, 1);
    public static readonly cyan = new Color(0, 1, 1, 1);
    public static readonly darkGray = new Color(0.3, 0.3, 0.3, 1);
    public static readonly lightGray = new Color(0.7, 0.7, 0.7, 1);
    public static readonly pink = new Color(255, 175, 175, 255);
    public static readonly orange = new Color(255, 200, 0, 255);
    public static readonly magenta = new Color(1, 0, 1, 1);

    public r: number;
    public g: number;
    public b: number;
    public a: number;

    public constructor(r: number, g: number, b: number);
    public constructor(r: number, g: number, b: number, a: number);
    public constructor(packedInteger: number);
    public constructor(color: Color);
    /**
     * Java Slick2D counterpart: Color(float, float, float, float) and Color(int).
     *
     * Creates a mutable RGBA color. Packed integers are interpreted as 0xAARRGGBB;
     * an alpha byte of 0 means 255 for compatibility with the audited code.
     */
    public constructor(rOrPackedOrColor: number | Color, g?: number, b?: number, a?: number) {
        if (rOrPackedOrColor instanceof Color) {
            this.r = rOrPackedOrColor.r;
            this.g = rOrPackedOrColor.g;
            this.b = rOrPackedOrColor.b;
            this.a = rOrPackedOrColor.a;
        } else if (g === undefined || b === undefined) {
            const rOrPacked = rOrPackedOrColor;
            const packed = rOrPacked >>> 0;
            const alphaByte = (packed >>> 24) & 0xff;
            this.a = (alphaByte === 0 ? 255 : alphaByte) / 255;
            this.r = ((packed >>> 16) & 0xff) / 255;
            this.g = ((packed >>> 8) & 0xff) / 255;
            this.b = (packed & 0xff) / 255;
        } else {
            this.r = normalizeChannel(rOrPackedOrColor);
            this.g = normalizeChannel(g);
            this.b = normalizeChannel(b);
            this.a = normalizeChannel(a ?? 1);
        }
    }

    /** Java Slick2D counterpart: Color(int, int, int, int). */
    public static fromInts(r: number, g: number, b: number, a: number = 255): Color {
        return Color.createRaw(Math.trunc(r) / 255, Math.trunc(g) / 255, Math.trunc(b) / 255, Math.trunc(a) / 255);
    }

    /** Java Slick2D counterpart: Color(float, float, float, float). */
    public static fromFloats(r: number, g: number, b: number, a: number = 1): Color {
        return Color.createRaw(r, g, b, a);
    }

    /**
     * Java Slick2D counterpart: Color.decode(String).
     *
     * Decodes decimal, octal, `0x`, `0X`, and `#` integer strings.
     */
    public static decode(nm: string): Color {
        return new Color(decodeInteger(nm));
    }

    /**
     * Java Slick2D counterpart: Color.bind().
     *
     * Applies this color to the active renderer if one exists.
     */
    public bind(): void {
        Renderer.get().glColor4f(this.r, this.g, this.b, this.a);
    }

    /**
     * Java Slick2D counterpart: Color.add(Color).
     *
     * Adds another color into this color.
     */
    public add(c: Color): void {
        this.r += c.r;
        this.g += c.g;
        this.b += c.b;
        this.a += c.a;
    }

    /**
     * Java Slick2D counterpart: Color.scale(float).
     *
     * Multiplies this color in place by a scalar.
     */
    public scale(value: number): void {
        this.r *= value;
        this.g *= value;
        this.b *= value;
        this.a *= value;
    }

    /**
     * Java Slick2D counterpart: Color.multiply(Color).
     *
     * Returns a new component-wise multiplied color.
     */
    public multiply(c: Color): Color {
        return new Color(this.r * c.r, this.g * c.g, this.b * c.b, this.a * c.a);
    }

    /**
     * Java Slick2D counterpart: Color.brighter().
     *
     * Returns a brighter copy.
     */
    public brighter(scale = 0.2): Color {
        const factor = scale + 1;
        return new Color(this.r * factor, this.g * factor, this.b * factor, this.a);
    }

    /**
     * Java Slick2D counterpart: Color.darker().
     *
     * Returns a darker copy.
     */
    public darker(scale = 0.5): Color {
        const factor = 1 - scale;
        return new Color(this.r * factor, this.g * factor, this.b * factor, this.a);
    }

    /**
     * Java Slick2D counterpart: Color.toString().
     *
     * Returns a diagnostic string.
     */
    public toString(): string {
        return `Color (${this.r},${this.g},${this.b},${this.a})`;
    }

    /**
     * Java Slick2D counterpart: Color.hashCode().
     *
     * Returns Slick2D's legacy hash based on truncated component sum.
     */
    public hashCode(): number {
        return Math.trunc(this.r + this.g + this.b + this.a) * 255;
    }

    /**
     * Java Slick2D counterpart: Color.equals(Object).
     *
     * Compares RGBA components exactly.
     */
    public equals(other: unknown): boolean {
        return other instanceof Color && other.r === this.r && other.g === this.g && other.b === this.b && other.a === this.a;
    }

    /**
     * Java Slick2D counterpart: Color.copy().
     *
     * Returns an independent mutable copy.
     */
    public copy(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    }

    /** Java Slick2D counterpart: Color.getRed(). */
    public getRed(): number {
        return Math.trunc(this.r * 255);
    }

    /** Java Slick2D counterpart: Color.getGreen(). */
    public getGreen(): number {
        return Math.trunc(this.g * 255);
    }

    /** Java Slick2D counterpart: Color.getBlue(). */
    public getBlue(): number {
        return Math.trunc(this.b * 255);
    }

    /** Java Slick2D counterpart: Color.getAlpha(). */
    public getAlpha(): number {
        return Math.trunc(this.a * 255);
    }

    /** Java Slick2D counterpart: Color.getRedByte(). */
    public getRedByte(): number {
        return this.getRed();
    }

    /** Java Slick2D counterpart: Color.getGreenByte(). */
    public getGreenByte(): number {
        return this.getGreen();
    }

    /** Java Slick2D counterpart: Color.getBlueByte(). */
    public getBlueByte(): number {
        return this.getBlue();
    }

    /** Java Slick2D counterpart: Color.getAlphaByte(). */
    public getAlphaByte(): number {
        return this.getAlpha();
    }

    /** Java Slick2D counterpart: Color.addToCopy(Color). */
    public addToCopy(c: Color): Color {
        const copy = new Color(this.r, this.g, this.b, this.a);
        copy.add(c);
        return copy;
    }

    /** Java Slick2D counterpart: Color.scaleCopy(float). */
    public scaleCopy(value: number): Color {
        const copy = new Color(this.r, this.g, this.b, this.a);
        copy.scale(value);
        return copy;
    }

    /**
     * Java Slick2D counterpart: packed color conversion support.
     *
     * Returns 0xAARRGGBB using rounded 8-bit channels.
     */
    public toInt(): number {
        const a = Math.round(clamp01(this.a) * 255) & 0xff;
        const r = Math.round(clamp01(this.r) * 255) & 0xff;
        const g = Math.round(clamp01(this.g) * 255) & 0xff;
        const b = Math.round(clamp01(this.b) * 255) & 0xff;
        return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
    }

    private static createRaw(r: number, g: number, b: number, a: number): Color {
        const color = Object.create(Color.prototype) as Color;
        color.r = r;
        color.g = g;
        color.b = b;
        color.a = a;
        return color;
    }
}
