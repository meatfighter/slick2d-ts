import { Graphics } from "../Graphics.js";
import type { Image } from "../Image.js";
import { SlickException } from "../SlickException.js";
import { WebGLRenderTarget } from "../rendering/WebGLRenderTarget.js";
import type { WebGLTextureResource } from "../rendering/WebGLTextureResource.js";
import { Renderer } from "./renderer/Renderer.js";

type GraphicsEntry = {
    readonly target: WebGLRenderTarget;
    readonly graphics: Graphics;
    readonly ownsTargetWrapper: boolean;
};

/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.pbuffer.GraphicsFactory.
 *
 * Caches one Graphics context by underlying texture identity. Images and
 * subimages that share a texture therefore share their writable context too.
 */
export class GraphicsFactory {
    private static readonly graphics = new Map<WebGLTextureResource, GraphicsEntry>();

    private constructor() {}

    /** Java Slick2D counterpart: GraphicsFactory.getGraphicsForImage(Image). */
    public static getGraphicsForImage(image: Image): Graphics {
        const resource = image.__getTextureResource();
        if (!resource) {
            throw new SlickException("Image has been destroyed");
        }
        const existing = GraphicsFactory.graphics.get(resource);
        if (existing) {
            return existing.graphics;
        }
        if (!resource.isReady() || resource.width <= 0 || resource.height <= 0) {
            throw new SlickException("Image must finish loading before getGraphics() is called");
        }

        const resourceTarget = resource.__getRenderTarget();
        const ownedTarget = image.__getOwnedRenderTarget();
        const target = resourceTarget ?? ownedTarget ?? WebGLRenderTarget.forTexture(resource);
        const graphics = new Graphics(target);
        GraphicsFactory.graphics.set(resource, {
            target,
            graphics,
            ownsTargetWrapper: ownedTarget === null
        });
        return graphics;
    }

    /** @internal Returns an already-created target for a shared texture. */
    public static getRenderTarget(resource: WebGLTextureResource): WebGLRenderTarget | null {
        return GraphicsFactory.graphics.get(resource)?.target ?? null;
    }

    /** Java Slick2D counterpart: GraphicsFactory.releaseGraphicsForImage(Image). */
    public static releaseGraphicsForImage(image: Image): void {
        const resource = image.__getTextureResource();
        if (resource) {
            GraphicsFactory.releaseGraphicsForTexture(resource);
        }
    }

    /** @internal Releases the cached context for an underlying texture. */
    public static releaseGraphicsForTexture(resource: WebGLTextureResource): void {
        const entry = GraphicsFactory.graphics.get(resource);
        if (!entry) {
            return;
        }
        GraphicsFactory.graphics.delete(resource);
        entry.graphics.destroy();
        if (entry.ownsTargetWrapper) {
            entry.target.dispose(Renderer.getBackend().getContext());
        }
    }
}
