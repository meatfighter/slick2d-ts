import { Color } from "../Color.js";
import type { Font } from "../Font.js";
import { Image } from "../Image.js";
import { WebGLTextureResource } from "../rendering/WebGLTextureResource.js";

type CanvasSource = HTMLCanvasElement | OffscreenCanvas;
type CanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function createCanvas(width: number, height: number): CanvasSource | null {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }
    const doc = typeof document === "undefined" ? null : document as Partial<Document>;
    if (typeof doc?.createElement === "function") {
        const canvas = doc.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
    return null;
}

function getContext(canvas: CanvasSource | null): CanvasContext | null {
    return canvas?.getContext("2d") ?? null;
}

function cssColor(color: Color): string {
    const red = Math.round(color.r * 255);
    const green = Math.round(color.g * 255);
    const blue = Math.round(color.b * 255);
    return `rgba(${red}, ${green}, ${blue}, ${color.a})`;
}

/**
 * Browser-backed default Slick font.
 *
 * This is a compatibility font for FPS/debug text; game ports should continue
 * to use their Java-style bitmap glyph helpers for authored game text.
 */
export class CanvasFont implements Font {
    private readonly fontCss = "16px monospace";
    private readonly lineHeight = 16;

    /** Java Slick2D counterpart: Font.getWidth(String). */
    public getWidth(text: string): number {
        const context = getContext(createCanvas(1, 1));
        if (!context) {
            return text.length * 8;
        }
        context.font = this.fontCss;
        return Math.ceil(context.measureText(text).width);
    }

    /** Java Slick2D counterpart: Font.getHeight(String). */
    public getHeight(_text: string): number {
        return this.lineHeight;
    }

    /** Java Slick2D counterpart: Font.getLineHeight(). */
    public getLineHeight(): number {
        return this.lineHeight;
    }

    /** Java Slick2D counterpart: Font.drawString(float, float, String). */
    public drawString(x: number, y: number, text: string): void;
    /** Java Slick2D counterpart: Font.drawString(float, float, String, Color). */
    public drawString(x: number, y: number, text: string, col: Color): void;
    /** Java Slick2D counterpart: Font.drawString(float, float, String, Color, int, int). */
    public drawString(x: number, y: number, text: string, col: Color, startIndex: number, endIndex: number): void;
    public drawString(x: number, y: number, text: string, col: Color = Color.white, startIndex: number = 0, endIndex: number = text.length - 1): void {
        const visibleText = text.substring(Math.max(0, startIndex), Math.min(text.length, endIndex + 1));
        if (visibleText.length === 0) {
            return;
        }
        const width = Math.max(1, this.getWidth(visibleText) + 2);
        const height = this.lineHeight + 2;
        const canvas = createCanvas(width, height);
        const context = getContext(canvas);
        if (!canvas || !context) {
            return;
        }
        context.clearRect(0, 0, width, height);
        context.font = this.fontCss;
        context.textBaseline = "top";
        context.fillStyle = cssColor(col);
        context.fillText(visibleText, 0, 0);
        const image = new Image(new WebGLTextureResource(canvas, Image.FILTER_LINEAR, null));
        image.draw(x, y);
    }
}
