import { Color } from "./Color.js";
import { Graphics } from "./Graphics.js";
import { GraphicsFactory } from "./opengl/GraphicsFactory.js";
import { InternalTextureLoader } from "./opengl/InternalTextureLoader.js";
import type { Renderable } from "./Renderable.js";
import { SlickException } from "./SlickException.js";
import { identityMatrix3 } from "./rendering/RenderBackend.js";
import { WebGLRenderTarget } from "./rendering/WebGLRenderTarget.js";
import { WebGLTextureResource } from "./rendering/WebGLTextureResource.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import type { ImageData as SlickImageData } from "./opengl/ImageData.js";

type CanvasSource = HTMLCanvasElement | OffscreenCanvas;
const IDENTITY_TRANSFORM = identityMatrix3();

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

function createCanvasFromSlickImageData(data: SlickImageData): CanvasSource {
    const texWidth = data.getTexWidth();
    const texHeight = data.getTexHeight();
    const canvas = createCanvasSource(texWidth, texHeight);
    const context = canvas.getContext("2d");
    if (!context || typeof globalThis.ImageData === "undefined") {
        throw new SlickException("Image(ImageData) requires browser ImageData and canvas 2D support");
    }
    const depth = data.getDepth();
    const components = depth === 24 ? 3 : 4;
    const source = data.getImageBufferData();
    const pixels = new Uint8ClampedArray(texWidth * texHeight * 4);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j += components) {
        pixels[i] = source[j] ?? 0;
        pixels[i + 1] = source[j + 1] ?? 0;
        pixels[i + 2] = source[j + 2] ?? 0;
        pixels[i + 3] = components === 4 ? (source[j + 3] ?? 255) : 255;
    }
    context.putImageData(new globalThis.ImageData(pixels, texWidth, texHeight), 0, 0);
    return canvas;
}

function normalizeDegrees(angle: number): number {
    return angle % 360;
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

    private static inUse: Image | null = null;

    private textureResource: WebGLTextureResource;
    private renderTarget: WebGLRenderTarget | null = null;
    private sourceX = 0;
    private sourceY = 0;
    private sourceWidth = 0;
    private sourceHeight = 0;
    private displayWidth = 0;
    private displayHeight = 0;
    private flipHorizontal = false;
    private flipVertical = false;
    private inverted = false;
    private alpha = 1;
    private rotation = 0;
    private centerX = 0;
    private centerY = 0;
    private centerSet = false;
    private imageName: string | null = null;
    private destroyed = false;
    private cornerColors: [Color, Color, Color, Color] | null = null;
    private pixelScratch = new Uint8Array(4);
    private sourceRectScratch = new Float64Array(4);
    private textureGeneration = 0;

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
    public constructor(texture: WebGLTextureResource);
    public constructor(image: Image);
    /**
     * Java Slick2D counterpart: Image constructors.
     *
     * Preserves Java overload shapes while routing browser loading through the
     * resource and WebGL texture systems.
     */
    public constructor(
        a: string | number | ArrayBuffer | Blob | SlickImageData | WebGLTextureResource | Image,
        b?: Color | boolean | number | string,
        c?: boolean | number,
        d?: number | Color
    ) {
        let filter: number;
        let width = 0;
        let height = 0;

        if (a instanceof Image) {
            this.textureResource = a.textureResource;
            this.renderTarget = null;
            this.sourceX = a.sourceX;
            this.sourceY = a.sourceY;
            this.sourceWidth = a.getSourceWidth();
            this.sourceHeight = a.getSourceHeight();
            this.displayWidth = a.getWidth();
            this.displayHeight = a.getHeight();
            this.flipHorizontal = a.flipHorizontal;
            this.flipVertical = a.flipVertical;
            this.inverted = a.inverted;
            this.centerX = a.centerX;
            this.centerY = a.centerY;
            this.centerSet = a.centerSet;
            this.imageName = a.imageName;
            return;
        } else if (typeof a === "string") {
            const flipped = typeof b === "boolean" ? b : false;
            const transparent = b instanceof Color ? b : d instanceof Color ? d : null;
            this.flipVertical = flipped;
            this.inverted = flipped;
            filter = typeof c === "number" ? c : Image.FILTER_LINEAR;
            this.textureResource = InternalTextureLoader.get().getTexture(
                a,
                filter,
                transparent,
                flipped,
                () => new WebGLTextureResource(a, filter, { transparent })
            );
        } else if (typeof a === "number") {
            width = a;
            height = typeof b === "number" ? b : 0;
            filter = typeof c === "number" ? c : Image.FILTER_NEAREST;
            const canvas = createCanvasSource(width, height);
            this.textureResource = new WebGLTextureResource(canvas, filter, null);
            this.renderTarget = new WebGLRenderTarget(width, height, this.textureResource);
        } else if (a instanceof ArrayBuffer || a instanceof Blob) {
            const ref = typeof b === "string" ? b : "stream";
            const flipped = typeof c === "boolean" ? c : false;
            this.flipVertical = flipped;
            this.inverted = flipped;
            filter = typeof d === "number" ? d : Image.FILTER_LINEAR;
            this.textureResource = new WebGLTextureResource(a, filter, ref);
        } else if (a instanceof WebGLTextureResource) {
            this.textureResource = a;
            width = a.width;
            height = a.height;
        } else {
            filter = typeof b === "number" ? b : Image.FILTER_LINEAR;
            const canvas = createCanvasFromSlickImageData(a);
            this.textureResource = new WebGLTextureResource(canvas, filter, null);
            width = a.getWidth();
            height = a.getHeight();
        }

        this.reinit(width || this.textureResource.width, height || this.textureResource.height);
        this.watchTextureReady(this.textureResource);
    }

    private static fromShared(
        resource: WebGLTextureResource,
        sourceX: number,
        sourceY: number,
        sourceWidth: number,
        sourceHeight: number,
        flipHorizontal: boolean,
        flipVertical: boolean,
        displayWidth: number = sourceWidth,
        displayHeight: number = sourceHeight,
        inverted: boolean = flipVertical
    ): Image {
        const image = Object.create(Image.prototype) as Image;
        image.textureResource = resource;
        image.renderTarget = null;
        image.sourceX = sourceX;
        image.sourceY = sourceY;
        image.sourceWidth = sourceWidth;
        image.sourceHeight = sourceHeight;
        image.displayWidth = displayWidth;
        image.displayHeight = displayHeight;
        image.flipHorizontal = flipHorizontal;
        image.flipVertical = flipVertical;
        image.inverted = inverted;
        image.alpha = 1;
        image.rotation = 0;
        image.centerX = displayWidth / 2;
        image.centerY = displayHeight / 2;
        image.centerSet = false;
        image.imageName = null;
        image.destroyed = false;
        image.cornerColors = null;
        image.pixelScratch = new Uint8Array(4);
        image.sourceRectScratch = new Float64Array(4);
        image.textureGeneration = 0;
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
    public setImageColor(r: number, g: number, b: number, a?: number): void {
        const colors = this.ensureCornerColors();
        for (const color of colors) {
            Image.setColorChannels(color, r, g, b, a);
        }
    }

    /** Java Slick2D counterpart: Image.setColor(int, float, float, float). */
    public setColor(corner: number, r: number, g: number, b: number): void;
    /** Java Slick2D counterpart: Image.setColor(int, float, float, float, float). */
    public setColor(corner: number, r: number, g: number, b: number, a: number): void;
    public setColor(corner: number, r: number, g: number, b: number, a?: number): void {
        if (!Number.isInteger(corner) || corner < Image.TOP_LEFT || corner > Image.BOTTOM_LEFT) {
            throw new RangeError(`Invalid image corner: ${corner}`);
        }
        const color = this.ensureCornerColors()[corner]!;
        Image.setColorChannels(color, r, g, b, a);
    }

    /** Java Slick2D counterpart: Image.clampTexture(). */
    public clampTexture(): void {}

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
        this.throwIfDestroyed();
        return GraphicsFactory.getGraphicsForImage(this);
    }

    /** Java Slick2D counterpart: Image.bind(). */
    public bind(): void {
        Renderer.getBackend().bindTextureResource(this.textureResource);
    }

    /** Java Slick2D counterpart: Image.draw(). */
    public draw(): void;
    /** Java Slick2D counterpart: Image.draw(float, float). */
    public draw(x: number, y: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float). */
    public draw(x: number, y: number, scale: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, Color). */
    public draw(x: number, y: number, scale: number, filter: Color): void;
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
    public draw(x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number, filter: Color): void;
    public draw(x?: number, y?: number, a?: number | Color, b?: number | Color, c?: number | Color, d?: number, e?: number, f?: number, g?: Color): void {
        this.throwIfDestroyed();
        const drawX = x ?? 0;
        const drawY = y ?? 0;
        let drawW = this.getWidth();
        let drawH = this.getHeight();
        let srcX = this.sourceX;
        let srcY = this.sourceY;
        let srcW = this.getSourceWidth();
        let srcH = this.getSourceHeight();
        let tint: Color | null = null;

        if (a instanceof Color) {
            tint = a;
        } else if (typeof a === "number" && b === undefined) {
            drawW = this.getWidth() * a;
            drawH = this.getHeight() * a;
        } else if (typeof a === "number" && b instanceof Color) {
            drawW = this.getWidth() * a;
            drawH = this.getHeight() * a;
            tint = b;
        } else if (typeof a === "number" && typeof b === "number" && c instanceof Color) {
            drawW = a;
            drawH = b;
            tint = c;
        } else if (typeof a === "number" && typeof b === "number" && c === undefined) {
            drawW = a;
            drawH = b;
        } else if (typeof a === "number" && typeof b === "number" && typeof c === "number" && typeof d === "number" && e === undefined) {
            const source = this.mapLogicalSourceRect(a, b, c, d);
            srcX = source[0]!;
            srcY = source[1]!;
            srcW = source[2]!;
            srcH = source[3]!;
            this.drawInternal(drawX, drawY, drawW, drawH, srcX, srcY, srcW, srcH, tint, false);
            return;
        } else if (
            typeof a === "number" &&
            typeof b === "number" &&
            typeof c === "number" &&
            typeof d === "number" &&
            typeof e === "number" &&
            typeof f === "number"
        ) {
            drawW = a - drawX;
            drawH = b - drawY;
            const source = this.mapLogicalSourceRect(c, d, e, f);
            srcX = source[0]!;
            srcY = source[1]!;
            srcW = source[2]!;
            srcH = source[3]!;
            tint = g ?? null;
            this.drawInternal(drawX, drawY, drawW, drawH, srcX, srcY, srcW, srcH, tint, false);
            return;
        }

        this.drawInternal(drawX, drawY, drawW, drawH, srcX, srcY, srcW, srcH, tint);
    }

    /** Java Slick2D counterpart: Image.drawCentered(float, float). */
    public drawCentered(x: number, y: number): void {
        this.draw(x - this.getWidth() / 2, y - this.getHeight() / 2);
    }

    /** Java Slick2D counterpart: Image.drawEmbedded(float, float, float, float). */
    public drawEmbedded(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Image.drawEmbedded(float, float, float, float, float, float, float, float). */
    public drawEmbedded(x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Image.drawEmbedded(float, float, float, float, float, float, float, float, Color). */
    public drawEmbedded(x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number, filter: Color | null): void;
    public drawEmbedded(x: number, y: number, a: number, b: number, c?: number, d?: number, e?: number, f?: number, g: Color | null = null): void {
        if (c === undefined || d === undefined || e === undefined || f === undefined) {
            this.drawEmbeddedInternal(x, y, x + a, y + b, 0, 0, this.getWidth(), this.getHeight(), null, true);
            return;
        }
        this.drawEmbeddedInternal(x, y, a, b, c, d, e, f, g, false);
    }

    /** Java Slick2D counterpart: Image.drawSheared(float, float, float, float). */
    public drawSheared(x: number, y: number, hshear: number, vshear: number): void;
    /** Java Slick2D counterpart: Image.drawSheared(float, float, float, float, Color). */
    public drawSheared(x: number, y: number, hshear: number, vshear: number, filter: Color): void;
    public drawSheared(x: number, y: number, hshear: number, vshear: number, filter: Color | null = Color.white): void {
        const width = this.getWidth();
        const height = this.getHeight();
        this.drawWarpedInternal(x, y, x + width, y + vshear, x + width + hshear, y + height + vshear, x + hshear, y + height, filter);
    }

    /** Java Slick2D counterpart: Image.drawFlash(float, float). */
    public drawFlash(x: number, y: number): void;
    /** Java Slick2D counterpart: Image.drawFlash(float, float, float, float). */
    public drawFlash(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Image.drawFlash(float, float, float, float, Color). */
    public drawFlash(x: number, y: number, width?: number, height?: number, col: Color = Color.white): void {
        this.drawFlashInternal(x, y, width ?? this.getWidth(), height ?? this.getHeight(), col);
    }

    /** Java Slick2D counterpart: Image.setCenterOfRotation(float, float). */
    public setCenterOfRotation(x: number, y: number): void {
        this.centerX = x;
        this.centerY = y;
        this.centerSet = true;
    }

    /** Java Slick2D counterpart: Image.getCenterOfRotationX(). */
    public getCenterOfRotationX(): number {
        return this.centerSet ? this.centerX : this.getWidth() / 2;
    }

    /** Java Slick2D counterpart: Image.getCenterOfRotationY(). */
    public getCenterOfRotationY(): number {
        return this.centerSet ? this.centerY : this.getHeight() / 2;
    }

    /** Java Slick2D counterpart: Image.setRotation(float). */
    public setRotation(angle: number): void {
        this.rotation = normalizeDegrees(angle);
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
        this.alpha = alpha;
    }

    /** Java Slick2D counterpart: Image.rotate(float). */
    public rotate(angle: number): void {
        this.rotation = normalizeDegrees(this.rotation + angle);
    }

    /** Java Slick2D counterpart: Image.getSubImage(int, int, int, int). */
    public getSubImage(x: number, y: number, width: number, height: number): Image {
        if (
            !this.flipHorizontal &&
            !this.flipVertical &&
            this.sourceWidth === 0 &&
            this.sourceHeight === 0 &&
            this.displayWidth === 0 &&
            this.displayHeight === 0
        ) {
            return Image.fromShared(this.textureResource, this.sourceX + x, this.sourceY + y, width, height, false, false, width, height, this.inverted);
        }

        const source = this.mapLogicalSourceRect(x, y, x + width, y + height);
        return Image.fromShared(
            this.textureResource,
            source[0]!,
            source[1]!,
            source[2]!,
            source[3]!,
            this.flipHorizontal,
            this.flipVertical,
            width,
            height,
            this.inverted
        );
    }

    /** Java Slick2D counterpart: Image.drawWarped(...). */
    public drawWarped(
        topLeftX: number,
        topLeftY: number,
        topRightX: number,
        topRightY: number,
        bottomRightX: number,
        bottomRightY: number,
        bottomLeftX: number,
        bottomLeftY: number
    ): void {
        this.drawWarpedInternal(topLeftX, topLeftY, topRightX, topRightY, bottomRightX, bottomRightY, bottomLeftX, bottomLeftY, Color.white);
    }

    /** Java Slick2D counterpart: Image.getWidth(). */
    public getWidth(): number {
        return this.displayWidth || this.sourceWidth || this.textureResource.width;
    }

    /** Java Slick2D counterpart: Image.getHeight(). */
    public getHeight(): number {
        return this.displayHeight || this.sourceHeight || this.textureResource.height;
    }

    /** Java Slick2D counterpart: Image.copy(). */
    public copy(): Image {
        return Image.fromShared(
            this.textureResource,
            this.sourceX,
            this.sourceY,
            this.getSourceWidth(),
            this.getSourceHeight(),
            this.flipHorizontal,
            this.flipVertical,
            this.getWidth(),
            this.getHeight(),
            this.inverted
        );
    }

    /** Java Slick2D counterpart: Image.getScaledCopy(float). */
    public getScaledCopy(scale: number): Image;
    /** Java Slick2D counterpart: Image.getScaledCopy(int, int). */
    public getScaledCopy(width: number, height: number): Image;
    public getScaledCopy(a: number, b?: number): Image {
        const copy = this.copy();
        copy.displayWidth = b === undefined ? Math.trunc(this.getWidth() * a) : a;
        copy.displayHeight = b === undefined ? Math.trunc(this.getHeight() * a) : b;
        if (!copy.centerSet) {
            copy.centerX = copy.displayWidth / 2;
            copy.centerY = copy.displayHeight / 2;
        }
        return copy;
    }

    /** Java Slick2D counterpart: Image.ensureInverted(). */
    public ensureInverted(): void {
        if (!this.inverted) {
            this.flipVertical = !this.flipVertical;
            this.inverted = true;
        }
    }

    /** Java Slick2D counterpart: Image.getFlippedCopy(boolean, boolean). */
    public getFlippedCopy(flipHorizontal: boolean, flipVertical: boolean): Image {
        const copy = this.copy();
        copy.flipHorizontal = this.flipHorizontal !== flipHorizontal;
        copy.flipVertical = this.flipVertical !== flipVertical;
        copy.inverted = copy.flipVertical;
        return copy;
    }

    /** Java Slick2D counterpart: Image.endUse(). */
    public endUse(): void {
        if (Image.inUse !== this) {
            throw new SlickException("The sprite sheet is not currently in use");
        }
        Image.inUse = null;
        Renderer.get().flush();
    }

    /** Java Slick2D counterpart: Image.startUse(). */
    public startUse(): void {
        if (Image.inUse !== null) {
            throw new SlickException("Attempt to start use of a sprite sheet before ending use with another - see endUse()");
        }
        Image.inUse = this;
        Color.white.bind();
        this.bind();
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

    /** Java Slick2D counterpart: Image.getTextureOffsetX(). */
    public getTextureOffsetX(): number {
        const width = this.textureResource.width || 1;
        return (this.flipHorizontal ? this.sourceX + this.getSourceWidth() : this.sourceX) / width;
    }

    /** Java Slick2D counterpart: Image.getTextureOffsetY(). */
    public getTextureOffsetY(): number {
        const height = this.textureResource.height || 1;
        return (this.flipVertical ? this.sourceY + this.getSourceHeight() : this.sourceY) / height;
    }

    /** Java Slick2D counterpart: Image.getTextureWidth(). */
    public getTextureWidth(): number {
        const width = this.textureResource.width || 1;
        return (this.flipHorizontal ? -this.getSourceWidth() : this.getSourceWidth()) / width;
    }

    /** Java Slick2D counterpart: Image.getTextureHeight(). */
    public getTextureHeight(): number {
        const height = this.textureResource.height || 1;
        return (this.flipVertical ? -this.getSourceHeight() : this.getSourceHeight()) / height;
    }

    /** Java Slick2D counterpart: Image.setTexture(Texture). */
    public setTexture(texture: WebGLTextureResource): void {
        this.throwIfDestroyed();
        const ownedTarget = this.renderTarget;
        if (ownedTarget) {
            GraphicsFactory.releaseGraphicsForTexture(this.textureResource);
            ownedTarget.dispose(Renderer.getBackend().getContext());
        }
        this.textureGeneration++;
        this.renderTarget = null;
        this.textureResource = texture;
        this.reinit(texture.width, texture.height);
        this.watchTextureReady(texture);
    }

    /** Java Slick2D counterpart: Image.getColor(int, int). */
    public getColor(x: number, y: number): Color {
        this.throwIfDestroyed();
        const sx = Math.trunc(x);
        const sy = Math.trunc(y);
        if (sx < 0 || sy < 0 || sx >= this.getWidth() || sy >= this.getHeight()) {
            throw new RangeError(`Image pixel coordinate is outside the image: ${sx}, ${sy}`);
        }
        const source = this.mapLogicalSourceRect(sx, sy, sx + 1, sy + 1);
        const pixelX = Math.trunc(source[0]!);
        const pixelY = Math.trunc(source[1]!);
        const target = this.__getRenderTarget();
        const renderer = Renderer.getBackend();
        if (target && renderer.getContext()) {
            renderer.pushRenderTarget(target);
            try {
                renderer.readPixels(pixelX, pixelY, 1, 1, this.pixelScratch);
            } finally {
                renderer.popRenderTarget();
            }
        } else if (!this.textureResource.getPixelInto(pixelX, pixelY, this.pixelScratch, renderer.getContext())) {
            throw new SlickException("Image pixel data is not available; wait for resources to finish loading before calling getColor");
        }
        return Color.fromInts(this.pixelScratch[0]!, this.pixelScratch[1]!, this.pixelScratch[2]!, this.pixelScratch[3]!);
    }

    /** Java Slick2D counterpart: Image.isDestroyed(). */
    public isDestroyed(): boolean {
        return this.destroyed;
    }

    /** Java Slick2D counterpart: Image.destroy(). */
    public destroy(): void {
        if (this.destroyed) {
            return;
        }
        const resource = this.textureResource;
        const gl = Renderer.getBackend().getContext();
        const ownedTarget = this.renderTarget;
        GraphicsFactory.releaseGraphicsForImage(this);
        ownedTarget?.dispose(gl);
        this.renderTarget = null;
        resource.dispose(gl);
        this.destroyed = true;
    }

    /** Java Slick2D counterpart: Image.flushPixelData(). */
    public flushPixelData(): void {
        this.textureResource.flushPixelData();
    }

    /** Internal renderer hook returning the texture resource. */
    public __getTextureResource(): WebGLTextureResource | null {
        return this.destroyed ? null : this.textureResource;
    }

    /** Internal renderer hook returning the render target if this image is writable. */
    public __getRenderTarget(): WebGLRenderTarget | null {
        return this.destroyed ? null : (this.textureResource.__getRenderTarget() ?? GraphicsFactory.getRenderTarget(this.textureResource));
    }

    /** @internal Returns only the target originally owned by this Image instance. */
    public __getOwnedRenderTarget(): WebGLRenderTarget | null {
        return this.destroyed || this.textureResource.__getRenderTarget() !== this.renderTarget ? null : this.renderTarget;
    }

    /** Internal renderer hook returning Slick per-corner tint colors. */
    public __getCornerColors(): [Color, Color, Color, Color] | null {
        return this.cornerColors;
    }

    private drawInternal(
        x: number,
        y: number,
        width: number,
        height: number,
        srcX: number,
        srcY: number,
        srcWidth: number,
        srcHeight: number,
        tint: Color | null,
        useCornerColors: boolean = true
    ): void {
        const renderer = Renderer.getBackend();
        const effectiveSrcX = this.flipHorizontal ? srcX + srcWidth : srcX;
        const effectiveSrcY = this.flipVertical ? srcY + srcHeight : srcY;
        const effectiveSrcW = this.flipHorizontal ? -srcWidth : srcWidth;
        const effectiveSrcH = this.flipVertical ? -srcHeight : srcHeight;
        if (this.rotation === 0) {
            renderer.drawImage(
                this,
                x,
                y,
                width,
                height,
                effectiveSrcX,
                effectiveSrcY,
                effectiveSrcW,
                effectiveSrcH,
                this.alpha,
                tint,
                IDENTITY_TRANSFORM,
                useCornerColors
            );
            return;
        }
        const scaleX = width / (this.getWidth() || 1);
        const scaleY = height / (this.getHeight() || 1);
        const centerX = x + this.getCenterOfRotationX() * scaleX;
        const centerY = y + this.getCenterOfRotationY() * scaleY;
        renderer.pushTransform();
        try {
            renderer.rotate(centerX, centerY, this.rotation);
            renderer.drawImage(
                this,
                x,
                y,
                width,
                height,
                effectiveSrcX,
                effectiveSrcY,
                effectiveSrcW,
                effectiveSrcH,
                this.alpha,
                tint,
                IDENTITY_TRANSFORM,
                useCornerColors
            );
        } finally {
            renderer.popTransform();
        }
    }

    private drawEmbeddedInternal(
        x: number,
        y: number,
        x2: number,
        y2: number,
        srcx: number,
        srcy: number,
        srcx2: number,
        srcy2: number,
        tint: Color | null,
        useCornerColors: boolean
    ): void {
        this.throwIfDestroyed();
        const source = this.mapLogicalSourceRect(srcx, srcy, srcx2, srcy2);
        const sourceX = source[0]!;
        const sourceY = source[1]!;
        const sourceWidth = source[2]!;
        const sourceHeight = source[3]!;
        const embeddedSrcX = this.flipHorizontal ? sourceX + sourceWidth : sourceX;
        const embeddedSrcY = this.flipVertical ? sourceY + sourceHeight : sourceY;
        const embeddedSrcW = this.flipHorizontal ? -sourceWidth : sourceWidth;
        const embeddedSrcH = this.flipVertical ? -sourceHeight : sourceHeight;
        Renderer.getBackend().drawImage(
            this,
            x,
            y,
            x2 - x,
            y2 - y,
            embeddedSrcX,
            embeddedSrcY,
            embeddedSrcW,
            embeddedSrcH,
            1,
            tint,
            IDENTITY_TRANSFORM,
            useCornerColors,
            tint === null
        );
    }

    private drawWarpedInternal(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, tint: Color | null): void {
        this.throwIfDestroyed();
        const renderer = Renderer.getBackend();
        const srcWidth = this.getSourceWidth();
        const srcHeight = this.getSourceHeight();
        const effectiveSrcX = this.flipHorizontal ? this.sourceX + srcWidth : this.sourceX;
        const effectiveSrcY = this.flipVertical ? this.sourceY + srcHeight : this.sourceY;
        const effectiveSrcW = this.flipHorizontal ? -srcWidth : srcWidth;
        const effectiveSrcH = this.flipVertical ? -srcHeight : srcHeight;
        if (this.rotation === 0) {
            renderer.drawImageWarped(
                this,
                x1,
                y1,
                x2,
                y2,
                x3,
                y3,
                x4,
                y4,
                effectiveSrcX,
                effectiveSrcY,
                effectiveSrcW,
                effectiveSrcH,
                this.alpha,
                tint,
                IDENTITY_TRANSFORM
            );
            return;
        }
        renderer.pushTransform();
        try {
            renderer.rotate(x1 + this.getCenterOfRotationX(), y1 + this.getCenterOfRotationY(), this.rotation);
            renderer.drawImageWarped(
                this,
                x1,
                y1,
                x2,
                y2,
                x3,
                y3,
                x4,
                y4,
                effectiveSrcX,
                effectiveSrcY,
                effectiveSrcW,
                effectiveSrcH,
                this.alpha,
                tint,
                IDENTITY_TRANSFORM
            );
        } finally {
            renderer.popTransform();
        }
    }

    private drawFlashInternal(x: number, y: number, width: number, height: number, tint: Color): void {
        this.throwIfDestroyed();
        const renderer = Renderer.getBackend();
        const srcWidth = this.getSourceWidth();
        const srcHeight = this.getSourceHeight();
        const effectiveSrcX = this.flipHorizontal ? this.sourceX + srcWidth : this.sourceX;
        const effectiveSrcY = this.flipVertical ? this.sourceY + srcHeight : this.sourceY;
        const effectiveSrcW = this.flipHorizontal ? -srcWidth : srcWidth;
        const effectiveSrcH = this.flipVertical ? -srcHeight : srcHeight;
        if (this.rotation === 0) {
            renderer.drawImageFlash(this, x, y, width, height, effectiveSrcX, effectiveSrcY, effectiveSrcW, effectiveSrcH, tint, IDENTITY_TRANSFORM);
            return;
        }
        const scaleX = width / (this.getWidth() || 1);
        const scaleY = height / (this.getHeight() || 1);
        const centerX = x + this.getCenterOfRotationX() * scaleX;
        const centerY = y + this.getCenterOfRotationY() * scaleY;
        renderer.pushTransform();
        try {
            renderer.rotate(centerX, centerY, this.rotation);
            renderer.drawImageFlash(this, x, y, width, height, effectiveSrcX, effectiveSrcY, effectiveSrcW, effectiveSrcH, tint, IDENTITY_TRANSFORM);
        } finally {
            renderer.popTransform();
        }
    }

    private ensureCornerColors(): [Color, Color, Color, Color] {
        if (!this.cornerColors) {
            this.cornerColors = [Color.white.copy(), Color.white.copy(), Color.white.copy(), Color.white.copy()];
        }
        return this.cornerColors;
    }

    private static setColorChannels(color: Color, r: number, g: number, b: number, a?: number): void {
        color.r = r;
        color.g = g;
        color.b = b;
        if (a !== undefined) {
            color.a = a;
        }
    }

    private mapLogicalSourceRect(x1: number, y1: number, x2: number, y2: number): Float64Array {
        const displayWidth = this.getWidth() || 1;
        const displayHeight = this.getHeight() || 1;
        const sourceWidth = this.getSourceWidth();
        const sourceHeight = this.getSourceHeight();
        const offsetX = (x1 / displayWidth) * sourceWidth;
        const offsetY = (y1 / displayHeight) * sourceHeight;
        const width = ((x2 - x1) / displayWidth) * sourceWidth;
        const height = ((y2 - y1) / displayHeight) * sourceHeight;
        this.sourceRectScratch[0] = this.flipHorizontal ? this.sourceX + sourceWidth - offsetX - width : this.sourceX + offsetX;
        this.sourceRectScratch[1] = this.flipVertical ? this.sourceY + sourceHeight - offsetY - height : this.sourceY + offsetY;
        this.sourceRectScratch[2] = width;
        this.sourceRectScratch[3] = height;
        return this.sourceRectScratch;
    }

    private reinit(width: number = this.textureResource.width, height: number = this.textureResource.height): void {
        this.sourceX = 0;
        this.sourceY = 0;
        this.sourceWidth = width;
        this.sourceHeight = height;
        this.displayWidth = width;
        this.displayHeight = height;
        this.centerX = width / 2;
        this.centerY = height / 2;
        this.centerSet = false;
    }

    private watchTextureReady(resource: WebGLTextureResource): void {
        const generation = ++this.textureGeneration;
        const pending = resource.ready();
        if (!pending) {
            return;
        }
        void pending.then(
            () => {
                if (!this.destroyed && generation === this.textureGeneration && resource === this.textureResource) {
                    this.reinit(resource.width, resource.height);
                }
            },
            () => undefined
        );
    }

    private throwIfDestroyed(): void {
        if (this.destroyed) {
            throw new SlickException("Image has been destroyed");
        }
    }

    private getSourceWidth(): number {
        return this.sourceWidth || this.textureResource.width;
    }

    private getSourceHeight(): number {
        return this.sourceHeight || this.textureResource.height;
    }
}
