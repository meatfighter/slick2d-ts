import { Image } from "../Image.js";
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
export declare class BitmapText {
    private readonly glyphs;
    private readonly glyphWidth;
    private readonly glyphHeight;
    private readonly xAdvance;
    private readonly nullGlyphSkips;
    private readonly clampNegativeNumbers;
    private readonly cullMinY;
    private readonly cullMaxY;
    /** Java counterpart: bitmap text helper constructor. */
    constructor(glyphs: Array<Image | null>, options: BitmapTextOptions);
    drawString(text: string, x: number, y: number): void;
    drawString(text: string, x: number, y: number, length: number): void;
    /** Java counterpart: drawStringAlpha(String, int, int, float). */
    drawStringAlpha(text: string, x: number, y: number, alpha: number): void;
    /** Java counterpart: drawStringScaled(String, int, int, float). */
    drawStringScaled(text: string, x: number, y: number, scale: number): void;
    /** Java counterpart: drawStringCentered(String, int, int). */
    drawStringCentered(text: string, centerX: number, y: number): void;
    /** Java counterpart: drawNumber(int, int, int, int). */
    drawNumber(value: number, digits: number, x: number, y: number): void;
    /** Java counterpart: text width helper. */
    measureWidth(text: string): number;
    private drawStringInternal;
    private getGlyph;
    private shouldDraw;
}
//# sourceMappingURL=BitmapText.d.ts.map