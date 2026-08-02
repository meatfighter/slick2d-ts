/**
 * Java LWJGL counterpart: org.lwjgl.opengl.PixelFormat.
 *
 * Immutable context-attribute request used by Display.create overloads.
 */
export class PixelFormat {
    private readonly bpp: number;
    private readonly alpha: number;
    private readonly depth: number;
    private readonly stencil: number;
    private readonly samples: number;

    public constructor();
    public constructor(alpha: number, depth: number, stencil: number);
    public constructor(alpha: number, depth: number, stencil: number, samples: number);
    public constructor(bpp: number, alpha: number, depth: number, stencil: number, samples: number);
    /** Java LWJGL counterpart: PixelFormat constructors. */
    public constructor(first: number = 0, second: number = 8, third: number = 0, fourth: number = 0, fifth?: number) {
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
    public withBitsPerPixel(bits: number): PixelFormat {
        return new PixelFormat(bits, this.alpha, this.depth, this.stencil, this.samples);
    }

    /** Java LWJGL counterpart: PixelFormat.withAlphaBits(int). */
    public withAlphaBits(alpha: number): PixelFormat {
        return new PixelFormat(this.bpp, alpha, this.depth, this.stencil, this.samples);
    }

    /** Java LWJGL counterpart: PixelFormat.withDepthBits(int). */
    public withDepthBits(depth: number): PixelFormat {
        return new PixelFormat(this.bpp, this.alpha, depth, this.stencil, this.samples);
    }

    /** Java LWJGL counterpart: PixelFormat.withStencilBits(int). */
    public withStencilBits(stencil: number): PixelFormat {
        return new PixelFormat(this.bpp, this.alpha, this.depth, stencil, this.samples);
    }

    /** Java LWJGL counterpart: PixelFormat.withSamples(int). */
    public withSamples(samples: number): PixelFormat {
        return new PixelFormat(this.bpp, this.alpha, this.depth, this.stencil, samples);
    }

    /** Java LWJGL counterpart: PixelFormat.getBitsPerPixel(). */
    public getBitsPerPixel(): number {
        return this.bpp;
    }

    /** Java LWJGL counterpart: PixelFormat.getAlphaBits(). */
    public getAlphaBits(): number {
        return this.alpha;
    }

    /** Java LWJGL counterpart: PixelFormat.getDepthBits(). */
    public getDepthBits(): number {
        return this.depth;
    }

    /** Java LWJGL counterpart: PixelFormat.getStencilBits(). */
    public getStencilBits(): number {
        return this.stencil;
    }

    /** Java LWJGL counterpart: PixelFormat.getSamples(). */
    public getSamples(): number {
        return this.samples;
    }
}
