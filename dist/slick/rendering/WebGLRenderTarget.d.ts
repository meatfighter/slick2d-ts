import { WebGLTextureResource } from "./WebGLTextureResource.js";
/**
 * Internal framebuffer-backed render target for Image(width, height).
 */
export declare class WebGLRenderTarget {
    readonly width: number;
    readonly height: number;
    framebuffer: WebGLFramebuffer | null;
    texture: WebGLTexture | null;
    readonly textureResource: WebGLTextureResource;
    /** Creates a framebuffer-backed render target with an associated texture resource. */
    constructor(width: number, height: number, textureResource: WebGLTextureResource);
    /** Ensures framebuffer and texture objects exist for a WebGL context. */
    ensure(gl: WebGL2RenderingContext): void;
    /** Releases framebuffer and texture objects. */
    dispose(gl: WebGL2RenderingContext | null): void;
}
//# sourceMappingURL=WebGLRenderTarget.d.ts.map