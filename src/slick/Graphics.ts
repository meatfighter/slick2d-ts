import { Color } from "./Color.js";
import type { Font } from "./Font.js";
import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { identityMatrix3 } from "./rendering/RenderBackend.js";
import type { WebGLRenderTarget } from "./rendering/WebGLRenderTarget.js";
import type { WebGLRenderer } from "./rendering/WebGLRenderer.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import { FastTrig } from "./util/FastTrig.js";
import { CanvasFont } from "./support/CanvasFont.js";

const IDENTITY_TRANSFORM = identityMatrix3();

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
export class Graphics {
    private static readonly DEFAULT_SEGMENTS = 50;
    public static readonly MODE_NORMAL = 1;
    public static readonly MODE_ALPHA_MAP = 2;
    public static readonly MODE_ALPHA_BLEND = 3;
    public static readonly MODE_COLOR_MULTIPLY = 4;
    public static readonly MODE_ADD = 5;
    public static readonly MODE_SCREEN = 6;

    private static current: Graphics | null = null;
    private static readonly currentStack: Array<Graphics | null> = [];
    private static sharedDefaultFont: Font | null = null;
    private color = Color.white.copy();
    private background = Color.black.copy();
    private font: Font = Graphics.getSharedDefaultFont();
    private defaultFont: Font = this.font;
    private lineWidth = 1;
    private antiAlias = false;
    private drawMode = Graphics.MODE_NORMAL;
    private readonly renderContextFastPathStack: boolean[] = [];
    private width = 0;
    private height = 0;
    private screenClipRecord: ClipRect | null = null;
    private worldClipRecord: ClipRect | null = null;
    private readonly pixelScratch = new Uint8Array(4);
    private readonly gradientColor1 = Color.white.copy();
    private readonly gradientColor2 = Color.white.copy();
    private readonly arcPointScratch: Array<[number, number]> = [];
    private readonly trianglePointScratch: Array<[number, number]> = [];
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
        if (current !== null) {
            current.applyDrawModeForContext(Renderer.getBackend());
        }
        Graphics.current = current;
    }

    /** Browser parity helper: returns the current graphics context. */
    public static getCurrent(): Graphics | null {
        return Graphics.current;
    }

    /** @internal Enters this Graphics object's complete renderer context. */
    public __beginRenderContext(): void {
        this.beginRenderTarget();
    }

    /** @internal Leaves a context entered by __beginRenderContext(). */
    public __endRenderContext(): void {
        this.endRenderTarget(Renderer.getBackend());
    }

    /** Java Slick2D counterpart: Graphics.setDrawMode(int). */
    public setDrawMode(mode: number): void {
        const renderer = this.beginRenderTarget(false);
        try {
            this.drawMode = mode;
            this.applyDrawModeForExplicitSet(renderer);
        } finally {
            this.endRenderTarget(renderer);
        }
    }

    /** Java Slick2D counterpart: Graphics.clearAlphaMap(). */
    public clearAlphaMap(): void {
        this.pushTransform();
        Renderer.get().glLoadIdentity();
        const originalMode = this.drawMode;
        try {
            this.setDrawMode(Graphics.MODE_ALPHA_MAP);
            this.setColor(Color.transparent);
            this.fillRect(0, 0, this.width || 1, this.height || 1);
            this.setColor(this.color);
            this.setDrawMode(originalMode);
        } finally {
            this.popTransform();
        }
    }

    /** Java Slick2D counterpart: Graphics.flush(). */
    public flush(): void {
        Renderer.get().flush();
    }

    /** Browser extension: toggles RGB inversion for subsequent renderer draw calls. */
    public setColorInverted(inverted: boolean): void {
        Renderer.getBackend().setColorInverted(inverted);
    }

    /** Browser extension: reports the active renderer RGB inversion state. */
    public isColorInverted(): boolean {
        return Renderer.getBackend().isColorInverted();
    }

    /**
     * Browser extension: maps rendered luminance between two replacement colors.
     *
     * Source black maps to blackReplacement and source white maps to
     * whiteReplacement. Alpha is preserved.
     */
    public setMonochromePalette(blackReplacement: Color, whiteReplacement: Color): void {
        Renderer.getBackend().setMonochromePalette(blackReplacement, whiteReplacement);
    }

    /** Browser extension: restores the renderer programs active before the monochrome palette. */
    public clearMonochromePalette(): void {
        Renderer.getBackend().clearMonochromePalette();
    }

    /** Browser extension: reports whether the optional monochrome palette renderer is active. */
    public isMonochromePaletteEnabled(): boolean {
        return Renderer.getBackend().isMonochromePaletteEnabled();
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
        this.background.r = color.r;
        this.background.g = color.g;
        this.background.b = color.b;
        this.background.a = color.a;
    }

    /** Java Slick2D counterpart: Graphics.getBackground(). */
    public getBackground(): Color {
        return this.background.copy();
    }

    /** Internal renderer helper: avoids copying the background during the frame loop. */
    public __getBackgroundReference(): Color {
        return this.background;
    }

    /** Internal renderer helper: copies background channels without allocating. */
    public __copyBackgroundFrom(source: Graphics): void {
        this.background.r = source.background.r;
        this.background.g = source.background.g;
        this.background.b = source.background.b;
        this.background.a = source.background.a;
    }

    /** Java Slick2D counterpart: Graphics.clear(). */
    public clear(): void {
        const renderer = this.beginRenderTarget();
        try {
            renderer.fillRect(0, 0, this.width || 1, this.height || 1, this.background, IDENTITY_TRANSFORM);
        } finally {
            this.endRenderTarget(renderer);
        }
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
    public setColor(color: Color | null): void {
        if (color === null) {
            return;
        }
        this.color.r = color.r;
        this.color.g = color.g;
        this.color.b = color.b;
        this.color.a = color.a;
        this.color.bind();
    }

    /** Java Slick2D counterpart: Graphics.getColor(). */
    public getColor(): Color {
        return this.color.copy();
    }

    /** Java Slick2D counterpart: Graphics.drawLine(float, float, float, float). */
    public drawLine(x1: number, y1: number, x2: number, y2: number): void {
        const renderer = this.beginRenderTarget();
        try {
            renderer.drawLine(x1, y1, x2, y2, this.color, this.lineWidth, IDENTITY_TRANSFORM);
        } finally {
            this.endRenderTarget(renderer);
        }
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
    /** Java Slick2D counterpart: Graphics.fillRect(float, float, float, float, Image, float, float). */
    public fillRect(x: number, y: number, width: number, height: number, pattern: Image, offX: number, offY: number): void;
    public fillRect(x: number, y: number, width: number, height: number, pattern?: Image, offX?: number, offY?: number): void {
        if (pattern !== undefined) {
            if (offX === undefined || offY === undefined) {
                throw new SlickException("Graphics.fillRect pattern overload requires offX and offY");
            }
            this.fillPatternRect(x, y, width, height, pattern, offX, offY);
            return;
        }
        const renderer = this.beginRenderTarget();
        try {
            renderer.fillRect(x, y, width, height, this.color, IDENTITY_TRANSFORM);
        } finally {
            this.endRenderTarget(renderer);
        }
    }

    /** Java Slick2D counterpart: Graphics.clearClip(). */
    public clearClip(): void {
        const renderer = this.beginRenderTarget();
        try {
            this.screenClipRecord = null;
            renderer.clearClip();
        } finally {
            this.endRenderTarget(renderer);
        }
    }

    /** Java Slick2D counterpart: Graphics.setClip(int, int, int, int). */
    public setClip(x: number, y: number, width: number, height: number): void {
        const renderer = this.beginRenderTarget();
        try {
            this.screenClipRecord = { x, y, width, height };
            renderer.setClip(x, y, width, height);
        } finally {
            this.endRenderTarget(renderer);
        }
    }

    /** Java Slick2D counterpart: Graphics.getClip(). */
    public getClip(): ClipRect | null {
        return this.screenClipRecord === null ? null : { ...this.screenClipRecord };
    }

    /** Java Slick2D counterpart: Graphics.clearWorldClip(). */
    public clearWorldClip(): void {
        const renderer = this.beginRenderTarget();
        try {
            this.applyWorldClip(renderer, null);
        } finally {
            this.endRenderTarget(renderer);
        }
    }

    /** Java Slick2D counterpart: Graphics.setWorldClip(float, float, float, float). */
    public setWorldClip(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Graphics.setWorldClip(Rectangle). */
    public setWorldClip(clip: ClipRect | null): void;
    public setWorldClip(xOrClip: number | ClipRect | null, y?: number, width?: number, height?: number): void {
        const renderer = this.beginRenderTarget();
        try {
            if (xOrClip === null) {
                this.applyWorldClip(renderer, null);
            } else if (typeof xOrClip === "object") {
                this.applyWorldClip(renderer, xOrClip);
            } else if (y !== undefined && width !== undefined && height !== undefined) {
                this.applyWorldClip(renderer, { x: xOrClip, y, width, height });
            } else {
                throw new SlickException("Invalid Graphics.setWorldClip overload");
            }
        } finally {
            this.endRenderTarget(renderer);
        }
    }

    /** Java Slick2D counterpart: Graphics.getWorldClip(). */
    public getWorldClip(): ClipRect | null {
        return this.worldClipRecord === null ? null : { ...this.worldClipRecord };
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
        const points = this.buildArcPoints(x, y, width, height, segments, start, end);
        const renderer = this.beginRenderTarget();
        try {
            renderer.drawLineStrip(points, this.color, this.lineWidth, IDENTITY_TRANSFORM);
        } finally {
            this.endRenderTarget(renderer);
        }
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
        const boundary = this.buildArcPoints(x, y, width, height, segments, start, end);
        const cx = x + width / 2;
        const cy = y + height / 2;
        const triangles = this.buildArcTriangles(boundary, cx, cy);
        const renderer = this.beginRenderTarget();
        try {
            renderer.fillTriangles(triangles, this.color, IDENTITY_TRANSFORM);
        } finally {
            this.endRenderTarget(renderer);
        }
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
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float, float, float). */
    public drawImage(image: Image, x: number, y: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float, float, float, Color). */
    public drawImage(image: Image, x: number, y: number, srcx: number, srcy: number, srcx2: number, srcy2: number, color: Color): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float, float, float, float, float). */
    public drawImage(image: Image, x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Graphics.drawImage(Image, float, float, float, float, float, float, float, float, Color). */
    public drawImage(image: Image, x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number, color: Color): void;
    public drawImage(
        image: Image,
        x: number,
        y: number,
        a?: number | Color,
        b?: number,
        c?: number,
        d?: number,
        e?: number | Color,
        f?: number | Color,
        g?: Color
    ): void {
        const renderer = this.beginRenderTarget();
        try {
            if (arguments.length === 3) {
                image.draw(x, y, Color.white);
            } else if (arguments.length === 4 && a instanceof Color) {
                image.draw(x, y, a);
            } else if (arguments.length === 7 && typeof a === "number" && typeof b === "number" && typeof c === "number" && typeof d === "number") {
                image.draw(x, y, a, b, c, d);
            } else if (
                arguments.length === 8 &&
                typeof a === "number" &&
                typeof b === "number" &&
                typeof c === "number" &&
                typeof d === "number" &&
                e instanceof Color
            ) {
                image.draw(x, y, x + image.getWidth(), y + image.getHeight(), a, b, c, d, e);
            } else if (
                arguments.length === 9 &&
                typeof a === "number" &&
                typeof b === "number" &&
                typeof c === "number" &&
                typeof d === "number" &&
                typeof e === "number" &&
                typeof f === "number"
            ) {
                image.draw(x, y, a, b, c, d, e, f);
            } else if (
                arguments.length === 10 &&
                typeof a === "number" &&
                typeof b === "number" &&
                typeof c === "number" &&
                typeof d === "number" &&
                typeof e === "number" &&
                typeof f === "number" &&
                g instanceof Color
            ) {
                image.draw(x, y, a, b, c, d, e, f, g);
            } else {
                throw new SlickException("Invalid Graphics.drawImage overload");
            }
            this.color.bind();
        } finally {
            this.endRenderTarget(renderer);
        }
    }

    /** Java Slick2D counterpart: Graphics.copyArea(Image, int, int). */
    public copyArea(target: Image, x: number, y: number): void {
        const renderTarget = target.__getRenderTarget();
        if (!renderTarget) {
            throw new SlickException("Graphics.copyArea requires a writable Image target");
        }
        const renderer = this.beginRenderTarget();
        try {
            renderer.copyAreaToRenderTarget(renderTarget, x, y);
        } finally {
            this.endRenderTarget(renderer);
        }
        target.ensureInverted();
    }

    /** Java Slick2D counterpart: Graphics.getPixel(int, int). */
    public getPixel(x: number, y: number): Color {
        const bytes = this.pixelScratch;
        this.getArea(x, y, 1, 1, bytes);
        return Color.fromInts(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
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
            const renderer = this.beginRenderTarget();
            try {
                renderer.readPixels(x, y, width, height, target);
            } finally {
                this.endRenderTarget(renderer);
            }
            return;
        }
        const image = new Image(width, height);
        this.copyArea(image, x, y);
        return image;
    }

    /** Java Slick2D counterpart: Graphics.drawGradientLine(...). */
    public drawGradientLine(
        x1: number,
        y1: number,
        r1: number,
        g1: number,
        b1: number,
        a1: number,
        x2: number,
        y2: number,
        r2: number,
        g2: number,
        b2: number,
        a2: number
    ): void;
    /** Java Slick2D counterpart: Graphics.drawGradientLine(float, float, Color, float, float, Color). */
    public drawGradientLine(x1: number, y1: number, color1: Color, x2: number, y2: number, color2: Color): void;
    public drawGradientLine(
        x1: number,
        y1: number,
        a: number | Color,
        b: number,
        c: number | Color,
        d: number | Color,
        e?: number,
        f?: number,
        g?: number,
        h?: number,
        i?: number,
        j?: number
    ): void {
        let color1: Color;
        let x2: number;
        let y2: number;
        let color2: Color;
        if (a instanceof Color && typeof c === "number" && d instanceof Color) {
            color1 = a;
            x2 = b;
            y2 = c;
            color2 = d;
        } else if (
            typeof a === "number" &&
            typeof c === "number" &&
            e !== undefined &&
            f !== undefined &&
            g !== undefined &&
            h !== undefined &&
            i !== undefined &&
            j !== undefined
        ) {
            color1 = this.gradientColor1;
            color1.r = Math.min(a, 1);
            color1.g = Math.min(b, 1);
            color1.b = Math.min(c, 1);
            color1.a = Math.min(Number(d), 1);
            x2 = e;
            y2 = f;
            color2 = this.gradientColor2;
            color2.r = Math.min(g, 1);
            color2.g = Math.min(h, 1);
            color2.b = Math.min(i, 1);
            color2.a = Math.min(j, 1);
        } else {
            throw new SlickException("Invalid Graphics.drawGradientLine overload");
        }
        const renderer = this.beginRenderTarget();
        try {
            renderer.drawGradientLine(x1, y1, color1, x2, y2, color2, this.lineWidth, IDENTITY_TRANSFORM);
        } finally {
            this.endRenderTarget(renderer);
        }
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
    public destroy(): void {}

    /** Browser parity helper: updates logical dimensions. */
    public setDimensions(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    /** Browser parity helper: returns current draw mode. */
    public getDrawMode(): number {
        return this.drawMode;
    }

    private static getSharedDefaultFont(): Font {
        Graphics.sharedDefaultFont ??= new CanvasFont();
        return Graphics.sharedDefaultFont;
    }

    private buildArcPoints(x: number, y: number, width: number, height: number, segments: number, start: number, end: number): Array<[number, number]> {
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
        let count = 0;
        for (let angleStep = Math.trunc(start); angleStep < Math.trunc(normalizedEnd + step); angleStep += step) {
            const angle = angleStep > normalizedEnd ? normalizedEnd : angleStep;
            const radians = (angle * Math.PI) / 180;
            const point = this.getScratchPoint(this.arcPointScratch, count++);
            point[0] = cx + (FastTrig.cos(radians) * width) / 2;
            point[1] = cy + (FastTrig.sin(radians) * height) / 2;
        }
        this.arcPointScratch.length = count;
        return this.arcPointScratch;
    }

    private buildArcTriangles(boundary: Array<[number, number]>, cx: number, cy: number): Array<[number, number]> {
        let count = 0;
        for (let i = 0; i + 1 < boundary.length; i++) {
            const start = boundary[i]!;
            const end = boundary[i + 1]!;
            let point = this.getScratchPoint(this.trianglePointScratch, count++);
            point[0] = cx;
            point[1] = cy;
            point = this.getScratchPoint(this.trianglePointScratch, count++);
            point[0] = start[0];
            point[1] = start[1];
            point = this.getScratchPoint(this.trianglePointScratch, count++);
            point[0] = end[0];
            point[1] = end[1];
        }
        this.trianglePointScratch.length = count;
        return this.trianglePointScratch;
    }

    private getScratchPoint(points: Array<[number, number]>, index: number): [number, number] {
        let point = points[index];
        if (!point) {
            point = [0, 0];
            points[index] = point;
        }
        return point;
    }

    private static normalizeCornerRadius(width: number, height: number, radius: number): number {
        if (radius < 0) {
            throw new RangeError("corner radius must be > 0");
        }
        const maxRadius = Math.trunc(Math.trunc(Math.min(width, height)) / 2);
        return Math.min(Math.trunc(radius), maxRadius);
    }

    private fillPatternRect(x: number, y: number, width: number, height: number, pattern: Image, offX: number, offY: number): void {
        const patternWidth = pattern.getWidth();
        const patternHeight = pattern.getHeight();
        if (patternWidth <= 0 || patternHeight <= 0) {
            return;
        }
        const renderer = this.beginRenderTarget();
        const hadWorldClip = this.worldClipRecord !== null;
        const previousX = this.worldClipRecord?.x ?? 0;
        const previousY = this.worldClipRecord?.y ?? 0;
        const previousWidth = this.worldClipRecord?.width ?? 0;
        const previousHeight = this.worldClipRecord?.height ?? 0;
        try {
            this.applyWorldClipValues(renderer, x, y, width, height);
            const cols = Math.trunc(Math.ceil(width / patternWidth)) + 2;
            const rows = Math.trunc(Math.ceil(height / patternHeight)) + 2;
            for (let c = 0; c < cols; c++) {
                const drawX = c * patternWidth + x - offX;
                for (let r = 0; r < rows; r++) {
                    pattern.draw(drawX, r * patternHeight + y - offY);
                }
            }
        } finally {
            if (hadWorldClip) {
                this.applyWorldClipValues(renderer, previousX, previousY, previousWidth, previousHeight);
            } else {
                this.applyWorldClip(renderer, null);
            }
            this.endRenderTarget(renderer);
        }
    }

    private applyWorldClipValues(renderer: WebGLRenderer, x: number, y: number, width: number, height: number): void {
        if (this.worldClipRecord) {
            this.worldClipRecord.x = x;
            this.worldClipRecord.y = y;
            this.worldClipRecord.width = width;
            this.worldClipRecord.height = height;
        } else {
            this.worldClipRecord = { x, y, width, height };
        }
        renderer.setWorldClip(x, y, width, height, IDENTITY_TRANSFORM);
    }

    private applyWorldClip(renderer: WebGLRenderer, clip: ClipRect | null): void {
        if (clip === null) {
            this.worldClipRecord = null;
            renderer.clearWorldClip();
            return;
        }
        this.applyWorldClipValues(renderer, clip.x, clip.y, clip.width, clip.height);
    }

    private withRenderTarget<T>(callback: () => T): T {
        const renderer = this.beginRenderTarget();
        try {
            return callback();
        } finally {
            this.endRenderTarget(renderer);
        }
    }

    private beginRenderTarget(activateDrawMode: boolean = true): WebGLRenderer {
        const renderer = Renderer.getBackend();
        this.renderTarget?.markModified?.();
        const reuseActiveContext = Graphics.current === this && renderer.getRenderTarget() === this.renderTarget;
        this.renderContextFastPathStack.push(reuseActiveContext);
        if (reuseActiveContext) {
            return renderer;
        }

        const previous = Graphics.current;
        let renderTargetPushed = false;
        let currentPushed = false;
        let drawModeStatePushed = false;

        try {
            renderer.pushRenderTarget(this.renderTarget);
            renderTargetPushed = true;
            Graphics.currentStack.push(previous);
            currentPushed = true;

            if (previous === this) {
                return renderer;
            }

            renderer.pushDrawModeState();
            drawModeStatePushed = true;
            Graphics.current = this;
            if (activateDrawMode) {
                this.applyDrawModeForContext(renderer);
            }
            this.applyClipState(renderer);
            return renderer;
        } catch (error) {
            this.renderContextFastPathStack.pop();
            Graphics.current = previous;
            if (currentPushed) {
                Graphics.currentStack.pop();
            }
            try {
                if (drawModeStatePushed) {
                    renderer.popDrawModeState();
                }
            } finally {
                if (renderTargetPushed) {
                    renderer.popRenderTarget();
                }
            }
            throw error;
        }
    }

    private endRenderTarget(renderer: WebGLRenderer): void {
        const reusedActiveContext = this.renderContextFastPathStack.pop();
        if (reusedActiveContext === undefined) {
            throw new SlickException("Graphics render-context stack underflow");
        }
        if (reusedActiveContext) {
            return;
        }

        const previous = Graphics.currentStack.pop();
        if (previous === undefined) {
            throw new SlickException("Graphics current stack underflow");
        }
        const contextChanged = previous !== this;
        try {
            renderer.popRenderTarget();
        } finally {
            Graphics.current = previous;
            if (contextChanged) {
                try {
                    if (previous === null) {
                        renderer.clearClip();
                        renderer.clearWorldClip();
                    } else {
                        previous.applyClipState(renderer);
                    }
                } finally {
                    renderer.popDrawModeState();
                }
            }
        }
    }

    private applyDrawModeForContext(renderer: WebGLRenderer): void {
        if (this.drawMode === Graphics.MODE_NORMAL) {
            renderer.__applyDrawModeState(
                true,
                renderer.GL_SRC_ALPHA,
                renderer.GL_ONE_MINUS_SRC_ALPHA,
                0b1111,
                renderer.GL_ONE,
                renderer.GL_ONE_MINUS_SRC_ALPHA
            );
        } else if (this.drawMode === Graphics.MODE_ALPHA_MAP) {
            renderer.__applyDrawModeState(false, null, null, 0b1000, null, null);
        } else if (this.drawMode === Graphics.MODE_ALPHA_BLEND) {
            renderer.__applyDrawModeState(
                true,
                renderer.GL_DST_ALPHA,
                renderer.GL_ONE_MINUS_DST_ALPHA,
                0b0111,
                renderer.GL_DST_ALPHA,
                renderer.GL_ONE_MINUS_DST_ALPHA
            );
        } else if (this.drawMode === Graphics.MODE_COLOR_MULTIPLY) {
            renderer.__applyDrawModeState(
                true,
                renderer.GL_ONE_MINUS_SRC_COLOR,
                renderer.GL_SRC_COLOR,
                0b1111,
                renderer.GL_ONE_MINUS_SRC_COLOR,
                renderer.GL_SRC_COLOR
            );
        } else if (this.drawMode === Graphics.MODE_ADD) {
            renderer.__applyDrawModeState(true, renderer.GL_ONE, renderer.GL_ONE, 0b1111, renderer.GL_ONE, renderer.GL_ONE);
        } else if (this.drawMode === Graphics.MODE_SCREEN) {
            renderer.__applyDrawModeState(true, renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR, 0b1111, renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR);
        }
    }

    private applyDrawModeForExplicitSet(renderer: WebGLRenderer): void {
        if (this.drawMode === Graphics.MODE_NORMAL) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, true);
            renderer.glBlendFunc(renderer.GL_SRC_ALPHA, renderer.GL_ONE_MINUS_SRC_ALPHA, renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_ALPHA);
        } else if (this.drawMode === Graphics.MODE_ALPHA_MAP) {
            renderer.glDisable(renderer.GL_BLEND);
            renderer.glColorMask(false, false, false, true);
        } else if (this.drawMode === Graphics.MODE_ALPHA_BLEND) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, false);
            renderer.glBlendFunc(renderer.GL_DST_ALPHA, renderer.GL_ONE_MINUS_DST_ALPHA);
        } else if (this.drawMode === Graphics.MODE_COLOR_MULTIPLY) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, true);
            renderer.glBlendFunc(renderer.GL_ONE_MINUS_SRC_COLOR, renderer.GL_SRC_COLOR);
        } else if (this.drawMode === Graphics.MODE_ADD) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, true);
            renderer.glBlendFunc(renderer.GL_ONE, renderer.GL_ONE);
        } else if (this.drawMode === Graphics.MODE_SCREEN) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, true);
            renderer.glBlendFunc(renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR);
        }
    }

    private applyClipState(renderer: WebGLRenderer): void {
        const screenClip = this.screenClipRecord;
        if (screenClip === null) {
            renderer.clearClip();
        } else {
            renderer.setClip(screenClip.x, screenClip.y, screenClip.width, screenClip.height);
        }

        const worldClip = this.worldClipRecord;
        if (worldClip === null) {
            renderer.clearWorldClip();
        } else {
            renderer.setWorldClip(worldClip.x, worldClip.y, worldClip.width, worldClip.height, IDENTITY_TRANSFORM);
        }
    }
}
