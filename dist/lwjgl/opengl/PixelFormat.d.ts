/**
 * Java LWJGL counterpart: org.lwjgl.opengl.PixelFormat.
 *
 * Immutable context-attribute request used by Display.create overloads.
 */
export declare class PixelFormat {
    private readonly bpp;
    private readonly alpha;
    private readonly depth;
    private readonly stencil;
    private readonly samples;
    constructor();
    constructor(alpha: number, depth: number, stencil: number);
    constructor(alpha: number, depth: number, stencil: number, samples: number);
    constructor(bpp: number, alpha: number, depth: number, stencil: number, samples: number);
    /** Java LWJGL counterpart: PixelFormat.withBitsPerPixel(int). */
    withBitsPerPixel(bits: number): PixelFormat;
    /** Java LWJGL counterpart: PixelFormat.withAlphaBits(int). */
    withAlphaBits(alpha: number): PixelFormat;
    /** Java LWJGL counterpart: PixelFormat.withDepthBits(int). */
    withDepthBits(depth: number): PixelFormat;
    /** Java LWJGL counterpart: PixelFormat.withStencilBits(int). */
    withStencilBits(stencil: number): PixelFormat;
    /** Java LWJGL counterpart: PixelFormat.withSamples(int). */
    withSamples(samples: number): PixelFormat;
    /** Java LWJGL counterpart: PixelFormat.getBitsPerPixel(). */
    getBitsPerPixel(): number;
    /** Java LWJGL counterpart: PixelFormat.getAlphaBits(). */
    getAlphaBits(): number;
    /** Java LWJGL counterpart: PixelFormat.getDepthBits(). */
    getDepthBits(): number;
    /** Java LWJGL counterpart: PixelFormat.getStencilBits(). */
    getStencilBits(): number;
    /** Java LWJGL counterpart: PixelFormat.getSamples(). */
    getSamples(): number;
}
//# sourceMappingURL=PixelFormat.d.ts.map