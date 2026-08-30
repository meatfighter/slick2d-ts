import { ResourceLoader } from "../util/ResourceLoader.js";
import { SlickException } from "../SlickException.js";
import { InternalTextureLoader } from "../opengl/InternalTextureLoader.js";
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
 * Owns decoded image data plus the lazily-created WebGL texture.
 */
export class WebGLTextureResource {
    ref;
    width;
    height;
    filter;
    source;
    texture = null;
    pending;
    pixelData = null;
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
            const ref = typeof refOrOptions === "string" ? refOrOptions : refOrOptions;
            const sourceOptions = typeof refOrOptions === "object" && refOrOptions !== null ? refOrOptions : options;
            this.ref = typeof ref === "string" ? ref : null;
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
    /** Returns the cached RGBA pixel at a texture-space coordinate. */
    getPixel(x, y) {
        if (!this.pixelData || x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return null;
        }
        const offset = (Math.trunc(y) * this.width + Math.trunc(x)) * 4;
        return [this.pixelData[offset], this.pixelData[offset + 1], this.pixelData[offset + 2], this.pixelData[offset + 3]];
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
        return this.texture;
    }
    /** Attaches a framebuffer texture so render-target images can be drawn. */
    attachTexture(texture, width, height) {
        this.texture = texture;
        this.width = width;
        this.height = height;
        this.pixelData = null;
    }
    /** @internal Returns the context-owned texture currently attached to this resource. */
    __getTextureReference() {
        return this.texture;
    }
    /** Drops a context-owned WebGL texture while keeping decoded image data available. */
    invalidateTexture(gl = null) {
        if (gl && this.texture && !WebGLTextureResource.isContextLost(gl)) {
            gl.deleteTexture(this.texture);
        }
        this.texture = null;
    }
    /** Detaches a framebuffer-owned texture handle without unregistering this logical resource. */
    detachTexture(texture = this.texture) {
        if (!texture || this.texture === texture) {
            this.texture = null;
        }
    }
    /** Applies the Slick filter mode to the WebGL texture. */
    applyFilter(gl) {
        const nearest = this.filter === 2;
        const value = nearest ? gl.NEAREST : gl.LINEAR;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, value);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, value);
    }
    /** Releases the underlying WebGL texture object. */
    dispose(gl) {
        this.invalidateTexture(gl);
        InternalTextureLoader.get().unregister(this);
    }
    static isContextLost(gl) {
        return typeof gl.isContextLost === "function" && gl.isContextLost();
    }
    async load(ref, options) {
        const bytes = await ResourceLoader.loadResource(ref);
        await this.loadBytes(bytes, ref, options);
    }
    async loadBytes(input, ref, options) {
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
            throw new SlickException(`Unable to decode image without ImageBitmap or HTMLImageElement: ${ref}`);
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
    prepareLoadedSource(source, options) {
        this.width = sourceWidth(source);
        this.height = sourceHeight(source);
        if (this.width <= 0 || this.height <= 0) {
            this.source = source;
            return;
        }
        try {
            const canvas = createCanvasSource(this.width, this.height);
            const context = get2dContext(canvas);
            context.drawImage(source, 0, 0);
            const imageData = context.getImageData(0, 0, this.width, this.height);
            if (options.transparent) {
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
            else {
                this.source = source;
            }
            this.pixelData = new Uint8ClampedArray(imageData.data);
        }
        catch {
            this.source = source;
            this.pixelData = null;
        }
    }
}
//# sourceMappingURL=WebGLTextureResource.js.map