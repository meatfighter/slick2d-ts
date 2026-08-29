import { Color } from "./Color.js";
import { Graphics } from "./Graphics.js";
import { SlickException } from "./SlickException.js";
import { identityMatrix3 } from "./rendering/RenderBackend.js";
import { WebGLRenderTarget } from "./rendering/WebGLRenderTarget.js";
import { WebGLTextureResource } from "./rendering/WebGLTextureResource.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
const IDENTITY_TRANSFORM = identityMatrix3();
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
    throw new SlickException("Image(width, height) requires a browser canvas implementation");
}
function createCanvasFromSlickImageData(data) {
    const texWidth = data.getTexWidth();
    const texHeight = data.getTexHeight();
    const canvas = createCanvasSource(texWidth, texHeight);
    const context = canvas.getContext("2d");
    if (!context || typeof globalThis.ImageData === "undefined") {
        throw new SlickException("Image(ImageData) requires browser ImageData and canvas 2D support");
    }
    const depth = data.getDepth();
    const components = depth === 24 ? 3 : 4;
    const source = data.getImageBufferData();
    const pixels = new Uint8ClampedArray(texWidth * texHeight * 4);
    for (let i = 0, j = 0; i < pixels.length; i += 4, j += components) {
        pixels[i] = source[j] ?? 0;
        pixels[i + 1] = source[j + 1] ?? 0;
        pixels[i + 2] = source[j + 2] ?? 0;
        pixels[i + 3] = components === 4 ? (source[j + 3] ?? 255) : 255;
    }
    context.putImageData(new globalThis.ImageData(pixels, texWidth, texHeight), 0, 0);
    return canvas;
}
function normalizeDegrees(angle) {
    return angle % 360;
}
/**
 * Java Slick2D counterpart: org.newdawn.slick.Image.
 *
 * Texture-backed image with Slick-compatible mutable draw state.
 */
export class Image {
    static TOP_LEFT = 0;
    static TOP_RIGHT = 1;
    static BOTTOM_RIGHT = 2;
    static BOTTOM_LEFT = 3;
    static FILTER_LINEAR = 1;
    static FILTER_NEAREST = 2;
    static inUse = null;
    textureResource;
    renderTarget = null;
    sourceX = 0;
    sourceY = 0;
    sourceWidth = 0;
    sourceHeight = 0;
    displayWidth = 0;
    displayHeight = 0;
    flipHorizontal = false;
    flipVertical = false;
    inverted = false;
    alpha = 1;
    rotation = 0;
    centerX = 0;
    centerY = 0;
    centerSet = false;
    imageName = null;
    destroyed = false;
    cornerColors = new Map();
    cornerColorScratch = [Color.white, Color.white, Color.white, Color.white];
    /**
     * Java Slick2D counterpart: Image constructors.
     *
     * Preserves Java overload shapes while routing browser loading through the
     * resource and WebGL texture systems.
     */
    constructor(a, b, c, d) {
        let filter;
        let width = 0;
        let height = 0;
        if (a instanceof Image) {
            this.textureResource = a.textureResource;
            this.renderTarget = null;
            this.sourceX = a.sourceX;
            this.sourceY = a.sourceY;
            this.sourceWidth = a.getSourceWidth();
            this.sourceHeight = a.getSourceHeight();
            this.displayWidth = a.getWidth();
            this.displayHeight = a.getHeight();
            this.flipHorizontal = a.flipHorizontal;
            this.flipVertical = a.flipVertical;
            this.inverted = a.inverted;
            this.centerX = a.centerX;
            this.centerY = a.centerY;
            this.centerSet = a.centerSet;
            this.imageName = a.imageName;
            return;
        }
        else if (typeof a === "string") {
            const flipped = typeof b === "boolean" ? b : false;
            const transparent = b instanceof Color ? b : d instanceof Color ? d : null;
            this.flipVertical = flipped;
            this.inverted = flipped;
            filter = typeof c === "number" ? c : Image.FILTER_LINEAR;
            this.textureResource = new WebGLTextureResource(a, filter, { transparent });
        }
        else if (typeof a === "number") {
            width = a;
            height = typeof b === "number" ? b : 0;
            filter = typeof c === "number" ? c : Image.FILTER_NEAREST;
            const canvas = createCanvasSource(width, height);
            this.textureResource = new WebGLTextureResource(canvas, filter, null);
            this.renderTarget = new WebGLRenderTarget(width, height, this.textureResource);
        }
        else if (a instanceof ArrayBuffer || a instanceof Blob) {
            const ref = typeof b === "string" ? b : "stream";
            const flipped = typeof c === "boolean" ? c : false;
            this.flipVertical = flipped;
            this.inverted = flipped;
            filter = typeof d === "number" ? d : Image.FILTER_LINEAR;
            this.textureResource = new WebGLTextureResource(a, filter, ref);
        }
        else if (a instanceof WebGLTextureResource) {
            this.textureResource = a;
            width = a.width;
            height = a.height;
        }
        else {
            filter = typeof b === "number" ? b : Image.FILTER_LINEAR;
            const canvas = createCanvasFromSlickImageData(a);
            this.textureResource = new WebGLTextureResource(canvas, filter, null);
            width = a.getWidth();
            height = a.getHeight();
        }
        this.sourceWidth = width || this.textureResource.width;
        this.sourceHeight = height || this.textureResource.height;
        this.displayWidth = this.sourceWidth;
        this.displayHeight = this.sourceHeight;
        this.centerX = this.getWidth() / 2;
        this.centerY = this.getHeight() / 2;
    }
    static fromShared(resource, sourceX, sourceY, sourceWidth, sourceHeight, flipHorizontal, flipVertical, displayWidth = sourceWidth, displayHeight = sourceHeight, inverted = flipVertical) {
        const image = Object.create(Image.prototype);
        image.textureResource = resource;
        image.renderTarget = null;
        image.sourceX = sourceX;
        image.sourceY = sourceY;
        image.sourceWidth = sourceWidth;
        image.sourceHeight = sourceHeight;
        image.displayWidth = displayWidth;
        image.displayHeight = displayHeight;
        image.flipHorizontal = flipHorizontal;
        image.flipVertical = flipVertical;
        image.inverted = inverted;
        image.alpha = 1;
        image.rotation = 0;
        image.centerX = displayWidth / 2;
        image.centerY = displayHeight / 2;
        image.centerSet = false;
        image.imageName = null;
        image.destroyed = false;
        image.cornerColors = new Map();
        image.cornerColorScratch = [Color.white, Color.white, Color.white, Color.white];
        return image;
    }
    /** Java Slick2D counterpart: Image.setFilter(int). */
    setFilter(filter) {
        this.textureResource.filter = filter;
    }
    /** Java Slick2D counterpart: Image.getFilter(). */
    getFilter() {
        return this.textureResource.filter;
    }
    /** Java Slick2D counterpart: Image.getResourceReference(). */
    getResourceReference() {
        return this.textureResource.ref;
    }
    setImageColor(r, g, b, a = 1) {
        this.cornerColors.set(Image.TOP_LEFT, new Color(r, g, b, a));
        this.cornerColors.set(Image.TOP_RIGHT, new Color(r, g, b, a));
        this.cornerColors.set(Image.BOTTOM_RIGHT, new Color(r, g, b, a));
        this.cornerColors.set(Image.BOTTOM_LEFT, new Color(r, g, b, a));
    }
    setColor(corner, r, g, b, a = 1) {
        this.cornerColors.set(corner, new Color(r, g, b, a));
    }
    /** Java Slick2D counterpart: Image.clampTexture(). */
    clampTexture() { }
    /** Java Slick2D counterpart: Image.setName(String). */
    setName(name) {
        this.imageName = name;
    }
    /** Java Slick2D counterpart: Image.getName(). */
    getName() {
        return this.imageName;
    }
    /** Java Slick2D counterpart: Image.getGraphics(). */
    getGraphics() {
        if (!this.renderTarget) {
            throw new SlickException("Image is not a writable render target");
        }
        return new Graphics(this.renderTarget);
    }
    /** Java Slick2D counterpart: Image.bind(). */
    bind() {
        Renderer.getBackend().bindTextureResource(this.textureResource);
    }
    draw(x, y, a, b, c, d, e, f, g) {
        this.throwIfDestroyed();
        const drawX = x ?? 0;
        const drawY = y ?? 0;
        let drawW = this.getWidth();
        let drawH = this.getHeight();
        let srcX = this.sourceX;
        let srcY = this.sourceY;
        let srcW = this.getSourceWidth();
        let srcH = this.getSourceHeight();
        let tint = null;
        if (a instanceof Color) {
            tint = a;
        }
        else if (typeof a === "number" && b === undefined) {
            drawW = this.getWidth() * a;
            drawH = this.getHeight() * a;
        }
        else if (typeof a === "number" && b instanceof Color) {
            drawW = this.getWidth() * a;
            drawH = this.getHeight() * a;
            tint = b;
        }
        else if (typeof a === "number" && typeof b === "number" && c instanceof Color) {
            drawW = a;
            drawH = b;
            tint = c;
        }
        else if (typeof a === "number" && typeof b === "number" && c === undefined) {
            drawW = a;
            drawH = b;
        }
        else if (typeof a === "number" && typeof b === "number" && typeof c === "number" && typeof d === "number" && e === undefined) {
            srcX = this.sourceX + a;
            srcY = this.sourceY + b;
            srcW = c - a;
            srcH = d - b;
            this.drawInternal(drawX, drawY, drawW, drawH, srcX, srcY, srcW, srcH, tint, false);
            return;
        }
        else if (typeof a === "number" &&
            typeof b === "number" &&
            typeof c === "number" &&
            typeof d === "number" &&
            typeof e === "number" &&
            typeof f === "number") {
            drawW = a - drawX;
            drawH = b - drawY;
            srcX = this.sourceX + c;
            srcY = this.sourceY + d;
            srcW = e - c;
            srcH = f - d;
            tint = g ?? null;
            this.drawInternal(drawX, drawY, drawW, drawH, srcX, srcY, srcW, srcH, tint, false);
            return;
        }
        this.drawInternal(drawX, drawY, drawW, drawH, srcX, srcY, srcW, srcH, tint);
    }
    /** Java Slick2D counterpart: Image.drawCentered(float, float). */
    drawCentered(x, y) {
        this.draw(x - this.getWidth() / 2, y - this.getHeight() / 2);
    }
    drawEmbedded(x, y, a, b, c, d, e, f, g = null) {
        if (c === undefined || d === undefined || e === undefined || f === undefined) {
            this.drawEmbeddedInternal(x, y, x + a, y + b, 0, 0, this.getWidth(), this.getHeight(), null, true);
            return;
        }
        this.drawEmbeddedInternal(x, y, a, b, c, d, e, f, g, false);
    }
    drawSheared(x, y, hshear, vshear, filter = Color.white) {
        const width = this.getWidth();
        const height = this.getHeight();
        this.drawWarpedInternal(x, y, x + width, y + vshear, x + width + hshear, y + height + vshear, x + hshear, y + height, filter);
    }
    /** Java Slick2D counterpart: Image.drawFlash(float, float, float, float, Color). */
    drawFlash(x, y, width, height, col = Color.white) {
        this.drawFlashInternal(x, y, width ?? this.getWidth(), height ?? this.getHeight(), col);
    }
    /** Java Slick2D counterpart: Image.setCenterOfRotation(float, float). */
    setCenterOfRotation(x, y) {
        this.centerX = x;
        this.centerY = y;
        this.centerSet = true;
    }
    /** Java Slick2D counterpart: Image.getCenterOfRotationX(). */
    getCenterOfRotationX() {
        return this.centerSet ? this.centerX : this.getWidth() / 2;
    }
    /** Java Slick2D counterpart: Image.getCenterOfRotationY(). */
    getCenterOfRotationY() {
        return this.centerSet ? this.centerY : this.getHeight() / 2;
    }
    /** Java Slick2D counterpart: Image.setRotation(float). */
    setRotation(angle) {
        this.rotation = normalizeDegrees(angle);
    }
    /** Java Slick2D counterpart: Image.getRotation(). */
    getRotation() {
        return this.rotation;
    }
    /** Java Slick2D counterpart: Image.getAlpha(). */
    getAlpha() {
        return this.alpha;
    }
    /** Java Slick2D counterpart: Image.setAlpha(float). */
    setAlpha(alpha) {
        this.alpha = alpha;
    }
    /** Java Slick2D counterpart: Image.rotate(float). */
    rotate(angle) {
        this.rotation = normalizeDegrees(this.rotation + angle);
    }
    /** Java Slick2D counterpart: Image.getSubImage(int, int, int, int). */
    getSubImage(x, y, width, height) {
        return Image.fromShared(this.textureResource, this.sourceX + x, this.sourceY + y, width, height, this.flipHorizontal, this.flipVertical);
    }
    /** Java Slick2D counterpart: Image.drawWarped(...). */
    drawWarped(topLeftX, topLeftY, topRightX, topRightY, bottomRightX, bottomRightY, bottomLeftX, bottomLeftY) {
        this.drawWarpedInternal(topLeftX, topLeftY, topRightX, topRightY, bottomRightX, bottomRightY, bottomLeftX, bottomLeftY, Color.white);
    }
    /** Java Slick2D counterpart: Image.getWidth(). */
    getWidth() {
        return this.displayWidth || this.sourceWidth || this.textureResource.width;
    }
    /** Java Slick2D counterpart: Image.getHeight(). */
    getHeight() {
        return this.displayHeight || this.sourceHeight || this.textureResource.height;
    }
    /** Java Slick2D counterpart: Image.copy(). */
    copy() {
        return Image.fromShared(this.textureResource, this.sourceX, this.sourceY, this.getSourceWidth(), this.getSourceHeight(), this.flipHorizontal, this.flipVertical, this.getWidth(), this.getHeight(), this.inverted);
    }
    getScaledCopy(a, b) {
        const copy = this.copy();
        copy.displayWidth = b === undefined ? Math.trunc(this.getWidth() * a) : a;
        copy.displayHeight = b === undefined ? Math.trunc(this.getHeight() * a) : b;
        if (!copy.centerSet) {
            copy.centerX = copy.displayWidth / 2;
            copy.centerY = copy.displayHeight / 2;
        }
        return copy;
    }
    /** Java Slick2D counterpart: Image.ensureInverted(). */
    ensureInverted() {
        if (!this.inverted) {
            this.flipVertical = !this.flipVertical;
            this.inverted = true;
        }
    }
    /** Java Slick2D counterpart: Image.getFlippedCopy(boolean, boolean). */
    getFlippedCopy(flipHorizontal, flipVertical) {
        const copy = this.copy();
        copy.flipHorizontal = this.flipHorizontal !== flipHorizontal;
        copy.flipVertical = this.flipVertical !== flipVertical;
        copy.inverted = copy.flipVertical;
        return copy;
    }
    /** Java Slick2D counterpart: Image.endUse(). */
    endUse() {
        if (Image.inUse !== this) {
            throw new SlickException("The sprite sheet is not currently in use");
        }
        Image.inUse = null;
        Renderer.get().flush();
    }
    /** Java Slick2D counterpart: Image.startUse(). */
    startUse() {
        if (Image.inUse !== null) {
            throw new SlickException("Attempt to start use of a sprite sheet before ending use with another - see endUse()");
        }
        Image.inUse = this;
        Color.white.bind();
        this.bind();
        Renderer.get().flush();
    }
    /** Java Slick2D counterpart: Image.toString(). */
    toString() {
        return this.imageName ?? this.textureResource.ref ?? "[Image]";
    }
    /** Java Slick2D counterpart: Image.getTexture(). */
    getTexture() {
        return this.textureResource;
    }
    /** Java Slick2D counterpart: Image.getTextureOffsetX(). */
    getTextureOffsetX() {
        const width = this.textureResource.width || 1;
        return (this.flipHorizontal ? this.sourceX + this.getSourceWidth() : this.sourceX) / width;
    }
    /** Java Slick2D counterpart: Image.getTextureOffsetY(). */
    getTextureOffsetY() {
        const height = this.textureResource.height || 1;
        return (this.flipVertical ? this.sourceY + this.getSourceHeight() : this.sourceY) / height;
    }
    /** Java Slick2D counterpart: Image.getTextureWidth(). */
    getTextureWidth() {
        const width = this.textureResource.width || 1;
        return (this.flipHorizontal ? -this.getSourceWidth() : this.getSourceWidth()) / width;
    }
    /** Java Slick2D counterpart: Image.getTextureHeight(). */
    getTextureHeight() {
        const height = this.textureResource.height || 1;
        return (this.flipVertical ? -this.getSourceHeight() : this.getSourceHeight()) / height;
    }
    /** Java Slick2D counterpart: Image.setTexture(Texture). */
    setTexture(texture) {
        this.textureResource = texture;
    }
    /** Java Slick2D counterpart: Image.getColor(int, int). */
    getColor(x, y) {
        const sx = Math.trunc(x);
        const sy = Math.trunc(y);
        const sourceWidth = this.getSourceWidth();
        const sourceHeight = this.getSourceHeight();
        const pixelX = this.flipHorizontal ? this.sourceX + sourceWidth - 1 - sx : this.sourceX + sx;
        const pixelY = this.flipVertical ? this.sourceY + sourceHeight - 1 - sy : this.sourceY + sy;
        const pixel = this.textureResource.getPixel(pixelX, pixelY);
        if (!pixel) {
            throw new SlickException("Image pixel data is not available; wait for resources to finish loading before calling getColor");
        }
        return Color.fromInts(pixel[0], pixel[1], pixel[2], pixel[3]);
    }
    /** Java Slick2D counterpart: Image.isDestroyed(). */
    isDestroyed() {
        return this.destroyed;
    }
    /** Java Slick2D counterpart: Image.destroy(). */
    destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        const gl = Renderer.getBackend().getContext();
        this.renderTarget?.dispose(gl);
        this.renderTarget = null;
        this.textureResource.dispose(gl);
    }
    /** Java Slick2D counterpart: Image.flushPixelData(). */
    flushPixelData() { }
    /** Internal renderer hook returning the texture resource. */
    __getTextureResource() {
        return this.destroyed ? null : this.textureResource;
    }
    /** Internal renderer hook returning the render target if this image is writable. */
    __getRenderTarget() {
        return this.destroyed ? null : this.renderTarget;
    }
    /** Internal renderer hook returning Slick per-corner tint colors. */
    __getCornerColors() {
        if (this.cornerColors.size === 0) {
            return null;
        }
        this.cornerColorScratch[0] = this.cornerColors.get(Image.TOP_LEFT) ?? Color.white;
        this.cornerColorScratch[1] = this.cornerColors.get(Image.TOP_RIGHT) ?? Color.white;
        this.cornerColorScratch[2] = this.cornerColors.get(Image.BOTTOM_RIGHT) ?? Color.white;
        this.cornerColorScratch[3] = this.cornerColors.get(Image.BOTTOM_LEFT) ?? Color.white;
        return this.cornerColorScratch;
    }
    drawInternal(x, y, width, height, srcX, srcY, srcWidth, srcHeight, tint, useCornerColors = true) {
        const renderer = Renderer.getBackend();
        const effectiveSrcX = this.flipHorizontal ? srcX + srcWidth : srcX;
        const effectiveSrcY = this.flipVertical ? srcY + srcHeight : srcY;
        const effectiveSrcW = this.flipHorizontal ? -srcWidth : srcWidth;
        const effectiveSrcH = this.flipVertical ? -srcHeight : srcHeight;
        if (this.rotation === 0) {
            renderer.drawImage(this, x, y, width, height, effectiveSrcX, effectiveSrcY, effectiveSrcW, effectiveSrcH, this.alpha, tint, IDENTITY_TRANSFORM, useCornerColors);
            return;
        }
        const scaleX = width / (this.getWidth() || 1);
        const scaleY = height / (this.getHeight() || 1);
        const centerX = x + this.getCenterOfRotationX() * scaleX;
        const centerY = y + this.getCenterOfRotationY() * scaleY;
        renderer.pushTransform();
        try {
            renderer.rotate(centerX, centerY, this.rotation);
            renderer.drawImage(this, x, y, width, height, effectiveSrcX, effectiveSrcY, effectiveSrcW, effectiveSrcH, this.alpha, tint, IDENTITY_TRANSFORM, useCornerColors);
        }
        finally {
            renderer.popTransform();
        }
    }
    drawEmbeddedInternal(x, y, x2, y2, srcx, srcy, srcx2, srcy2, tint, useCornerColors) {
        this.throwIfDestroyed();
        const imageWidth = this.getWidth() || 1;
        const imageHeight = this.getHeight() || 1;
        const srcWidth = this.getSourceWidth();
        const srcHeight = this.getSourceHeight();
        const effectiveSrcX = this.flipHorizontal ? this.sourceX + srcWidth : this.sourceX;
        const effectiveSrcY = this.flipVertical ? this.sourceY + srcHeight : this.sourceY;
        const effectiveSrcW = this.flipHorizontal ? -srcWidth : srcWidth;
        const effectiveSrcH = this.flipVertical ? -srcHeight : srcHeight;
        const embeddedSrcX = effectiveSrcX + (srcx / imageWidth) * effectiveSrcW;
        const embeddedSrcY = effectiveSrcY + (srcy / imageHeight) * effectiveSrcH;
        const embeddedSrcW = ((srcx2 - srcx) / imageWidth) * effectiveSrcW;
        const embeddedSrcH = ((srcy2 - srcy) / imageHeight) * effectiveSrcH;
        Renderer.getBackend().drawImage(this, x, y, x2 - x, y2 - y, embeddedSrcX, embeddedSrcY, embeddedSrcW, embeddedSrcH, 1, tint, IDENTITY_TRANSFORM, useCornerColors, tint === null);
    }
    drawWarpedInternal(x1, y1, x2, y2, x3, y3, x4, y4, tint) {
        this.throwIfDestroyed();
        const renderer = Renderer.getBackend();
        const srcWidth = this.getSourceWidth();
        const srcHeight = this.getSourceHeight();
        const effectiveSrcX = this.flipHorizontal ? this.sourceX + srcWidth : this.sourceX;
        const effectiveSrcY = this.flipVertical ? this.sourceY + srcHeight : this.sourceY;
        const effectiveSrcW = this.flipHorizontal ? -srcWidth : srcWidth;
        const effectiveSrcH = this.flipVertical ? -srcHeight : srcHeight;
        if (this.rotation === 0) {
            renderer.drawImageWarped(this, x1, y1, x2, y2, x3, y3, x4, y4, effectiveSrcX, effectiveSrcY, effectiveSrcW, effectiveSrcH, this.alpha, tint, IDENTITY_TRANSFORM);
            return;
        }
        renderer.pushTransform();
        try {
            renderer.rotate(x1 + this.getCenterOfRotationX(), y1 + this.getCenterOfRotationY(), this.rotation);
            renderer.drawImageWarped(this, x1, y1, x2, y2, x3, y3, x4, y4, effectiveSrcX, effectiveSrcY, effectiveSrcW, effectiveSrcH, this.alpha, tint, IDENTITY_TRANSFORM);
        }
        finally {
            renderer.popTransform();
        }
    }
    drawFlashInternal(x, y, width, height, tint) {
        this.throwIfDestroyed();
        const renderer = Renderer.getBackend();
        const srcWidth = this.getSourceWidth();
        const srcHeight = this.getSourceHeight();
        const effectiveSrcX = this.flipHorizontal ? this.sourceX + srcWidth : this.sourceX;
        const effectiveSrcY = this.flipVertical ? this.sourceY + srcHeight : this.sourceY;
        const effectiveSrcW = this.flipHorizontal ? -srcWidth : srcWidth;
        const effectiveSrcH = this.flipVertical ? -srcHeight : srcHeight;
        if (this.rotation === 0) {
            renderer.drawImageFlash(this, x, y, width, height, effectiveSrcX, effectiveSrcY, effectiveSrcW, effectiveSrcH, tint, IDENTITY_TRANSFORM);
            return;
        }
        const scaleX = width / (this.getWidth() || 1);
        const scaleY = height / (this.getHeight() || 1);
        const centerX = x + this.getCenterOfRotationX() * scaleX;
        const centerY = y + this.getCenterOfRotationY() * scaleY;
        renderer.pushTransform();
        try {
            renderer.rotate(centerX, centerY, this.rotation);
            renderer.drawImageFlash(this, x, y, width, height, effectiveSrcX, effectiveSrcY, effectiveSrcW, effectiveSrcH, tint, IDENTITY_TRANSFORM);
        }
        finally {
            renderer.popTransform();
        }
    }
    throwIfDestroyed() {
        if (this.destroyed) {
            throw new SlickException("Image has been destroyed");
        }
    }
    getSourceWidth() {
        return this.sourceWidth || this.textureResource.width;
    }
    getSourceHeight() {
        return this.sourceHeight || this.textureResource.height;
    }
}
//# sourceMappingURL=Image.js.map