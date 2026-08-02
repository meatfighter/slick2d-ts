import type { ImageData } from "./ImageData.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.LoadableImageData.
 *
 * Image data loader contract operating on already-loaded browser bytes.
 */
export interface LoadableImageData extends ImageData {
    /** Java Slick2D counterpart: LoadableImageData.configureEdging(boolean). */
    configureEdging(edging: boolean): void;
    /** Java Slick2D counterpart: LoadableImageData.loadImage(InputStream). */
    loadImage(data: ArrayBuffer | Uint8Array): Uint8Array;
    /** Java Slick2D counterpart: LoadableImageData.loadImage(InputStream, boolean, int[]). */
    loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, transparent: number[] | null): Uint8Array;
    /** Java Slick2D counterpart: LoadableImageData.loadImage(InputStream, boolean, boolean, int[]). */
    loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, forceAlpha: boolean, transparent: number[] | null): Uint8Array;
}
