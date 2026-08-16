import { Graphics } from "../Graphics.js";
import { SlickException } from "../SlickException.js";
/**
 * Java counterpart: source bitmap string/number drawing helpers.
 *
 * Draws text from an Image array indexed by character code.
 */
export class BitmapText {
    glyphs;
    glyphWidth;
    glyphHeight;
    xAdvance;
    nullGlyphSkips;
    clampNegativeNumbers;
    cullMinY;
    cullMaxY;
    /** Java counterpart: bitmap text helper constructor. */
    constructor(glyphs, options) {
        this.glyphs = glyphs;
        this.glyphWidth = options.glyphWidth;
        this.glyphHeight = options.glyphHeight;
        this.xAdvance = options.xAdvance;
        this.nullGlyphSkips = options.nullGlyphSkips ?? false;
        this.clampNegativeNumbers = options.clampNegativeNumbers ?? false;
        this.cullMinY = options.cullMinY ?? null;
        this.cullMaxY = options.cullMaxY ?? null;
    }
    /** Java counterpart: drawString(String, int, int[, int]). */
    drawString(text, x, y, length = text.length) {
        const visibleText = length >= text.length ? text : text.substring(0, length);
        this.drawStringInternal(visibleText, x, y, 1, 1);
    }
    /** Java counterpart: drawStringAlpha(String, int, int, float). */
    drawStringAlpha(text, x, y, alpha) {
        for (let i = 0; i < text.length; i++) {
            const glyph = this.getGlyph(text.charCodeAt(i));
            if (!glyph || !this.shouldDraw(y)) {
                continue;
            }
            glyph.setAlpha(alpha);
            try {
                glyph.draw(x + i * this.xAdvance, y);
            }
            finally {
                glyph.setAlpha(1);
            }
        }
    }
    /** Java counterpart: drawStringScaled(String, int, int, float). */
    drawStringScaled(text, x, y, scale) {
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
    drawStringCentered(text, centerX, y) {
        this.drawString(text, centerX - this.measureWidth(text) / 2, y);
    }
    /** Java counterpart: drawNumber(int, int, int, int). */
    drawNumber(value, digits, x, y) {
        let number = this.clampNegativeNumbers ? Math.max(0, value) : value;
        for (let i = digits - 1; i >= 0; i--) {
            const digit = Math.abs(number % 10);
            this.drawString(String(digit), x + i * this.xAdvance, y);
            number = Math.trunc(number / 10);
        }
    }
    /** Java counterpart: text width helper. */
    measureWidth(text) {
        void this.glyphWidth;
        void this.glyphHeight;
        return text.length * this.xAdvance;
    }
    drawStringInternal(text, x, y, scaleX, scaleY) {
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
    getGlyph(code) {
        const glyph = this.glyphs[code] ?? null;
        if (!glyph && !this.nullGlyphSkips) {
            throw new SlickException(`Missing bitmap glyph: ${code}`);
        }
        return glyph;
    }
    shouldDraw(y) {
        if (this.cullMinY !== null && y < this.cullMinY) {
            return false;
        }
        if (this.cullMaxY !== null && y > this.cullMaxY) {
            return false;
        }
        return true;
    }
}
//# sourceMappingURL=BitmapText.js.map