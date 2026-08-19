import { Renderer } from "./renderer/Renderer.js";
import type { WebGLTextureResource } from "../rendering/WebGLTextureResource.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.InternalTextureLoader.
 *
 * Compatibility facade over WebGL texture resource caching.
 */
export class InternalTextureLoader {
    private static readonly instance = new InternalTextureLoader();
    private readonly textures = new Set<WebGLTextureResource>();
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

    /** Java Slick2D counterpart: InternalTextureLoader.clear(). */
    public clear(): void;
    /** Java Slick2D counterpart: InternalTextureLoader.clear(String). */
    public clear(name: string): void;
    public clear(name?: string): void {
        const gl = Renderer.getBackend().getContext();
        for (const texture of Array.from(this.textures)) {
            if (name === undefined || texture.ref === name) {
                texture.dispose(gl);
                this.textures.delete(texture);
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

    /** Browser parity helper: removes a texture resource from Java-style cache tracking. */
    public unregister(texture: WebGLTextureResource): void {
        this.textures.delete(texture);
    }

    /** Browser parity helper: returns whether texture data retention was requested. */
    public isHoldingTextureData(): boolean {
        return this.holdTextureData;
    }

    /** Browser parity helper: returns whether 16-bit mode was requested. */
    public is16BitMode(): boolean {
        return this.sixteenBit;
    }
}
