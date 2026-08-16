import { Renderer } from "./renderer/Renderer.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.InternalTextureLoader.
 *
 * Compatibility facade over WebGL texture resource caching.
 */
export class InternalTextureLoader {
    static instance = new InternalTextureLoader();
    textures = new Set();
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
    clear(name) {
        const gl = Renderer.getBackend().getContext();
        for (const texture of Array.from(this.textures)) {
            if (name === undefined || texture.ref === name) {
                texture.dispose(gl);
                this.textures.delete(texture);
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
        const gl = Renderer.getBackend().getContext();
        for (const texture of Array.from(this.textures)) {
            texture.dispose(gl);
        }
    }
    /** Browser parity helper: registers a texture resource for Java-style cache clearing. */
    register(texture) {
        this.textures.add(texture);
    }
    /** Browser parity helper: removes a texture resource from Java-style cache tracking. */
    unregister(texture) {
        this.textures.delete(texture);
    }
    /** Browser parity helper: returns whether texture data retention was requested. */
    isHoldingTextureData() {
        return this.holdTextureData;
    }
    /** Browser parity helper: returns whether 16-bit mode was requested. */
    is16BitMode() {
        return this.sixteenBit;
    }
}
//# sourceMappingURL=InternalTextureLoader.js.map