import type { Color } from "../Color.js";
import type { WebGLRenderTarget } from "./WebGLRenderTarget.js";
type TextureSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;
export type WebGLTextureLoadOptions = {
    transparent?: Color | null;
};
/**
 * Internal WebGL texture resource.
 *
 * Owns a decoded source, lazily-created CPU pixel data, and a context-owned
 * WebGL texture. Render-target pixels are transient across context restoration.
 */
export declare class WebGLTextureResource {
    readonly ref: string | null;
    width: number;
    height: number;
    filter: number;
    source: TextureSource | null;
    private texture;
    private renderTarget;
    private readonly pending;
    private pixelData;
    private gpuPixelsAuthoritative;
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
    /** Copies the cached or lazily materialized RGBA pixel into a caller-owned buffer. */
    getPixelInto(x: number, y: number, target: Uint8Array, gl?: WebGL2RenderingContext | null): boolean;
    /** Java-style pixel-cache invalidation used by Image.flushPixelData(). */
    flushPixelData(): void;
    /** Marks the GPU texture as newer than the retained decoded source. */
    markGpuModified(): void;
    /** Returns or creates the WebGL texture for a context. */
    ensureTexture(gl: WebGL2RenderingContext): WebGLTexture | null;
    /** Attaches a framebuffer texture so render-target images can be drawn. */
    attachTexture(texture: WebGLTexture, width: number, height: number): void;
    /** @internal Returns the context-owned texture currently attached to this resource. */
    __getTextureReference(): WebGLTexture | null;
    /** @internal Associates the one framebuffer wrapper belonging to this texture identity. */
    attachRenderTarget(target: WebGLRenderTarget): void;
    /** @internal Returns the framebuffer wrapper associated with this texture identity. */
    __getRenderTarget(): WebGLRenderTarget | null;
    /** @internal Removes an associated framebuffer wrapper after disposal. */
    detachRenderTarget(target: WebGLRenderTarget): void;
    /** Drops a context-owned WebGL texture while keeping decoded image data available. */
    invalidateTexture(gl?: WebGL2RenderingContext | null): void;
    /** Detaches a framebuffer-owned texture handle without unregistering this logical resource. */
    detachTexture(texture?: WebGLTexture | null): void;
    /** Applies the Slick filter mode to the WebGL texture. */
    applyFilter(gl: WebGL2RenderingContext): void;
    /** @internal Reapplies the current filter to an already-created texture. */
    __applyFilterToExistingTexture(gl: WebGL2RenderingContext): void;
    /** Releases the underlying WebGL texture object. */
    dispose(gl: WebGL2RenderingContext | null): void;
    private materializeGpuPixelData;
    private materializePixelData;
    private static isContextLost;
    private load;
    private loadBytes;
    private prepareLoadedSource;
}
export {};
//# sourceMappingURL=WebGLTextureResource.d.ts.map