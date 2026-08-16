import type { LoadableImageData } from "./LoadableImageData.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.TGAImageData.
 *
 * Loader for uncompressed 24-bit and 32-bit TGA files.
 */
export declare class TGAImageData implements LoadableImageData {
    private depth;
    private width;
    private height;
    private texWidth;
    private texHeight;
    private buffer;
    /** Java Slick2D counterpart: TGAImageData(). */
    constructor();
    /** Java Slick2D counterpart: ImageData.getDepth(). */
    getDepth(): number;
    /** Java Slick2D counterpart: ImageData.getWidth(). */
    getWidth(): number;
    /** Java Slick2D counterpart: ImageData.getHeight(). */
    getHeight(): number;
    /** Java Slick2D counterpart: ImageData.getTexWidth(). */
    getTexWidth(): number;
    /** Java Slick2D counterpart: ImageData.getTexHeight(). */
    getTexHeight(): number;
    /** Java Slick2D counterpart: LoadableImageData.configureEdging(boolean). */
    configureEdging(_edging: boolean): void;
    /** Java Slick2D counterpart: TGAImageData.loadImage(InputStream). */
    loadImage(data: ArrayBuffer | Uint8Array): Uint8Array;
    /** Java Slick2D counterpart: TGAImageData.loadImage(InputStream, boolean, int[]). */
    loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, transparent: number[] | null): Uint8Array;
    /** Java Slick2D counterpart: TGAImageData.loadImage(InputStream, boolean, boolean, int[]). */
    loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, forceAlpha: boolean, transparent: number[] | null): Uint8Array;
    /** Java Slick2D counterpart: ImageData.getImageBufferData(). */
    getImageBufferData(): Uint8Array;
}
//# sourceMappingURL=TGAImageData.d.ts.map