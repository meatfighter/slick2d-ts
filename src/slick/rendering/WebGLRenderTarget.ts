import { WebGLTextureResource } from "./WebGLTextureResource.js";

/**
 * Internal framebuffer-backed render target for Image(width, height).
 */
export class WebGLRenderTarget {
    public readonly width: number;
    public readonly height: number;
    public framebuffer: WebGLFramebuffer | null = null;
    public texture: WebGLTexture | null = null;
    public readonly textureResource: WebGLTextureResource;

    /** Creates a render target placeholder with an associated texture resource. */
    public constructor(width: number, height: number, textureResource: WebGLTextureResource) {
        this.width = width;
        this.height = height;
        this.textureResource = textureResource;
    }

    /** Ensures framebuffer and texture objects exist for a WebGL context. */
    public ensure(gl: WebGL2RenderingContext): void {
        if (this.framebuffer && this.texture) {
            return;
        }
        this.texture = gl.createTexture();
        this.framebuffer = gl.createFramebuffer();
        if (!this.texture || !this.framebuffer) {
            return;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        this.textureResource.attachTexture(this.texture, this.width, this.height);
    }

    /** Releases framebuffer and texture objects. */
    public dispose(gl: WebGL2RenderingContext | null): void {
        if (gl && this.framebuffer) {
            gl.deleteFramebuffer(this.framebuffer);
        }
        if (gl && this.texture) {
            gl.deleteTexture(this.texture);
        }
        this.framebuffer = null;
        this.texture = null;
    }
}
