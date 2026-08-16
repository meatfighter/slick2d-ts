import { SlickException } from "../SlickException.js";
import type { LoadableImageData } from "./LoadableImageData.js";

function nextPowerOfTwo(value: number): number {
    let result = 2;
    while (result < value) {
        result <<= 1;
    }
    return result;
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.ImageIOImageData.
 *
 * Browser image-data compatibility shell for non-TGA image bytes.
 */
export class ImageIOImageData implements LoadableImageData {
    private depth = 32;
    private width = 0;
    private height = 0;
    private texWidth = 0;
    private texHeight = 0;
    private buffer = new Uint8Array(0);
    private edging = true;

    /** Java Slick2D counterpart: ImageIOImageData(). */
    public constructor() {}

    /** Java Slick2D counterpart: ImageData.getDepth(). */
    public getDepth(): number {
        return this.depth;
    }

    /** Java Slick2D counterpart: ImageData.getWidth(). */
    public getWidth(): number {
        return this.width;
    }

    /** Java Slick2D counterpart: ImageData.getHeight(). */
    public getHeight(): number {
        return this.height;
    }

    /** Java Slick2D counterpart: ImageData.getTexWidth(). */
    public getTexWidth(): number {
        return this.texWidth;
    }

    /** Java Slick2D counterpart: ImageData.getTexHeight(). */
    public getTexHeight(): number {
        return this.texHeight;
    }

    /** Java Slick2D counterpart: LoadableImageData.configureEdging(boolean). */
    public configureEdging(edging: boolean): void {
        this.edging = edging;
    }

    /** Java Slick2D counterpart: ImageIOImageData.loadImage(InputStream). */
    public loadImage(data: ArrayBuffer | Uint8Array): Uint8Array;
    /** Java Slick2D counterpart: ImageIOImageData.loadImage(InputStream, boolean, int[]). */
    public loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, transparent: number[] | null): Uint8Array;
    /** Java Slick2D counterpart: ImageIOImageData.loadImage(InputStream, boolean, boolean, int[]). */
    public loadImage(data: ArrayBuffer | Uint8Array, flipped: boolean, forceAlpha: boolean, transparent: number[] | null): Uint8Array;
    public loadImage(
        _data: ArrayBuffer | Uint8Array,
        _flipped: boolean = true,
        _forceAlphaOrTransparent: boolean | number[] | null = false,
        _transparentMaybe: number[] | null = null
    ): Uint8Array {
        throw new SlickException("ImageIOImageData.loadImage requires async browser image decoding; use imageToByteBuffer with a decoded image source");
    }

    /** Java Slick2D counterpart: ImageIOImageData.imageToByteBuffer(BufferedImage, ...). */
    public imageToByteBuffer(
        image: ImageBitmap | HTMLImageElement | OffscreenCanvas,
        flipped: boolean,
        forceAlpha: boolean,
        transparent: number[] | null
    ): Uint8Array {
        this.width = image.width;
        this.height = image.height;
        this.texWidth = nextPowerOfTwo(this.width);
        this.texHeight = nextPowerOfTwo(this.height);
        this.depth = forceAlpha || transparent ? 32 : 32;
        const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(this.texWidth, this.texHeight) : document.createElement("canvas");
        canvas.width = this.texWidth;
        canvas.height = this.texHeight;
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
        if (!ctx) {
            throw new SlickException("Unable to create 2D staging context for ImageIOImageData");
        }
        if (flipped) {
            ctx.translate(0, this.height);
            ctx.scale(1, -1);
        }
        ctx.drawImage(image, 0, 0);
        const domData = ctx.getImageData(0, 0, this.texWidth, this.texHeight);
        this.buffer = new Uint8Array(domData.data.buffer.slice(0));
        if (transparent) {
            for (let i = 0; i < this.buffer.length; i += 4) {
                if (this.buffer[i] === transparent[0] && this.buffer[i + 1] === transparent[1] && this.buffer[i + 2] === transparent[2]) {
                    this.buffer[i + 3] = 0;
                }
            }
        }
        void this.edging;
        return this.buffer;
    }

    /** Java Slick2D counterpart: ImageData.getImageBufferData(). */
    public getImageBufferData(): Uint8Array {
        return this.buffer;
    }
}
