import { Renderer } from "./opengl/renderer/Renderer.js";

function clamp01(value: number): number {
    if (Number.isNaN(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}

function normalizeChannel(value: number): number {
    return value > 1 ? clamp01(value / 255) : clamp01(value);
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
    public static readonly darkGray = new Color(0.25, 0.25, 0.25, 1);
    public static readonly lightGray = new Color(0.75, 0.75, 0.75, 1);
    public static readonly pink = new Color(1, 0.68, 0.68, 1);
    public static readonly orange = new Color(1, 0.78, 0, 1);
    public static readonly magenta = new Color(1, 0, 1, 1);

    public r: number;
    public g: number;
    public b: number;
    public a: number;

    public constructor(r: number, g: number, b: number);
    public constructor(r: number, g: number, b: number, a: number);
    public constructor(packedInteger: number);
    /**
     * Java Slick2D counterpart: Color(float, float, float, float) and Color(int).
     *
     * Creates a mutable RGBA color. Packed integers are interpreted as 0xAARRGGBB;
     * an alpha byte of 0 means 255 for compatibility with the audited code.
     */
    public constructor(rOrPacked: number, g?: number, b?: number, a?: number) {
        if (g === undefined || b === undefined) {
            const packed = rOrPacked >>> 0;
            const alphaByte = (packed >>> 24) & 0xFF;
            this.a = (alphaByte === 0 ? 255 : alphaByte) / 255;
            this.r = ((packed >>> 16) & 0xFF) / 255;
            this.g = ((packed >>> 8) & 0xFF) / 255;
            this.b = (packed & 0xFF) / 255;
        } else {
            this.r = normalizeChannel(rOrPacked);
            this.g = normalizeChannel(g);
            this.b = normalizeChannel(b);
            this.a = normalizeChannel(a ?? 1);
        }
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
     * Adds another color into this color, clamped to 0..1.
     */
    public add(c: Color): void {
        this.r = clamp01(this.r + c.r);
        this.g = clamp01(this.g + c.g);
        this.b = clamp01(this.b + c.b);
        this.a = clamp01(this.a + c.a);
    }

    /**
     * Java Slick2D counterpart: Color.scale(float).
     *
     * Multiplies this color in place by a scalar, clamped to 0..1.
     */
    public scale(value: number): void {
        this.r = clamp01(this.r * value);
        this.g = clamp01(this.g * value);
        this.b = clamp01(this.b * value);
        this.a = clamp01(this.a * value);
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
    public brighter(): Color {
        return new Color(
            clamp01(this.r / 0.7),
            clamp01(this.g / 0.7),
            clamp01(this.b / 0.7),
            this.a
        );
    }

    /**
     * Java Slick2D counterpart: Color.darker().
     *
     * Returns a darker copy.
     */
    public darker(): Color {
        return new Color(this.r * 0.7, this.g * 0.7, this.b * 0.7, this.a);
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
     * Returns a packed 32-bit RGBA-ish value for map keys.
     */
    public hashCode(): number {
        return (this.toInt() | 0);
    }

    /**
     * Java Slick2D counterpart: Color.equals(Object).
     *
     * Compares RGBA components exactly.
     */
    public equals(other: unknown): boolean {
        return other instanceof Color
            && other.r === this.r
            && other.g === this.g
            && other.b === this.b
            && other.a === this.a;
    }

    /**
     * Java Slick2D counterpart: Color.copy().
     *
     * Returns an independent mutable copy.
     */
    public copy(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    }

    /**
     * Java Slick2D counterpart: packed color conversion support.
     *
     * Returns 0xAARRGGBB using rounded 8-bit channels.
     */
    public toInt(): number {
        const a = Math.round(clamp01(this.a) * 255) & 0xFF;
        const r = Math.round(clamp01(this.r) * 255) & 0xFF;
        const g = Math.round(clamp01(this.g) * 255) & 0xFF;
        const b = Math.round(clamp01(this.b) * 255) & 0xFF;
        return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
    }
}
