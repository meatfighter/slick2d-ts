/**
 * Java LWJGL counterpart: org.lwjgl.opengl.PixelFormat.
 *
 * Immutable context-attribute request used by Display.create overloads.
 */
export class PixelFormat {
    bpp;
    alpha;
    depth;
    stencil;
    samples;
    /** Java LWJGL counterpart: PixelFormat constructors. */
    constructor(first = 0, second = 8, third = 0, fourth = 0, fifth) {
        if (fifth === undefined) {
            this.bpp = 0;
            this.alpha = first;
            this.depth = second;
            this.stencil = third;
            this.samples = fourth;
            return;
        }
        this.bpp = first;
        this.alpha = second;
        this.depth = third;
        this.stencil = fourth;
        this.samples = fifth;
    }
    /** Java LWJGL counterpart: PixelFormat.withBitsPerPixel(int). */
    withBitsPerPixel(bits) {
        return new PixelFormat(bits, this.alpha, this.depth, this.stencil, this.samples);
    }
    /** Java LWJGL counterpart: PixelFormat.withAlphaBits(int). */
    withAlphaBits(alpha) {
        return new PixelFormat(this.bpp, alpha, this.depth, this.stencil, this.samples);
    }
    /** Java LWJGL counterpart: PixelFormat.withDepthBits(int). */
    withDepthBits(depth) {
        return new PixelFormat(this.bpp, this.alpha, depth, this.stencil, this.samples);
    }
    /** Java LWJGL counterpart: PixelFormat.withStencilBits(int). */
    withStencilBits(stencil) {
        return new PixelFormat(this.bpp, this.alpha, this.depth, stencil, this.samples);
    }
    /** Java LWJGL counterpart: PixelFormat.withSamples(int). */
    withSamples(samples) {
        return new PixelFormat(this.bpp, this.alpha, this.depth, this.stencil, samples);
    }
    /** Java LWJGL counterpart: PixelFormat.getBitsPerPixel(). */
    getBitsPerPixel() {
        return this.bpp;
    }
    /** Java LWJGL counterpart: PixelFormat.getAlphaBits(). */
    getAlphaBits() {
        return this.alpha;
    }
    /** Java LWJGL counterpart: PixelFormat.getDepthBits(). */
    getDepthBits() {
        return this.depth;
    }
    /** Java LWJGL counterpart: PixelFormat.getStencilBits(). */
    getStencilBits() {
        return this.stencil;
    }
    /** Java LWJGL counterpart: PixelFormat.getSamples(). */
    getSamples() {
        return this.samples;
    }
}
//# sourceMappingURL=PixelFormat.js.map