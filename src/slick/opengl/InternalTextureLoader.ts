/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.InternalTextureLoader.
 *
 * Compatibility facade over WebGL texture resource caching.
 */
export class InternalTextureLoader {
    private static readonly instance = new InternalTextureLoader();
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
    public clear(_name: string): void;
    public clear(_name?: string): void {
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
