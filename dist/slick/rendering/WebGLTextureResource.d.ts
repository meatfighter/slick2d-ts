import type { Color } from "../Color.js";
type TextureSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;
export type WebGLTextureLoadOptions = {
    transparent?: Color | null;
};
/**
 * Internal WebGL texture resource.
 *
 * Owns decoded image data plus the lazily-created WebGL texture.
 */
export declare class WebGLTextureResource {
    readonly ref: string | null;
    width: number;
    height: number;
    filter: number;
    source: TextureSource | null;
    private texture;
    private readonly pending;
    private pixelData;
    /** Creates a texture resource from an existing image-like source. */
    constructor(source: TextureSource, filter: number, ref?: string | null, options?: WebGLTextureLoadOptions);
    /** Creates a texture resource from already-available browser bytes. */
    constructor(source: ArrayBuffer | Blob, filter: number, ref: string, options?: WebGLTextureLoadOptions);
    /** Creates a texture resource from a Java resource reference. */
    constructor(ref: string, filter: number, options?: WebGLTextureLoadOptions);
    /** Returns true when the decoded image source is available. */
    isReady(): boolean;
    /** Returns a pending decode promise, if this resource was path-created. */
    ready(): Promise<void> | null;
    /** Returns the cached RGBA pixel at a texture-space coordinate. */
    getPixel(x: number, y: number): [number, number, number, number] | null;
    /** Returns or creates the WebGL texture for a context. */
    ensureTexture(gl: WebGL2RenderingContext): WebGLTexture | null;
    /** Attaches a framebuffer texture so render-target images can be drawn. */
    attachTexture(texture: WebGLTexture, width: number, height: number): void;
    /** Applies the Slick filter mode to the WebGL texture. */
    applyFilter(gl: WebGL2RenderingContext): void;
    /** Releases the underlying WebGL texture object. */
    dispose(gl: WebGL2RenderingContext | null): void;
    private load;
    private loadBytes;
    private prepareLoadedSource;
}
export {};
//# sourceMappingURL=WebGLTextureResource.d.ts.map