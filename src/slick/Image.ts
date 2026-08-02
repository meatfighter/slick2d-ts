import { Color } from "./Color.js";
import { Graphics } from "./Graphics.js";
import type { Renderable } from "./Renderable.js";
import { SlickException } from "./SlickException.js";
import { identityMatrix3 } from "./rendering/RenderBackend.js";
import { WebGLRenderTarget } from "./rendering/WebGLRenderTarget.js";
import { WebGLTextureResource } from "./rendering/WebGLTextureResource.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import type { ImageData as SlickImageData } from "./opengl/ImageData.js";

type CanvasSource = HTMLCanvasElement | OffscreenCanvas;

function createCanvasSource(width: number, height: number): CanvasSource {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }
    if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
    throw new SlickException("Image(width, height) requires a browser canvas implementation");
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.Image.
 *
 * Texture-backed image with Slick-compatible mutable draw state.
 */
export class Image implements Renderable {
    public static readonly TOP_LEFT = 0;
    public static readonly TOP_RIGHT = 1;
    public static readonly BOTTOM_RIGHT = 2;
    public static readonly BOTTOM_LEFT = 3;
    public static readonly FILTER_LINEAR = 1;
    public static readonly FILTER_NEAREST = 2;

    private textureResource: WebGLTextureResource;
    private renderTarget: WebGLRenderTarget | null = null;
    private sourceX = 0;
    private sourceY = 0;
    private sourceWidth = 0;
    private sourceHeight = 0;
    private flipHorizontal = false;
    private flipVertical = false;
    private alpha = 1;
    private rotation = 0;
    private centerX = 0;
    private centerY = 0;
    private imageName: string | null = null;
    private destroyed = false;
    private cornerColors = new Map<number, Color>();

    public constructor(ref: string);
    public constructor(ref: string, trans: Color);
    public constructor(ref: string, flipped: boolean);
    public constructor(ref: string, flipped: boolean, filter: number);
    public constructor(ref: string, flipped: boolean, filter: number, transparent: Color);
    public constructor(width: number, height: number);
    public constructor(width: number, height: number, filter: number);
    public constructor(input: ArrayBuffer | Blob, ref: string, flipped: boolean);
    public constructor(input: ArrayBuffer | Blob, ref: string, flipped: boolean, filter: number);
    public constructor(data: SlickImageData);
    public constructor(data: SlickImageData, filter: number);
    /**
     * Java Slick2D counterpart: Image constructors.
     *
     * Preserves Java overload shapes while routing browser loading through the
     * resource and WebGL texture systems.
     */
    public constructor(a: string | number | ArrayBuffer | Blob | SlickImageData, b?: Color | boolean | number | string, c?: boolean | number, d?: number | Color) {
        let filter: number;
        let width = 0;
        let height = 0;

        if (typeof a === "string") {
            this.flipHorizontal = typeof b === "boolean" ? b : false;
            filter = typeof c === "number" ? c : Image.FILTER_LINEAR;
            this.textureResource = new WebGLTextureResource(a, filter);
        } else if (typeof a === "number") {
            width = a;
            height = typeof b === "number" ? b : 0;
            filter = typeof c === "number" ? c : Image.FILTER_LINEAR;
            const canvas = createCanvasSource(width, height);
            this.textureResource = new WebGLTextureResource(canvas, filter, null);
            this.renderTarget = new WebGLRenderTarget(width, height, this.textureResource);
        } else if (a instanceof ArrayBuffer || a instanceof Blob) {
            const ref = typeof b === "string" ? b : "stream";
            filter = typeof d === "number" ? d : Image.FILTER_LINEAR;
            const resource = new WebGLTextureResource(ref, filter);
            this.textureResource = resource;
        } else {
            filter = typeof b === "number" ? b : Image.FILTER_LINEAR;
            const canvas = createCanvasSource(a.getTexWidth(), a.getTexHeight());
            this.textureResource = new WebGLTextureResource(canvas, filter, null);
            width = a.getWidth();
            height = a.getHeight();
        }

        this.sourceWidth = width || this.textureResource.width;
        this.sourceHeight = height || this.textureResource.height;
        this.centerX = this.getWidth() / 2;
        this.centerY = this.getHeight() / 2;
    }

    private static fromShared(resource: WebGLTextureResource, sourceX: number, sourceY: number, sourceWidth: number, sourceHeight: number, flipHorizontal: boolean, flipVertical: boolean): Image {
        const image = Object.create(Image.prototype) as Image;
        image.textureResource = resource;
        image.renderTarget = null;
        image.sourceX = sourceX;
        image.sourceY = sourceY;
        image.sourceWidth = sourceWidth;
        image.sourceHeight = sourceHeight;
        image.flipHorizontal = flipHorizontal;
        image.flipVertical = flipVertical;
        image.alpha = 1;
        image.rotation = 0;
        image.centerX = sourceWidth / 2;
        image.centerY = sourceHeight / 2;
        image.imageName = null;
        image.destroyed = false;
        image.cornerColors = new Map<number, Color>();
        return image;
    }

    /** Java Slick2D counterpart: Image.setFilter(int). */
    public setFilter(filter: number): void {
        this.textureResource.filter = filter;
    }

    /** Java Slick2D counterpart: Image.getFilter(). */
    public getFilter(): number {
        return this.textureResource.filter;
    }

    /** Java Slick2D counterpart: Image.getResourceReference(). */
    public getResourceReference(): string | null {
        return this.textureResource.ref;
    }

    /** Java Slick2D counterpart: Image.setImageColor(float, float, float). */
    public setImageColor(r: number, g: number, b: number): void;
    /** Java Slick2D counterpart: Image.setImageColor(float, float, float, float). */
    public setImageColor(r: number, g: number, b: number, a: number): void;
    public setImageColor(r: number, g: number, b: number, a: number = 1): void {
        this.cornerColors.set(Image.TOP_LEFT, new Color(r, g, b, a));
        this.cornerColors.set(Image.TOP_RIGHT, new Color(r, g, b, a));
        this.cornerColors.set(Image.BOTTOM_RIGHT, new Color(r, g, b, a));
        this.cornerColors.set(Image.BOTTOM_LEFT, new Color(r, g, b, a));
    }

    /** Java Slick2D counterpart: Image.setColor(int, float, float, float). */
    public setColor(corner: number, r: number, g: number, b: number): void;
    /** Java Slick2D counterpart: Image.setColor(int, float, float, float, float). */
    public setColor(corner: number, r: number, g: number, b: number, a: number): void;
    public setColor(corner: number, r: number, g: number, b: number, a: number = 1): void {
        this.cornerColors.set(corner, new Color(r, g, b, a));
    }

    /** Java Slick2D counterpart: Image.clampTexture(). */
    public clampTexture(): void {
    }

    /** Java Slick2D counterpart: Image.setName(String). */
    public setName(name: string): void {
        this.imageName = name;
    }

    /** Java Slick2D counterpart: Image.getName(). */
    public getName(): string | null {
        return this.imageName;
    }

    /** Java Slick2D counterpart: Image.getGraphics(). */
    public getGraphics(): Graphics {
        if (!this.renderTarget) {
            throw new SlickException("Image is not a writable render target");
        }
        return new Graphics(this.renderTarget);
    }

    /** Java Slick2D counterpart: Image.bind(). */
    public bind(): void {
        Color.white.bind();
    }

    /** Java Slick2D counterpart: Image.draw(). */
    public draw(): void;
    /** Java Slick2D counterpart: Image.draw(float, float). */
    public draw(x: number, y: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float). */
    public draw(x: number, y: number, scale: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, Color). */
    public draw(x: number, y: number, filter: Color): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float). */
    public draw(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float, Color). */
    public draw(x: number, y: number, width: number, height: number, filter: Color): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float, float, float). */
    public draw(x: number, y: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float, float, float, float, float). */
    public draw(x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float, float, float, float, float, Color). */
    public draw(x?: number, y?: number, a?: number | Color, b?: number, c?: number | Color, d?: number, e?: number, f?: number, g?: Color): void {
        this.throwIfDestroyed();
        const drawX = x ?? 0;
        const drawY = y ?? 0;
        let drawW = this.getWidth();
        let drawH = this.getHeight();
        let srcX = this.sourceX;
        let srcY = this.sourceY;
        let srcW = this.getWidth();
        let srcH = this.getHeight();
        let tint: Color | null = null;

        if (a instanceof Color) {
            tint = a;
        } else if (typeof a === "number" && b === undefined) {
            drawW = this.getWidth() * a;
            drawH = this.getHeight() * a;
        } else if (typeof a === "number" && typeof b === "number" && c instanceof Color) {
            drawW = a;
            drawH = b;
            tint = c;
        } else if (typeof a === "number" && typeof b === "number" && c === undefined) {
            drawW = a;
            drawH = b;
        } else if (typeof a === "number" && typeof b === "number" && typeof c === "number" && typeof d === "number" && e === undefined) {
            srcX = this.sourceX + a;
            srcY = this.sourceY + b;
            srcW = c - a;
            srcH = d - b;
            drawW = srcW;
            drawH = srcH;
        } else if (typeof a === "number" && typeof b === "number" && typeof c === "number" && typeof d === "number" && typeof e === "number" && typeof f === "number") {
            drawW = a - drawX;
            drawH = b - drawY;
            srcX = this.sourceX + c;
            srcY = this.sourceY + d;
            srcW = e - c;
            srcH = f - d;
            tint = g ?? null;
        }

        this.drawInternal(drawX, drawY, drawW, drawH, srcX, srcY, srcW, srcH, tint);
    }

    /** Java Slick2D counterpart: Image.drawCentered(float, float). */
    public drawCentered(x: number, y: number): void {
        this.draw(x - this.getWidth() / 2, y - this.getHeight() / 2);
    }

    /** Java Slick2D counterpart: Image.drawEmbedded(float, float, float, float). */
    public drawEmbedded(x: number, y: number, width: number, height: number): void {
        this.draw(x, y, width, height);
    }

    /** Java Slick2D counterpart: Image.drawSheared(...). */
    public drawSheared(_x: number, _y: number, _hshear: number, _vshear: number, _filter?: Color): void {
        throw new SlickException("Unsupported phase-one Image.drawSheared");
    }

    /** Java Slick2D counterpart: Image.drawFlash(float, float). */
    public drawFlash(x: number, y: number): void;
    /** Java Slick2D counterpart: Image.drawFlash(float, float, float, float). */
    public drawFlash(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Image.drawFlash(float, float, float, float, Color). */
    public drawFlash(x: number, y: number, width?: number, height?: number, col: Color = Color.white): void {
        this.draw(x, y, width ?? this.getWidth(), height ?? this.getHeight(), col);
    }

    /** Java Slick2D counterpart: Image.setCenterOfRotation(float, float). */
    public setCenterOfRotation(x: number, y: number): void {
        this.centerX = x;
        this.centerY = y;
    }

    /** Java Slick2D counterpart: Image.getCenterOfRotationX(). */
    public getCenterOfRotationX(): number {
        return this.centerX;
    }

    /** Java Slick2D counterpart: Image.getCenterOfRotationY(). */
    public getCenterOfRotationY(): number {
        return this.centerY;
    }

    /** Java Slick2D counterpart: Image.setRotation(float). */
    public setRotation(angle: number): void {
        this.rotation = angle;
    }

    /** Java Slick2D counterpart: Image.getRotation(). */
    public getRotation(): number {
        return this.rotation;
    }

    /** Java Slick2D counterpart: Image.getAlpha(). */
    public getAlpha(): number {
        return this.alpha;
    }

    /** Java Slick2D counterpart: Image.setAlpha(float). */
    public setAlpha(alpha: number): void {
        this.alpha = Math.max(0, Math.min(1, alpha));
    }

    /** Java Slick2D counterpart: Image.rotate(float). */
    public rotate(angle: number): void {
        this.rotation += angle;
    }

    /** Java Slick2D counterpart: Image.getSubImage(int, int, int, int). */
    public getSubImage(x: number, y: number, width: number, height: number): Image {
        return Image.fromShared(
            this.textureResource,
            this.sourceX + x,
            this.sourceY + y,
            width,
            height,
            this.flipHorizontal,
            this.flipVertical
        );
    }

    /** Java Slick2D counterpart: Image.drawWarped(...). */
    public drawWarped(_topLeftX: number, _topLeftY: number, _topRightX: number, _topRightY: number, _bottomRightX: number, _bottomRightY: number, _bottomLeftX: number, _bottomLeftY: number): void {
        throw new SlickException("Unsupported phase-one Image.drawWarped");
    }

    /** Java Slick2D counterpart: Image.getWidth(). */
    public getWidth(): number {
        return this.sourceWidth || this.textureResource.width;
    }

    /** Java Slick2D counterpart: Image.getHeight(). */
    public getHeight(): number {
        return this.sourceHeight || this.textureResource.height;
    }

    /** Java Slick2D counterpart: Image.copy(). */
    public copy(): Image {
        const copy = Image.fromShared(this.textureResource, this.sourceX, this.sourceY, this.getWidth(), this.getHeight(), this.flipHorizontal, this.flipVertical);
        copy.alpha = this.alpha;
        copy.rotation = this.rotation;
        copy.centerX = this.centerX;
        copy.centerY = this.centerY;
        copy.imageName = this.imageName;
        copy.cornerColors = new Map(Array.from(this.cornerColors.entries()).map(([key, value]) => [key, value.copy()]));
        return copy;
    }

    /** Java Slick2D counterpart: Image.getScaledCopy(float). */
    public getScaledCopy(scale: number): Image;
    /** Java Slick2D counterpart: Image.getScaledCopy(int, int). */
    public getScaledCopy(width: number, height: number): Image;
    public getScaledCopy(a: number, b?: number): Image {
        const copy = this.copy();
        copy.sourceWidth = b === undefined ? this.getWidth() * a : a;
        copy.sourceHeight = b === undefined ? this.getHeight() * a : b;
        return copy;
    }

    /** Java Slick2D counterpart: Image.ensureInverted(). */
    public ensureInverted(): void {
        this.flipVertical = !this.flipVertical;
    }

    /** Java Slick2D counterpart: Image.getFlippedCopy(boolean, boolean). */
    public getFlippedCopy(flipHorizontal: boolean, flipVertical: boolean): Image {
        const copy = this.copy();
        copy.flipHorizontal = this.flipHorizontal !== flipHorizontal;
        copy.flipVertical = this.flipVertical !== flipVertical;
        return copy;
    }

    /** Java Slick2D counterpart: Image.endUse(). */
    public endUse(): void {
        Renderer.get().flush();
    }

    /** Java Slick2D counterpart: Image.startUse(). */
    public startUse(): void {
        Renderer.get().flush();
    }

    /** Java Slick2D counterpart: Image.toString(). */
    public toString(): string {
        return this.imageName ?? this.textureResource.ref ?? "[Image]";
    }

    /** Java Slick2D counterpart: Image.getTexture(). */
    public getTexture(): WebGLTextureResource {
        return this.textureResource;
    }

    /** Java Slick2D counterpart: Image.setTexture(Texture). */
    public setTexture(texture: WebGLTextureResource): void {
        this.textureResource = texture;
    }

    /** Java Slick2D counterpart: Image.getColor(int, int). */
    public getColor(x: number, y: number): Color {
        const bytes = new Uint8Array(4);
        Renderer.getBackend().readPixels(this.sourceX + x, this.sourceY + y, 1, 1, bytes);
        return new Color(bytes[0], bytes[1], bytes[2], bytes[3]);
    }

    /** Java Slick2D counterpart: Image.isDestroyed(). */
    public isDestroyed(): boolean {
        return this.destroyed;
    }

    /** Java Slick2D counterpart: Image.destroy(). */
    public destroy(): void {
        this.destroyed = true;
        this.textureResource.dispose(Renderer.getBackend().getContext());
    }

    /** Java Slick2D counterpart: Image.flushPixelData(). */
    public flushPixelData(): void {
    }

    /** Internal renderer hook returning the texture resource. */
    public __getTextureResource(): WebGLTextureResource | null {
        return this.destroyed ? null : this.textureResource;
    }

    /** Internal renderer hook returning the render target if this image is writable. */
    public __getRenderTarget(): WebGLRenderTarget | null {
        return this.renderTarget;
    }

    private drawInternal(x: number, y: number, width: number, height: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, tint: Color | null): void {
        const renderer = Renderer.getBackend();
        const scaleX = width / (this.getWidth() || 1);
        const scaleY = height / (this.getHeight() || 1);
        const centerX = x + this.centerX * scaleX;
        const centerY = y + this.centerY * scaleY;
        renderer.pushTransform();
        if (this.rotation !== 0) {
            renderer.rotate(centerX, centerY, this.rotation);
        }
        const effectiveSrcX = this.flipHorizontal ? srcX + srcWidth : srcX;
        const effectiveSrcY = this.flipVertical ? srcY + srcHeight : srcY;
        const effectiveSrcW = this.flipHorizontal ? -srcWidth : srcWidth;
        const effectiveSrcH = this.flipVertical ? -srcHeight : srcHeight;
        renderer.drawImage(this, x, y, width, height, effectiveSrcX, effectiveSrcY, effectiveSrcW, effectiveSrcH, this.alpha, tint, identityMatrix3());
        renderer.popTransform();
    }

    private throwIfDestroyed(): void {
        if (this.destroyed) {
            throw new SlickException("Image has been destroyed");
        }
    }
}
