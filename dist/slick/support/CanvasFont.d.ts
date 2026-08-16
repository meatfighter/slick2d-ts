import { Color } from "../Color.js";
import type { Font } from "../Font.js";
/**
 * Browser-backed default Slick font.
 *
 * This is a compatibility font for FPS/debug text; game ports should continue
 * to use their Java-style bitmap glyph helpers for authored game text.
 */
export declare class CanvasFont implements Font {
    private readonly fontCss;
    private readonly lineHeight;
    private measureCanvas;
    private measureContext;
    private readonly textImages;
    /** Java Slick2D counterpart: Font.getWidth(String). */
    getWidth(text: string): number;
    /** Java Slick2D counterpart: Font.getHeight(String). */
    getHeight(_text: string): number;
    /** Java Slick2D counterpart: Font.getLineHeight(). */
    getLineHeight(): number;
    /** Java Slick2D counterpart: Font.drawString(float, float, String). */
    drawString(x: number, y: number, text: string): void;
    /** Java Slick2D counterpart: Font.drawString(float, float, String, Color). */
    drawString(x: number, y: number, text: string, col: Color): void;
    /** Java Slick2D counterpart: Font.drawString(float, float, String, Color, int, int). */
    drawString(x: number, y: number, text: string, col: Color, startIndex: number, endIndex: number): void;
    private getMeasureContext;
    private getTextImage;
    private evictTextImages;
}
//# sourceMappingURL=CanvasFont.d.ts.map