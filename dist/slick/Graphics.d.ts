import { Color } from "./Color.js";
import type { Font } from "./Font.js";
import { Image } from "./Image.js";
import type { WebGLRenderTarget } from "./rendering/WebGLRenderTarget.js";
export type ClipRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
/**
 * Java Slick2D counterpart: org.newdawn.slick.Graphics.
 *
 * Drawing context facade that delegates to the active WebGL renderer.
 */
export declare class Graphics {
    private static readonly DEFAULT_SEGMENTS;
    static readonly MODE_NORMAL = 1;
    static readonly MODE_ALPHA_MAP = 2;
    static readonly MODE_ALPHA_BLEND = 3;
    static readonly MODE_COLOR_MULTIPLY = 4;
    static readonly MODE_ADD = 5;
    static readonly MODE_SCREEN = 6;
    private static current;
    private static readonly currentStack;
    private color;
    private background;
    private font;
    private defaultFont;
    private lineWidth;
    private antiAlias;
    private drawMode;
    private width;
    private height;
    private screenClipRecord;
    private worldClipRecord;
    private readonly pixelScratch;
    private readonly renderTarget;
    constructor();
    constructor(width: number, height: number);
    constructor(renderTarget: WebGLRenderTarget);
    /** Java Slick2D counterpart: Graphics.setCurrent(Graphics). */
    static setCurrent(current: Graphics | null): void;
    /** Browser parity helper: returns the current graphics context. */
    static getCurrent(): Graphics | null;
    /** Java Slick2D counterpart: Graphics.setDrawMode(int). */
    setDrawMode(mode: number): void;
    /** Java Slick2D counterpart: Graphics.clearAlphaMap(). */
    clearAlphaMap(): void;
    /** Java Slick2D counterpart: Graphics.flush(). */
    flush(): void;
    /** Browser extension: toggles RGB inversion for subsequent renderer draw calls. */
    setColorInverted(inverted: boolean): void;
    /** Browser extension: reports the active renderer RGB inversion state. */
    isColorInverted(): boolean;
    /**
     * Browser extension: maps rendered luminance between two replacement colors.
     *
     * Source black maps to blackReplacement and source white maps to
     * whiteReplacement. Alpha is preserved.
     */
    setMonochromePalette(blackReplacement: Color, whiteReplacement: Color): void;
    /** Browser extension: restores the renderer programs active before the monochrome palette. */
    clearMonochromePalette(): void;
    /** Browser extension: reports whether the optional monochrome palette renderer is active. */
    isMonochromePaletteEnabled(): boolean;
    /** Java Slick2D counterpart: Graphics.getFont(). */
    getFont(): Font;
    /** Java Slick2D counterpart: Graphics.setFont(Font). */
    setFont(font: Font): void;
    /** Java Slick2D counterpart: Graphics.resetFont(). */
    resetFont(): void;
    /** Java Slick2D counterpart: Graphics.setBackground(Color). */
    setBackground(color: Color): void;
    /** Java Slick2D counterpart: Graphics.getBackground(). */
    getBackground(): Color;
    /** Internal renderer helper: avoids copying the background during the frame loop. */
    __getBackgroundReference(): Color;
    /** Java Slick2D counterpart: Graphics.clear(). */
    clear(): void;
    /** Java Slick2D counterpart: Graphics.resetTransform(). */
    resetTransform(): void;
    /** Java Slick2D counterpart: Graphics.scale(float, float). */
    scale(x: number, y: number): void;
    /** Java Slick2D counterpart: Graphics.rotate(float, float, float). */
    rotate(x: number, y: number, angle: number): void;
    /** Java Slick2D counterpart: Graphics.translate(float, float). */
    translate(x: number, y: number): void;
    /** Java Slick2D counterpart: Graphics.setColor(Color). */
    setColor(color: Color): void;
    /** Java Slick2D counterpart: Graphics.getColor(). */
    getColor(): Color;
    /** Java Slick2D counterpart: Graphics.drawLine(float, float, float, float). */
    drawLine(x1: number, y1: number, x2: number, y2: number): void;
    /** Java Slick2D counterpart: Graphics.drawRect(float, float, float, float). */
    drawRect(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.fillRect(float, float, float, float). */
    fillRect(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.fillRect(float, float, float, float, Image, float, float). */
    fillRect(x: number, y: number, width: number, height: number, pattern: Image, offX: number, offY: number): void;
    /** Java Slick2D counterpart: Graphics.clearClip(). */
    clearClip(): void;
    /** Java Slick2D counterpart: Graphics.setClip(int, int, int, int). */
    setClip(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.getClip(). */
    getClip(): ClipRect | null;
    /** Java Slick2D counterpart: Graphics.clearWorldClip(). */
    clearWorldClip(): void;
    /** Java Slick2D counterpart: Graphics.setWorldClip(float, float, float, float). */
    setWorldClip(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.setWorldClip(Rectangle). */
    setWorldClip(clip: ClipRect | null): void;
    /** Java Slick2D counterpart: Graphics.getWorldClip(). */
    getWorldClip(): ClipRect | null;
    /** Java Slick2D counterpart: Graphics.drawOval(float, float, float, float). */
    drawOval(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.drawOval(float, float, float, float, int). */
    drawOval(x: number, y: number, width: number, height: number, segments: number): void;
    /** Java Slick2D counterpart: Graphics.drawArc(float, float, float, float, float, float). */
    drawArc(x: number, y: number, width: number, height: number, start: number, end: number): void;
    /** Java Slick2D counterpart: Graphics.drawArc(float, float, float, float, int, float, float). */
    drawArc(x: number, y: number, width: number, height: number, segments: number, start: number, end: number): void;
    /** Java Slick2D counterpart: Graphics.fillOval(float, float, float, float). */
    fillOval(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.fillOval(float, float, float, float, int). */
    fillOval(x: number, y: number, width: number, height: number, segments: number): void;
    /** Java Slick2D counterpart: Graphics.fillArc(float, float, float, float, float, float). */
    fillArc(x: number, y: number, width: number, height: number, start: number, end: number): void;
    /** Java Slick2D counterpart: Graphics.fillArc(float, float, float, float, int, float, float). */
    fillArc(x: number, y: number, width: number, height: number, segments: number, start: number, end: number): void;
    /** Java Slick2D counterpart: Graphics.drawRoundRect(float, float, float, float, int). */
    drawRoundRect(x: number, y: number, width: number, height: number, radius: number): void;
    /** Java Slick2D counterpart: Graphics.drawRoundRect(float, float, float, float, int, int). */
    drawRoundRect(x: number, y: number, width: number, height: number, radius: number, segments: number): void;
    /** Java Slick2D counterpart: Graphics.fillRoundRect(float, float, float, float, int). */
    fillRoundRect(x: number, y: number, width: number, height: number, radius: number): void;
    /** Java Slick2D counterpart: Graphics.fillRoundRect(float, float, float, float, int, int). */
    fillRoundRect(x: number, y: number, width: number, height: number, radius: number, segments: number): void;
    /** Java Slick2D counterpart: Graphics.setLineWidth(float). */
    setLineWidth(width: number): void;
    /** Java Slick2D counterpart: Graphics.getLineWidth(). */
    getLineWidth(): number;
    /** Java Slick2D counterpart: Graphics.resetLineWidth(). */
    resetLineWidth(): void;
    /** Java Slick2D counterpart: Graphics.setAntiAlias(boolean). */
    setAntiAlias(antiAlias: boolean): void;
    /** Java Slick2D counterpart: Graphics.isAntiAlias(). */
    isAntiAlias(): boolean;
    /** Java Slick2D counterpart: Graphics.drawString(String, float, float). */
    drawString(text: string, x: number, y: number): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float). */
    drawImage(image: Image, x: number, y: number): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, Color). */
    drawImage(image: Image, x: number, y: number, color: Color): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float, float, float). */
    drawImage(image: Image, x: number, y: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float, float, float, Color). */
    drawImage(image: Image, x: number, y: number, srcx: number, srcy: number, srcx2: number, srcy2: number, color: Color): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float, float, float, float, float). */
    drawImage(image: Image, x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float, float, float, float, float, Color). */
    drawImage(image: Image, x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number, color: Color): void;
    /** Java Slick2D counterpart: Graphics.copyArea(Image, int, int). */
    copyArea(target: Image, x: number, y: number): void;
    /** Java Slick2D counterpart: Graphics.getPixel(int, int). */
    getPixel(x: number, y: number): Color;
    /** Java Slick2D counterpart: Graphics.getArea(int, int, int, int). */
    getArea(x: number, y: number, width: number, height: number): Image;
    /** Java Slick2D counterpart: Graphics.getArea(int, int, int, int, ByteBuffer). */
    getArea(x: number, y: number, width: number, height: number, target: Uint8Array): void;
    /** Java Slick2D counterpart: Graphics.drawGradientLine(...). */
    drawGradientLine(x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, x2: number, y2: number, r2: number, g2: number, b2: number, a2: number): void;
    /** Java Slick2D counterpart: Graphics.drawGradientLine(float, float, Color, float, float, Color). */
    drawGradientLine(x1: number, y1: number, color1: Color, x2: number, y2: number, color2: Color): void;
    /** Java Slick2D counterpart: Graphics.pushTransform(). */
    pushTransform(): void;
    /** Java Slick2D counterpart: Graphics.popTransform(). */
    popTransform(): void;
    /** Java Slick2D counterpart: Graphics.destroy(). */
    destroy(): void;
    /** Browser parity helper: updates logical dimensions. */
    setDimensions(width: number, height: number): void;
    /** Browser parity helper: returns current draw mode. */
    getDrawMode(): number;
    private static arcPoints;
    private static normalizeCornerRadius;
    private fillPatternRect;
    private applyWorldClip;
    private withRenderTarget;
    private beginRenderTarget;
    private endRenderTarget;
}
//# sourceMappingURL=Graphics.d.ts.map