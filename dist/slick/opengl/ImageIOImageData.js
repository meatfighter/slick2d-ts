import { SlickException } from "../SlickException.js";
function nextPowerOfTwo(value) {
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
export class ImageIOImageData {
    depth = 32;
    width = 0;
    height = 0;
    texWidth = 0;
    texHeight = 0;
    buffer = new Uint8Array(0);
    edging = true;
    /** Java Slick2D counterpart: ImageIOImageData(). */
    constructor() { }
    /** Java Slick2D counterpart: ImageData.getDepth(). */
    getDepth() {
        return this.depth;
    }
    /** Java Slick2D counterpart: ImageData.getWidth(). */
    getWidth() {
        return this.width;
    }
    /** Java Slick2D counterpart: ImageData.getHeight(). */
    getHeight() {
        return this.height;
    }
    /** Java Slick2D counterpart: ImageData.getTexWidth(). */
    getTexWidth() {
        return this.texWidth;
    }
    /** Java Slick2D counterpart: ImageData.getTexHeight(). */
    getTexHeight() {
        return this.texHeight;
    }
    /** Java Slick2D counterpart: LoadableImageData.configureEdging(boolean). */
    configureEdging(edging) {
        this.edging = edging;
    }
    loadImage(_data, _flipped = true, _forceAlphaOrTransparent = false, _transparentMaybe = null) {
        throw new SlickException("ImageIOImageData.loadImage requires async browser image decoding; use imageToByteBuffer with a decoded image source");
    }
    /** Java Slick2D counterpart: ImageIOImageData.imageToByteBuffer(BufferedImage, ...). */
    imageToByteBuffer(image, flipped, forceAlpha, transparent) {
        this.width = image.width;
        this.height = image.height;
        this.texWidth = nextPowerOfTwo(this.width);
        this.texHeight = nextPowerOfTwo(this.height);
        this.depth = forceAlpha || transparent ? 32 : 32;
        const canvas = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(this.texWidth, this.texHeight) : document.createElement("canvas");
        canvas.width = this.texWidth;
        canvas.height = this.texHeight;
        const ctx = canvas.getContext("2d");
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
    getImageBufferData() {
        return this.buffer;
    }
}
//# sourceMappingURL=ImageIOImageData.js.map