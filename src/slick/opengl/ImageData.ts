/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.ImageData.
 *
 * Slick image byte-data interface, distinct from the DOM ImageData type.
 */
export interface ImageData {
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
    /** Java Slick2D counterpart: ImageData.getImageBufferData(). */
    getImageBufferData(): Uint8Array;
}
