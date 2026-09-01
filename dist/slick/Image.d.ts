import { Color } from "./Color.js";
import { Graphics } from "./Graphics.js";
import type { Renderable } from "./Renderable.js";
import { WebGLRenderTarget } from "./rendering/WebGLRenderTarget.js";
import { WebGLTextureResource } from "./rendering/WebGLTextureResource.js";
import type { ImageData as SlickImageData } from "./opengl/ImageData.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.Image.
 *
 * Texture-backed image with Slick-compatible mutable draw state.
 */
export declare class Image implements Renderable {
    static readonly TOP_LEFT = 0;
    static readonly TOP_RIGHT = 1;
    static readonly BOTTOM_RIGHT = 2;
    static readonly BOTTOM_LEFT = 3;
    static readonly FILTER_LINEAR = 1;
    static readonly FILTER_NEAREST = 2;
    private static inUse;
    private textureResource;
    private renderTarget;
    private sourceX;
    private sourceY;
    private sourceWidth;
    private sourceHeight;
    private displayWidth;
    private displayHeight;
    private flipHorizontal;
    private flipVertical;
    private inverted;
    private alpha;
    private rotation;
    private centerX;
    private centerY;
    private centerSet;
    private imageName;
    private destroyed;
    private cornerColors;
    private pixelScratch;
    private sourceRectScratch;
    private textureGeneration;
    constructor(ref: string);
    constructor(ref: string, trans: Color);
    constructor(ref: string, flipped: boolean);
    constructor(ref: string, flipped: boolean, filter: number);
    constructor(ref: string, flipped: boolean, filter: number, transparent: Color);
    constructor(width: number, height: number);
    constructor(width: number, height: number, filter: number);
    constructor(input: ArrayBuffer | Blob, ref: string, flipped: boolean);
    constructor(input: ArrayBuffer | Blob, ref: string, flipped: boolean, filter: number);
    constructor(data: SlickImageData);
    constructor(data: SlickImageData, filter: number);
    constructor(texture: WebGLTextureResource);
    constructor(image: Image);
    private static fromShared;
    /** Java Slick2D counterpart: Image.setFilter(int). */
    setFilter(filter: number): void;
    /** Java Slick2D counterpart: Image.getFilter(). */
    getFilter(): number;
    /** Java Slick2D counterpart: Image.getResourceReference(). */
    getResourceReference(): string | null;
    /** Java Slick2D counterpart: Image.setImageColor(float, float, float). */
    setImageColor(r: number, g: number, b: number): void;
    /** Java Slick2D counterpart: Image.setImageColor(float, float, float, float). */
    setImageColor(r: number, g: number, b: number, a: number): void;
    /** Java Slick2D counterpart: Image.setColor(int, float, float, float). */
    setColor(corner: number, r: number, g: number, b: number): void;
    /** Java Slick2D counterpart: Image.setColor(int, float, float, float, float). */
    setColor(corner: number, r: number, g: number, b: number, a: number): void;
    /** Java Slick2D counterpart: Image.clampTexture(). */
    clampTexture(): void;
    /** Java Slick2D counterpart: Image.setName(String). */
    setName(name: string): void;
    /** Java Slick2D counterpart: Image.getName(). */
    getName(): string | null;
    /** Java Slick2D counterpart: Image.getGraphics(). */
    getGraphics(): Graphics;
    /** Java Slick2D counterpart: Image.bind(). */
    bind(): void;
    /** Java Slick2D counterpart: Image.draw(). */
    draw(): void;
    /** Java Slick2D counterpart: Image.draw(float, float). */
    draw(x: number, y: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float). */
    draw(x: number, y: number, scale: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, Color). */
    draw(x: number, y: number, scale: number, filter: Color): void;
    /** Java Slick2D counterpart: Image.draw(float, float, Color). */
    draw(x: number, y: number, filter: Color): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float). */
    draw(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float, Color). */
    draw(x: number, y: number, width: number, height: number, filter: Color): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float, float, float). */
    draw(x: number, y: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float, float, float, float, float). */
    draw(x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Image.draw(float, float, float, float, float, float, float, float, Color). */
    draw(x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number, filter: Color): void;
    /** Java Slick2D counterpart: Image.drawCentered(float, float). */
    drawCentered(x: number, y: number): void;
    /** Java Slick2D counterpart: Image.drawEmbedded(float, float, float, float). */
    drawEmbedded(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Image.drawEmbedded(float, float, float, float, float, float, float, float). */
    drawEmbedded(x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number): void;
    /** Java Slick2D counterpart: Image.drawEmbedded(float, float, float, float, float, float, float, float, Color). */
    drawEmbedded(x: number, y: number, x2: number, y2: number, srcx: number, srcy: number, srcx2: number, srcy2: number, filter: Color | null): void;
    /** Java Slick2D counterpart: Image.drawSheared(float, float, float, float). */
    drawSheared(x: number, y: number, hshear: number, vshear: number): void;
    /** Java Slick2D counterpart: Image.drawSheared(float, float, float, float, Color). */
    drawSheared(x: number, y: number, hshear: number, vshear: number, filter: Color): void;
    /** Java Slick2D counterpart: Image.drawFlash(float, float). */
    drawFlash(x: number, y: number): void;
    /** Java Slick2D counterpart: Image.drawFlash(float, float, float, float). */
    drawFlash(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: Image.setCenterOfRotation(float, float). */
    setCenterOfRotation(x: number, y: number): void;
    /** Java Slick2D counterpart: Image.getCenterOfRotationX(). */
    getCenterOfRotationX(): number;
    /** Java Slick2D counterpart: Image.getCenterOfRotationY(). */
    getCenterOfRotationY(): number;
    /** Java Slick2D counterpart: Image.setRotation(float). */
    setRotation(angle: number): void;
    /** Java Slick2D counterpart: Image.getRotation(). */
    getRotation(): number;
    /** Java Slick2D counterpart: Image.getAlpha(). */
    getAlpha(): number;
    /** Java Slick2D counterpart: Image.setAlpha(float). */
    setAlpha(alpha: number): void;
    /** Java Slick2D counterpart: Image.rotate(float). */
    rotate(angle: number): void;
    /** Java Slick2D counterpart: Image.getSubImage(int, int, int, int). */
    getSubImage(x: number, y: number, width: number, height: number): Image;
    /** Java Slick2D counterpart: Image.drawWarped(...). */
    drawWarped(topLeftX: number, topLeftY: number, topRightX: number, topRightY: number, bottomRightX: number, bottomRightY: number, bottomLeftX: number, bottomLeftY: number): void;
    /** Java Slick2D counterpart: Image.getWidth(). */
    getWidth(): number;
    /** Java Slick2D counterpart: Image.getHeight(). */
    getHeight(): number;
    /** Java Slick2D counterpart: Image.copy(). */
    copy(): Image;
    /** Java Slick2D counterpart: Image.getScaledCopy(float). */
    getScaledCopy(scale: number): Image;
    /** Java Slick2D counterpart: Image.getScaledCopy(int, int). */
    getScaledCopy(width: number, height: number): Image;
    /** Java Slick2D counterpart: Image.ensureInverted(). */
    ensureInverted(): void;
    /** Java Slick2D counterpart: Image.getFlippedCopy(boolean, boolean). */
    getFlippedCopy(flipHorizontal: boolean, flipVertical: boolean): Image;
    /** Java Slick2D counterpart: Image.endUse(). */
    endUse(): void;
    /** Java Slick2D counterpart: Image.startUse(). */
    startUse(): void;
    /** Java Slick2D counterpart: Image.toString(). */
    toString(): string;
    /** Java Slick2D counterpart: Image.getTexture(). */
    getTexture(): WebGLTextureResource;
    /** Java Slick2D counterpart: Image.getTextureOffsetX(). */
    getTextureOffsetX(): number;
    /** Java Slick2D counterpart: Image.getTextureOffsetY(). */
    getTextureOffsetY(): number;
    /** Java Slick2D counterpart: Image.getTextureWidth(). */
    getTextureWidth(): number;
    /** Java Slick2D counterpart: Image.getTextureHeight(). */
    getTextureHeight(): number;
    /** Java Slick2D counterpart: Image.setTexture(Texture). */
    setTexture(texture: WebGLTextureResource): void;
    /** Java Slick2D counterpart: Image.getColor(int, int). */
    getColor(x: number, y: number): Color;
    /** Java Slick2D counterpart: Image.isDestroyed(). */
    isDestroyed(): boolean;
    /** Java Slick2D counterpart: Image.destroy(). */
    destroy(): void;
    /** Java Slick2D counterpart: Image.flushPixelData(). */
    flushPixelData(): void;
    /** Internal renderer hook returning the texture resource. */
    __getTextureResource(): WebGLTextureResource | null;
    /** Internal renderer hook returning the render target if this image is writable. */
    __getRenderTarget(): WebGLRenderTarget | null;
    /** @internal Returns only the target originally owned by this Image instance. */
    __getOwnedRenderTarget(): WebGLRenderTarget | null;
    /** Internal renderer hook returning Slick per-corner tint colors. */
    __getCornerColors(): [Color, Color, Color, Color] | null;
    private drawInternal;
    private drawEmbeddedInternal;
    private drawWarpedInternal;
    private drawFlashInternal;
    private ensureCornerColors;
    private static setColorChannels;
    private mapLogicalSourceRect;
    private reinit;
    private watchTextureReady;
    private throwIfDestroyed;
    private getSourceWidth;
    private getSourceHeight;
}
//# sourceMappingURL=Image.d.ts.map