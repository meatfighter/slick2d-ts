import { WebGLTextureResource } from "./WebGLTextureResource.js";

/**
 * Internal framebuffer-backed render target used by writable Slick images.
 *
 * A target either owns a transient blank texture (Image(width, height)) or
 * wraps an existing loaded texture (GraphicsFactory). Pixel changes made
 * through either form are transient across WebGL context restoration.
 */
export class WebGLRenderTarget {
    public framebuffer: WebGLFramebuffer | null = null;
    public texture: WebGLTexture | null = null;
    public readonly textureResource: WebGLTextureResource;
    private contextGeneration = -1;

    /** Creates a framebuffer-backed target. */
    public constructor(
        public readonly width: number,
        public readonly height: number,
        textureResource: WebGLTextureResource,
        private readonly allocateBlankTexture: boolean = true
    ) {
        this.textureResource = textureResource;
        textureResource.attachRenderTarget(this);
    }

    /** Creates a framebuffer wrapper around a texture resource already loaded by Slick. */
    public static forTexture(textureResource: WebGLTextureResource): WebGLRenderTarget {
        const existing = textureResource.__getRenderTarget();
        if (existing) {
            return existing;
        }
        return new WebGLRenderTarget(textureResource.width, textureResource.height, textureResource, false);
    }

    /** Ensures framebuffer and texture objects exist for a WebGL context. */
    public ensure(gl: WebGL2RenderingContext, contextGeneration: number = 0): void {
        const resourceTexture = this.textureResource.__getTextureReference();
        if (this.framebuffer && this.texture && this.contextGeneration === contextGeneration && resourceTexture === this.texture) {
            return;
        }
        if (this.framebuffer || this.texture) {
            this.invalidate(this.contextGeneration === contextGeneration ? gl : null);
        }

        const texture = this.allocateBlankTexture ? gl.createTexture() : this.textureResource.ensureTexture(gl);
        const framebuffer = gl.createFramebuffer();
        if (!texture || !framebuffer) {
            if (framebuffer) {
                gl.deleteFramebuffer(framebuffer);
            }
            if (this.allocateBlankTexture && texture) {
                gl.deleteTexture(texture);
            }
            return;
        }

        this.texture = texture;
        this.framebuffer = framebuffer;
        if (this.allocateBlankTexture) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            this.textureResource.applyFilter(gl);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            this.textureResource.attachTexture(texture, this.width, this.height);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        this.contextGeneration = contextGeneration;
    }

    /** Marks the texture's CPU-side pixel cache stale before drawing begins. */
    public markModified(): void {
        this.textureResource.markGpuModified();
    }

    /** Drops context-owned framebuffer state while keeping the logical resource alive. */
    public invalidate(gl: WebGL2RenderingContext | null = null): void {
        const texture = this.texture;
        const resourceOwnsTexture = texture !== null && this.textureResource.__getTextureReference() === texture;
        if (gl && !WebGLRenderTarget.isContextLost(gl)) {
            if (this.framebuffer) {
                gl.deleteFramebuffer(this.framebuffer);
            }
            if (this.allocateBlankTexture && resourceOwnsTexture) {
                gl.deleteTexture(texture);
            }
        }
        this.framebuffer = null;
        this.texture = null;
        this.contextGeneration = -1;
        if (this.allocateBlankTexture) {
            this.textureResource.detachTexture(texture);
        }
    }

    /** Releases framebuffer state; wrapped resources retain their texture. */
    public dispose(gl: WebGL2RenderingContext | null): void {
        this.invalidate(gl);
        this.textureResource.detachRenderTarget(this);
    }

    /** Returns whether this target owns the texture allocation it attaches. */
    public ownsTextureAllocation(): boolean {
        return this.allocateBlankTexture;
    }

    private static isContextLost(gl: WebGL2RenderingContext): boolean {
        return typeof gl.isContextLost === "function" && gl.isContextLost();
    }
}
