import { ResourceLoader } from "../util/ResourceLoader.js";

type TextureSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;

/**
 * Internal WebGL texture resource.
 *
 * Owns decoded image data plus the lazily-created WebGL texture.
 */
export class WebGLTextureResource {
    public readonly ref: string | null;
    public width: number;
    public height: number;
    public filter: number;
    public source: TextureSource | null;
    private texture: WebGLTexture | null = null;
    private readonly pending: Promise<void> | null;

    /** Creates a texture resource from an existing image-like source. */
    public constructor(source: TextureSource, filter: number, ref?: string | null);
    /** Creates a texture resource from a Java resource reference. */
    public constructor(ref: string, filter: number);
    public constructor(sourceOrRef: TextureSource | string, filter: number, ref: string | null = null) {
        this.filter = filter;
        if (typeof sourceOrRef === "string") {
            this.ref = sourceOrRef;
            this.width = 0;
            this.height = 0;
            this.source = null;
            this.pending = ResourceLoader.track(this.load(sourceOrRef));
        } else {
            this.ref = ref;
            this.source = sourceOrRef;
            this.width = "width" in sourceOrRef ? sourceOrRef.width : 0;
            this.height = "height" in sourceOrRef ? sourceOrRef.height : 0;
            this.pending = null;
        }
    }

    /** Returns true when the decoded image source is available. */
    public isReady(): boolean {
        return this.source !== null;
    }

    /** Returns a pending decode promise, if this resource was path-created. */
    public ready(): Promise<void> | null {
        return this.pending;
    }

    /** Returns or creates the WebGL texture for a context. */
    public ensureTexture(gl: WebGL2RenderingContext): WebGLTexture | null {
        if (this.texture) {
            return this.texture;
        }
        const source = this.source;
        if (!source) {
            return null;
        }
        this.texture = gl.createTexture();
        if (!this.texture) {
            return null;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.applyFilter(gl);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        return this.texture;
    }

    /** Attaches a framebuffer texture so render-target images can be drawn. */
    public attachTexture(texture: WebGLTexture, width: number, height: number): void {
        this.texture = texture;
        this.width = width;
        this.height = height;
    }

    /** Applies the Slick filter mode to the WebGL texture. */
    public applyFilter(gl: WebGL2RenderingContext): void {
        const nearest = this.filter === 2;
        const value = nearest ? gl.NEAREST : gl.LINEAR;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, value);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, value);
    }

    /** Releases the underlying WebGL texture object. */
    public dispose(gl: WebGL2RenderingContext | null): void {
        if (gl && this.texture) {
            gl.deleteTexture(this.texture);
        }
        this.texture = null;
    }

    private async load(ref: string): Promise<void> {
        const bytes = await ResourceLoader.loadResource(ref);
        const blob = new Blob([bytes]);
        if (typeof createImageBitmap !== "undefined") {
            const bitmap = await createImageBitmap(blob);
            this.source = bitmap;
            this.width = bitmap.width;
            this.height = bitmap.height;
            return;
        }
        if (typeof Image === "undefined") {
            return;
        }
        const element = new Image();
        const url = URL.createObjectURL(blob);
        try {
            await new Promise<void>((resolve, reject) => {
                element.onload = () => resolve();
                element.onerror = () => reject(new Error(`Unable to decode image: ${ref}`));
                element.src = url;
            });
            this.source = element;
            this.width = element.width;
            this.height = element.height;
        } finally {
            URL.revokeObjectURL(url);
        }
    }
}
