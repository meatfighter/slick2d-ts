import { SlickException } from "../SlickException.js";
import { identityMatrix3 } from "./RenderBackend.js";
import { WebGLBatch } from "./WebGLBatch.js";
import { WebGLShaderProgram } from "./WebGLShaderProgram.js";
const SOLID_VERTEX = `#version 300 es
in vec2 a_position;
in vec4 a_color;
out vec4 v_color;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_color = a_color;
}`;
const SOLID_FRAGMENT = `#version 300 es
precision mediump float;
uniform vec4 u_color;
uniform float u_invert;
in vec4 v_color;
out vec4 outColor;
void main() {
    vec4 color = v_color * u_color;
    if (u_invert > 0.5) {
        color.rgb = 1.0 - color.rgb;
    }
    outColor = color;
}`;
const TEXTURE_VERTEX = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
in vec4 a_color;
out vec2 v_texCoord;
out vec4 v_color;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
    v_color = a_color;
}`;
const TEXTURE_FRAGMENT = `#version 300 es
precision mediump float;
uniform sampler2D u_texture;
uniform vec4 u_color;
uniform float u_flash;
uniform float u_invert;
in vec2 v_texCoord;
in vec4 v_color;
out vec4 outColor;
void main() {
    vec4 texel = texture(u_texture, v_texCoord);
    vec4 color;
    if (u_flash > 0.5) {
        color = vec4(v_color.rgb * u_color.rgb, texel.a * v_color.a * u_color.a);
    } else {
        color = texel * v_color * u_color;
    }
    if (u_invert > 0.5) {
        color.rgb = 1.0 - color.rgb;
    }
    outColor = color;
}`;
/*
 * These programs are deliberately separate from the normal programs above.
 * They are compiled only after setMonochromePalette() is first called, so a
 * game that never opts in executes the original shaders unchanged.
 */
const MONOCHROME_SOLID_FRAGMENT = `#version 300 es
precision mediump float;
uniform vec4 u_color;
uniform float u_invert;
uniform vec3 u_paletteBlack;
uniform vec3 u_paletteWhite;
in vec4 v_color;
out vec4 outColor;
void main() {
    vec4 color = v_color * u_color;
    float luminance = clamp(dot(color.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    if (u_invert > 0.5) {
        luminance = 1.0 - luminance;
    }
    color.rgb = mix(u_paletteBlack, u_paletteWhite, luminance);
    outColor = color;
}`;
const MONOCHROME_TEXTURE_FRAGMENT = `#version 300 es
precision mediump float;
uniform sampler2D u_texture;
uniform vec4 u_color;
uniform float u_flash;
uniform float u_invert;
uniform vec3 u_paletteBlack;
uniform vec3 u_paletteWhite;
in vec2 v_texCoord;
in vec4 v_color;
out vec4 outColor;
void main() {
    vec4 texel = texture(u_texture, v_texCoord);
    vec4 color;
    if (u_flash > 0.5) {
        color = vec4(v_color.rgb * u_color.rgb, texel.a * v_color.a * u_color.a);
    } else {
        color = texel * v_color * u_color;
    }
    float luminance = clamp(dot(color.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    if (u_invert > 0.5) {
        luminance = 1.0 - luminance;
    }
    color.rgb = mix(u_paletteBlack, u_paletteWhite, luminance);
    outColor = color;
}`;
const WHITE_COLOR = { r: 1, g: 1, b: 1, a: 1 };
const IDENTITY_TRANSFORM = identityMatrix3();
const TEXTURE_VERTEX_FLOATS = 8;
const SOLID_VERTEX_FLOATS = 6;
const TEXTURE_BATCH_VERTEX_CAPACITY = 2048 * 6;
/**
 * Internal WebGL2 renderer implementing Slick2D's 2D OpenGL-style state.
 */
export class WebGLRenderer {
    GL_TEXTURE_2D = 0x0de1;
    GL_RGBA = 0x1908;
    GL_RGB = 0x1907;
    GL_UNSIGNED_BYTE = 0x1401;
    GL_LINEAR = 0x2601;
    GL_NEAREST = 0x2600;
    GL_TEXTURE_MIN_FILTER = 0x2801;
    GL_TEXTURE_MAG_FILTER = 0x2800;
    GL_POINT_SMOOTH = 0x0b10;
    GL_POLYGON_SMOOTH = 0x0b41;
    GL_LINE_SMOOTH = 0x0b20;
    GL_SCISSOR_TEST = 0x0c11;
    GL_MODULATE = 0x2100;
    GL_TEXTURE_ENV = 0x2300;
    GL_TEXTURE_ENV_MODE = 0x2200;
    GL_QUADS = 0x0007;
    GL_TRIANGLES = 0x0004;
    GL_LINES = 0x0001;
    GL_SRC_ALPHA = 0x0302;
    GL_ONE = 1;
    GL_ONE_MINUS_DST_ALPHA = 0x0305;
    GL_DST_ALPHA = 0x0304;
    GL_ONE_MINUS_SRC_ALPHA = 0x0303;
    GL_COMPILE = 0x1300;
    GL_MAX_TEXTURE_SIZE = 0x0d33;
    GL_COLOR_BUFFER_BIT = 0x4000;
    GL_DEPTH_BUFFER_BIT = 0x0100;
    GL_BLEND = 0x0be2;
    GL_COLOR_CLEAR_VALUE = 0x0c22;
    GL_LINE_WIDTH = 0x0b21;
    GL_CLIP_PLANE0 = 0x3000;
    GL_CLIP_PLANE1 = 0x3001;
    GL_CLIP_PLANE2 = 0x3002;
    GL_CLIP_PLANE3 = 0x3003;
    GL_COMPILE_AND_EXECUTE = 0x1301;
    GL_RGBA8 = 0x8058;
    GL_RGBA16 = 0x805b;
    GL_BGRA = 0x80e1;
    GL_MIRROR_CLAMP_TO_EDGE_EXT = 0x8743;
    GL_TEXTURE_WRAP_S = 0x2802;
    GL_TEXTURE_WRAP_T = 0x2803;
    GL_CLAMP = 0x2900;
    GL_COLOR_SUM_EXT = 0x8458;
    GL_ALWAYS = 0x0207;
    GL_DEPTH_TEST = 0x0b71;
    GL_NOTEQUAL = 0x0205;
    GL_EQUAL = 0x0202;
    GL_SRC_COLOR = 0x0300;
    GL_ONE_MINUS_SRC_COLOR = 0x0301;
    GL_MODELVIEW_MATRIX = 0x0ba6;
    canvas = null;
    gl = null;
    contextOptions = {};
    contextLost = false;
    contextGeneration = 0;
    normalSolidProgram = null;
    normalTextureProgram = null;
    solidProgram = null;
    textureProgram = null;
    monochromeSolidProgram = null;
    monochromeTextureProgram = null;
    buffer = null;
    batch = new WebGLBatch();
    width = 1;
    height = 1;
    backingWidth = 1;
    backingHeight = 1;
    backingScaleX = 1;
    backingScaleY = 1;
    defaultWidth = 1;
    defaultHeight = 1;
    defaultBackingWidth = 1;
    defaultBackingHeight = 1;
    lineWidth = 1;
    globalAlphaScale = 1;
    colorInverted = false;
    monochromePalette = null;
    monochromePaletteEnabled = false;
    currentColor = [1, 1, 1, 1];
    transformStack = [identityMatrix3()];
    matrixPool = [];
    matrixScratch = identityMatrix3();
    textureBatchVertices = new Float32Array(TEXTURE_BATCH_VERTEX_CAPACITY * TEXTURE_VERTEX_FLOATS);
    textureBatchVertexCount = 0;
    textureBatchTexture = null;
    textureBatchFlash = false;
    textureBatchInverted = false;
    solidQuadVertices = new Float32Array(36);
    dynamicSolidVertices = new Float32Array(0);
    modelViewScratch = new Float32Array(16);
    scratchColor = { r: 1, g: 1, b: 1, a: 1 };
    currentTarget = null;
    renderTargetStack = [];
    globalColorInvertedStack = [];
    monochromePaletteStack = [];
    monochromePaletteEnabledStack = [];
    blendEnabled = true;
    /** RGB source factor; this legacy name predates separate alpha-factor tracking. */
    blendSourceFactor = this.GL_SRC_ALPHA;
    /** RGB destination factor; this legacy name predates separate alpha-factor tracking. */
    blendDestinationFactor = this.GL_ONE_MINUS_SRC_ALPHA;
    blendSourceAlphaFactor = this.GL_ONE;
    blendDestinationAlphaFactor = this.GL_ONE_MINUS_SRC_ALPHA;
    colorMaskBits = 0b1111;
    drawModeBlendEnabledStack = [];
    drawModeBlendSourceFactorStack = [];
    drawModeBlendDestinationFactorStack = [];
    drawModeBlendSourceAlphaFactorStack = [];
    drawModeBlendDestinationAlphaFactorStack = [];
    drawModeColorMaskBitsStack = [];
    colorMaskStateStack = [];
    immediateType = 0;
    immediateTexCoord = [0, 0];
    immediateVertices = [];
    lists = new Map();
    recordingList = null;
    recordingOption = 0;
    replayingList = false;
    nextList = 1;
    textures = new Map();
    currentTextureId = 0;
    nextTextureId = 1;
    screenClip = null;
    worldClip = null;
    /** Initializes the renderer with a canvas and WebGL2 context attributes. */
    initialize(canvas, options, logicalWidth = canvas.width, logicalHeight = canvas.height, backingWidth = canvas.width, backingHeight = canvas.height) {
        this.resetDrawModeStateTracking();
        const contextOptions = {
            alpha: options.alpha ?? true,
            antialias: options.antialias ?? false,
            stencil: options.stencil ?? false
        };
        this.colorInverted = false;
        this.textureBatchInverted = false;
        this.monochromePalette = null;
        this.monochromePaletteEnabled = false;
        this.normalSolidProgram = null;
        this.normalTextureProgram = null;
        this.monochromeSolidProgram = null;
        this.monochromeTextureProgram = null;
        this.solidProgram = null;
        this.textureProgram = null;
        this.canvas = canvas;
        this.contextOptions = contextOptions;
        const gl = canvas.getContext("webgl2", contextOptions);
        if (!gl) {
            throw new SlickException("Unable to create WebGL2 context");
        }
        this.contextLost = false;
        this.contextGeneration++;
        this.gl = gl;
        this.normalSolidProgram = new WebGLShaderProgram(gl, SOLID_VERTEX, SOLID_FRAGMENT);
        this.normalTextureProgram = new WebGLShaderProgram(gl, TEXTURE_VERTEX, TEXTURE_FRAGMENT);
        this.solidProgram = this.normalSolidProgram;
        this.textureProgram = this.normalTextureProgram;
        this.buffer = gl.createBuffer();
        this.currentTarget = null;
        this.renderTargetStack.length = 0;
        this.globalColorInvertedStack.length = 0;
        this.monochromePaletteStack.length = 0;
        this.monochromePaletteEnabledStack.length = 0;
        gl.enable(gl.BLEND);
        gl.colorMask(true, true, true, true);
        this.applyBlendFunction(gl, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        this.initDisplay(logicalWidth, logicalHeight, backingWidth, backingHeight);
    }
    /** Begins a frame by binding the default target, setting viewport, and clearing. */
    beginFrame(width, height, background, backingWidth = this.defaultBackingWidth, backingHeight = this.defaultBackingHeight) {
        this.flushTextureBatch();
        this.colorInverted = false;
        this.textureBatchInverted = false;
        this.setDefaultDimensions(width, height, backingWidth, backingHeight);
        this.useDefaultDimensions();
        this.currentTarget = null;
        this.renderTargetStack.length = 0;
        this.globalColorInvertedStack.length = 0;
        this.monochromePaletteStack.length = 0;
        this.monochromePaletteEnabledStack.length = 0;
        const gl = this.gl;
        if (!gl) {
            return;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.backingWidth, this.backingHeight);
        // WebGL clear obeys colorMask but ignores blend state, so widen only
        // the color mask while preserving the persistent draw-mode blend state.
        this.pushFullColorMask();
        try {
            gl.clearColor(background.r, background.g, background.b, background.a);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        finally {
            this.popColorMask();
        }
        this.transformStack.length = 1;
        this.writeIdentity(this.transformStack[0]);
        this.screenClip = null;
        this.worldClip = null;
        this.applyActiveClip();
    }
    /** Ends a frame by flushing pending work. */
    endFrame() {
        this.flush();
    }
    /** Returns the active framebuffer-backed render target, or null for the display. */
    getRenderTarget() {
        return this.currentTarget;
    }
    /** @internal Returns the generation of the currently owned WebGL context. */
    __getContextGeneration() {
        return this.contextGeneration;
    }
    /** Sets the active framebuffer-backed render target. */
    setRenderTarget(target) {
        const gl = this.gl;
        if (this.currentTarget === target) {
            return;
        }
        this.flushTextureBatch();
        this.currentTarget = target;
        if (!gl) {
            return;
        }
        if (target) {
            target.ensure(gl, this.contextGeneration);
            target.markModified?.();
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
            this.setActiveDimensions(target.width, target.height, target.width, target.height);
        }
        else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            this.useDefaultDimensions();
        }
        gl.viewport(0, 0, this.backingWidth, this.backingHeight);
        this.applyActiveClip();
    }
    /** Saves the active render target and switches to another target. */
    pushRenderTarget(target) {
        this.renderTargetStack.push(this.currentTarget);
        this.setRenderTarget(target);
    }
    /** Restores the render target saved by pushRenderTarget(). */
    popRenderTarget() {
        const target = this.renderTargetStack.pop();
        if (target === undefined) {
            throw new SlickException("Render target stack underflow");
        }
        this.setRenderTarget(target);
    }
    /** Saves the exact WebGL state controlled by Graphics.setDrawMode(). */
    pushDrawModeState() {
        this.drawModeBlendEnabledStack.push(this.blendEnabled);
        this.drawModeBlendSourceFactorStack.push(this.blendSourceFactor);
        this.drawModeBlendDestinationFactorStack.push(this.blendDestinationFactor);
        this.drawModeBlendSourceAlphaFactorStack.push(this.blendSourceAlphaFactor);
        this.drawModeBlendDestinationAlphaFactorStack.push(this.blendDestinationAlphaFactor);
        this.drawModeColorMaskBitsStack.push(this.colorMaskBits);
    }
    /** Saves the current draw-mode state and applies Graphics.MODE_NORMAL semantics. */
    pushNormalDrawModeState() {
        this.pushDrawModeState();
        this.__applyDrawModeState(true, this.GL_SRC_ALPHA, this.GL_ONE_MINUS_SRC_ALPHA, 0b1111, this.GL_ONE, this.GL_ONE_MINUS_SRC_ALPHA);
    }
    /** Restores the exact state saved by pushDrawModeState() or pushNormalDrawModeState(). */
    popDrawModeState() {
        const depth = this.drawModeBlendEnabledStack.length;
        if (depth === 0 ||
            this.drawModeBlendSourceFactorStack.length !== depth ||
            this.drawModeBlendDestinationFactorStack.length !== depth ||
            this.drawModeBlendSourceAlphaFactorStack.length !== depth ||
            this.drawModeBlendDestinationAlphaFactorStack.length !== depth ||
            this.drawModeColorMaskBitsStack.length !== depth) {
            throw new SlickException("Draw-mode state stack underflow or corruption");
        }
        const colorMaskBits = this.drawModeColorMaskBitsStack.pop();
        const destinationAlphaFactor = this.drawModeBlendDestinationAlphaFactorStack.pop();
        const sourceAlphaFactor = this.drawModeBlendSourceAlphaFactorStack.pop();
        const destinationFactor = this.drawModeBlendDestinationFactorStack.pop();
        const sourceFactor = this.drawModeBlendSourceFactorStack.pop();
        const blendEnabled = this.drawModeBlendEnabledStack.pop();
        this.__applyDrawModeState(blendEnabled, sourceFactor, destinationFactor, colorMaskBits, sourceAlphaFactor, destinationAlphaFactor);
    }
    /** Saves the current color mask and makes all four channels writable. */
    pushFullColorMask() {
        this.colorMaskStateStack.push(this.colorMaskBits);
        this.applyColorMaskBits(0b1111);
    }
    /** Restores the color mask saved by pushFullColorMask(). */
    popColorMask() {
        const colorMaskBits = this.colorMaskStateStack.pop();
        if (colorMaskBits === undefined) {
            throw new SlickException("Color-mask state stack underflow");
        }
        this.applyColorMaskBits(colorMaskBits);
    }
    /** Draws a textured quad. */
    drawImage(image, x, y, width, height, srcX, srcY, srcWidth, srcHeight, alpha, tint, transform, useCornerColors = true, useCurrentColorForNullTint = false) {
        this.drawImageWarped(image, x, y, x + width, y, x + width, y + height, x, y + height, srcX, srcY, srcWidth, srcHeight, alpha, tint, transform, useCornerColors, useCurrentColorForNullTint);
    }
    /** Draws a textured quad as a Slick flash/silhouette. */
    drawImageFlash(image, x, y, width, height, srcX, srcY, srcWidth, srcHeight, tint, transform) {
        this.drawTexturedWarped(image, x, y, x + width, y, x + width, y + height, x, y + height, srcX, srcY, srcWidth, srcHeight, 1, tint, transform, true, true, false);
    }
    /** Draws a textured quad with arbitrary corner positions. */
    drawImageWarped(image, x1, y1, x2, y2, x3, y3, x4, y4, srcX, srcY, srcWidth, srcHeight, alpha, tint, transform, useCornerColors = true, useCurrentColorForNullTint = false) {
        this.drawTexturedWarped(image, x1, y1, x2, y2, x3, y3, x4, y4, srcX, srcY, srcWidth, srcHeight, alpha, tint, transform, false, useCornerColors, useCurrentColorForNullTint);
    }
    drawTexturedWarped(image, x1, y1, x2, y2, x3, y3, x4, y4, srcX, srcY, srcWidth, srcHeight, alpha, tint, transform, flash, useCornerColors, useCurrentColorForNullTint) {
        const gl = this.gl;
        if (!gl || !this.textureProgram || !this.buffer) {
            return;
        }
        const resource = image.__getTextureResource();
        const texture = resource?.ensureTexture(gl);
        if (!resource || !texture || resource.width <= 0 || resource.height <= 0) {
            return;
        }
        const matrix = this.combinedMatrix(transform);
        const u1 = srcX / resource.width;
        const v1 = srcY / resource.height;
        const u2 = (srcX + srcWidth) / resource.width;
        const v2 = (srcY + srcHeight) / resource.height;
        const cornerColors = useCornerColors ? image.__getCornerColors() : null;
        const color = tint ??
            (useCurrentColorForNullTint && !cornerColors
                ? this.setScratchColor(this.currentColor[0], this.currentColor[1], this.currentColor[2], this.currentColor[3])
                : WHITE_COLOR);
        const topLeft = cornerColors?.[0] ?? WHITE_COLOR;
        const topRight = cornerColors?.[1] ?? WHITE_COLOR;
        const bottomRight = cornerColors?.[2] ?? WHITE_COLOR;
        const bottomLeft = cornerColors?.[3] ?? WHITE_COLOR;
        this.queueTextureQuad(texture, matrix, x1, y1, x2, y2, x3, y3, x4, y4, u1, v1, u2, v2, topLeft, topRight, bottomRight, bottomLeft, color, color.a * alpha * this.globalAlphaScale, flash);
        this.batch.markDirty();
    }
    /** Draws a filled rectangle. */
    fillRect(x, y, width, height, color, transform = IDENTITY_TRANSFORM) {
        const x2 = x + width;
        const y2 = y + height;
        this.drawSolidQuad(x, y, x2, y, x2, y2, x, y2, color, transform);
    }
    /** Draws a line as a thin quad so browser line-width limits do not matter. */
    drawLine(x1, y1, x2, y2, color, width, transform = IDENTITY_TRANSFORM) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const px = ((-dy / len) * width) / 2;
        const py = ((dx / len) * width) / 2;
        this.drawSolidQuad(x1 + px, y1 + py, x2 + px, y2 + py, x2 - px, y2 - py, x1 - px, y1 - py, color, transform);
    }
    /** Draws a line with endpoint color interpolation. */
    drawGradientLine(x1, y1, color1, x2, y2, color2, width, transform = IDENTITY_TRANSFORM) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const px = ((-dy / len) * width) / 2;
        const py = ((dx / len) * width) / 2;
        const matrix = this.combinedMatrix(transform);
        const vertices = this.solidQuadVertices;
        this.writeSolidVertex(vertices, 0, matrix, x1 + px, y1 + py, color1);
        this.writeSolidVertex(vertices, 1, matrix, x2 + px, y2 + py, color2);
        this.writeSolidVertex(vertices, 2, matrix, x2 - px, y2 - py, color2);
        this.writeSolidVertex(vertices, 3, matrix, x1 + px, y1 + py, color1);
        this.writeSolidVertex(vertices, 4, matrix, x2 - px, y2 - py, color2);
        this.writeSolidVertex(vertices, 5, matrix, x1 - px, y1 - py, color1);
        this.submitSolidVertices(vertices, 6);
    }
    /** Draws connected line segments. */
    drawLineStrip(points, color, width, transform = IDENTITY_TRANSFORM) {
        for (let i = 0; i + 1 < points.length; i++) {
            const start = points[i];
            const end = points[i + 1];
            this.drawLine(start[0], start[1], end[0], end[1], color, width, transform);
        }
    }
    /** Draws already-triangulated solid geometry. */
    fillTriangles(points, color, transform = IDENTITY_TRANSFORM) {
        this.drawSolidPolygon(points, color, transform);
    }
    /** Copies pixels from the active framebuffer into a render-target image texture. */
    copyAreaToRenderTarget(target, x, y) {
        this.flushTextureBatch();
        const gl = this.gl;
        if (!gl) {
            return;
        }
        const sourceFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        target.ensure(gl, this.contextGeneration);
        if (!target.texture) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, sourceFramebuffer);
            return;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, sourceFramebuffer);
        gl.bindTexture(gl.TEXTURE_2D, target.texture);
        const sourceX0 = Math.floor(x * this.backingScaleX);
        const sourceX1 = Math.ceil((x + target.width) * this.backingScaleX);
        const sourceY0 = Math.floor((this.height - y - target.height) * this.backingScaleY);
        const sourceY1 = Math.ceil((this.height - y) * this.backingScaleY);
        const sourceMatchesTargetSize = sourceX1 - sourceX0 === target.width && sourceY1 - sourceY0 === target.height;
        if (sourceMatchesTargetSize || typeof gl.blitFramebuffer !== "function") {
            gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, sourceX0, sourceY0, target.width, target.height);
        }
        else {
            gl.bindFramebuffer(gl.READ_FRAMEBUFFER, sourceFramebuffer);
            gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, target.framebuffer);
            gl.blitFramebuffer(sourceX0, sourceY0, sourceX1, sourceY1, 0, 0, target.width, target.height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
            gl.bindFramebuffer(gl.FRAMEBUFFER, sourceFramebuffer);
        }
        target.textureResource.applyFilter(gl);
        this.batch.markDirty();
    }
    /** Applies a screen-space scissor clip. */
    setClip(x, y, width, height) {
        this.flushTextureBatch();
        this.screenClip = WebGLRenderer.normalizeClip(x, y, width, height);
        this.applyActiveClip();
    }
    /** Clears the active screen-space clip. */
    clearClip() {
        this.flushTextureBatch();
        this.screenClip = null;
        this.applyActiveClip();
    }
    /** Applies a transformed world-space clip by converting its bounds to a scissor rectangle. */
    setWorldClip(x, y, width, height, transform) {
        this.flushTextureBatch();
        const matrix = this.combinedMatrix(transform);
        const x2 = x + width;
        const y2 = y + height;
        const tx1 = matrix[0] * x + matrix[1] * y + matrix[2];
        const ty1 = matrix[3] * x + matrix[4] * y + matrix[5];
        const tx2 = matrix[0] * x2 + matrix[1] * y + matrix[2];
        const ty2 = matrix[3] * x2 + matrix[4] * y + matrix[5];
        const tx3 = matrix[0] * x2 + matrix[1] * y2 + matrix[2];
        const ty3 = matrix[3] * x2 + matrix[4] * y2 + matrix[5];
        const tx4 = matrix[0] * x + matrix[1] * y2 + matrix[2];
        const ty4 = matrix[3] * x + matrix[4] * y2 + matrix[5];
        const minX = Math.min(tx1, tx2, tx3, tx4);
        const maxX = Math.max(tx1, tx2, tx3, tx4);
        const minY = Math.min(ty1, ty2, ty3, ty4);
        const maxY = Math.max(ty1, ty2, ty3, ty4);
        this.worldClip = WebGLRenderer.normalizeClip(minX, minY, maxX - minX, maxY - minY);
        this.applyActiveClip();
    }
    /** Clears the active world-space clip. */
    clearWorldClip() {
        this.flushTextureBatch();
        this.worldClip = null;
        this.applyActiveClip();
    }
    /** Browser extension: toggles RGB inversion for subsequent draw calls. */
    setColorInverted(inverted) {
        if (this.colorInverted === inverted) {
            return;
        }
        this.flushTextureBatch();
        this.colorInverted = inverted;
    }
    /** Browser extension: reports the active RGB inversion state. */
    isColorInverted() {
        return this.colorInverted;
    }
    /**
     * Browser extension: maps rendered luminance between replacement colors.
     *
     * Palette programs are compiled lazily. The normal and inversion shader
     * programs remain untouched and active for callers that never opt in.
     */
    setMonochromePalette(blackReplacement, whiteReplacement) {
        const blackRed = WebGLRenderer.normalizeColorChannel(blackReplacement.r);
        const blackGreen = WebGLRenderer.normalizeColorChannel(blackReplacement.g);
        const blackBlue = WebGLRenderer.normalizeColorChannel(blackReplacement.b);
        const whiteRed = WebGLRenderer.normalizeColorChannel(whiteReplacement.r);
        const whiteGreen = WebGLRenderer.normalizeColorChannel(whiteReplacement.g);
        const whiteBlue = WebGLRenderer.normalizeColorChannel(whiteReplacement.b);
        const paletteChanged = !WebGLRenderer.monochromePaletteMatches(this.monochromePalette, blackRed, blackGreen, blackBlue, whiteRed, whiteGreen, whiteBlue);
        if (this.monochromePaletteEnabled && !paletteChanged) {
            return;
        }
        this.flushTextureBatch();
        if (!this.monochromePaletteEnabled) {
            this.normalSolidProgram ??= this.solidProgram;
            this.normalTextureProgram ??= this.textureProgram;
        }
        if (paletteChanged) {
            this.monochromePalette = {
                black: [blackRed, blackGreen, blackBlue],
                white: [whiteRed, whiteGreen, whiteBlue]
            };
        }
        this.monochromePaletteEnabled = true;
        const gl = this.gl;
        if (!gl) {
            return;
        }
        try {
            const programsCreated = this.ensureMonochromePalettePrograms(gl);
            if (programsCreated || paletteChanged) {
                this.applyMonochromePaletteUniforms(gl);
            }
            this.solidProgram = this.monochromeSolidProgram;
            this.textureProgram = this.monochromeTextureProgram;
        }
        catch (error) {
            if (!WebGLRenderer.isContextLost(gl)) {
                this.monochromeSolidProgram?.dispose(gl);
                this.monochromeTextureProgram?.dispose(gl);
            }
            this.monochromeSolidProgram = null;
            this.monochromeTextureProgram = null;
            this.disableMonochromePalette(false);
            throw error;
        }
    }
    /** Browser extension: restores the normal programs active before the palette was enabled. */
    clearMonochromePalette() {
        if (!this.monochromePaletteEnabled) {
            return;
        }
        this.flushTextureBatch();
        this.disableMonochromePalette(false);
    }
    /** Browser extension: reports whether the optional palette programs are active. */
    isMonochromePaletteEnabled() {
        return this.monochromePaletteEnabled;
    }
    /** Browser extension: disables whole-frame color effects until restored. */
    pushGlobalColorEffectsDisabled() {
        this.flushTextureBatch();
        this.globalColorInvertedStack.push(this.colorInverted);
        this.monochromePaletteStack.push(this.monochromePalette);
        this.monochromePaletteEnabledStack.push(this.monochromePaletteEnabled);
        this.colorInverted = false;
        this.disableMonochromePalette(false);
    }
    /** Browser extension: restores color effects saved by pushGlobalColorEffectsDisabled(). */
    popGlobalColorEffects() {
        if (this.globalColorInvertedStack.length === 0 || this.monochromePaletteStack.length === 0 || this.monochromePaletteEnabledStack.length === 0) {
            throw new SlickException("Global color effect stack underflow");
        }
        this.flushTextureBatch();
        const colorInverted = this.globalColorInvertedStack.pop();
        const monochromePalette = this.monochromePaletteStack.pop();
        const monochromePaletteEnabled = this.monochromePaletteEnabledStack.pop();
        const paletteChanged = this.monochromePalette !== monochromePalette;
        this.colorInverted = colorInverted;
        this.monochromePalette = monochromePalette;
        this.monochromePaletteEnabled = monochromePaletteEnabled;
        if (!monochromePaletteEnabled) {
            this.solidProgram = this.normalSolidProgram;
            this.textureProgram = this.normalTextureProgram;
            return;
        }
        if (monochromePalette === null) {
            throw new SlickException("Global color effect stack contains an invalid palette state");
        }
        const gl = this.gl;
        if (gl) {
            const programsCreated = this.ensureMonochromePalettePrograms(gl);
            if (programsCreated || paletteChanged) {
                this.applyMonochromePaletteUniforms(gl);
            }
        }
        this.solidProgram = this.monochromeSolidProgram;
        this.textureProgram = this.monochromeTextureProgram;
    }
    /** Saves the current matrix. */
    pushTransform() {
        const matrix = this.matrixPool.pop() ?? identityMatrix3();
        this.copyMatrix(this.currentMatrix(), matrix);
        this.transformStack.push(matrix);
    }
    /** Restores the previous matrix. */
    popTransform() {
        if (this.transformStack.length > 1) {
            const matrix = this.transformStack.pop();
            if (matrix) {
                this.matrixPool.push(matrix);
            }
        }
    }
    /** Applies a translation to the current matrix. */
    translate(x, y) {
        const matrix = this.currentMatrix();
        matrix[2] = matrix[0] * x + matrix[1] * y + matrix[2];
        matrix[5] = matrix[3] * x + matrix[4] * y + matrix[5];
    }
    /** Applies a scale to the current matrix. */
    scale(x, y) {
        const matrix = this.currentMatrix();
        matrix[0] *= x;
        matrix[1] *= y;
        matrix[3] *= x;
        matrix[4] *= y;
    }
    /** Applies a clockwise degree rotation around a point to the current matrix. */
    rotate(x, y, angle) {
        const radians = (angle * Math.PI) / 180;
        const c = Math.cos(radians);
        const s = Math.sin(radians);
        const tx = x - c * x + s * y;
        const ty = y - s * x - c * y;
        const matrix = this.currentMatrix();
        const m0 = matrix[0];
        const m1 = matrix[1];
        const m3 = matrix[3];
        const m4 = matrix[4];
        matrix[0] = m0 * c + m1 * s;
        matrix[1] = -m0 * s + m1 * c;
        matrix[2] = m0 * tx + m1 * ty + matrix[2];
        matrix[3] = m3 * c + m4 * s;
        matrix[4] = -m3 * s + m4 * c;
        matrix[5] = m3 * tx + m4 * ty + matrix[5];
    }
    /** Reads RGBA pixels from the active target. */
    readPixels(x, y, width, height, target) {
        this.flushTextureBatch();
        const gl = this.gl;
        if (!gl) {
            target.fill(0);
            return;
        }
        const sourceX0 = Math.floor(x * this.backingScaleX);
        const sourceX1 = Math.ceil((x + width) * this.backingScaleX);
        const sourceY0 = Math.floor((this.height - y - height) * this.backingScaleY);
        const sourceY1 = Math.ceil((this.height - y) * this.backingScaleY);
        const sourceWidth = Math.max(0, sourceX1 - sourceX0);
        const sourceHeight = Math.max(0, sourceY1 - sourceY0);
        if (sourceWidth === width && sourceHeight === height) {
            gl.readPixels(sourceX0, sourceY0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, target);
            return;
        }
        if (sourceWidth === 0 || sourceHeight === 0) {
            target.fill(0);
            return;
        }
        const source = new Uint8Array(sourceWidth * sourceHeight * 4);
        gl.readPixels(sourceX0, sourceY0, sourceWidth, sourceHeight, gl.RGBA, gl.UNSIGNED_BYTE, source);
        for (let row = 0; row < height; row++) {
            const sourceRow = Math.min(sourceHeight - 1, Math.max(0, Math.floor(((row + 0.5) * sourceHeight) / height)));
            for (let column = 0; column < width; column++) {
                const sourceColumn = Math.min(sourceWidth - 1, Math.max(0, Math.floor(((column + 0.5) * sourceWidth) / width)));
                const sourceOffset = (sourceRow * sourceWidth + sourceColumn) * 4;
                const targetOffset = (row * width + column) * 4;
                target[targetOffset] = source[sourceOffset];
                target[targetOffset + 1] = source[sourceOffset + 1];
                target[targetOffset + 2] = source[sourceOffset + 2];
                target[targetOffset + 3] = source[sourceOffset + 3];
            }
        }
    }
    /** Binds a decoded WebGL texture resource to the active texture unit. */
    bindTextureResource(resource) {
        this.flushTextureBatch();
        const gl = this.gl;
        if (!gl) {
            return;
        }
        this.currentTextureId = 0;
        const texture = resource.ensureTexture(gl);
        if (texture) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
        }
    }
    /** Handles browser WebGL context loss. */
    handleContextLost() {
        this.resetDrawModeStateTracking();
        const gl = this.gl;
        this.contextLost = true;
        this.textureBatchVertexCount = 0;
        this.textureBatchTexture = null;
        this.textureBatchFlash = false;
        this.textureBatchInverted = false;
        this.colorInverted = false;
        this.monochromePalette = null;
        this.monochromePaletteEnabled = false;
        for (const target of this.renderTargetStack) {
            target?.invalidate(gl);
        }
        this.currentTarget?.invalidate(gl);
        this.currentTarget = null;
        this.renderTargetStack.length = 0;
        this.globalColorInvertedStack.length = 0;
        this.monochromePaletteStack.length = 0;
        this.monochromePaletteEnabledStack.length = 0;
        this.textures.clear();
        this.currentTextureId = 0;
        this.gl = null;
        this.normalSolidProgram = null;
        this.normalTextureProgram = null;
        this.solidProgram = null;
        this.textureProgram = null;
        this.monochromeSolidProgram = null;
        this.monochromeTextureProgram = null;
        this.buffer = null;
    }
    /** Handles browser WebGL context restoration. */
    handleContextRestored() {
        if (this.canvas && (this.contextLost || !this.gl)) {
            this.initialize(this.canvas, this.contextOptions, this.defaultWidth, this.defaultHeight, this.defaultBackingWidth, this.defaultBackingHeight);
        }
    }
    /** Releases renderer-owned WebGL state. */
    dispose() {
        this.resetDrawModeStateTracking();
        const gl = this.gl;
        const canDelete = gl !== null && !WebGLRenderer.isContextLost(gl);
        if (canDelete && this.buffer) {
            gl.deleteBuffer(this.buffer);
        }
        if (canDelete) {
            const programs = new Set();
            if (this.normalSolidProgram) {
                programs.add(this.normalSolidProgram);
            }
            if (this.normalTextureProgram) {
                programs.add(this.normalTextureProgram);
            }
            if (this.solidProgram) {
                programs.add(this.solidProgram);
            }
            if (this.textureProgram) {
                programs.add(this.textureProgram);
            }
            if (this.monochromeSolidProgram) {
                programs.add(this.monochromeSolidProgram);
            }
            if (this.monochromeTextureProgram) {
                programs.add(this.monochromeTextureProgram);
            }
            for (const program of programs) {
                program.dispose(gl);
            }
        }
        if (canDelete) {
            for (const texture of this.textures.values()) {
                gl.deleteTexture(texture.texture);
            }
        }
        for (const target of this.renderTargetStack) {
            if (canDelete) {
                target?.dispose(gl);
            }
            else {
                target?.invalidate(null);
            }
        }
        if (canDelete) {
            this.currentTarget?.dispose(gl);
        }
        else {
            this.currentTarget?.invalidate(null);
        }
        this.textures.clear();
        this.currentTextureId = 0;
        this.textureBatchVertexCount = 0;
        this.textureBatchTexture = null;
        this.textureBatchFlash = false;
        this.textureBatchInverted = false;
        this.colorInverted = false;
        this.monochromePalette = null;
        this.monochromePaletteEnabled = false;
        this.renderTargetStack.length = 0;
        this.globalColorInvertedStack.length = 0;
        this.monochromePaletteStack.length = 0;
        this.monochromePaletteEnabledStack.length = 0;
        this.contextLost = false;
        this.gl = null;
        this.buffer = null;
        this.normalSolidProgram = null;
        this.normalTextureProgram = null;
        this.solidProgram = null;
        this.textureProgram = null;
        this.monochromeSolidProgram = null;
        this.monochromeTextureProgram = null;
        this.currentTarget = null;
        this.canvas = null;
    }
    /** Java Slick2D counterpart: SGL.flush(). */
    flush() {
        this.flushTextureBatch();
        this.batch.flush();
    }
    /** Java Slick2D counterpart: SGL.initDisplay(int, int). */
    initDisplay(width, height, backingWidth = width, backingHeight = height) {
        this.flushTextureBatch();
        this.colorInverted = false;
        this.textureBatchInverted = false;
        this.currentTarget = null;
        this.renderTargetStack.length = 0;
        this.globalColorInvertedStack.length = 0;
        this.monochromePaletteStack.length = 0;
        this.monochromePaletteEnabledStack.length = 0;
        this.setDefaultDimensions(width, height, backingWidth, backingHeight);
        this.useDefaultDimensions();
        this.gl?.viewport(0, 0, this.backingWidth, this.backingHeight);
    }
    /** Java Slick2D counterpart: SGL.enterOrtho(int, int). */
    enterOrtho(xsize, ysize) {
        this.flushTextureBatch();
        this.colorInverted = false;
        this.textureBatchInverted = false;
        this.currentTarget = null;
        this.renderTargetStack.length = 0;
        this.globalColorInvertedStack.length = 0;
        this.monochromePaletteStack.length = 0;
        this.monochromePaletteEnabledStack.length = 0;
        this.setDefaultDimensions(xsize, ysize, this.defaultBackingWidth, this.defaultBackingHeight);
        this.useDefaultDimensions();
        this.gl?.viewport(0, 0, this.backingWidth, this.backingHeight);
        this.glLoadIdentity();
    }
    /** Java Slick2D counterpart: SGL.glClearColor(float, float, float, float). */
    glClearColor(r, g, b, a) {
        this.gl?.clearColor(r, g, b, a);
    }
    /** Java Slick2D counterpart: SGL.glClipPlane(int, DoubleBuffer). */
    glClipPlane(_plane, _buffer) { }
    /** Java Slick2D counterpart: SGL.glScissor(int, int, int, int). */
    glScissor(x, y, width, height) {
        this.flushTextureBatch();
        this.screenClip = null;
        this.worldClip = null;
        this.gl?.enable(this.gl.SCISSOR_TEST);
        const x0 = Math.floor(x * this.backingScaleX);
        const x1 = Math.ceil((x + width) * this.backingScaleX);
        const y0 = Math.floor(y * this.backingScaleY);
        const y1 = Math.ceil((y + height) * this.backingScaleY);
        this.gl?.scissor(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
    }
    /** Java Slick2D counterpart: SGL.glLineWidth(float). */
    glLineWidth(width) {
        if (this.recordListCommand(() => this.glLineWidth(width))) {
            return;
        }
        this.lineWidth = width;
        this.gl?.lineWidth(width);
    }
    /** Java Slick2D counterpart: SGL.glClear(int). */
    glClear(mask) {
        this.flushTextureBatch();
        this.gl?.clear(mask);
    }
    /** Java Slick2D counterpart: SGL.glColorMask(boolean, boolean, boolean, boolean). */
    glColorMask(red, green, blue, alpha) {
        this.applyColorMaskBits(WebGLRenderer.encodeColorMask(red, green, blue, alpha));
    }
    /** Java Slick2D counterpart: SGL.glLoadIdentity(). */
    glLoadIdentity() {
        this.writeIdentity(this.transformStack[this.transformStack.length - 1]);
    }
    /** Java Slick2D counterpart: SGL.glGetInteger(int, IntBuffer). */
    glGetInteger(id, ret) {
        const value = this.gl?.getParameter(id);
        ret[0] = typeof value === "number" ? value : 0;
    }
    /** Java Slick2D counterpart: SGL.glGetFloat(int, FloatBuffer). */
    glGetFloat(id, ret) {
        if (id === this.GL_MODELVIEW_MATRIX) {
            const m = this.currentMatrix();
            const scratch = this.modelViewScratch;
            scratch[0] = m[0];
            scratch[1] = m[3];
            scratch[2] = 0;
            scratch[3] = m[6];
            scratch[4] = m[1];
            scratch[5] = m[4];
            scratch[6] = 0;
            scratch[7] = m[7];
            scratch[8] = 0;
            scratch[9] = 0;
            scratch[10] = 1;
            scratch[11] = 0;
            scratch[12] = m[2];
            scratch[13] = m[5];
            scratch[14] = 0;
            scratch[15] = m[8];
            const limit = Math.min(ret.length, scratch.length);
            for (let i = 0; i < limit; i++) {
                ret[i] = scratch[i];
            }
            return;
        }
        const value = this.gl?.getParameter(id);
        ret[0] = typeof value === "number" ? value : 0;
    }
    /** Java Slick2D counterpart: SGL.glEnable(int). */
    glEnable(id) {
        if (this.recordListCommand(() => this.glEnable(id))) {
            return;
        }
        if (id === this.GL_BLEND) {
            this.__applyDrawModeState(true, this.blendSourceFactor, this.blendDestinationFactor, this.colorMaskBits, this.blendSourceAlphaFactor, this.blendDestinationAlphaFactor);
            return;
        }
        this.flushTextureBatch();
        this.gl?.enable(id);
    }
    /** Java Slick2D counterpart: SGL.glDisable(int). */
    glDisable(id) {
        if (this.recordListCommand(() => this.glDisable(id))) {
            return;
        }
        if (id === this.GL_BLEND) {
            this.__applyDrawModeState(false, this.blendSourceFactor, this.blendDestinationFactor, this.colorMaskBits, this.blendSourceAlphaFactor, this.blendDestinationAlphaFactor);
            return;
        }
        this.flushTextureBatch();
        this.gl?.disable(id);
    }
    /** Java Slick2D counterpart: SGL.glBindTexture(int, int). */
    glBindTexture(target, id) {
        if (this.recordListCommand(() => this.glBindTexture(target, id))) {
            return;
        }
        this.flushTextureBatch();
        const gl = this.gl;
        this.currentTextureId = Math.trunc(id);
        if (!gl) {
            return;
        }
        if (id === 0) {
            gl.bindTexture(target, null);
            return;
        }
        let info = this.textures.get(this.currentTextureId);
        if (!info) {
            const texture = gl.createTexture();
            if (!texture) {
                return;
            }
            info = { texture, target, width: 0, height: 0 };
            this.textures.set(this.currentTextureId, info);
        }
        gl.bindTexture(target, info.texture);
    }
    /** Java Slick2D counterpart: SGL.glGetTexImage(...). */
    glGetTexImage(target, level, format, type, pixels) {
        this.flushTextureBatch();
        pixels.fill(0);
        const gl = this.gl;
        const info = this.currentTextureId === 0 ? null : this.textures.get(this.currentTextureId);
        if (!gl || !info || info.width <= 0 || info.height <= 0 || pixels.byteLength < info.width * info.height * 4) {
            return;
        }
        const framebuffer = gl.createFramebuffer();
        if (!framebuffer) {
            return;
        }
        const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, info.texture, level);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
            gl.readPixels(0, 0, info.width, info.height, format, type, pixels);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
        gl.deleteFramebuffer(framebuffer);
    }
    /** Java Slick2D counterpart: SGL.glDeleteTextures(IntBuffer). */
    glDeleteTextures(buffer) {
        this.flushTextureBatch();
        const gl = this.gl;
        for (const id of buffer) {
            const info = this.textures.get(id);
            if (gl && info) {
                gl.deleteTexture(info.texture);
            }
            this.textures.delete(id);
            if (this.currentTextureId === id) {
                this.currentTextureId = 0;
            }
        }
    }
    /** Java Slick2D counterpart: SGL.glColor4f(float, float, float, float). */
    glColor4f(r, g, b, a) {
        if (this.recordListCommand(() => this.glColor4f(r, g, b, a))) {
            return;
        }
        this.currentColor[0] = r;
        this.currentColor[1] = g;
        this.currentColor[2] = b;
        this.currentColor[3] = a;
    }
    /** Java Slick2D counterpart: SGL.glTexCoord2f(float, float). */
    glTexCoord2f(u, v) {
        if (this.recordListCommand(() => this.glTexCoord2f(u, v))) {
            return;
        }
        this.immediateTexCoord[0] = u;
        this.immediateTexCoord[1] = v;
    }
    /** Java Slick2D counterpart: SGL.glVertex3f(float, float, float). */
    glVertex3f(x, y, _z) {
        if (this.recordListCommand(() => this.glVertex3f(x, y, _z))) {
            return;
        }
        this.immediateVertices.push(x, y, this.immediateTexCoord[0], this.immediateTexCoord[1]);
    }
    /** Java Slick2D counterpart: SGL.glVertex2f(float, float). */
    glVertex2f(x, y) {
        if (this.recordListCommand(() => this.glVertex2f(x, y))) {
            return;
        }
        this.immediateVertices.push(x, y, this.immediateTexCoord[0], this.immediateTexCoord[1]);
    }
    /** Java Slick2D counterpart: SGL.glRotatef(float, float, float, float). */
    glRotatef(angle, x, y, z) {
        if (this.recordListCommand(() => this.glRotatef(angle, x, y, z))) {
            return;
        }
        if (z !== 0 || (x === 0 && y === 0)) {
            this.rotate(0, 0, angle);
        }
    }
    /** Java Slick2D counterpart: SGL.glTranslatef(float, float, float). */
    glTranslatef(x, y, _z) {
        if (this.recordListCommand(() => this.glTranslatef(x, y, _z))) {
            return;
        }
        this.translate(x, y);
    }
    /** Java Slick2D counterpart: SGL.glBegin(int). */
    glBegin(geomType) {
        if (this.recordListCommand(() => this.glBegin(geomType))) {
            return;
        }
        this.immediateType = geomType;
        this.immediateVertices.length = 0;
    }
    /** Java Slick2D counterpart: SGL.glEnd(). */
    glEnd() {
        if (this.recordListCommand(() => this.glEnd())) {
            return;
        }
        if (this.immediateType === this.GL_LINES) {
            const color = this.setScratchColor(this.currentColor[0], this.currentColor[1], this.currentColor[2], this.currentColor[3]);
            for (let i = 0; i + 7 < this.immediateVertices.length; i += 8) {
                this.drawLine(this.immediateVertices[i], this.immediateVertices[i + 1], this.immediateVertices[i + 4], this.immediateVertices[i + 5], color, this.lineWidth);
            }
        }
        else {
            const color = this.setScratchColor(this.currentColor[0], this.currentColor[1], this.currentColor[2], this.currentColor[3]);
            this.drawImmediateSolidVertices(color);
        }
        this.immediateVertices.length = 0;
        this.immediateType = 0;
    }
    /** Java Slick2D counterpart: SGL.glTexEnvi(int, int, int). */
    glTexEnvi(_target, _mode, _value) { }
    /** Java Slick2D counterpart: SGL.glPointSize(float). */
    glPointSize(size) {
        if (this.recordListCommand(() => this.glPointSize(size))) {
            return;
        }
    }
    /** Java Slick2D counterpart: SGL.glScalef(float, float, float). */
    glScalef(x, y, _z) {
        if (this.recordListCommand(() => this.glScalef(x, y, _z))) {
            return;
        }
        this.scale(x, y);
    }
    /** Java Slick2D counterpart: SGL.glPushMatrix(). */
    glPushMatrix() {
        if (this.recordListCommand(() => this.glPushMatrix())) {
            return;
        }
        this.pushTransform();
    }
    /** Java Slick2D counterpart: SGL.glPopMatrix(). */
    glPopMatrix() {
        if (this.recordListCommand(() => this.glPopMatrix())) {
            return;
        }
        this.popTransform();
    }
    /**
     * Java Slick2D counterpart: SGL.glBlendFunc(int, int).
     *
     * Two arguments retain OpenGL compatibility by applying the same factors to
     * RGB and alpha. Optional alpha factors are an internal extension used by
     * Graphics.MODE_NORMAL while retaining display-list recording.
     */
    glBlendFunc(src, dest, srcAlpha = src, destAlpha = dest) {
        if (this.recordListCommand(() => this.glBlendFunc(src, dest, srcAlpha, destAlpha))) {
            return;
        }
        this.__applyDrawModeState(this.blendEnabled, src, dest, this.colorMaskBits, srcAlpha, destAlpha);
    }
    /** Java Slick2D counterpart: SGL.glGenLists(int). */
    glGenLists(count) {
        const start = this.nextList;
        for (let i = 0; i < count; i++) {
            this.lists.set(this.nextList++, []);
        }
        return start;
    }
    /** Java Slick2D counterpart: SGL.glNewList(int, int). */
    glNewList(id, option) {
        this.recordingList = id;
        this.recordingOption = option;
        this.lists.set(id, []);
    }
    /** Java Slick2D counterpart: SGL.glEndList(). */
    glEndList() {
        this.recordingList = null;
        this.recordingOption = 0;
    }
    /** Java Slick2D counterpart: SGL.glCallList(int). */
    glCallList(id) {
        const commands = this.lists.get(id) ?? [];
        this.replayingList = true;
        try {
            for (const command of commands) {
                command();
            }
        }
        finally {
            this.replayingList = false;
        }
    }
    /** Java Slick2D counterpart: SGL.glCopyTexImage2D(...). */
    glCopyTexImage2D(target, level, internalFormat, x, y, width, height, border) {
        this.flushTextureBatch();
        this.gl?.copyTexImage2D(target, level, internalFormat, x, y, width, height, border);
        const info = this.currentTextureId === 0 ? null : this.textures.get(this.currentTextureId);
        if (info) {
            info.target = target;
            info.width = width;
            info.height = height;
        }
    }
    /** Java Slick2D counterpart: SGL.glReadPixels(...). */
    glReadPixels(x, y, width, height, format, type, pixels) {
        this.flushTextureBatch();
        this.gl?.readPixels(x, y, width, height, format, type, pixels);
    }
    /** Java Slick2D counterpart: SGL.glTexParameteri(int, int, int). */
    glTexParameteri(target, param, value) {
        this.flushTextureBatch();
        this.gl?.texParameteri(target, param, value);
    }
    /** Java Slick2D counterpart: SGL.getCurrentColor(). */
    getCurrentColor() {
        return [...this.currentColor];
    }
    /** Java Slick2D counterpart: SGL.glDeleteLists(int, int). */
    glDeleteLists(list, count) {
        for (let i = 0; i < count; i++) {
            this.lists.delete(list + i);
        }
    }
    /** Java Slick2D counterpart: SGL.glDepthMask(boolean). */
    glDepthMask(mask) {
        this.flushTextureBatch();
        this.gl?.depthMask(mask);
    }
    /** Java Slick2D counterpart: SGL.glClearDepth(float). */
    glClearDepth(value) {
        this.flushTextureBatch();
        this.gl?.clearDepth(value);
    }
    /** Java Slick2D counterpart: SGL.glDepthFunc(int). */
    glDepthFunc(func) {
        this.flushTextureBatch();
        this.gl?.depthFunc(func);
    }
    /** Java Slick2D counterpart: SGL.setGlobalAlphaScale(float). */
    setGlobalAlphaScale(alphaScale) {
        this.globalAlphaScale = alphaScale;
    }
    /** Java Slick2D counterpart: SGL.glLoadMatrix(FloatBuffer). */
    glLoadMatrix(buffer) {
        if (buffer.length >= 16) {
            const matrix = this.currentMatrix();
            matrix[0] = buffer[0];
            matrix[1] = buffer[4];
            matrix[2] = buffer[12];
            matrix[3] = buffer[1];
            matrix[4] = buffer[5];
            matrix[5] = buffer[13];
            matrix[6] = 0;
            matrix[7] = 0;
            matrix[8] = 1;
        }
    }
    /** Java Slick2D counterpart: SGL.glGenTextures(IntBuffer). */
    glGenTextures(ids) {
        const gl = this.gl;
        for (let i = 0; i < ids.length; i++) {
            if (!gl) {
                ids[i] = 0;
                continue;
            }
            const texture = gl.createTexture();
            if (!texture) {
                ids[i] = 0;
                continue;
            }
            const id = this.nextTextureId++;
            ids[i] = id;
            this.textures.set(id, { texture, target: this.GL_TEXTURE_2D, width: 0, height: 0 });
        }
    }
    /** Java Slick2D counterpart: SGL.glGetError(). */
    glGetError() {
        this.gl?.getError();
    }
    /** Java Slick2D counterpart: SGL.glTexImage2D(...). */
    glTexImage2D(target, level, dstPixelFormat, width, height, border, srcPixelFormat, type, textureBuffer) {
        this.flushTextureBatch();
        this.gl?.texImage2D(target, level, dstPixelFormat, width, height, border, srcPixelFormat, type, textureBuffer);
        const info = this.currentTextureId === 0 ? null : this.textures.get(this.currentTextureId);
        if (info) {
            info.target = target;
            info.width = width;
            info.height = height;
        }
    }
    /** Java Slick2D counterpart: SGL.glTexSubImage2D(...). */
    glTexSubImage2D(target, level, pageX, pageY, width, height, format, type, scratchByteBuffer) {
        this.flushTextureBatch();
        this.gl?.texSubImage2D(target, level, pageX, pageY, width, height, format, type, scratchByteBuffer);
    }
    /** Java Slick2D counterpart: SGL.canTextureMirrorClamp(). */
    canTextureMirrorClamp() {
        return false;
    }
    /** Java Slick2D counterpart: SGL.canSecondaryColor(). */
    canSecondaryColor() {
        return false;
    }
    /** Java Slick2D counterpart: SGL.glSecondaryColor3ubEXT(byte, byte, byte). */
    glSecondaryColor3ubEXT(_b, _c, _d) { }
    /** Returns the underlying WebGL2 context for compatibility shims. */
    getContext() {
        return this.gl;
    }
    /** Returns the current renderer matrix. */
    getCurrentMatrix() {
        return [...this.currentMatrix()];
    }
    recordListCommand(command) {
        if (this.recordingList === null || this.replayingList) {
            return false;
        }
        this.lists.get(this.recordingList)?.push(command);
        return this.recordingOption === this.GL_COMPILE;
    }
    ensureMonochromePalettePrograms(gl) {
        if (this.monochromeSolidProgram !== null && this.monochromeTextureProgram !== null) {
            return false;
        }
        let solidProgram = null;
        try {
            solidProgram = new WebGLShaderProgram(gl, SOLID_VERTEX, MONOCHROME_SOLID_FRAGMENT);
            const textureProgram = new WebGLShaderProgram(gl, TEXTURE_VERTEX, MONOCHROME_TEXTURE_FRAGMENT);
            this.monochromeSolidProgram = solidProgram;
            this.monochromeTextureProgram = textureProgram;
            return true;
        }
        catch (error) {
            if (solidProgram !== null && !WebGLRenderer.isContextLost(gl)) {
                solidProgram.dispose(gl);
            }
            this.monochromeSolidProgram = null;
            this.monochromeTextureProgram = null;
            throw error;
        }
    }
    applyMonochromePaletteUniforms(gl) {
        const palette = this.monochromePalette;
        const solidProgram = this.monochromeSolidProgram;
        const textureProgram = this.monochromeTextureProgram;
        if (palette === null || solidProgram === null || textureProgram === null) {
            return;
        }
        for (const program of [solidProgram, textureProgram]) {
            gl.useProgram(program.program);
            const blackLocation = program.getUniformLocation(gl, "u_paletteBlack");
            gl.uniform3f(blackLocation, palette.black[0], palette.black[1], palette.black[2]);
            const whiteLocation = program.getUniformLocation(gl, "u_paletteWhite");
            gl.uniform3f(whiteLocation, palette.white[0], palette.white[1], palette.white[2]);
        }
    }
    disableMonochromePalette(clearCachedPalette) {
        const wasEnabled = this.monochromePaletteEnabled;
        this.monochromePaletteEnabled = false;
        if (wasEnabled) {
            this.solidProgram = this.normalSolidProgram;
            this.textureProgram = this.normalTextureProgram;
        }
        if (clearCachedPalette) {
            this.monochromePalette = null;
        }
    }
    /** Applies four blend factors to WebGL2, with a fallback for minimal test doubles. */
    applyBlendFunction(gl, sourceFactor, destinationFactor, sourceAlphaFactor, destinationAlphaFactor) {
        if (typeof gl.blendFuncSeparate === "function") {
            gl.blendFuncSeparate(sourceFactor, destinationFactor, sourceAlphaFactor, destinationAlphaFactor);
            return;
        }
        gl.blendFunc(sourceFactor, destinationFactor);
    }
    resetDrawModeStateTracking() {
        this.blendEnabled = true;
        this.blendSourceFactor = this.GL_SRC_ALPHA;
        this.blendDestinationFactor = this.GL_ONE_MINUS_SRC_ALPHA;
        this.blendSourceAlphaFactor = this.GL_ONE;
        this.blendDestinationAlphaFactor = this.GL_ONE_MINUS_SRC_ALPHA;
        this.colorMaskBits = 0b1111;
        this.drawModeBlendEnabledStack.length = 0;
        this.drawModeBlendSourceFactorStack.length = 0;
        this.drawModeBlendDestinationFactorStack.length = 0;
        this.drawModeBlendSourceAlphaFactorStack.length = 0;
        this.drawModeBlendDestinationAlphaFactorStack.length = 0;
        this.drawModeColorMaskBitsStack.length = 0;
        this.colorMaskStateStack.length = 0;
    }
    /**
     * @internal Applies exact Graphics draw-mode state without display-list recording.
     *
     * A null RGB or alpha factor preserves the corresponding tracked factor,
     * matching MODE_ALPHA_MAP's behavior of changing blend enablement and the
     * write mask without selecting a new blend function.
     */
    __applyDrawModeState(blendEnabled, sourceFactor, destinationFactor, colorMaskBits, sourceAlphaFactor = sourceFactor, destinationAlphaFactor = destinationFactor) {
        const resolvedSourceFactor = sourceFactor ?? this.blendSourceFactor;
        const resolvedDestinationFactor = destinationFactor ?? this.blendDestinationFactor;
        const resolvedSourceAlphaFactor = sourceAlphaFactor ?? this.blendSourceAlphaFactor;
        const resolvedDestinationAlphaFactor = destinationAlphaFactor ?? this.blendDestinationAlphaFactor;
        const blendEnabledChanged = this.blendEnabled !== blendEnabled;
        const blendFunctionChanged = this.blendSourceFactor !== resolvedSourceFactor ||
            this.blendDestinationFactor !== resolvedDestinationFactor ||
            this.blendSourceAlphaFactor !== resolvedSourceAlphaFactor ||
            this.blendDestinationAlphaFactor !== resolvedDestinationAlphaFactor;
        const colorMaskChanged = this.colorMaskBits !== colorMaskBits;
        if (!blendEnabledChanged && !blendFunctionChanged && !colorMaskChanged) {
            return;
        }
        this.flushTextureBatch();
        const gl = this.gl;
        if (blendEnabledChanged) {
            this.blendEnabled = blendEnabled;
            if (blendEnabled) {
                gl?.enable(this.GL_BLEND);
            }
            else {
                gl?.disable(this.GL_BLEND);
            }
        }
        if (blendFunctionChanged) {
            this.blendSourceFactor = resolvedSourceFactor;
            this.blendDestinationFactor = resolvedDestinationFactor;
            this.blendSourceAlphaFactor = resolvedSourceAlphaFactor;
            this.blendDestinationAlphaFactor = resolvedDestinationAlphaFactor;
            if (gl) {
                this.applyBlendFunction(gl, resolvedSourceFactor, resolvedDestinationFactor, resolvedSourceAlphaFactor, resolvedDestinationAlphaFactor);
            }
        }
        if (colorMaskChanged) {
            this.colorMaskBits = colorMaskBits;
            gl?.colorMask((colorMaskBits & 0b0001) !== 0, (colorMaskBits & 0b0010) !== 0, (colorMaskBits & 0b0100) !== 0, (colorMaskBits & 0b1000) !== 0);
        }
    }
    applyColorMaskBits(colorMaskBits) {
        if (this.colorMaskBits === colorMaskBits) {
            return;
        }
        this.flushTextureBatch();
        this.colorMaskBits = colorMaskBits;
        this.gl?.colorMask((colorMaskBits & 0b0001) !== 0, (colorMaskBits & 0b0010) !== 0, (colorMaskBits & 0b0100) !== 0, (colorMaskBits & 0b1000) !== 0);
    }
    static encodeColorMask(red, green, blue, alpha) {
        return (red ? 0b0001 : 0) | (green ? 0b0010 : 0) | (blue ? 0b0100 : 0) | (alpha ? 0b1000 : 0);
    }
    static normalizeColorChannel(value) {
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.max(0, Math.min(1, value));
    }
    static monochromePaletteMatches(palette, blackRed, blackGreen, blackBlue, whiteRed, whiteGreen, whiteBlue) {
        return (palette !== null &&
            palette.black[0] === blackRed &&
            palette.black[1] === blackGreen &&
            palette.black[2] === blackBlue &&
            palette.white[0] === whiteRed &&
            palette.white[1] === whiteGreen &&
            palette.white[2] === whiteBlue);
    }
    queueTextureQuad(texture, matrix, x1, y1, x2, y2, x3, y3, x4, y4, u1, v1, u2, v2, topLeft, topRight, bottomRight, bottomLeft, tint, alphaScale, flash) {
        if (this.textureBatchTexture !== null &&
            (this.textureBatchTexture !== texture || this.textureBatchFlash !== flash || this.textureBatchInverted !== this.colorInverted)) {
            this.flushTextureBatch();
        }
        if (this.textureBatchVertexCount + 6 > TEXTURE_BATCH_VERTEX_CAPACITY) {
            this.flushTextureBatch();
        }
        this.textureBatchTexture = texture;
        this.textureBatchFlash = flash;
        this.textureBatchInverted = this.colorInverted;
        const vertices = this.textureBatchVertices;
        const base = this.textureBatchVertexCount;
        this.writeTextureVertex(vertices, base, matrix, x1, y1, u1, v1, topLeft, tint, alphaScale);
        this.writeTextureVertex(vertices, base + 1, matrix, x2, y2, u2, v1, topRight, tint, alphaScale);
        this.writeTextureVertex(vertices, base + 2, matrix, x3, y3, u2, v2, bottomRight, tint, alphaScale);
        this.writeTextureVertex(vertices, base + 3, matrix, x1, y1, u1, v1, topLeft, tint, alphaScale);
        this.writeTextureVertex(vertices, base + 4, matrix, x3, y3, u2, v2, bottomRight, tint, alphaScale);
        this.writeTextureVertex(vertices, base + 5, matrix, x4, y4, u1, v2, bottomLeft, tint, alphaScale);
        this.textureBatchVertexCount += 6;
    }
    flushTextureBatch() {
        const vertexCount = this.textureBatchVertexCount;
        if (vertexCount === 0) {
            return;
        }
        const gl = this.gl;
        const textureProgram = this.textureProgram;
        const buffer = this.buffer;
        const texture = this.textureBatchTexture;
        if (gl && textureProgram && buffer && texture) {
            gl.useProgram(textureProgram.program);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            const floatCount = vertexCount * TEXTURE_VERTEX_FLOATS;
            gl.bufferData(gl.ARRAY_BUFFER, floatCount * Float32Array.BYTES_PER_ELEMENT, gl.STREAM_DRAW);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.textureBatchVertices, 0, floatCount);
            const position = textureProgram.getAttribLocation(gl, "a_position");
            const texCoord = textureProgram.getAttribLocation(gl, "a_texCoord");
            const colorAttrib = textureProgram.getAttribLocation(gl, "a_color");
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 32, 0);
            gl.enableVertexAttribArray(texCoord);
            gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 32, 8);
            gl.enableVertexAttribArray(colorAttrib);
            gl.vertexAttribPointer(colorAttrib, 4, gl.FLOAT, false, 32, 16);
            const colorLocation = textureProgram.getUniformLocation(gl, "u_color");
            gl.uniform4f(colorLocation, 1, 1, 1, 1);
            const flashLocation = textureProgram.getUniformLocation(gl, "u_flash");
            gl.uniform1f(flashLocation, this.textureBatchFlash ? 1 : 0);
            const invertLocation = textureProgram.getUniformLocation(gl, "u_invert");
            gl.uniform1f(invertLocation, this.textureBatchInverted ? 1 : 0);
            gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
        }
        this.textureBatchVertexCount = 0;
        this.textureBatchTexture = null;
        this.textureBatchFlash = false;
        this.textureBatchInverted = false;
    }
    drawSolidPolygon(points, color, transform) {
        if (points.length === 0) {
            return;
        }
        const matrix = this.combinedMatrix(transform);
        const vertices = this.ensureDynamicSolidCapacity(points.length);
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            this.writeSolidVertex(vertices, i, matrix, point[0], point[1], color);
        }
        this.submitSolidVertices(vertices, points.length);
    }
    drawImmediateSolidVertices(color) {
        const vertexCount = Math.trunc(this.immediateVertices.length / 4);
        if (vertexCount === 0) {
            return;
        }
        const vertices = this.ensureDynamicSolidCapacity(vertexCount);
        const matrix = this.currentMatrix();
        for (let vertex = 0, source = 0; vertex < vertexCount; vertex++, source += 4) {
            this.writeSolidVertex(vertices, vertex, matrix, this.immediateVertices[source], this.immediateVertices[source + 1], color);
        }
        this.submitSolidVertices(vertices, vertexCount);
    }
    drawSolidQuad(x1, y1, x2, y2, x3, y3, x4, y4, color, transform) {
        const matrix = this.combinedMatrix(transform);
        const vertices = this.solidQuadVertices;
        this.writeSolidVertex(vertices, 0, matrix, x1, y1, color);
        this.writeSolidVertex(vertices, 1, matrix, x2, y2, color);
        this.writeSolidVertex(vertices, 2, matrix, x3, y3, color);
        this.writeSolidVertex(vertices, 3, matrix, x1, y1, color);
        this.writeSolidVertex(vertices, 4, matrix, x3, y3, color);
        this.writeSolidVertex(vertices, 5, matrix, x4, y4, color);
        this.submitSolidVertices(vertices, 6);
    }
    submitSolidVertices(vertices, vertexCount) {
        this.flushTextureBatch();
        const gl = this.gl;
        const solidProgram = this.solidProgram;
        const buffer = this.buffer;
        if (!gl || !solidProgram || !buffer || vertexCount === 0) {
            return;
        }
        gl.useProgram(solidProgram.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const floatCount = vertexCount * SOLID_VERTEX_FLOATS;
        gl.bufferData(gl.ARRAY_BUFFER, floatCount * Float32Array.BYTES_PER_ELEMENT, gl.STREAM_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices, 0, floatCount);
        const position = solidProgram.getAttribLocation(gl, "a_position");
        const colorAttrib = solidProgram.getAttribLocation(gl, "a_color");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(colorAttrib);
        gl.vertexAttribPointer(colorAttrib, 4, gl.FLOAT, false, 24, 8);
        const colorLocation = solidProgram.getUniformLocation(gl, "u_color");
        gl.uniform4f(colorLocation, 1, 1, 1, this.globalAlphaScale);
        const invertLocation = solidProgram.getUniformLocation(gl, "u_invert");
        gl.uniform1f(invertLocation, this.colorInverted ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
        this.batch.markDirty();
    }
    ensureDynamicSolidCapacity(vertexCount) {
        const required = vertexCount * 6;
        if (this.dynamicSolidVertices.length < required) {
            this.dynamicSolidVertices = new Float32Array(required);
        }
        return this.dynamicSolidVertices;
    }
    combinedMatrix(transform) {
        const current = this.currentMatrix();
        const out = this.matrixScratch;
        out[0] = current[0] * transform[0] + current[1] * transform[3] + current[2] * transform[6];
        out[1] = current[0] * transform[1] + current[1] * transform[4] + current[2] * transform[7];
        out[2] = current[0] * transform[2] + current[1] * transform[5] + current[2] * transform[8];
        out[3] = current[3] * transform[0] + current[4] * transform[3] + current[5] * transform[6];
        out[4] = current[3] * transform[1] + current[4] * transform[4] + current[5] * transform[7];
        out[5] = current[3] * transform[2] + current[4] * transform[5] + current[5] * transform[8];
        out[6] = current[6] * transform[0] + current[7] * transform[3] + current[8] * transform[6];
        out[7] = current[6] * transform[1] + current[7] * transform[4] + current[8] * transform[7];
        out[8] = current[6] * transform[2] + current[7] * transform[5] + current[8] * transform[8];
        return out;
    }
    writeTextureVertex(vertices, vertex, matrix, x, y, u, v, color, tint, alphaScale) {
        const offset = vertex * TEXTURE_VERTEX_FLOATS;
        vertices[offset] = ((matrix[0] * x + matrix[1] * y + matrix[2]) / this.width) * 2 - 1;
        vertices[offset + 1] = 1 - ((matrix[3] * x + matrix[4] * y + matrix[5]) / this.height) * 2;
        vertices[offset + 2] = u;
        vertices[offset + 3] = v;
        vertices[offset + 4] = color.r * tint.r;
        vertices[offset + 5] = color.g * tint.g;
        vertices[offset + 6] = color.b * tint.b;
        vertices[offset + 7] = color.a * alphaScale;
    }
    writeSolidVertex(vertices, vertex, matrix, x, y, color) {
        const offset = vertex * SOLID_VERTEX_FLOATS;
        vertices[offset] = ((matrix[0] * x + matrix[1] * y + matrix[2]) / this.width) * 2 - 1;
        vertices[offset + 1] = 1 - ((matrix[3] * x + matrix[4] * y + matrix[5]) / this.height) * 2;
        vertices[offset + 2] = color.r;
        vertices[offset + 3] = color.g;
        vertices[offset + 4] = color.b;
        vertices[offset + 5] = color.a;
    }
    copyMatrix(source, target) {
        target[0] = source[0];
        target[1] = source[1];
        target[2] = source[2];
        target[3] = source[3];
        target[4] = source[4];
        target[5] = source[5];
        target[6] = source[6];
        target[7] = source[7];
        target[8] = source[8];
    }
    writeIdentity(target) {
        target[0] = 1;
        target[1] = 0;
        target[2] = 0;
        target[3] = 0;
        target[4] = 1;
        target[5] = 0;
        target[6] = 0;
        target[7] = 0;
        target[8] = 1;
    }
    setScratchColor(r, g, b, a) {
        this.scratchColor.r = r;
        this.scratchColor.g = g;
        this.scratchColor.b = b;
        this.scratchColor.a = a;
        return this.scratchColor;
    }
    setDefaultDimensions(width, height, backingWidth, backingHeight) {
        this.defaultWidth = Math.max(1, width);
        this.defaultHeight = Math.max(1, height);
        this.defaultBackingWidth = Math.max(1, backingWidth);
        this.defaultBackingHeight = Math.max(1, backingHeight);
    }
    useDefaultDimensions() {
        this.setActiveDimensions(this.defaultWidth, this.defaultHeight, this.defaultBackingWidth, this.defaultBackingHeight);
    }
    setActiveDimensions(width, height, backingWidth, backingHeight) {
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);
        this.backingWidth = Math.max(1, backingWidth);
        this.backingHeight = Math.max(1, backingHeight);
        this.backingScaleX = this.backingWidth / this.width;
        this.backingScaleY = this.backingHeight / this.height;
    }
    applyActiveClip() {
        const gl = this.gl;
        if (!gl) {
            return;
        }
        const clip = WebGLRenderer.intersectClips(this.screenClip, this.worldClip);
        if (!clip) {
            gl.disable(gl.SCISSOR_TEST);
            return;
        }
        gl.enable(gl.SCISSOR_TEST);
        const x0 = Math.floor(clip.x * this.backingScaleX);
        const x1 = Math.ceil((clip.x + clip.width) * this.backingScaleX);
        const y0 = Math.floor((this.height - clip.y - clip.height) * this.backingScaleY);
        const y1 = Math.ceil((this.height - clip.y) * this.backingScaleY);
        gl.scissor(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
    }
    static normalizeClip(x, y, width, height) {
        const normalizedWidth = Math.max(0, width);
        const normalizedHeight = Math.max(0, height);
        return { x, y, width: normalizedWidth, height: normalizedHeight };
    }
    static intersectClips(a, b) {
        if (!a) {
            return b;
        }
        if (!b) {
            return a;
        }
        const x1 = Math.max(a.x, b.x);
        const y1 = Math.max(a.y, b.y);
        const x2 = Math.min(a.x + a.width, b.x + b.width);
        const y2 = Math.min(a.y + a.height, b.y + b.height);
        return {
            x: x1,
            y: y1,
            width: Math.max(0, x2 - x1),
            height: Math.max(0, y2 - y1)
        };
    }
    static isContextLost(gl) {
        return typeof gl.isContextLost === "function" && gl.isContextLost();
    }
    currentMatrix() {
        return this.transformStack[this.transformStack.length - 1];
    }
}
//# sourceMappingURL=WebGLRenderer.js.map