import { SlickException } from "../SlickException.js";
import { InternalTextureLoader } from "../opengl/InternalTextureLoader.js";
import { ResourceLoadException, ResourceLoader } from "../util/ResourceLoader.js";
function createCanvasSource(width, height) {
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
function get2dContext(canvas) {
    const context = canvas.getContext("2d");
    if (!context) {
        throw new SlickException("Unable to create 2D texture staging context");
    }
    return context;
}
function sourceWidth(source) {
    return "width" in source ? Number(source.width) : 0;
}
function sourceHeight(source) {
    return "height" in source ? Number(source.height) : 0;
}
function colorByte(value) {
    return Math.trunc(value * 255);
}
/**
 * Internal WebGL texture resource.
 *
 * Owns a decoded source, lazily-created CPU pixel data, and a context-owned
 * WebGL texture. Render-target pixels are transient across context restoration.
 */
export class WebGLTextureResource {
    ref;
    width;
    height;
    filter;
    source;
    texture = null;
    renderTarget = null;
    pending;
    pixelData = null;
    gpuPixelsAuthoritative = false;
    constructor(sourceOrRef, filter, refOrOptions = null, options = {}) {
        this.filter = filter;
        if (typeof sourceOrRef === "string") {
            this.ref = sourceOrRef;
            this.width = 0;
            this.height = 0;
            this.source = null;
            const loadOptions = typeof refOrOptions === "object" && refOrOptions !== null ? refOrOptions : options;
            this.pending = ResourceLoader.track(this.load(sourceOrRef, loadOptions), sourceOrRef);
        }
        else if (sourceOrRef instanceof ArrayBuffer || sourceOrRef instanceof Blob) {
            const ref = typeof refOrOptions === "string" ? refOrOptions : "stream";
            this.ref = ref;
            this.width = 0;
            this.height = 0;
            this.source = null;
            const bytesOptions = typeof refOrOptions === "object" && refOrOptions !== null ? refOrOptions : options;
            this.pending = ResourceLoader.track(this.loadBytes(sourceOrRef, ref, bytesOptions), ref);
        }
        else {
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
    isReady() {
        return this.source !== null;
    }
    /** Returns a pending decode promise, if this resource was path-created. */
    ready() {
        return this.pending;
    }
    /** Copies the cached or lazily materialized RGBA pixel into a caller-owned buffer. */
    getPixelInto(x, y, target, gl = null) {
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
        target[0] = pixels[offset];
        target[1] = pixels[offset + 1];
        target[2] = pixels[offset + 2];
        target[3] = pixels[offset + 3];
        return true;
    }
    /** Java-style pixel-cache invalidation used by Image.flushPixelData(). */
    flushPixelData() {
        this.pixelData = null;
    }
    /** Marks the GPU texture as newer than the retained decoded source. */
    markGpuModified() {
        this.gpuPixelsAuthoritative = true;
        this.pixelData = null;
    }
    /** Returns or creates the WebGL texture for a context. */
    ensureTexture(gl) {
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
    attachTexture(texture, width, height) {
        this.texture = texture;
        this.width = width;
        this.height = height;
        this.pixelData = null;
        this.gpuPixelsAuthoritative = false;
    }
    /** @internal Returns the context-owned texture currently attached to this resource. */
    __getTextureReference() {
        return this.texture;
    }
    /** @internal Associates the one framebuffer wrapper belonging to this texture identity. */
    attachRenderTarget(target) {
        if (this.renderTarget && this.renderTarget !== target) {
            throw new SlickException("Texture already has an associated render target");
        }
        this.renderTarget = target;
    }
    /** @internal Returns the framebuffer wrapper associated with this texture identity. */
    __getRenderTarget() {
        return this.renderTarget;
    }
    /** @internal Removes an associated framebuffer wrapper after disposal. */
    detachRenderTarget(target) {
        if (this.renderTarget === target) {
            this.renderTarget = null;
        }
    }
    /** Drops a context-owned WebGL texture while keeping decoded image data available. */
    invalidateTexture(gl = null) {
        if (gl && this.texture && !WebGLTextureResource.isContextLost(gl)) {
            gl.deleteTexture(this.texture);
        }
        this.texture = null;
        this.pixelData = null;
        this.gpuPixelsAuthoritative = false;
    }
    /** Detaches a framebuffer-owned texture handle without unregistering this logical resource. */
    detachTexture(texture = this.texture) {
        if (!texture || this.texture === texture) {
            this.texture = null;
            this.pixelData = null;
            this.gpuPixelsAuthoritative = false;
        }
    }
    /** Applies the Slick filter mode to the WebGL texture. */
    applyFilter(gl) {
        const value = this.filter === 2 ? gl.NEAREST : gl.LINEAR;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, value);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, value);
    }
    /** @internal Reapplies the current filter to an already-created texture. */
    __applyFilterToExistingTexture(gl) {
        const texture = this.texture;
        if (!texture) {
            return;
        }
        const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.applyFilter(gl);
        gl.bindTexture(gl.TEXTURE_2D, previousTexture);
    }
    /** Releases the underlying WebGL texture object. */
    dispose(gl) {
        this.renderTarget?.dispose(gl);
        this.invalidateTexture(gl);
        InternalTextureLoader.get().unregister(this);
    }
    materializeGpuPixelData(gl) {
        const texture = this.texture;
        if (!texture || this.width <= 0 || this.height <= 0 || WebGLTextureResource.isContextLost(gl)) {
            return false;
        }
        const framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            return false;
        }
        const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
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
        }
        catch {
            this.pixelData = null;
            return false;
        }
        finally {
            gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
            gl.deleteFramebuffer(framebuffer);
        }
    }
    materializePixelData() {
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
        }
        catch {
            this.pixelData = null;
            return false;
        }
    }
    static isContextLost(gl) {
        return typeof gl.isContextLost === "function" && gl.isContextLost();
    }
    async load(ref, options) {
        const bytes = await ResourceLoader.loadResource(ref);
        await this.loadBytes(bytes, ref, options);
    }
    async loadBytes(input, ref, options) {
        try {
            let blob;
            if (input instanceof ArrayBuffer) {
                ResourceLoader.registerResource(ref, input);
                blob = new Blob([input]);
            }
            else {
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
                await new Promise((resolve, reject) => {
                    element.onload = () => resolve();
                    element.onerror = () => reject(new Error(`Unable to decode image: ${ref}`));
                    element.src = url;
                });
                this.prepareLoadedSource(element, options);
            }
            finally {
                URL.revokeObjectURL(url);
            }
        }
        catch (cause) {
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
    prepareLoadedSource(source, options) {
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
        }
        catch {
            this.source = source;
        }
    }
}
//# sourceMappingURL=WebGLTextureResource.js.map