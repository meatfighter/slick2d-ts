import { Graphics } from "../Graphics.js";
import type { Image } from "../Image.js";
import { WebGLRenderTarget } from "../rendering/WebGLRenderTarget.js";
import type { WebGLTextureResource } from "../rendering/WebGLTextureResource.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.pbuffer.GraphicsFactory.
 *
 * Caches one Graphics context by underlying texture identity. Images and
 * subimages that share a texture therefore share their writable context too.
 */
export declare class GraphicsFactory {
    private static readonly graphics;
    private constructor();
    /** Java Slick2D counterpart: GraphicsFactory.getGraphicsForImage(Image). */
    static getGraphicsForImage(image: Image): Graphics;
    /** @internal Returns an already-created target for a shared texture. */
    static getRenderTarget(resource: WebGLTextureResource): WebGLRenderTarget | null;
    /** Java Slick2D counterpart: GraphicsFactory.releaseGraphicsForImage(Image). */
    static releaseGraphicsForImage(image: Image): void;
    /** @internal Releases the cached context for an underlying texture. */
    static releaseGraphicsForTexture(resource: WebGLTextureResource): void;
}
//# sourceMappingURL=GraphicsFactory.d.ts.map