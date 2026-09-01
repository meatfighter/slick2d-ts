import { WebGLTextureResource } from "./WebGLTextureResource.js";
/**
 * Internal framebuffer-backed render target used by writable Slick images.
 *
 * A target either owns a transient blank texture (Image(width, height)) or
 * wraps an existing loaded texture (GraphicsFactory). Pixel changes made
 * through either form are transient across WebGL context restoration.
 */
export declare class WebGLRenderTarget {
    readonly width: number;
    readonly height: number;
    private readonly allocateBlankTexture;
    framebuffer: WebGLFramebuffer | null;
    texture: WebGLTexture | null;
    readonly textureResource: WebGLTextureResource;
    private contextGeneration;
    /** Creates a framebuffer-backed target. */
    constructor(width: number, height: number, textureResource: WebGLTextureResource, allocateBlankTexture?: boolean);
    /** Creates a framebuffer wrapper around a texture resource already loaded by Slick. */
    static forTexture(textureResource: WebGLTextureResource): WebGLRenderTarget;
    /** Ensures framebuffer and texture objects exist for a WebGL context. */
    ensure(gl: WebGL2RenderingContext, contextGeneration?: number): void;
    /** Marks the texture's CPU-side pixel cache stale before drawing begins. */
    markModified(): void;
    /** Drops context-owned framebuffer state while keeping the logical resource alive. */
    invalidate(gl?: WebGL2RenderingContext | null): void;
    /** Releases framebuffer state; wrapped resources retain their texture. */
    dispose(gl: WebGL2RenderingContext | null): void;
    /** Returns whether this target owns the texture allocation it attaches. */
    ownsTextureAllocation(): boolean;
    private static isContextLost;
}
//# sourceMappingURL=WebGLRenderTarget.d.ts.map