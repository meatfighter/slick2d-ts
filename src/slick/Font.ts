import type { Color } from "./Color.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.Font.
 *
 * Font contract used by Graphics and BasicGame FPS rendering.
 */
export interface Font {
    /** Java Slick2D counterpart: Font.getWidth(String). */
    getWidth(text: string): number;
    /** Java Slick2D counterpart: Font.getHeight(String). */
    getHeight(text: string): number;
    /** Java Slick2D counterpart: Font.getLineHeight(). */
    getLineHeight(): number;
    /** Java Slick2D counterpart: Font.drawString(float, float, String). */
    drawString(x: number, y: number, text: string): void;
    /** Java Slick2D counterpart: Font.drawString(float, float, String, Color). */
    drawString(x: number, y: number, text: string, col: Color): void;
    /** Java Slick2D counterpart: Font.drawString(float, float, String, Color, int, int). */
    drawString(x: number, y: number, text: string, col: Color, startIndex: number, endIndex: number): void;
}
