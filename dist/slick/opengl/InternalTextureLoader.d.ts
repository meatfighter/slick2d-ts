import type { Color } from "../Color.js";
import type { WebGLTextureResource } from "../rendering/WebGLTextureResource.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.InternalTextureLoader.
 *
 * Tracks all logical texture resources and shares path-loaded textures using
 * Slick's separate nearest/linear caches.
 */
export declare class InternalTextureLoader {
    private static readonly instance;
    private readonly textures;
    private readonly linearTextures;
    private readonly nearestTextures;
    private holdTextureData;
    private deferredLoading;
    private sixteenBit;
    /** Java Slick2D counterpart: InternalTextureLoader.get(). */
    static get(): InternalTextureLoader;
    /** Java Slick2D counterpart: InternalTextureLoader.setHoldTextureData(boolean). */
    setHoldTextureData(holdTextureData: boolean): void;
    /** Java Slick2D counterpart: InternalTextureLoader.setDeferredLoading(boolean). */
    setDeferredLoading(deferred: boolean): void;
    /** Java Slick2D counterpart: InternalTextureLoader.isDeferredLoading(). */
    isDeferredLoading(): boolean;
    /**
     * Browser texture acquisition helper mirroring Slick's filter-separated
     * cache identity: resource reference, transparent color, and load flip.
     */
    getTexture(ref: string, filter: number, transparent: Color | null, flipped: boolean, factory: () => WebGLTextureResource): WebGLTextureResource;
    /** Java Slick2D counterpart: InternalTextureLoader.clear(). */
    clear(): void;
    /** Java Slick2D counterpart: InternalTextureLoader.clear(String). */
    clear(name: string): void;
    /** Java Slick2D counterpart: InternalTextureLoader.set16BitMode(). */
    set16BitMode(): void;
    /** Java Slick2D counterpart: InternalTextureLoader.get2Fold(int). */
    static get2Fold(fold: number): number;
    /** Java Slick2D counterpart: InternalTextureLoader.createIntBuffer(int). */
    static createIntBuffer(size: number): Int32Array;
    /** Java Slick2D counterpart: InternalTextureLoader.reload(). */
    reload(): void;
    /** Browser parity helper: drops GPU texture handles without clearing logical texture tracking. */
    invalidate(): void;
    /** Browser parity helper: registers a texture resource for Java-style cache clearing. */
    register(texture: WebGLTextureResource): void;
    /** Browser parity helper: removes a texture resource from tracking and acquisition caches. */
    unregister(texture: WebGLTextureResource): void;
    /** Browser parity helper: returns whether texture data retention was requested. */
    isHoldingTextureData(): boolean;
    /** Browser parity helper: returns whether 16-bit mode was requested. */
    is16BitMode(): boolean;
    private static cacheKey;
    private static removeCachedTexture;
}
//# sourceMappingURL=InternalTextureLoader.d.ts.map