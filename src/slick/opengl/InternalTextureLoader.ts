import type { Color } from "../Color.js";
import type { WebGLTextureResource } from "../rendering/WebGLTextureResource.js";
import { GraphicsFactory } from "./GraphicsFactory.js";
import { Renderer } from "./renderer/Renderer.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.InternalTextureLoader.
 *
 * Tracks all logical texture resources and shares path-loaded textures using
 * Slick's separate nearest/linear caches.
 */
export class InternalTextureLoader {
    private static readonly instance = new InternalTextureLoader();
    private readonly textures = new Set<WebGLTextureResource>();
    private readonly linearTextures = new Map<string, WebGLTextureResource>();
    private readonly nearestTextures = new Map<string, WebGLTextureResource>();
    private holdTextureData = false;
    private deferredLoading = false;
    private sixteenBit = false;

    /** Java Slick2D counterpart: InternalTextureLoader.get(). */
    public static get(): InternalTextureLoader {
        return InternalTextureLoader.instance;
    }

    /** Java Slick2D counterpart: InternalTextureLoader.setHoldTextureData(boolean). */
    public setHoldTextureData(holdTextureData: boolean): void {
        this.holdTextureData = holdTextureData;
    }

    /** Java Slick2D counterpart: InternalTextureLoader.setDeferredLoading(boolean). */
    public setDeferredLoading(deferred: boolean): void {
        this.deferredLoading = deferred;
    }

    /** Java Slick2D counterpart: InternalTextureLoader.isDeferredLoading(). */
    public isDeferredLoading(): boolean {
        return this.deferredLoading;
    }

    /**
     * Browser texture acquisition helper mirroring Slick's filter-separated
     * cache identity: resource reference, transparent color, and load flip.
     */
    public getTexture(ref: string, filter: number, transparent: Color | null, flipped: boolean, factory: () => WebGLTextureResource): WebGLTextureResource {
        const cache = filter === 2 ? this.nearestTextures : this.linearTextures;
        const key = InternalTextureLoader.cacheKey(ref, transparent, flipped);
        const existing = cache.get(key);
        if (existing) {
            return existing;
        }
        const texture = factory();
        cache.set(key, texture);
        const pending = texture.ready?.() ?? null;
        if (pending) {
            void pending.catch(() => {
                if (cache.get(key) === texture) {
                    this.unregister(texture);
                }
            });
        }
        return texture;
    }

    /** Java Slick2D counterpart: InternalTextureLoader.clear(). */
    public clear(): void;
    /** Java Slick2D counterpart: InternalTextureLoader.clear(String). */
    public clear(name: string): void;
    public clear(name?: string): void {
        const gl = Renderer.getBackend().getContext();
        for (const texture of Array.from(this.textures)) {
            if (name === undefined || texture.ref === name) {
                // Remove tracking first so clear() is idempotent even for
                // compatibility resources whose dispose() does not unregister itself.
                this.unregister(texture);
                GraphicsFactory.releaseGraphicsForTexture(texture);
                texture.dispose(gl);
            }
        }
    }

    /** Java Slick2D counterpart: InternalTextureLoader.set16BitMode(). */
    public set16BitMode(): void {
        this.sixteenBit = true;
    }

    /** Java Slick2D counterpart: InternalTextureLoader.get2Fold(int). */
    public static get2Fold(fold: number): number {
        let ret = 2;
        while (ret < fold) {
            ret <<= 1;
        }
        return ret;
    }

    /** Java Slick2D counterpart: InternalTextureLoader.createIntBuffer(int). */
    public static createIntBuffer(size: number): Int32Array {
        return new Int32Array(size);
    }

    /** Java Slick2D counterpart: InternalTextureLoader.reload(). */
    public reload(): void {
        this.invalidate();
    }

    /** Browser parity helper: drops GPU texture handles without clearing logical texture tracking. */
    public invalidate(): void {
        const gl = Renderer.getBackend().getContext();
        for (const texture of this.textures) {
            texture.invalidateTexture(gl);
        }
    }

    /** Browser parity helper: registers a texture resource for Java-style cache clearing. */
    public register(texture: WebGLTextureResource): void {
        this.textures.add(texture);
    }

    /** Browser parity helper: removes a texture resource from tracking and acquisition caches. */
    public unregister(texture: WebGLTextureResource): void {
        this.textures.delete(texture);
        InternalTextureLoader.removeCachedTexture(this.linearTextures, texture);
        InternalTextureLoader.removeCachedTexture(this.nearestTextures, texture);
    }

    /** Browser parity helper: returns whether texture data retention was requested. */
    public isHoldingTextureData(): boolean {
        return this.holdTextureData;
    }

    /** Browser parity helper: returns whether 16-bit mode was requested. */
    public is16BitMode(): boolean {
        return this.sixteenBit;
    }

    private static cacheKey(ref: string, transparent: Color | null, flipped: boolean): string {
        if (!transparent) {
            return `${ref}:${flipped ? 1 : 0}`;
        }
        return `${ref}:${flipped ? 1 : 0}:${transparent.getRed()}:${transparent.getGreen()}:${transparent.getBlue()}`;
    }

    private static removeCachedTexture(cache: Map<string, WebGLTextureResource>, texture: WebGLTextureResource): void {
        for (const [key, cached] of cache) {
            if (cached === texture) {
                cache.delete(key);
            }
        }
    }
}
