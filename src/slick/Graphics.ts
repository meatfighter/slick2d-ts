import { Color } from "./Color.js";
import type { Font } from "./Font.js";
import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { identityMatrix3, Matrix3 } from "./rendering/RenderBackend.js";
import type { WebGLRenderTarget } from "./rendering/WebGLRenderTarget.js";
import { Renderer } from "./opengl/renderer/Renderer.js";

class DefaultFont implements Font {
    /** Java Slick2D counterpart: Font.getWidth(String). */
    public getWidth(text: string): number {
        return text.length * 8;
    }

    /** Java Slick2D counterpart: Font.getHeight(String). */
    public getHeight(_text: string): number {
        return 16;
    }

    /** Java Slick2D counterpart: Font.getLineHeight(). */
    public getLineHeight(): number {
        return 16;
    }

    /** Java Slick2D counterpart: Font.drawString(...). */
    public drawString(_x: number, _y: number, _text: string, _col?: Color, _startIndex?: number, _endIndex?: number): void {
    }
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.Graphics.
 *
 * Drawing context facade that delegates to the active WebGL renderer.
 */
export class Graphics {
    public static readonly MODE_NORMAL = 1;
    public static readonly MODE_ALPHA_MAP = 2;
    public static readonly MODE_ALPHA_BLEND = 3;
    public static readonly MODE_COLOR_MULTIPLY = 4;
    public static readonly MODE_ADD = 5;
    public static readonly MODE_SCREEN = 6;

    private static current: Graphics | null = null;
    private color = Color.white.copy();
    private background = Color.black.copy();
    private font: Font = new DefaultFont();
    private defaultFont: Font = this.font;
    private lineWidth = 1;
    private antiAlias = false;
    private drawMode = Graphics.MODE_NORMAL;
    private width = 0;
    private height = 0;
    private readonly renderTarget: WebGLRenderTarget | null;

    public constructor();
    public constructor(width: number, height: number);
    public constructor(renderTarget: WebGLRenderTarget);
    /**
     * Java Slick2D counterpart: Graphics constructors.
     *
     * Creates a graphics context for the active display or a render target.
     */
    public constructor(widthOrTarget?: number | WebGLRenderTarget, height: number = 0) {
        if (typeof widthOrTarget === "number") {
            this.width = widthOrTarget;
            this.height = height;
            this.renderTarget = null;
        } else if (widthOrTarget) {
            this.width = widthOrTarget.width;
            this.height = widthOrTarget.height;
            this.renderTarget = widthOrTarget;
        } else {
            this.renderTarget = null;
        }
    }

    /** Java Slick2D counterpart: Graphics.setCurrent(Graphics). */
    public static setCurrent(current: Graphics | null): void {
        Graphics.current = current;
    }

    /** Browser parity helper: returns the current graphics context. */
    public static getCurrent(): Graphics | null {
        return Graphics.current;
    }

    /** Java Slick2D counterpart: Graphics.setDrawMode(int). */
    public setDrawMode(mode: number): void {
        this.drawMode = mode;
    }

    /** Java Slick2D counterpart: Graphics.clearAlphaMap(). */
    public clearAlphaMap(): void {
    }

    /** Java Slick2D counterpart: Graphics.flush(). */
    public flush(): void {
        Renderer.get().flush();
    }

    /** Java Slick2D counterpart: Graphics.getFont(). */
    public getFont(): Font {
        return this.font;
    }

    /** Java Slick2D counterpart: Graphics.setFont(Font). */
    public setFont(font: Font): void {
        this.font = font;
    }

    /** Java Slick2D counterpart: Graphics.resetFont(). */
    public resetFont(): void {
        this.font = this.defaultFont;
    }

    /** Java Slick2D counterpart: Graphics.setBackground(Color). */
    public setBackground(color: Color): void {
        this.background = color.copy();
    }

    /** Java Slick2D counterpart: Graphics.getBackground(). */
    public getBackground(): Color {
        return this.background.copy();
    }

    /** Java Slick2D counterpart: Graphics.clear(). */
    public clear(): void {
        this.withRenderTarget(() => {
            const renderer = Renderer.getBackend();
            renderer.fillRect(0, 0, this.width || 1, this.height || 1, this.background, identityMatrix3());
        });
    }

    /** Java Slick2D counterpart: Graphics.resetTransform(). */
    public resetTransform(): void {
        Renderer.get().glLoadIdentity();
    }

    /** Java Slick2D counterpart: Graphics.scale(float, float). */
    public scale(x: number, y: number): void {
        Renderer.getBackend().scale(x, y);
    }

    /** Java Slick2D counterpart: Graphics.rotate(float, float, float). */
    public rotate(x: number, y: number, angle: number): void {
        Renderer.getBackend().rotate(x, y, angle);
    }

    /** Java Slick2D counterpart: Graphics.translate(float, float). */
    public translate(x: number, y: number): void {
        Renderer.getBackend().translate(x, y);
    }

    /** Java Slick2D counterpart: Graphics.setColor(Color). */
    public setColor(color: Color): void {
        this.color = color.copy();
        this.color.bind();
    }

    /** Java Slick2D counterpart: Graphics.getColor(). */
    public getColor(): Color {
        return this.color.copy();
    }

    /** Java Slick2D counterpart: Graphics.drawLine(float, float, float, float). */
    public drawLine(x1: number, y1: number, x2: number, y2: number): void {
        this.withRenderTarget(() => Renderer.getBackend().drawLine(x1, y1, x2, y2, this.color, this.lineWidth, identityMatrix3()));
    }

    /** Java Slick2D counterpart: Graphics.drawRect(float, float, float, float). */
    public drawRect(x: number, y: number, width: number, height: number): void {
        this.drawLine(x, y, x + width, y);
        this.drawLine(x + width, y, x + width, y + height);
        this.drawLine(x + width, y + height, x, y + height);
        this.drawLine(x, y + height, x, y);
    }

    /** Java Slick2D counterpart: Graphics.fillRect(float, float, float, float). */
    public fillRect(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.fillRect(float, float, float, float, ShapeFill). */
    public fillRect(x: number, y: number, width: number, height: number, fill: unknown): void;
    public fillRect(x: number, y: number, width: number, height: number, fill?: unknown): void {
        if (fill !== undefined) {
            throw new SlickException("Unsupported phase-one Graphics.fillRect ShapeFill overload");
        }
        this.withRenderTarget(() => Renderer.getBackend().fillRect(x, y, width, height, this.color, identityMatrix3()));
    }

    /** Java Slick2D counterpart: Graphics.clearClip(). */
    public clearClip(): void {
        Renderer.getBackend().clearClip();
    }

    /** Java Slick2D counterpart: Graphics.setClip(int, int, int, int). */
    public setClip(x: number, y: number, width: number, height: number): void {
        Renderer.getBackend().setClip(x, y, width, height);
    }

    /** Java Slick2D counterpart: Graphics.clearWorldClip(). */
    public clearWorldClip(): void {
        Renderer.getBackend().clearWorldClip();
    }

    /** Java Slick2D counterpart: Graphics.setWorldClip(float, float, float, float). */
    public setWorldClip(x: number, y: number, width: number, height: number): void {
        Renderer.getBackend().setWorldClip(x, y, width, height, identityMatrix3());
    }

    /** Java Slick2D counterpart: Graphics.drawOval(float, float, float, float). */
    public drawOval(_x: number, _y: number, _width: number, _height: number): void {
        throw new SlickException("Unsupported phase-one Graphics.drawOval");
    }

    /** Java Slick2D counterpart: Graphics.drawArc(float, float, float, float, float, float). */
    public drawArc(_x: number, _y: number, _width: number, _height: number, _start: number, _end: number): void {
        throw new SlickException("Unsupported phase-one Graphics.drawArc");
    }

    /** Java Slick2D counterpart: Graphics.fillOval(float, float, float, float). */
    public fillOval(_x: number, _y: number, _width: number, _height: number): void {
        throw new SlickException("Unsupported phase-one Graphics.fillOval");
    }

    /** Java Slick2D counterpart: Graphics.fillArc(float, float, float, float, float, float). */
    public fillArc(_x: number, _y: number, _width: number, _height: number, _start: number, _end: number): void {
        throw new SlickException("Unsupported phase-one Graphics.fillArc");
    }

    /** Java Slick2D counterpart: Graphics.drawRoundRect(float, float, float, float, int). */
    public drawRoundRect(_x: number, _y: number, _width: number, _height: number, _radius: number): void {
        throw new SlickException("Unsupported phase-one Graphics.drawRoundRect");
    }

    /** Java Slick2D counterpart: Graphics.fillRoundRect(float, float, float, float, int). */
    public fillRoundRect(_x: number, _y: number, _width: number, _height: number, _radius: number): void {
        throw new SlickException("Unsupported phase-one Graphics.fillRoundRect");
    }

    /** Java Slick2D counterpart: Graphics.setLineWidth(float). */
    public setLineWidth(width: number): void {
        this.lineWidth = width;
        Renderer.get().glLineWidth(width);
    }

    /** Java Slick2D counterpart: Graphics.getLineWidth(). */
    public getLineWidth(): number {
        return this.lineWidth;
    }

    /** Java Slick2D counterpart: Graphics.resetLineWidth(). */
    public resetLineWidth(): void {
        this.setLineWidth(1);
    }

    /** Java Slick2D counterpart: Graphics.setAntiAlias(boolean). */
    public setAntiAlias(antiAlias: boolean): void {
        this.antiAlias = antiAlias;
    }

    /** Java Slick2D counterpart: Graphics.isAntiAlias(). */
    public isAntiAlias(): boolean {
        return this.antiAlias;
    }

    /** Java Slick2D counterpart: Graphics.drawString(String, float, float). */
    public drawString(text: string, x: number, y: number): void {
        this.font.drawString(x, y, text, this.color);
    }

    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float). */
    public drawImage(image: Image, x: number, y: number): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, Color). */
    public drawImage(image: Image, x: number, y: number, color: Color): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float). */
    public drawImage(image: Image, x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float, Color). */
    public drawImage(image: Image, x: number, y: number, a?: number | Color, b?: number, c?: Color): void {
        this.withRenderTarget(() => {
            if (a instanceof Color) {
                image.draw(x, y, a);
            } else if (typeof a === "number" && typeof b === "number") {
                image.draw(x, y, a, b, c ?? this.color);
            } else {
                image.draw(x, y, this.color);
            }
        });
    }

    /** Java Slick2D counterpart: Graphics.copyArea(Image, int, int). */
    public copyArea(target: Image, x: number, y: number): void {
        const bytes = new Uint8Array(target.getWidth() * target.getHeight() * 4);
        this.getArea(x, y, target.getWidth(), target.getHeight(), bytes);
    }

    /** Java Slick2D counterpart: Graphics.getPixel(int, int). */
    public getPixel(x: number, y: number): Color {
        const bytes = new Uint8Array(4);
        this.getArea(x, y, 1, 1, bytes);
        return new Color(bytes[0], bytes[1], bytes[2], bytes[3]);
    }

    /** Java Slick2D counterpart: Graphics.getArea(int, int, int, int). */
    public getArea(x: number, y: number, width: number, height: number): Image;
    /** Java Slick2D counterpart: Graphics.getArea(int, int, int, int, ByteBuffer). */
    public getArea(x: number, y: number, width: number, height: number, target: Uint8Array): void;
    public getArea(x: number, y: number, width: number, height: number, target?: Uint8Array): Image | void {
        if (target) {
            this.withRenderTarget(() => Renderer.getBackend().readPixels(x, y, width, height, target));
            return;
        }
        const image = new Image(width, height);
        return image;
    }

    /** Java Slick2D counterpart: Graphics.drawGradientLine(...). */
    public drawGradientLine(x1: number, y1: number, _r1: number, _g1: number, _b1: number, _a1: number, x2: number, y2: number, _r2: number, _g2: number, _b2: number, _a2: number): void {
        this.drawLine(x1, y1, x2, y2);
    }

    /** Java Slick2D counterpart: Graphics.pushTransform(). */
    public pushTransform(): void {
        Renderer.getBackend().pushTransform();
    }

    /** Java Slick2D counterpart: Graphics.popTransform(). */
    public popTransform(): void {
        Renderer.getBackend().popTransform();
    }

    /** Java Slick2D counterpart: Graphics.destroy(). */
    public destroy(): void {
    }

    /** Browser parity helper: updates logical dimensions. */
    public setDimensions(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    /** Browser parity helper: returns current draw mode. */
    public getDrawMode(): number {
        return this.drawMode;
    }

    private withRenderTarget<T>(callback: () => T): T {
        const renderer = Renderer.getBackend();
        renderer.setRenderTarget(this.renderTarget);
        try {
            Graphics.current = this;
            return callback();
        } finally {
            if (this.renderTarget) {
                renderer.setRenderTarget(null);
            }
        }
    }
}

void (undefined as unknown as Matrix3 | undefined);
