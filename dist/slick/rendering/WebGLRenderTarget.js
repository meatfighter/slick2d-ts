/**
 * Internal framebuffer-backed render target used by writable Slick images.
 *
 * A target either owns a transient blank texture (Image(width, height)) or
 * wraps an existing loaded texture (GraphicsFactory). Pixel changes made
 * through either form are transient across WebGL context restoration.
 */
export class WebGLRenderTarget {
    width;
    height;
    allocateBlankTexture;
    framebuffer = null;
    texture = null;
    textureResource;
    contextGeneration = -1;
    /** Creates a framebuffer-backed target. */
    constructor(width, height, textureResource, allocateBlankTexture = true) {
        this.width = width;
        this.height = height;
        this.allocateBlankTexture = allocateBlankTexture;
        this.textureResource = textureResource;
        textureResource.attachRenderTarget(this);
    }
    /** Creates a framebuffer wrapper around a texture resource already loaded by Slick. */
    static forTexture(textureResource) {
        const existing = textureResource.__getRenderTarget();
        if (existing) {
            return existing;
        }
        return new WebGLRenderTarget(textureResource.width, textureResource.height, textureResource, false);
    }
    /** Ensures framebuffer and texture objects exist for a WebGL context. */
    ensure(gl, contextGeneration = 0) {
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
    markModified() {
        this.textureResource.markGpuModified();
    }
    /** Drops context-owned framebuffer state while keeping the logical resource alive. */
    invalidate(gl = null) {
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
    dispose(gl) {
        this.invalidate(gl);
        this.textureResource.detachRenderTarget(this);
    }
    /** Returns whether this target owns the texture allocation it attaches. */
    ownsTextureAllocation() {
        return this.allocateBlankTexture;
    }
    static isContextLost(gl) {
        return typeof gl.isContextLost === "function" && gl.isContextLost();
    }
}
//# sourceMappingURL=WebGLRenderTarget.js.map