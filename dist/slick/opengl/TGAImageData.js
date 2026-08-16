import { SlickException } from "../SlickException.js";
function toBytes(data) {
    return data instanceof Uint8Array ? data : new Uint8Array(data);
}
function nextPowerOfTwo(value) {
    let result = 2;
    while (result < value) {
        result <<= 1;
    }
    return result;
}
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.TGAImageData.
 *
 * Loader for uncompressed 24-bit and 32-bit TGA files.
 */
export class TGAImageData {
    depth = 0;
    width = 0;
    height = 0;
    texWidth = 0;
    texHeight = 0;
    buffer = new Uint8Array(0);
    /** Java Slick2D counterpart: TGAImageData(). */
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
    configureEdging(_edging) { }
    loadImage(data, flipped = true, forceAlphaOrTransparent = false, transparentMaybe = null) {
        const forceAlpha = typeof forceAlphaOrTransparent === "boolean" ? forceAlphaOrTransparent : false;
        const transparent = Array.isArray(forceAlphaOrTransparent) ? forceAlphaOrTransparent : transparentMaybe;
        const bytes = toBytes(data);
        if (bytes.length < 18) {
            throw new SlickException("Invalid TGA file: header too short");
        }
        const idLength = bytes[0];
        const colorMapType = bytes[1];
        const imageType = bytes[2];
        if (colorMapType !== 0 || imageType !== 2) {
            throw new SlickException("Unsupported TGA file: only uncompressed true-color images are supported");
        }
        this.width = bytes[12] | (bytes[13] << 8);
        this.height = bytes[14] | (bytes[15] << 8);
        const bits = bytes[16];
        if (bits !== 24 && bits !== 32) {
            throw new SlickException(`Unsupported TGA depth: ${bits}`);
        }
        this.depth = bits === 32 || forceAlpha || transparent ? 32 : 24;
        this.texWidth = nextPowerOfTwo(this.width);
        this.texHeight = nextPowerOfTwo(this.height);
        const components = this.depth / 8;
        const sourceComponents = bits / 8;
        const sourceStart = 18 + idLength;
        if (sourceStart + this.width * this.height * sourceComponents > bytes.length) {
            throw new SlickException("Invalid TGA file: pixel data truncated");
        }
        const descriptor = bytes[17];
        const topOrigin = (descriptor & 0x20) !== 0;
        this.buffer = new Uint8Array(this.texWidth * this.texHeight * components);
        for (let y = 0; y < this.height; y++) {
            const sourceY = topOrigin ? y : this.height - 1 - y;
            const destY = flipped ? this.height - 1 - y : y;
            for (let x = 0; x < this.width; x++) {
                const src = sourceStart + (sourceY * this.width + x) * sourceComponents;
                const dst = (destY * this.texWidth + x) * components;
                const b = bytes[src];
                const g = bytes[src + 1];
                const r = bytes[src + 2];
                const sourceA = sourceComponents === 4 ? bytes[src + 3] : 255;
                const transparentMatch = transparent ? r === transparent[0] && g === transparent[1] && b === transparent[2] : false;
                this.buffer[dst] = r;
                this.buffer[dst + 1] = g;
                this.buffer[dst + 2] = b;
                if (components === 4) {
                    this.buffer[dst + 3] = transparentMatch ? 0 : sourceA;
                }
            }
        }
        return this.buffer;
    }
    /** Java Slick2D counterpart: ImageData.getImageBufferData(). */
    getImageBufferData() {
        return this.buffer;
    }
}
//# sourceMappingURL=TGAImageData.js.map