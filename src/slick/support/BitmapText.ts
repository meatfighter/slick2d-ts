import { Graphics } from "../Graphics.js";
import { Image } from "../Image.js";
import { SlickException } from "../SlickException.js";

/**
 * Java counterpart: bitmap text helper options.
 */
export interface BitmapTextOptions {
    glyphWidth: number;
    glyphHeight: number;
    xAdvance: number;
    nullGlyphSkips?: boolean;
    clampNegativeNumbers?: boolean;
    cullMinY?: number;
    cullMaxY?: number;
}

/**
 * Java counterpart: source bitmap string/number drawing helpers.
 *
 * Draws text from an Image array indexed by character code.
 */
export class BitmapText {
    private readonly glyphWidth: number;
    private readonly glyphHeight: number;
    private readonly xAdvance: number;
    private readonly nullGlyphSkips: boolean;
    private readonly clampNegativeNumbers: boolean;
    private readonly cullMinY: number | null;
    private readonly cullMaxY: number | null;

    /** Java counterpart: bitmap text helper constructor. */
    public constructor(private readonly glyphs: Array<Image | null>, options: BitmapTextOptions) {
        this.glyphWidth = options.glyphWidth;
        this.glyphHeight = options.glyphHeight;
        this.xAdvance = options.xAdvance;
        this.nullGlyphSkips = options.nullGlyphSkips ?? false;
        this.clampNegativeNumbers = options.clampNegativeNumbers ?? false;
        this.cullMinY = options.cullMinY ?? null;
        this.cullMaxY = options.cullMaxY ?? null;
    }

    public drawString(text: string, x: number, y: number): void;
    public drawString(text: string, x: number, y: number, length: number): void;
    /** Java counterpart: drawString(String, int, int[, int]). */
    public drawString(text: string, x: number, y: number, length: number = text.length): void {
        this.drawStringInternal(text.substring(0, length), x, y, 1, 1);
    }

    /** Java counterpart: drawStringAlpha(String, int, int, float). */
    public drawStringAlpha(text: string, x: number, y: number, alpha: number): void {
        for (let i = 0; i < text.length; i++) {
            const glyph = this.getGlyph(text.charCodeAt(i));
            if (!glyph || !this.shouldDraw(y)) {
                continue;
            }
            glyph.setAlpha(alpha);
            try {
                glyph.draw(x + i * this.xAdvance, y);
            } finally {
                glyph.setAlpha(1);
            }
        }
    }

    /** Java counterpart: drawStringScaled(String, int, int, float). */
    public drawStringScaled(text: string, x: number, y: number, scale: number): void {
        const g = Graphics.getCurrent();
        if (!g) {
            this.drawStringInternal(text, x, y, scale, scale);
            return;
        }
        g.pushTransform();
        g.translate(x, y);
        g.scale(scale, scale);
        this.drawStringInternal(text, 0, 0, 1, 1);
        g.popTransform();
    }

    /** Java counterpart: drawStringCentered(String, int, int). */
    public drawStringCentered(text: string, centerX: number, y: number): void {
        this.drawString(text, centerX - this.measureWidth(text) / 2, y);
    }

    /** Java counterpart: drawNumber(int, int, int, int). */
    public drawNumber(value: number, digits: number, x: number, y: number): void {
        let number = this.clampNegativeNumbers ? Math.max(0, value) : value;
        for (let i = digits - 1; i >= 0; i--) {
            const digit = Math.abs(number % 10);
            this.drawString(String(digit), x + i * this.xAdvance, y);
            number = Math.trunc(number / 10);
        }
    }

    /** Java counterpart: text width helper. */
    public measureWidth(text: string): number {
        void this.glyphWidth;
        void this.glyphHeight;
        return text.length * this.xAdvance;
    }

    private drawStringInternal(text: string, x: number, y: number, scaleX: number, scaleY: number): void {
        if (!this.shouldDraw(y)) {
            return;
        }
        for (let i = 0; i < text.length; i++) {
            const glyph = this.getGlyph(text.charCodeAt(i));
            if (!glyph) {
                continue;
            }
            glyph.draw(x + i * this.xAdvance * scaleX, y, glyph.getWidth() * scaleX, glyph.getHeight() * scaleY);
        }
    }

    private getGlyph(code: number): Image | null {
        const glyph = this.glyphs[code] ?? null;
        if (!glyph && !this.nullGlyphSkips) {
            throw new SlickException(`Missing bitmap glyph: ${code}`);
        }
        return glyph;
    }

    private shouldDraw(y: number): boolean {
        if (this.cullMinY !== null && y < this.cullMinY) {
            return false;
        }
        if (this.cullMaxY !== null && y > this.cullMaxY) {
            return false;
        }
        return true;
    }
}
