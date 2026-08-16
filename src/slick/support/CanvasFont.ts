import { Color } from "../Color.js";
import type { Font } from "../Font.js";
import { Image } from "../Image.js";
import { WebGLTextureResource } from "../rendering/WebGLTextureResource.js";

type CanvasSource = HTMLCanvasElement | OffscreenCanvas;
type CanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type CachedTextImage = {
    image: Image;
    width: number;
};

const MAX_TEXT_CACHE_ENTRIES = 128;

function createCanvas(width: number, height: number): CanvasSource | null {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }
    const doc = typeof document === "undefined" ? null : (document as Partial<Document>);
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
    private measureCanvas: CanvasSource | null = null;
    private measureContext: CanvasContext | null = null;
    private readonly textImages = new Map<string, CachedTextImage>();

    /** Java Slick2D counterpart: Font.getWidth(String). */
    public getWidth(text: string): number {
        const context = this.getMeasureContext();
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
        const start = Math.max(0, startIndex);
        const end = Math.min(text.length, endIndex + 1);
        const visibleText = start === 0 && end === text.length ? text : text.substring(start, end);
        if (visibleText.length === 0) {
            return;
        }
        const fillStyle = cssColor(col);
        const cached = this.getTextImage(visibleText, fillStyle);
        if (!cached) {
            return;
        }
        cached.image.draw(x, y, cached.width, this.lineHeight + 2);
    }

    private getMeasureContext(): CanvasContext | null {
        if (this.measureContext) {
            return this.measureContext;
        }
        this.measureCanvas = createCanvas(1, 1);
        this.measureContext = getContext(this.measureCanvas);
        return this.measureContext;
    }

    private getTextImage(text: string, fillStyle: string): CachedTextImage | null {
        const key = `${this.fontCss}\n${fillStyle}\n${text}`;
        const cached = this.textImages.get(key);
        if (cached) {
            this.textImages.delete(key);
            this.textImages.set(key, cached);
            return cached;
        }
        const width = Math.max(1, this.getWidth(text) + 2);
        const height = this.lineHeight + 2;
        const canvas = createCanvas(width, height);
        const context = getContext(canvas);
        if (!canvas || !context) {
            return null;
        }
        context.clearRect(0, 0, width, height);
        context.font = this.fontCss;
        context.textBaseline = "top";
        context.fillStyle = fillStyle;
        context.fillText(text, 0, 0);
        const entry = {
            image: new Image(new WebGLTextureResource(canvas, Image.FILTER_LINEAR, null)),
            width
        };
        this.textImages.set(key, entry);
        this.evictTextImages();
        return entry;
    }

    private evictTextImages(): void {
        while (this.textImages.size > MAX_TEXT_CACHE_ENTRIES) {
            const oldestKey = this.textImages.keys().next().value;
            if (typeof oldestKey !== "string") {
                return;
            }
            this.textImages.get(oldestKey)?.image.destroy();
            this.textImages.delete(oldestKey);
        }
    }
}
