import { Color } from "./Color.js";
import type { Font } from "./Font.js";
import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { identityMatrix3, Matrix3 } from "./rendering/RenderBackend.js";
import type { WebGLRenderTarget } from "./rendering/WebGLRenderTarget.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import { FastTrig } from "./util/FastTrig.js";
import { CanvasFont } from "./support/CanvasFont.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.Graphics.
 *
 * Drawing context facade that delegates to the active WebGL renderer.
 */
export class Graphics {
    private static readonly DEFAULT_SEGMENTS = 50;
    public static readonly MODE_NORMAL = 1;
    public static readonly MODE_ALPHA_MAP = 2;
    public static readonly MODE_ALPHA_BLEND = 3;
    public static readonly MODE_COLOR_MULTIPLY = 4;
    public static readonly MODE_ADD = 5;
    public static readonly MODE_SCREEN = 6;

    private static current: Graphics | null = null;
    private color = Color.white.copy();
    private background = Color.black.copy();
    private font: Font = new CanvasFont();
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
    public drawOval(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.drawOval(float, float, float, float, int). */
    public drawOval(x: number, y: number, width: number, height: number, segments: number): void;
    public drawOval(x: number, y: number, width: number, height: number, segments: number = Graphics.DEFAULT_SEGMENTS): void {
        this.drawArc(x, y, width, height, segments, 0, 360);
    }

    /** Java Slick2D counterpart: Graphics.drawArc(float, float, float, float, float, float). */
    public drawArc(x: number, y: number, width: number, height: number, start: number, end: number): void;
    /** Java Slick2D counterpart: Graphics.drawArc(float, float, float, float, int, float, float). */
    public drawArc(x: number, y: number, width: number, height: number, segments: number, start: number, end: number): void;
    public drawArc(x: number, y: number, width: number, height: number, a: number, b: number, c?: number): void {
        const segments = c === undefined ? Graphics.DEFAULT_SEGMENTS : a;
        const start = c === undefined ? a : b;
        const end = c === undefined ? b : c;
        const points = Graphics.arcPoints(x, y, width, height, segments, start, end);
        this.withRenderTarget(() => Renderer.getBackend().drawLineStrip(points, this.color, this.lineWidth, identityMatrix3()));
    }

    /** Java Slick2D counterpart: Graphics.fillOval(float, float, float, float). */
    public fillOval(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.fillOval(float, float, float, float, int). */
    public fillOval(x: number, y: number, width: number, height: number, segments: number): void;
    public fillOval(x: number, y: number, width: number, height: number, segments: number = Graphics.DEFAULT_SEGMENTS): void {
        this.fillArc(x, y, width, height, segments, 0, 360);
    }

    /** Java Slick2D counterpart: Graphics.fillArc(float, float, float, float, float, float). */
    public fillArc(x: number, y: number, width: number, height: number, start: number, end: number): void;
    /** Java Slick2D counterpart: Graphics.fillArc(float, float, float, float, int, float, float). */
    public fillArc(x: number, y: number, width: number, height: number, segments: number, start: number, end: number): void;
    public fillArc(x: number, y: number, width: number, height: number, a: number, b: number, c?: number): void {
        const segments = c === undefined ? Graphics.DEFAULT_SEGMENTS : a;
        const start = c === undefined ? a : b;
        const end = c === undefined ? b : c;
        const boundary = Graphics.arcPoints(x, y, width, height, segments, start, end);
        const cx = x + width / 2;
        const cy = y + height / 2;
        const triangles: Array<[number, number]> = [];
        for (let i = 0; i + 1 < boundary.length; i++) {
            triangles.push([cx, cy], boundary[i], boundary[i + 1]);
        }
        this.withRenderTarget(() => Renderer.getBackend().fillTriangles(triangles, this.color, identityMatrix3()));
    }

    /** Java Slick2D counterpart: Graphics.drawRoundRect(float, float, float, float, int). */
    public drawRoundRect(x: number, y: number, width: number, height: number, radius: number): void;
    /** Java Slick2D counterpart: Graphics.drawRoundRect(float, float, float, float, int, int). */
    public drawRoundRect(x: number, y: number, width: number, height: number, radius: number, segments: number): void;
    public drawRoundRect(x: number, y: number, width: number, height: number, radius: number, segments: number = Graphics.DEFAULT_SEGMENTS): void {
        const cornerRadius = Graphics.normalizeCornerRadius(width, height, radius);
        if (cornerRadius === 0) {
            this.drawRect(x, y, width, height);
            return;
        }
        const d = cornerRadius * 2;
        this.drawLine(x + cornerRadius, y, x + width - cornerRadius, y);
        this.drawLine(x, y + cornerRadius, x, y + height - cornerRadius);
        this.drawLine(x + width, y + cornerRadius, x + width, y + height - cornerRadius);
        this.drawLine(x + cornerRadius, y + height, x + width - cornerRadius, y + height);
        this.drawArc(x + width - d, y + height - d, d, d, segments, 0, 90);
        this.drawArc(x, y + height - d, d, d, segments, 90, 180);
        this.drawArc(x + width - d, y, d, d, segments, 270, 360);
        this.drawArc(x, y, d, d, segments, 180, 270);
    }

    /** Java Slick2D counterpart: Graphics.fillRoundRect(float, float, float, float, int). */
    public fillRoundRect(x: number, y: number, width: number, height: number, radius: number): void;
    /** Java Slick2D counterpart: Graphics.fillRoundRect(float, float, float, float, int, int). */
    public fillRoundRect(x: number, y: number, width: number, height: number, radius: number, segments: number): void;
    public fillRoundRect(x: number, y: number, width: number, height: number, radius: number, segments: number = Graphics.DEFAULT_SEGMENTS): void {
        const cornerRadius = Graphics.normalizeCornerRadius(width, height, radius);
        if (cornerRadius === 0) {
            this.fillRect(x, y, width, height);
            return;
        }
        const d = cornerRadius * 2;
        this.fillRect(x + cornerRadius, y, width - d, cornerRadius);
        this.fillRect(x, y + cornerRadius, cornerRadius, height - d);
        this.fillRect(x + width - cornerRadius, y + cornerRadius, cornerRadius, height - d);
        this.fillRect(x + cornerRadius, y + height - cornerRadius, width - d, cornerRadius);
        this.fillRect(x + cornerRadius, y + cornerRadius, width - d, height - d);
        this.fillArc(x + width - d, y + height - d, d, d, segments, 0, 90);
        this.fillArc(x, y + height - d, d, d, segments, 90, 180);
        this.fillArc(x + width - d, y, d, d, segments, 270, 360);
        this.fillArc(x, y, d, d, segments, 180, 270);
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
        const renderTarget = target.__getRenderTarget();
        if (!renderTarget) {
            throw new SlickException("Graphics.copyArea requires a writable Image target");
        }
        this.withRenderTarget(() => Renderer.getBackend().copyAreaToRenderTarget(renderTarget, x, y));
        target.ensureInverted();
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
            if (target.byteLength < width * height * 4) {
                throw new RangeError("Byte buffer provided to get area is not big enough");
            }
            this.withRenderTarget(() => Renderer.getBackend().readPixels(x, y, width, height, target));
            return;
        }
        const image = new Image(width, height);
        this.copyArea(image, x, y);
        return image;
    }

    /** Java Slick2D counterpart: Graphics.drawGradientLine(...). */
    public drawGradientLine(x1: number, y1: number, r1: number, g1: number, b1: number, a1: number, x2: number, y2: number, r2: number, g2: number, b2: number, a2: number): void;
    /** Java Slick2D counterpart: Graphics.drawGradientLine(float, float, Color, float, float, Color). */
    public drawGradientLine(x1: number, y1: number, color1: Color, x2: number, y2: number, color2: Color): void;
    public drawGradientLine(x1: number, y1: number, a: number | Color, b: number, c: number | Color, d: number | Color, e?: number, f?: number, g?: number, h?: number, i?: number, j?: number): void {
        let color1: Color;
        let x2: number;
        let y2: number;
        let color2: Color;
        if (a instanceof Color && typeof c === "number" && d instanceof Color) {
            color1 = a;
            x2 = b;
            y2 = c;
            color2 = d;
        } else if (typeof a === "number" && typeof c === "number" && e !== undefined && f !== undefined && g !== undefined && h !== undefined && i !== undefined && j !== undefined) {
            color1 = new Color(a, b, c, Number(d));
            x2 = e;
            y2 = f;
            color2 = new Color(g, h, i, j);
        } else {
            throw new SlickException("Invalid Graphics.drawGradientLine overload");
        }
        this.withRenderTarget(() => Renderer.getBackend().drawGradientLine(x1, y1, color1, x2, y2, color2, this.lineWidth, identityMatrix3()));
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

    private static arcPoints(x: number, y: number, width: number, height: number, segments: number, start: number, end: number): Array<[number, number]> {
        const normalizedSegments = Math.trunc(segments);
        if (normalizedSegments <= 0) {
            throw new RangeError("segments must be > 0");
        }
        let normalizedEnd = end;
        while (normalizedEnd < start) {
            normalizedEnd += 360;
        }
        const step = Math.max(1, Math.trunc(360 / normalizedSegments));
        const cx = x + width / 2;
        const cy = y + height / 2;
        const points: Array<[number, number]> = [];
        for (let a = Math.trunc(start); a < Math.trunc(normalizedEnd + step); a += step) {
            const angle = a > normalizedEnd ? normalizedEnd : a;
            const radians = angle * Math.PI / 180;
            points.push([
                cx + FastTrig.cos(radians) * width / 2,
                cy + FastTrig.sin(radians) * height / 2
            ]);
        }
        return points;
    }

    private static normalizeCornerRadius(width: number, height: number, radius: number): number {
        if (radius < 0) {
            throw new RangeError("corner radius must be > 0");
        }
        const maxRadius = Math.trunc(Math.trunc(Math.min(width, height)) / 2);
        return Math.min(Math.trunc(radius), maxRadius);
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
