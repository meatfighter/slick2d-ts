import type { WebGLTextureResource } from "../rendering/WebGLTextureResource.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.InternalTextureLoader.
 *
 * Compatibility facade over WebGL texture resource caching.
 */
export declare class InternalTextureLoader {
    private static readonly instance;
    private readonly textures;
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
    /** Browser parity helper: removes a texture resource from Java-style cache tracking. */
    unregister(texture: WebGLTextureResource): void;
    /** Browser parity helper: returns whether texture data retention was requested. */
    isHoldingTextureData(): boolean;
    /** Browser parity helper: returns whether 16-bit mode was requested. */
    is16BitMode(): boolean;
}
//# sourceMappingURL=InternalTextureLoader.d.ts.map