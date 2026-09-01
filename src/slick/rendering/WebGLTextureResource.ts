import type { Color } from "../Color.js";
import { SlickException } from "../SlickException.js";
import { InternalTextureLoader } from "../opengl/InternalTextureLoader.js";
import { ResourceLoadException, ResourceLoader } from "../util/ResourceLoader.js";
import type { WebGLRenderTarget } from "./WebGLRenderTarget.js";

type TextureSource = ImageBitmap | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas;
type TextureInputSource = TextureSource | ArrayBuffer | Blob;
type CanvasSource = HTMLCanvasElement | OffscreenCanvas;

export type WebGLTextureLoadOptions = {
    transparent?: Color | null;
};

function createCanvasSource(width: number, height: number): CanvasSource {
    if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(width, height);
    }
    if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
    throw new SlickException("Texture staging requires a browser canvas implementation");
}

function get2dContext(canvas: CanvasSource): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
    const context = canvas.getContext("2d");
    if (!context) {
        throw new SlickException("Unable to create 2D texture staging context");
    }
    return context;
}

function sourceWidth(source: TextureSource): number {
    return "width" in source ? Number(source.width) : 0;
}

function sourceHeight(source: TextureSource): number {
    return "height" in source ? Number(source.height) : 0;
}

function colorByte(value: number): number {
    return Math.trunc(value * 255);
}

/**
 * Internal WebGL texture resource.
 *
 * Owns a decoded source, lazily-created CPU pixel data, and a context-owned
 * WebGL texture. Render-target pixels are transient across context restoration.
 */
export class WebGLTextureResource {
    public readonly ref: string | null;
    public width: number;
    public height: number;
    public filter: number;
    public source: TextureSource | null;
    private texture: WebGLTexture | null = null;
    private renderTarget: WebGLRenderTarget | null = null;
    private readonly pending: Promise<void> | null;
    private pixelData: Uint8ClampedArray | null = null;
    private gpuPixelsAuthoritative = false;

    /** Creates a texture resource from an existing image-like source. */
    public constructor(source: TextureSource, filter: number, ref?: string | null, options?: WebGLTextureLoadOptions);
    /** Creates a texture resource from already-available browser bytes. */
    public constructor(source: ArrayBuffer | Blob, filter: number, ref: string, options?: WebGLTextureLoadOptions);
    /** Creates a texture resource from a Java resource reference. */
    public constructor(ref: string, filter: number, options?: WebGLTextureLoadOptions);
    public constructor(
        sourceOrRef: TextureInputSource | string,
        filter: number,
        refOrOptions: string | null | WebGLTextureLoadOptions = null,
        options: WebGLTextureLoadOptions = {}
    ) {
        this.filter = filter;
        if (typeof sourceOrRef === "string") {
            this.ref = sourceOrRef;
            this.width = 0;
            this.height = 0;
            this.source = null;
            const loadOptions = typeof refOrOptions === "object" && refOrOptions !== null ? refOrOptions : options;
            this.pending = ResourceLoader.track(this.load(sourceOrRef, loadOptions), sourceOrRef);
        } else if (sourceOrRef instanceof ArrayBuffer || sourceOrRef instanceof Blob) {
            const ref = typeof refOrOptions === "string" ? refOrOptions : "stream";
            this.ref = ref;
            this.width = 0;
            this.height = 0;
            this.source = null;
            const bytesOptions = typeof refOrOptions === "object" && refOrOptions !== null ? refOrOptions : options;
            this.pending = ResourceLoader.track(this.loadBytes(sourceOrRef, ref, bytesOptions), ref);
        } else {
            const sourceOptions = typeof refOrOptions === "object" && refOrOptions !== null ? refOrOptions : options;
            this.ref = typeof refOrOptions === "string" ? refOrOptions : null;
            this.source = null;
            this.width = 0;
            this.height = 0;
            this.prepareLoadedSource(sourceOrRef, sourceOptions);
            this.pending = null;
        }
        InternalTextureLoader.get().register(this);
    }

    /** Returns true when the decoded image source is available. */
    public isReady(): boolean {
        return this.source !== null;
    }

    /** Returns a pending decode promise, if this resource was path-created. */
    public ready(): Promise<void> | null {
        return this.pending;
    }

    /** Copies the cached or lazily materialized RGBA pixel into a caller-owned buffer. */
    public getPixelInto(x: number, y: number, target: Uint8Array, gl: WebGL2RenderingContext | null = null): boolean {
        const px = Math.trunc(x);
        const py = Math.trunc(y);
        if (target.byteLength < 4 || px < 0 || py < 0 || px >= this.width || py >= this.height) {
            return false;
        }
        if (!this.pixelData) {
            const materialized = this.gpuPixelsAuthoritative ? gl !== null && this.materializeGpuPixelData(gl) : this.materializePixelData();
            if (!materialized) {
                return false;
            }
        }
        const pixels = this.pixelData;
        if (!pixels) {
            return false;
        }
        const offset = (py * this.width + px) * 4;
        target[0] = pixels[offset]!;
        target[1] = pixels[offset + 1]!;
        target[2] = pixels[offset + 2]!;
        target[3] = pixels[offset + 3]!;
        return true;
    }

    /** Java-style pixel-cache invalidation used by Image.flushPixelData(). */
    public flushPixelData(): void {
        this.pixelData = null;
    }

    /** Marks the GPU texture as newer than the retained decoded source. */
    public markGpuModified(): void {
        this.gpuPixelsAuthoritative = true;
        this.pixelData = null;
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
        this.gpuPixelsAuthoritative = false;
        return this.texture;
    }

    /** Attaches a framebuffer texture so render-target images can be drawn. */
    public attachTexture(texture: WebGLTexture, width: number, height: number): void {
        this.texture = texture;
        this.width = width;
        this.height = height;
        this.pixelData = null;
        this.gpuPixelsAuthoritative = false;
    }

    /** @internal Returns the context-owned texture currently attached to this resource. */
    public __getTextureReference(): WebGLTexture | null {
        return this.texture;
    }

    /** @internal Associates the one framebuffer wrapper belonging to this texture identity. */
    public attachRenderTarget(target: WebGLRenderTarget): void {
        if (this.renderTarget && this.renderTarget !== target) {
            throw new SlickException("Texture already has an associated render target");
        }
        this.renderTarget = target;
    }

    /** @internal Returns the framebuffer wrapper associated with this texture identity. */
    public __getRenderTarget(): WebGLRenderTarget | null {
        return this.renderTarget;
    }

    /** @internal Removes an associated framebuffer wrapper after disposal. */
    public detachRenderTarget(target: WebGLRenderTarget): void {
        if (this.renderTarget === target) {
            this.renderTarget = null;
        }
    }

    /** Drops a context-owned WebGL texture while keeping decoded image data available. */
    public invalidateTexture(gl: WebGL2RenderingContext | null = null): void {
        if (gl && this.texture && !WebGLTextureResource.isContextLost(gl)) {
            gl.deleteTexture(this.texture);
        }
        this.texture = null;
        this.pixelData = null;
        this.gpuPixelsAuthoritative = false;
    }

    /** Detaches a framebuffer-owned texture handle without unregistering this logical resource. */
    public detachTexture(texture: WebGLTexture | null = this.texture): void {
        if (!texture || this.texture === texture) {
            this.texture = null;
            this.pixelData = null;
            this.gpuPixelsAuthoritative = false;
        }
    }

    /** Applies the Slick filter mode to the WebGL texture. */
    public applyFilter(gl: WebGL2RenderingContext): void {
        const value = this.filter === 2 ? gl.NEAREST : gl.LINEAR;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, value);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, value);
    }

    /** @internal Reapplies the current filter to an already-created texture. */
    public __applyFilterToExistingTexture(gl: WebGL2RenderingContext): void {
        const texture = this.texture;
        if (!texture) {
            return;
        }
        const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.applyFilter(gl);
        gl.bindTexture(gl.TEXTURE_2D, previousTexture);
    }

    /** Releases the underlying WebGL texture object. */
    public dispose(gl: WebGL2RenderingContext | null): void {
        this.renderTarget?.dispose(gl);
        this.invalidateTexture(gl);
        InternalTextureLoader.get().unregister(this);
    }

    private materializeGpuPixelData(gl: WebGL2RenderingContext): boolean {
        const texture = this.texture;
        if (!texture || this.width <= 0 || this.height <= 0 || WebGLTextureResource.isContextLost(gl)) {
            return false;
        }
        const framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            return false;
        }
        const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
        try {
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                return false;
            }
            const pixels = new Uint8Array(this.width * this.height * 4);
            gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            this.pixelData = new Uint8ClampedArray(pixels.buffer);
            return true;
        } catch {
            this.pixelData = null;
            return false;
        } finally {
            gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
            gl.deleteFramebuffer(framebuffer);
        }
    }

    private materializePixelData(): boolean {
        const source = this.source;
        if (!source || this.width <= 0 || this.height <= 0) {
            return false;
        }
        try {
            const canvas = createCanvasSource(this.width, this.height);
            const context = get2dContext(canvas);
            context.drawImage(source, 0, 0);
            this.pixelData = new Uint8ClampedArray(context.getImageData(0, 0, this.width, this.height).data);
            return true;
        } catch {
            this.pixelData = null;
            return false;
        }
    }

    private static isContextLost(gl: WebGL2RenderingContext): boolean {
        return typeof gl.isContextLost === "function" && gl.isContextLost();
    }

    private async load(ref: string, options: WebGLTextureLoadOptions): Promise<void> {
        const bytes = await ResourceLoader.loadResource(ref);
        await this.loadBytes(bytes, ref, options);
    }

    private async loadBytes(input: ArrayBuffer | Blob, ref: string, options: WebGLTextureLoadOptions): Promise<void> {
        try {
            let blob: Blob;
            if (input instanceof ArrayBuffer) {
                ResourceLoader.registerResource(ref, input);
                blob = new Blob([input]);
            } else {
                const bytes = await input.arrayBuffer();
                ResourceLoader.registerResource(ref, bytes);
                blob = new Blob([bytes], { type: input.type });
            }
            if (typeof createImageBitmap !== "undefined") {
                const bitmap = await createImageBitmap(blob);
                this.prepareLoadedSource(bitmap, options);
                return;
            }
            if (typeof globalThis.Image === "undefined") {
                throw new Error("ImageBitmap and HTMLImageElement are unavailable.");
            }
            const element = new globalThis.Image();
            const url = URL.createObjectURL(blob);
            try {
                await new Promise<void>((resolve, reject) => {
                    element.onload = () => resolve();
                    element.onerror = () => reject(new Error(`Unable to decode image: ${ref}`));
                    element.src = url;
                });
                this.prepareLoadedSource(element, options);
            } finally {
                URL.revokeObjectURL(url);
            }
        } catch (cause) {
            if (cause instanceof ResourceLoadException) {
                throw cause;
            }
            throw new ResourceLoadException(`Failed to decode image: ${ref}`, {
                ref,
                url: ResourceLoader.getResource(ref)?.href ?? null,
                kind: "decode",
                phase: "decode",
                cause
            });
        }
    }

    private prepareLoadedSource(source: TextureSource, options: WebGLTextureLoadOptions): void {
        this.width = sourceWidth(source);
        this.height = sourceHeight(source);
        this.pixelData = null;
        if (this.width <= 0 || this.height <= 0 || !options.transparent) {
            this.source = source;
            return;
        }

        try {
            const canvas = createCanvasSource(this.width, this.height);
            const context = get2dContext(canvas);
            context.drawImage(source, 0, 0);
            const imageData = context.getImageData(0, 0, this.width, this.height);
            const tr = colorByte(options.transparent.r);
            const tg = colorByte(options.transparent.g);
            const tb = colorByte(options.transparent.b);
            for (let i = 0; i < imageData.data.length; i += 4) {
                if (imageData.data[i] === tr && imageData.data[i + 1] === tg && imageData.data[i + 2] === tb) {
                    imageData.data[i + 3] = 0;
                }
            }
            context.putImageData(imageData, 0, 0);
            this.source = canvas;
        } catch {
            this.source = source;
        }
    }
}
