import { Color } from "../Color.js";
import { SlickException } from "../SlickException.js";
import type { Image } from "../Image.js";
import type { SGL } from "../opengl/renderer/SGL.js";
import { identityMatrix3, Matrix3, multiplyMatrix3, RenderBackend, RenderBackendOptions, rotationMatrix3, scaleMatrix3, transformPoint, translationMatrix3 } from "./RenderBackend.js";
import { WebGLBatch } from "./WebGLBatch.js";
import { WebGLRenderTarget } from "./WebGLRenderTarget.js";
import { WebGLShaderProgram } from "./WebGLShaderProgram.js";
import type { WebGLTextureResource } from "./WebGLTextureResource.js";

type ImageInternals = {
    __getTextureResource(): WebGLTextureResource | null;
    __getCornerColors(): [Color, Color, Color, Color] | null;
};

type TextureInfo = {
    texture: WebGLTexture;
    target: number;
    width: number;
    height: number;
};
type ScreenClip = {
    x: number;
    y: number;
    width: number;
    height: number;
};

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
in vec4 v_color;
out vec4 outColor;
void main() {
    outColor = v_color * u_color;
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
in vec2 v_texCoord;
in vec4 v_color;
out vec4 outColor;
void main() {
    outColor = texture(u_texture, v_texCoord) * v_color * u_color;
}`;

/**
 * Internal WebGL2 renderer implementing Slick2D's 2D OpenGL-style state.
 */
export class WebGLRenderer implements RenderBackend, SGL {
    public readonly GL_TEXTURE_2D = 0x0DE1;
    public readonly GL_RGBA = 0x1908;
    public readonly GL_RGB = 0x1907;
    public readonly GL_UNSIGNED_BYTE = 0x1401;
    public readonly GL_LINEAR = 0x2601;
    public readonly GL_NEAREST = 0x2600;
    public readonly GL_TEXTURE_MIN_FILTER = 0x2801;
    public readonly GL_TEXTURE_MAG_FILTER = 0x2800;
    public readonly GL_POINT_SMOOTH = 0x0B10;
    public readonly GL_POLYGON_SMOOTH = 0x0B41;
    public readonly GL_LINE_SMOOTH = 0x0B20;
    public readonly GL_SCISSOR_TEST = 0x0C11;
    public readonly GL_MODULATE = 0x2100;
    public readonly GL_TEXTURE_ENV = 0x2300;
    public readonly GL_TEXTURE_ENV_MODE = 0x2200;
    public readonly GL_QUADS = 0x0007;
    public readonly GL_TRIANGLES = 0x0004;
    public readonly GL_LINES = 0x0001;
    public readonly GL_SRC_ALPHA = 0x0302;
    public readonly GL_ONE = 1;
    public readonly GL_ONE_MINUS_DST_ALPHA = 0x0305;
    public readonly GL_DST_ALPHA = 0x0304;
    public readonly GL_ONE_MINUS_SRC_ALPHA = 0x0303;
    public readonly GL_COMPILE = 0x1300;
    public readonly GL_MAX_TEXTURE_SIZE = 0x0D33;
    public readonly GL_COLOR_BUFFER_BIT = 0x4000;
    public readonly GL_DEPTH_BUFFER_BIT = 0x0100;
    public readonly GL_BLEND = 0x0BE2;
    public readonly GL_COLOR_CLEAR_VALUE = 0x0C22;
    public readonly GL_LINE_WIDTH = 0x0B21;
    public readonly GL_CLIP_PLANE0 = 0x3000;
    public readonly GL_CLIP_PLANE1 = 0x3001;
    public readonly GL_CLIP_PLANE2 = 0x3002;
    public readonly GL_CLIP_PLANE3 = 0x3003;
    public readonly GL_COMPILE_AND_EXECUTE = 0x1301;
    public readonly GL_RGBA8 = 0x8058;
    public readonly GL_RGBA16 = 0x805B;
    public readonly GL_BGRA = 0x80E1;
    public readonly GL_MIRROR_CLAMP_TO_EDGE_EXT = 0x8743;
    public readonly GL_TEXTURE_WRAP_S = 0x2802;
    public readonly GL_TEXTURE_WRAP_T = 0x2803;
    public readonly GL_CLAMP = 0x2900;
    public readonly GL_COLOR_SUM_EXT = 0x8458;
    public readonly GL_ALWAYS = 0x0207;
    public readonly GL_DEPTH_TEST = 0x0B71;
    public readonly GL_NOTEQUAL = 0x0205;
    public readonly GL_EQUAL = 0x0202;
    public readonly GL_SRC_COLOR = 0x0300;
    public readonly GL_ONE_MINUS_SRC_COLOR = 0x0301;
    public readonly GL_MODELVIEW_MATRIX = 0x0BA6;

    private canvas: HTMLCanvasElement | null = null;
    private gl: WebGL2RenderingContext | null = null;
    private solidProgram: WebGLShaderProgram | null = null;
    private textureProgram: WebGLShaderProgram | null = null;
    private buffer: WebGLBuffer | null = null;
    private batch = new WebGLBatch();
    private width = 1;
    private height = 1;
    private lineWidth = 1;
    private globalAlphaScale = 1;
    private currentColor = [1, 1, 1, 1];
    private transformStack: Matrix3[] = [identityMatrix3()];
    private currentTarget: WebGLRenderTarget | null = null;
    private immediateType = 0;
    private immediateTexCoord: [number, number] = [0, 0];
    private immediateVertices: Array<{ x: number; y: number; u: number; v: number }> = [];
    private lists = new Map<number, Array<() => void>>();
    private recordingList: number | null = null;
    private recordingOption = 0;
    private replayingList = false;
    private nextList = 1;
    private textures = new Map<number, TextureInfo>();
    private currentTextureId = 0;
    private nextTextureId = 1;
    private screenClip: ScreenClip | null = null;
    private worldClip: ScreenClip | null = null;

    /** Initializes the renderer with a canvas and WebGL2 context attributes. */
    public initialize(canvas: HTMLCanvasElement, options: RenderBackendOptions): void {
        this.canvas = canvas;
        const gl = canvas.getContext("webgl2", {
            alpha: options.alpha ?? true,
            antialias: options.antialias ?? false,
            stencil: options.stencil ?? false
        });
        if (!gl) {
            throw new SlickException("Unable to create WebGL2 context");
        }
        this.gl = gl;
        this.solidProgram = new WebGLShaderProgram(gl, SOLID_VERTEX, SOLID_FRAGMENT);
        this.textureProgram = new WebGLShaderProgram(gl, TEXTURE_VERTEX, TEXTURE_FRAGMENT);
        this.buffer = gl.createBuffer();
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this.initDisplay(canvas.width, canvas.height);
    }

    /** Begins a frame by binding the default target, setting viewport, and clearing. */
    public beginFrame(width: number, height: number, background: Color): void {
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);
        const gl = this.gl;
        if (!gl) {
            return;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(background.r, background.g, background.b, background.a);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.transformStack = [identityMatrix3()];
        this.screenClip = null;
        this.worldClip = null;
        this.applyActiveClip();
    }

    /** Ends a frame by flushing pending work. */
    public endFrame(): void {
        this.flush();
    }

    /** Sets the active framebuffer-backed render target. */
    public setRenderTarget(target: WebGLRenderTarget | null): void {
        const gl = this.gl;
        this.currentTarget = target;
        if (!gl) {
            return;
        }
        if (target) {
            target.ensure(gl);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
            this.width = target.width;
            this.height = target.height;
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            this.width = this.canvas?.width ?? this.width;
            this.height = this.canvas?.height ?? this.height;
        }
        gl.viewport(0, 0, this.width, this.height);
    }

    /** Draws a textured quad. */
    public drawImage(image: Image, x: number, y: number, width: number, height: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, alpha: number, tint: Color | null, transform: Matrix3): void {
        this.drawImageWarped(image, x, y, x + width, y, x + width, y + height, x, y + height, srcX, srcY, srcWidth, srcHeight, alpha, tint, transform);
    }

    /** Draws a textured quad with arbitrary corner positions. */
    public drawImageWarped(image: Image, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, alpha: number, tint: Color | null, transform: Matrix3): void {
        const gl = this.gl;
        const textureProgram = this.textureProgram;
        const buffer = this.buffer;
        if (!gl || !textureProgram || !buffer) {
            return;
        }
        const resource = (image as unknown as ImageInternals).__getTextureResource?.() ?? null;
        const texture = resource?.ensureTexture(gl);
        if (!resource || !texture || resource.width <= 0 || resource.height <= 0) {
            return;
        }
        const matrix = multiplyMatrix3(this.currentMatrix(), transform);
        const color = tint ?? Color.white;
        const u1 = srcX / resource.width;
        const v1 = srcY / resource.height;
        const u2 = (srcX + srcWidth) / resource.width;
        const v2 = (srcY + srcHeight) / resource.height;
        const p1 = this.toClip(...transformPoint(matrix, x1, y1));
        const p2 = this.toClip(...transformPoint(matrix, x2, y2));
        const p3 = this.toClip(...transformPoint(matrix, x3, y3));
        const p4 = this.toClip(...transformPoint(matrix, x4, y4));
        const cornerColors = (image as unknown as ImageInternals).__getCornerColors?.() ?? null;
        const topLeft = cornerColors?.[0] ?? Color.white;
        const topRight = cornerColors?.[1] ?? Color.white;
        const bottomRight = cornerColors?.[2] ?? Color.white;
        const bottomLeft = cornerColors?.[3] ?? Color.white;
        const vertices = new Float32Array([
            p1[0], p1[1], u1, v1, topLeft.r, topLeft.g, topLeft.b, topLeft.a,
            p2[0], p2[1], u2, v1, topRight.r, topRight.g, topRight.b, topRight.a,
            p3[0], p3[1], u2, v2, bottomRight.r, bottomRight.g, bottomRight.b, bottomRight.a,
            p1[0], p1[1], u1, v1, topLeft.r, topLeft.g, topLeft.b, topLeft.a,
            p3[0], p3[1], u2, v2, bottomRight.r, bottomRight.g, bottomRight.b, bottomRight.a,
            p4[0], p4[1], u1, v2, bottomLeft.r, bottomLeft.g, bottomLeft.b, bottomLeft.a
        ]);
        gl.useProgram(textureProgram.program);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
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
        gl.uniform4f(colorLocation, color.r, color.g, color.b, color.a * alpha * this.globalAlphaScale);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        this.batch.markDirty();
    }

    /** Draws a filled rectangle. */
    public fillRect(x: number, y: number, width: number, height: number, color: Color, transform: Matrix3 = identityMatrix3()): void {
        const x2 = x + width;
        const y2 = y + height;
        this.drawSolidPolygon([
            [x, y],
            [x2, y],
            [x2, y2],
            [x, y],
            [x2, y2],
            [x, y2]
        ], color, transform);
    }

    /** Draws a line as a thin quad so browser line-width limits do not matter. */
    public drawLine(x1: number, y1: number, x2: number, y2: number, color: Color, width: number, transform: Matrix3 = identityMatrix3()): void {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len * width / 2;
        const py = dx / len * width / 2;
        this.drawSolidPolygon([
            [x1 + px, y1 + py],
            [x2 + px, y2 + py],
            [x2 - px, y2 - py],
            [x1 + px, y1 + py],
            [x2 - px, y2 - py],
            [x1 - px, y1 - py]
        ], color, transform);
    }

    /** Draws a line with endpoint color interpolation. */
    public drawGradientLine(x1: number, y1: number, color1: Color, x2: number, y2: number, color2: Color, width: number, transform: Matrix3 = identityMatrix3()): void {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const px = -dy / len * width / 2;
        const py = dx / len * width / 2;
        this.drawColoredTriangles([
            { x: x1 + px, y: y1 + py, color: color1 },
            { x: x2 + px, y: y2 + py, color: color2 },
            { x: x2 - px, y: y2 - py, color: color2 },
            { x: x1 + px, y: y1 + py, color: color1 },
            { x: x2 - px, y: y2 - py, color: color2 },
            { x: x1 - px, y: y1 - py, color: color1 }
        ], transform);
    }

    /** Draws connected line segments. */
    public drawLineStrip(points: Array<[number, number]>, color: Color, width: number, transform: Matrix3 = identityMatrix3()): void {
        for (let i = 0; i + 1 < points.length; i++) {
            const start = points[i];
            const end = points[i + 1];
            this.drawLine(start[0], start[1], end[0], end[1], color, width, transform);
        }
    }

    /** Draws already-triangulated solid geometry. */
    public fillTriangles(points: Array<[number, number]>, color: Color, transform: Matrix3 = identityMatrix3()): void {
        this.drawSolidPolygon(points, color, transform);
    }

    /** Copies pixels from the active framebuffer into a render-target image texture. */
    public copyAreaToRenderTarget(target: WebGLRenderTarget, x: number, y: number): void {
        const gl = this.gl;
        if (!gl) {
            return;
        }
        const sourceFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
        target.ensure(gl);
        if (!target.texture) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, sourceFramebuffer);
            return;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, sourceFramebuffer);
        gl.bindTexture(gl.TEXTURE_2D, target.texture);
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, Math.trunc(x), Math.trunc(this.height - y - target.height), target.width, target.height);
        target.textureResource.applyFilter(gl);
        this.batch.markDirty();
    }

    /** Applies a screen-space scissor clip. */
    public setClip(x: number, y: number, width: number, height: number): void {
        this.screenClip = WebGLRenderer.normalizeClip(x, y, width, height);
        this.applyActiveClip();
    }

    /** Clears the active screen-space clip. */
    public clearClip(): void {
        this.screenClip = null;
        this.applyActiveClip();
    }

    /** Applies a transformed world-space clip by converting its bounds to a scissor rectangle. */
    public setWorldClip(x: number, y: number, width: number, height: number, transform: Matrix3): void {
        const matrix = multiplyMatrix3(this.currentMatrix(), transform);
        const points = [
            transformPoint(matrix, x, y),
            transformPoint(matrix, x + width, y),
            transformPoint(matrix, x + width, y + height),
            transformPoint(matrix, x, y + height)
        ];
        const xs = points.map((point) => point[0]);
        const ys = points.map((point) => point[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        this.worldClip = WebGLRenderer.normalizeClip(minX, minY, maxX - minX, maxY - minY);
        this.applyActiveClip();
    }

    /** Clears the active world-space clip. */
    public clearWorldClip(): void {
        this.worldClip = null;
        this.applyActiveClip();
    }

    /** Saves the current matrix. */
    public pushTransform(): void {
        this.transformStack.push([...this.currentMatrix()] as Matrix3);
    }

    /** Restores the previous matrix. */
    public popTransform(): void {
        if (this.transformStack.length > 1) {
            this.transformStack.pop();
        }
    }

    /** Applies a translation to the current matrix. */
    public translate(x: number, y: number): void {
        this.replaceCurrent(multiplyMatrix3(this.currentMatrix(), translationMatrix3(x, y)));
    }

    /** Applies a scale to the current matrix. */
    public scale(x: number, y: number): void {
        this.replaceCurrent(multiplyMatrix3(this.currentMatrix(), scaleMatrix3(x, y)));
    }

    /** Applies a clockwise degree rotation around a point to the current matrix. */
    public rotate(x: number, y: number, angle: number): void {
        this.replaceCurrent(multiplyMatrix3(this.currentMatrix(), rotationMatrix3(x, y, angle)));
    }

    /** Reads RGBA pixels from the active target. */
    public readPixels(x: number, y: number, width: number, height: number, target: Uint8Array): void {
        const gl = this.gl;
        if (!gl) {
            target.fill(0);
            return;
        }
        gl.readPixels(x, this.height - y - height, width, height, gl.RGBA, gl.UNSIGNED_BYTE, target);
    }

    /** Binds a decoded WebGL texture resource to the active texture unit. */
    public bindTextureResource(resource: WebGLTextureResource): void {
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
    public handleContextLost(): void {
        this.gl = null;
        this.solidProgram = null;
        this.textureProgram = null;
        this.buffer = null;
    }

    /** Handles browser WebGL context restoration. */
    public handleContextRestored(): void {
        if (this.canvas) {
            this.initialize(this.canvas, {});
        }
    }

    /** Releases renderer-owned WebGL state. */
    public dispose(): void {
        const gl = this.gl;
        if (gl && this.buffer) {
            gl.deleteBuffer(this.buffer);
        }
        if (gl) {
            for (const texture of this.textures.values()) {
                gl.deleteTexture(texture.texture);
            }
        }
        this.currentTarget?.dispose(gl);
        this.textures.clear();
        this.currentTextureId = 0;
        this.gl = null;
        this.buffer = null;
        this.canvas = null;
    }

    /** Java Slick2D counterpart: SGL.flush(). */
    public flush(): void {
        this.batch.flush();
    }

    /** Java Slick2D counterpart: SGL.initDisplay(int, int). */
    public initDisplay(width: number, height: number): void {
        this.width = Math.max(1, width);
        this.height = Math.max(1, height);
        this.gl?.viewport(0, 0, this.width, this.height);
    }

    /** Java Slick2D counterpart: SGL.enterOrtho(int, int). */
    public enterOrtho(xsize: number, ysize: number): void {
        this.initDisplay(xsize, ysize);
        this.glLoadIdentity();
    }

    /** Java Slick2D counterpart: SGL.glClearColor(float, float, float, float). */
    public glClearColor(r: number, g: number, b: number, a: number): void {
        this.gl?.clearColor(r, g, b, a);
    }

    /** Java Slick2D counterpart: SGL.glClipPlane(int, DoubleBuffer). */
    public glClipPlane(_plane: number, _buffer: Float64Array): void {
    }

    /** Java Slick2D counterpart: SGL.glScissor(int, int, int, int). */
    public glScissor(x: number, y: number, width: number, height: number): void {
        this.screenClip = null;
        this.worldClip = null;
        this.gl?.enable(this.gl.SCISSOR_TEST);
        this.gl?.scissor(x, y, width, height);
    }

    /** Java Slick2D counterpart: SGL.glLineWidth(float). */
    public glLineWidth(width: number): void {
        if (this.recordListCommand(() => this.glLineWidth(width))) {
            return;
        }
        this.lineWidth = width;
        this.gl?.lineWidth(width);
    }

    /** Java Slick2D counterpart: SGL.glClear(int). */
    public glClear(mask: number): void {
        this.gl?.clear(mask);
    }

    /** Java Slick2D counterpart: SGL.glColorMask(boolean, boolean, boolean, boolean). */
    public glColorMask(red: boolean, green: boolean, blue: boolean, alpha: boolean): void {
        this.gl?.colorMask(red, green, blue, alpha);
    }

    /** Java Slick2D counterpart: SGL.glLoadIdentity(). */
    public glLoadIdentity(): void {
        this.transformStack[this.transformStack.length - 1] = identityMatrix3();
    }

    /** Java Slick2D counterpart: SGL.glGetInteger(int, IntBuffer). */
    public glGetInteger(id: number, ret: Int32Array): void {
        const value = this.gl?.getParameter(id);
        ret[0] = typeof value === "number" ? value : 0;
    }

    /** Java Slick2D counterpart: SGL.glGetFloat(int, FloatBuffer). */
    public glGetFloat(id: number, ret: Float32Array): void {
        if (id === this.GL_MODELVIEW_MATRIX) {
            const m = this.currentMatrix();
            ret.set([m[0], m[3], 0, m[6], m[1], m[4], 0, m[7], 0, 0, 1, 0, m[2], m[5], 0, m[8]].slice(0, ret.length));
            return;
        }
        const value = this.gl?.getParameter(id);
        ret[0] = typeof value === "number" ? value : 0;
    }

    /** Java Slick2D counterpart: SGL.glEnable(int). */
    public glEnable(id: number): void {
        if (this.recordListCommand(() => this.glEnable(id))) {
            return;
        }
        this.gl?.enable(id);
    }

    /** Java Slick2D counterpart: SGL.glDisable(int). */
    public glDisable(id: number): void {
        if (this.recordListCommand(() => this.glDisable(id))) {
            return;
        }
        this.gl?.disable(id);
    }

    /** Java Slick2D counterpart: SGL.glBindTexture(int, int). */
    public glBindTexture(target: number, id: number): void {
        if (this.recordListCommand(() => this.glBindTexture(target, id))) {
            return;
        }
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
    public glGetTexImage(target: number, level: number, format: number, type: number, pixels: Uint8Array): void {
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
        const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, target, info.texture, level);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
            gl.readPixels(0, 0, info.width, info.height, format, type, pixels);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
        gl.deleteFramebuffer(framebuffer);
    }

    /** Java Slick2D counterpart: SGL.glDeleteTextures(IntBuffer). */
    public glDeleteTextures(buffer: Int32Array): void {
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
    public glColor4f(r: number, g: number, b: number, a: number): void {
        if (this.recordListCommand(() => this.glColor4f(r, g, b, a))) {
            return;
        }
        this.currentColor = [r, g, b, a];
    }

    /** Java Slick2D counterpart: SGL.glTexCoord2f(float, float). */
    public glTexCoord2f(u: number, v: number): void {
        if (this.recordListCommand(() => this.glTexCoord2f(u, v))) {
            return;
        }
        this.immediateTexCoord = [u, v];
    }

    /** Java Slick2D counterpart: SGL.glVertex3f(float, float, float). */
    public glVertex3f(x: number, y: number, _z: number): void {
        if (this.recordListCommand(() => this.glVertex3f(x, y, _z))) {
            return;
        }
        this.immediateVertices.push({ x, y, u: this.immediateTexCoord[0], v: this.immediateTexCoord[1] });
    }

    /** Java Slick2D counterpart: SGL.glVertex2f(float, float). */
    public glVertex2f(x: number, y: number): void {
        if (this.recordListCommand(() => this.glVertex2f(x, y))) {
            return;
        }
        this.immediateVertices.push({ x, y, u: this.immediateTexCoord[0], v: this.immediateTexCoord[1] });
    }

    /** Java Slick2D counterpart: SGL.glRotatef(float, float, float, float). */
    public glRotatef(angle: number, x: number, y: number, z: number): void {
        if (this.recordListCommand(() => this.glRotatef(angle, x, y, z))) {
            return;
        }
        if (z !== 0 || (x === 0 && y === 0)) {
            this.rotate(0, 0, angle);
        }
    }

    /** Java Slick2D counterpart: SGL.glTranslatef(float, float, float). */
    public glTranslatef(x: number, y: number, _z: number): void {
        if (this.recordListCommand(() => this.glTranslatef(x, y, _z))) {
            return;
        }
        this.translate(x, y);
    }

    /** Java Slick2D counterpart: SGL.glBegin(int). */
    public glBegin(geomType: number): void {
        if (this.recordListCommand(() => this.glBegin(geomType))) {
            return;
        }
        this.immediateType = geomType;
        this.immediateVertices = [];
    }

    /** Java Slick2D counterpart: SGL.glEnd(). */
    public glEnd(): void {
        if (this.recordListCommand(() => this.glEnd())) {
            return;
        }
        if (this.immediateType === this.GL_LINES) {
            for (let i = 0; i + 1 < this.immediateVertices.length; i += 2) {
                const a = this.immediateVertices[i];
                const b = this.immediateVertices[i + 1];
                this.drawLine(a.x, a.y, b.x, b.y, new Color(this.currentColor[0], this.currentColor[1], this.currentColor[2], this.currentColor[3]), this.lineWidth);
            }
        } else {
            const points = this.immediateVertices.map((vertex) => [vertex.x, vertex.y] as [number, number]);
            this.drawSolidPolygon(points, new Color(this.currentColor[0], this.currentColor[1], this.currentColor[2], this.currentColor[3]), identityMatrix3());
        }
        this.immediateVertices = [];
        this.immediateType = 0;
    }

    /** Java Slick2D counterpart: SGL.glTexEnvi(int, int, int). */
    public glTexEnvi(_target: number, _mode: number, _value: number): void {
    }

    /** Java Slick2D counterpart: SGL.glPointSize(float). */
    public glPointSize(size: number): void {
        if (this.recordListCommand(() => this.glPointSize(size))) {
            return;
        }
    }

    /** Java Slick2D counterpart: SGL.glScalef(float, float, float). */
    public glScalef(x: number, y: number, _z: number): void {
        if (this.recordListCommand(() => this.glScalef(x, y, _z))) {
            return;
        }
        this.scale(x, y);
    }

    /** Java Slick2D counterpart: SGL.glPushMatrix(). */
    public glPushMatrix(): void {
        if (this.recordListCommand(() => this.glPushMatrix())) {
            return;
        }
        this.pushTransform();
    }

    /** Java Slick2D counterpart: SGL.glPopMatrix(). */
    public glPopMatrix(): void {
        if (this.recordListCommand(() => this.glPopMatrix())) {
            return;
        }
        this.popTransform();
    }

    /** Java Slick2D counterpart: SGL.glBlendFunc(int, int). */
    public glBlendFunc(src: number, dest: number): void {
        if (this.recordListCommand(() => this.glBlendFunc(src, dest))) {
            return;
        }
        this.gl?.blendFunc(src, dest);
    }

    /** Java Slick2D counterpart: SGL.glGenLists(int). */
    public glGenLists(count: number): number {
        const start = this.nextList;
        for (let i = 0; i < count; i++) {
            this.lists.set(this.nextList++, []);
        }
        return start;
    }

    /** Java Slick2D counterpart: SGL.glNewList(int, int). */
    public glNewList(id: number, option: number): void {
        this.recordingList = id;
        this.recordingOption = option;
        this.lists.set(id, []);
    }

    /** Java Slick2D counterpart: SGL.glEndList(). */
    public glEndList(): void {
        this.recordingList = null;
        this.recordingOption = 0;
    }

    /** Java Slick2D counterpart: SGL.glCallList(int). */
    public glCallList(id: number): void {
        const commands = this.lists.get(id) ?? [];
        this.replayingList = true;
        try {
            for (const command of commands) {
                command();
            }
        } finally {
            this.replayingList = false;
        }
    }

    /** Java Slick2D counterpart: SGL.glCopyTexImage2D(...). */
    public glCopyTexImage2D(target: number, level: number, internalFormat: number, x: number, y: number, width: number, height: number, border: number): void {
        this.gl?.copyTexImage2D(target, level, internalFormat, x, y, width, height, border);
        const info = this.currentTextureId === 0 ? null : this.textures.get(this.currentTextureId);
        if (info) {
            info.target = target;
            info.width = width;
            info.height = height;
        }
    }

    /** Java Slick2D counterpart: SGL.glReadPixels(...). */
    public glReadPixels(x: number, y: number, width: number, height: number, format: number, type: number, pixels: Uint8Array): void {
        this.gl?.readPixels(x, y, width, height, format, type, pixels);
    }

    /** Java Slick2D counterpart: SGL.glTexParameteri(int, int, int). */
    public glTexParameteri(target: number, param: number, value: number): void {
        this.gl?.texParameteri(target, param, value);
    }

    /** Java Slick2D counterpart: SGL.getCurrentColor(). */
    public getCurrentColor(): number[] {
        return [...this.currentColor];
    }

    /** Java Slick2D counterpart: SGL.glDeleteLists(int, int). */
    public glDeleteLists(list: number, count: number): void {
        for (let i = 0; i < count; i++) {
            this.lists.delete(list + i);
        }
    }

    /** Java Slick2D counterpart: SGL.glDepthMask(boolean). */
    public glDepthMask(mask: boolean): void {
        this.gl?.depthMask(mask);
    }

    /** Java Slick2D counterpart: SGL.glClearDepth(float). */
    public glClearDepth(value: number): void {
        this.gl?.clearDepth(value);
    }

    /** Java Slick2D counterpart: SGL.glDepthFunc(int). */
    public glDepthFunc(func: number): void {
        this.gl?.depthFunc(func);
    }

    /** Java Slick2D counterpart: SGL.setGlobalAlphaScale(float). */
    public setGlobalAlphaScale(alphaScale: number): void {
        this.globalAlphaScale = alphaScale;
    }

    /** Java Slick2D counterpart: SGL.glLoadMatrix(FloatBuffer). */
    public glLoadMatrix(buffer: Float32Array): void {
        if (buffer.length >= 16) {
            this.replaceCurrent([buffer[0], buffer[4], buffer[12], buffer[1], buffer[5], buffer[13], 0, 0, 1]);
        }
    }

    /** Java Slick2D counterpart: SGL.glGenTextures(IntBuffer). */
    public glGenTextures(ids: Int32Array): void {
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
    public glGetError(): void {
        this.gl?.getError();
    }

    /** Java Slick2D counterpart: SGL.glTexImage2D(...). */
    public glTexImage2D(target: number, level: number, dstPixelFormat: number, width: number, height: number, border: number, srcPixelFormat: number, type: number, textureBuffer: Uint8Array): void {
        this.gl?.texImage2D(target, level, dstPixelFormat, width, height, border, srcPixelFormat, type, textureBuffer);
        const info = this.currentTextureId === 0 ? null : this.textures.get(this.currentTextureId);
        if (info) {
            info.target = target;
            info.width = width;
            info.height = height;
        }
    }

    /** Java Slick2D counterpart: SGL.glTexSubImage2D(...). */
    public glTexSubImage2D(target: number, level: number, pageX: number, pageY: number, width: number, height: number, format: number, type: number, scratchByteBuffer: Uint8Array): void {
        this.gl?.texSubImage2D(target, level, pageX, pageY, width, height, format, type, scratchByteBuffer);
    }

    /** Java Slick2D counterpart: SGL.canTextureMirrorClamp(). */
    public canTextureMirrorClamp(): boolean {
        return false;
    }

    /** Java Slick2D counterpart: SGL.canSecondaryColor(). */
    public canSecondaryColor(): boolean {
        return false;
    }

    /** Java Slick2D counterpart: SGL.glSecondaryColor3ubEXT(byte, byte, byte). */
    public glSecondaryColor3ubEXT(_b: number, _c: number, _d: number): void {
    }

    /** Returns the underlying WebGL2 context for compatibility shims. */
    public getContext(): WebGL2RenderingContext | null {
        return this.gl;
    }

    /** Returns the current renderer matrix. */
    public getCurrentMatrix(): Matrix3 {
        return [...this.currentMatrix()] as Matrix3;
    }

    private drawSolidPolygon(points: Array<[number, number]>, color: Color, transform: Matrix3): void {
        this.drawColoredTriangles(points.map((point) => ({ x: point[0], y: point[1], color })), transform);
    }

    private recordListCommand(command: () => void): boolean {
        if (this.recordingList === null || this.replayingList) {
            return false;
        }
        this.lists.get(this.recordingList)?.push(command);
        return this.recordingOption === this.GL_COMPILE;
    }

    private drawColoredTriangles(points: Array<{ x: number; y: number; color: Color }>, transform: Matrix3): void {
        const gl = this.gl;
        const solidProgram = this.solidProgram;
        const buffer = this.buffer;
        if (!gl || !solidProgram || !buffer || points.length === 0) {
            return;
        }
        const matrix = multiplyMatrix3(this.currentMatrix(), transform);
        const vertices = new Float32Array(points.flatMap((point) => {
            const clip = this.toClip(...transformPoint(matrix, point.x, point.y));
            return [clip[0], clip[1], point.color.r, point.color.g, point.color.b, point.color.a];
        }));
        gl.useProgram(solidProgram.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        const position = solidProgram.getAttribLocation(gl, "a_position");
        const colorAttrib = solidProgram.getAttribLocation(gl, "a_color");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 24, 0);
        gl.enableVertexAttribArray(colorAttrib);
        gl.vertexAttribPointer(colorAttrib, 4, gl.FLOAT, false, 24, 8);
        const colorLocation = solidProgram.getUniformLocation(gl, "u_color");
        gl.uniform4f(colorLocation, 1, 1, 1, this.globalAlphaScale);
        gl.drawArrays(gl.TRIANGLES, 0, points.length);
        this.batch.markDirty();
    }

    private applyActiveClip(): void {
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
        const width = Math.max(0, Math.floor(clip.width));
        const height = Math.max(0, Math.floor(clip.height));
        gl.scissor(Math.floor(clip.x), Math.floor(this.height - clip.y - clip.height), width, height);
    }

    private static normalizeClip(x: number, y: number, width: number, height: number): ScreenClip {
        const normalizedWidth = Math.max(0, width);
        const normalizedHeight = Math.max(0, height);
        return { x, y, width: normalizedWidth, height: normalizedHeight };
    }

    private static intersectClips(a: ScreenClip | null, b: ScreenClip | null): ScreenClip | null {
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

    private toClip(x: number, y: number): [number, number] {
        return [
            (x / this.width) * 2 - 1,
            1 - (y / this.height) * 2
        ];
    }

    private currentMatrix(): Matrix3 {
        return this.transformStack[this.transformStack.length - 1];
    }

    private replaceCurrent(matrix: Matrix3): void {
        this.transformStack[this.transformStack.length - 1] = matrix;
    }
}
