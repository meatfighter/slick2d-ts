import { GraphicsFactory } from "./GraphicsFactory.js";
import { Renderer } from "./renderer/Renderer.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.InternalTextureLoader.
 *
 * Tracks all logical texture resources and shares path-loaded textures using
 * Slick's separate nearest/linear caches.
 */
export class InternalTextureLoader {
    static instance = new InternalTextureLoader();
    textures = new Set();
    linearTextures = new Map();
    nearestTextures = new Map();
    holdTextureData = false;
    deferredLoading = false;
    sixteenBit = false;
    /** Java Slick2D counterpart: InternalTextureLoader.get(). */
    static get() {
        return InternalTextureLoader.instance;
    }
    /** Java Slick2D counterpart: InternalTextureLoader.setHoldTextureData(boolean). */
    setHoldTextureData(holdTextureData) {
        this.holdTextureData = holdTextureData;
    }
    /** Java Slick2D counterpart: InternalTextureLoader.setDeferredLoading(boolean). */
    setDeferredLoading(deferred) {
        this.deferredLoading = deferred;
    }
    /** Java Slick2D counterpart: InternalTextureLoader.isDeferredLoading(). */
    isDeferredLoading() {
        return this.deferredLoading;
    }
    /**
     * Browser texture acquisition helper mirroring Slick's filter-separated
     * cache identity: resource reference, transparent color, and load flip.
     */
    getTexture(ref, filter, transparent, flipped, factory) {
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
    clear(name) {
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
    set16BitMode() {
        this.sixteenBit = true;
    }
    /** Java Slick2D counterpart: InternalTextureLoader.get2Fold(int). */
    static get2Fold(fold) {
        let ret = 2;
        while (ret < fold) {
            ret <<= 1;
        }
        return ret;
    }
    /** Java Slick2D counterpart: InternalTextureLoader.createIntBuffer(int). */
    static createIntBuffer(size) {
        return new Int32Array(size);
    }
    /** Java Slick2D counterpart: InternalTextureLoader.reload(). */
    reload() {
        this.invalidate();
    }
    /** Browser parity helper: drops GPU texture handles without clearing logical texture tracking. */
    invalidate() {
        const gl = Renderer.getBackend().getContext();
        for (const texture of this.textures) {
            texture.invalidateTexture(gl);
        }
    }
    /** Browser parity helper: registers a texture resource for Java-style cache clearing. */
    register(texture) {
        this.textures.add(texture);
    }
    /** Browser parity helper: removes a texture resource from tracking and acquisition caches. */
    unregister(texture) {
        this.textures.delete(texture);
        InternalTextureLoader.removeCachedTexture(this.linearTextures, texture);
        InternalTextureLoader.removeCachedTexture(this.nearestTextures, texture);
    }
    /** Browser parity helper: returns whether texture data retention was requested. */
    isHoldingTextureData() {
        return this.holdTextureData;
    }
    /** Browser parity helper: returns whether 16-bit mode was requested. */
    is16BitMode() {
        return this.sixteenBit;
    }
    static cacheKey(ref, transparent, flipped) {
        if (!transparent) {
            return `${ref}:${flipped ? 1 : 0}`;
        }
        return `${ref}:${flipped ? 1 : 0}:${transparent.getRed()}:${transparent.getGreen()}:${transparent.getBlue()}`;
    }
    static removeCachedTexture(cache, texture) {
        for (const [key, cached] of cache) {
            if (cached === texture) {
                cache.delete(key);
            }
        }
    }
}
//# sourceMappingURL=InternalTextureLoader.js.map