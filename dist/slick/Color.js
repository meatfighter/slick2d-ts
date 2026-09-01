import { Renderer } from "./opengl/renderer/Renderer.js";
function clamp01(value) {
    if (Number.isNaN(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}
function clampFloatChannel(value) {
    return Math.min(value, 1);
}
function usesIntegerComponentOverload(r, g, b, a) {
    if (!Number.isInteger(r) || !Number.isInteger(g) || !Number.isInteger(b) || (a !== undefined && !Number.isInteger(a))) {
        return false;
    }
    return Math.abs(r) > 1 || Math.abs(g) > 1 || Math.abs(b) > 1 || (a !== undefined && Math.abs(a) > 1);
}
function decodeInteger(value) {
    let text = value.trim();
    let sign = 1;
    if (text.startsWith("-")) {
        sign = -1;
        text = text.substring(1);
    }
    else if (text.startsWith("+")) {
        text = text.substring(1);
    }
    let radix = 10;
    if (text.startsWith("0x") || text.startsWith("0X")) {
        radix = 16;
        text = text.substring(2);
    }
    else if (text.startsWith("#")) {
        radix = 16;
        text = text.substring(1);
    }
    else if (text.startsWith("0") && text.length > 1) {
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
    static transparent = new Color(0, 0, 0, 0);
    static white = new Color(1, 1, 1, 1);
    static yellow = new Color(1, 1, 0, 1);
    static red = new Color(1, 0, 0, 1);
    static blue = new Color(0, 0, 1, 1);
    static green = new Color(0, 1, 0, 1);
    static black = new Color(0, 0, 0, 1);
    static gray = new Color(0.5, 0.5, 0.5, 1);
    static cyan = new Color(0, 1, 1, 1);
    static darkGray = new Color(0.3, 0.3, 0.3, 1);
    static lightGray = new Color(0.7, 0.7, 0.7, 1);
    static pink = new Color(255, 175, 175, 255);
    static orange = new Color(255, 200, 0, 255);
    static magenta = new Color(255, 0, 255, 255);
    r;
    g;
    b;
    a;
    /**
     * Java Slick2D counterpart: Color(float, float, float, float) and Color(int).
     *
     * Creates a mutable RGBA color. Packed integers are interpreted as 0xAARRGGBB;
     * an alpha byte of 0 means 255 for compatibility with existing Java ports.
     * Component overloads are selected tuple-wide: integral tuples containing a
     * value outside [-1, 1] use Java's byte-component path; other tuples use the
     * float path. Use fromInts() or fromFloats() when an all-0/1 tuple is ambiguous.
     */
    constructor(rOrPackedOrColor, g, b, a) {
        if (rOrPackedOrColor instanceof Color) {
            this.r = rOrPackedOrColor.r;
            this.g = rOrPackedOrColor.g;
            this.b = rOrPackedOrColor.b;
            this.a = rOrPackedOrColor.a;
        }
        else if (g === undefined || b === undefined) {
            const rOrPacked = rOrPackedOrColor;
            const packed = rOrPacked >>> 0;
            const alphaByte = (packed >>> 24) & 0xff;
            this.a = (alphaByte === 0 ? 255 : alphaByte) / 255;
            this.r = ((packed >>> 16) & 0xff) / 255;
            this.g = ((packed >>> 8) & 0xff) / 255;
            this.b = (packed & 0xff) / 255;
        }
        else if (usesIntegerComponentOverload(rOrPackedOrColor, g, b, a)) {
            this.r = rOrPackedOrColor / 255;
            this.g = g / 255;
            this.b = b / 255;
            this.a = (a ?? 255) / 255;
        }
        else if (a === undefined) {
            this.r = rOrPackedOrColor;
            this.g = g;
            this.b = b;
            this.a = 1;
        }
        else {
            this.r = clampFloatChannel(rOrPackedOrColor);
            this.g = clampFloatChannel(g);
            this.b = clampFloatChannel(b);
            this.a = clampFloatChannel(a);
        }
    }
    /** Java Slick2D counterpart: Color(int, int, int, int). */
    static fromInts(r, g, b, a = 255) {
        return Color.createRaw(Math.trunc(r) / 255, Math.trunc(g) / 255, Math.trunc(b) / 255, Math.trunc(a) / 255);
    }
    /** Java Slick2D counterparts: Color(float, float, float) and Color(float, float, float, float). */
    static fromFloats(r, g, b, a) {
        if (a === undefined) {
            return Color.createRaw(r, g, b, 1);
        }
        return Color.createRaw(clampFloatChannel(r), clampFloatChannel(g), clampFloatChannel(b), clampFloatChannel(a));
    }
    /**
     * Java Slick2D counterpart: Color.decode(String).
     *
     * Decodes decimal, octal, `0x`, `0X`, and `#` integer strings.
     */
    static decode(nm) {
        return new Color(decodeInteger(nm));
    }
    /**
     * Java Slick2D counterpart: Color.bind().
     *
     * Applies this color to the active renderer if one exists.
     */
    bind() {
        Renderer.get().glColor4f(this.r, this.g, this.b, this.a);
    }
    /**
     * Java Slick2D counterpart: Color.add(Color).
     *
     * Adds another color into this color.
     */
    add(c) {
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
    scale(value) {
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
    multiply(c) {
        return Color.fromFloats(this.r * c.r, this.g * c.g, this.b * c.b, this.a * c.a);
    }
    /**
     * Java Slick2D counterpart: Color.brighter().
     *
     * Returns a brighter copy.
     */
    brighter(scale = 0.2) {
        const factor = scale + 1;
        return Color.fromFloats(this.r * factor, this.g * factor, this.b * factor, this.a);
    }
    /**
     * Java Slick2D counterpart: Color.darker().
     *
     * Returns a darker copy.
     */
    darker(scale = 0.5) {
        const factor = 1 - scale;
        return Color.fromFloats(this.r * factor, this.g * factor, this.b * factor, this.a);
    }
    /**
     * Java Slick2D counterpart: Color.toString().
     *
     * Returns a diagnostic string.
     */
    toString() {
        return `Color (${this.r},${this.g},${this.b},${this.a})`;
    }
    /**
     * Java Slick2D counterpart: Color.hashCode().
     *
     * Returns Slick2D's legacy hash based on truncated component sum.
     */
    hashCode() {
        return Math.trunc(this.r + this.g + this.b + this.a) * 255;
    }
    /**
     * Java Slick2D counterpart: Color.equals(Object).
     *
     * Compares RGBA components exactly.
     */
    equals(other) {
        return other instanceof Color && other.r === this.r && other.g === this.g && other.b === this.b && other.a === this.a;
    }
    /**
     * Java Slick2D counterpart: Color.copy().
     *
     * Returns an independent mutable copy.
     */
    copy() {
        return new Color(this);
    }
    /** Java Slick2D counterpart: Color.getRed(). */
    getRed() {
        return Math.trunc(this.r * 255);
    }
    /** Java Slick2D counterpart: Color.getGreen(). */
    getGreen() {
        return Math.trunc(this.g * 255);
    }
    /** Java Slick2D counterpart: Color.getBlue(). */
    getBlue() {
        return Math.trunc(this.b * 255);
    }
    /** Java Slick2D counterpart: Color.getAlpha(). */
    getAlpha() {
        return Math.trunc(this.a * 255);
    }
    /** Java Slick2D counterpart: Color.getRedByte(). */
    getRedByte() {
        return this.getRed();
    }
    /** Java Slick2D counterpart: Color.getGreenByte(). */
    getGreenByte() {
        return this.getGreen();
    }
    /** Java Slick2D counterpart: Color.getBlueByte(). */
    getBlueByte() {
        return this.getBlue();
    }
    /** Java Slick2D counterpart: Color.getAlphaByte(). */
    getAlphaByte() {
        return this.getAlpha();
    }
    /** Java Slick2D counterpart: Color.addToCopy(Color). */
    addToCopy(c) {
        const copy = Color.fromFloats(this.r, this.g, this.b, this.a);
        copy.add(c);
        return copy;
    }
    /** Java Slick2D counterpart: Color.scaleCopy(float). */
    scaleCopy(value) {
        const copy = Color.fromFloats(this.r, this.g, this.b, this.a);
        copy.scale(value);
        return copy;
    }
    /**
     * Java Slick2D counterpart: packed color conversion support.
     *
     * Returns 0xAARRGGBB using rounded 8-bit channels.
     */
    toInt() {
        const a = Math.round(clamp01(this.a) * 255) & 0xff;
        const r = Math.round(clamp01(this.r) * 255) & 0xff;
        const g = Math.round(clamp01(this.g) * 255) & 0xff;
        const b = Math.round(clamp01(this.b) * 255) & 0xff;
        return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
    }
    static createRaw(r, g, b, a) {
        const color = Object.create(Color.prototype);
        color.r = r;
        color.g = g;
        color.b = b;
        color.a = a;
        return color;
    }
}
//# sourceMappingURL=Color.js.map