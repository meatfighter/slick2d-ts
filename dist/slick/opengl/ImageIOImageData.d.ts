import type { LoadableImageData } from "./LoadableImageData.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.ImageIOImageData.
 *
 * Browser image-data compatibility shell for non-TGA image bytes.
 */
export declare class ImageIOImageData implements LoadableImageData {
    private depth;
    private width;
    private height;
    private texWidth;
    private texHeight;
    private buffer;
    private edging;
    /** Java Slick2D counterpart: ImageIOImageData(). */
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
    configureEdging(edging: boolean): void;
    /** Java Slick2D counterpart: ImageIOImageData.loadImage(InputStream). */
    loadImage(data: ArrayBuffer | Uint8Array): Uint8Array;
    /** Java Slick2D counterpart: ImageIOImageData.loadImage(InputStream, boolean, int[]). */
    loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, transparent: number[] | null): Uint8Array;
    /** Java Slick2D counterpart: ImageIOImageData.loadImage(InputStream, boolean, boolean, int[]). */
    loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, forceAlpha: boolean, transparent: number[] | null): Uint8Array;
    /** Java Slick2D counterpart: ImageIOImageData.imageToByteBuffer(BufferedImage, ...). */
    imageToByteBuffer(image: ImageBitmap | HTMLImageElement | OffscreenCanvas, flipped: boolean, forceAlpha: boolean, transparent: number[] | null): Uint8Array;
    /** Java Slick2D counterpart: ImageData.getImageBufferData(). */
    getImageBufferData(): Uint8Array;
}
//# sourceMappingURL=ImageIOImageData.d.ts.map