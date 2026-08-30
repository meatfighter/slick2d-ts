import { Color } from "../Color.js";
import type { Image } from "../Image.js";
import type { SGL } from "../opengl/renderer/SGL.js";
import { Matrix3, RenderBackend, RenderBackendOptions } from "./RenderBackend.js";
import { WebGLRenderTarget } from "./WebGLRenderTarget.js";
import type { WebGLTextureResource } from "./WebGLTextureResource.js";
/**
 * Internal WebGL2 renderer implementing Slick2D's 2D OpenGL-style state.
 */
export declare class WebGLRenderer implements RenderBackend, SGL {
    readonly GL_TEXTURE_2D = 3553;
    readonly GL_RGBA = 6408;
    readonly GL_RGB = 6407;
    readonly GL_UNSIGNED_BYTE = 5121;
    readonly GL_LINEAR = 9729;
    readonly GL_NEAREST = 9728;
    readonly GL_TEXTURE_MIN_FILTER = 10241;
    readonly GL_TEXTURE_MAG_FILTER = 10240;
    readonly GL_POINT_SMOOTH = 2832;
    readonly GL_POLYGON_SMOOTH = 2881;
    readonly GL_LINE_SMOOTH = 2848;
    readonly GL_SCISSOR_TEST = 3089;
    readonly GL_MODULATE = 8448;
    readonly GL_TEXTURE_ENV = 8960;
    readonly GL_TEXTURE_ENV_MODE = 8704;
    readonly GL_QUADS = 7;
    readonly GL_TRIANGLES = 4;
    readonly GL_LINES = 1;
    readonly GL_SRC_ALPHA = 770;
    readonly GL_ONE = 1;
    readonly GL_ONE_MINUS_DST_ALPHA = 773;
    readonly GL_DST_ALPHA = 772;
    readonly GL_ONE_MINUS_SRC_ALPHA = 771;
    readonly GL_COMPILE = 4864;
    readonly GL_MAX_TEXTURE_SIZE = 3379;
    readonly GL_COLOR_BUFFER_BIT = 16384;
    readonly GL_DEPTH_BUFFER_BIT = 256;
    readonly GL_BLEND = 3042;
    readonly GL_COLOR_CLEAR_VALUE = 3106;
    readonly GL_LINE_WIDTH = 2849;
    readonly GL_CLIP_PLANE0 = 12288;
    readonly GL_CLIP_PLANE1 = 12289;
    readonly GL_CLIP_PLANE2 = 12290;
    readonly GL_CLIP_PLANE3 = 12291;
    readonly GL_COMPILE_AND_EXECUTE = 4865;
    readonly GL_RGBA8 = 32856;
    readonly GL_RGBA16 = 32859;
    readonly GL_BGRA = 32993;
    readonly GL_MIRROR_CLAMP_TO_EDGE_EXT = 34627;
    readonly GL_TEXTURE_WRAP_S = 10242;
    readonly GL_TEXTURE_WRAP_T = 10243;
    readonly GL_CLAMP = 10496;
    readonly GL_COLOR_SUM_EXT = 33880;
    readonly GL_ALWAYS = 519;
    readonly GL_DEPTH_TEST = 2929;
    readonly GL_NOTEQUAL = 517;
    readonly GL_EQUAL = 514;
    readonly GL_SRC_COLOR = 768;
    readonly GL_ONE_MINUS_SRC_COLOR = 769;
    readonly GL_MODELVIEW_MATRIX = 2982;
    private canvas;
    private gl;
    private contextOptions;
    private contextLost;
    private contextGeneration;
    private normalSolidProgram;
    private normalTextureProgram;
    private solidProgram;
    private textureProgram;
    private monochromeSolidProgram;
    private monochromeTextureProgram;
    private buffer;
    private batch;
    private width;
    private height;
    private backingWidth;
    private backingHeight;
    private backingScaleX;
    private backingScaleY;
    private defaultWidth;
    private defaultHeight;
    private defaultBackingWidth;
    private defaultBackingHeight;
    private lineWidth;
    private globalAlphaScale;
    private colorInverted;
    private monochromePalette;
    private monochromePaletteEnabled;
    private currentColor;
    private transformStack;
    private readonly matrixPool;
    private readonly matrixScratch;
    private readonly textureBatchVertices;
    private textureBatchVertexCount;
    private textureBatchTexture;
    private textureBatchFlash;
    private textureBatchInverted;
    private readonly solidQuadVertices;
    private dynamicSolidVertices;
    private readonly modelViewScratch;
    private readonly scratchColor;
    private currentTarget;
    private readonly renderTargetStack;
    private readonly globalColorInvertedStack;
    private readonly monochromePaletteStack;
    private readonly monochromePaletteEnabledStack;
    private blendEnabled;
    private blendSourceFactor;
    private blendDestinationFactor;
    private colorMaskBits;
    private readonly drawModeBlendEnabledStack;
    private readonly drawModeBlendSourceFactorStack;
    private readonly drawModeBlendDestinationFactorStack;
    private readonly drawModeColorMaskBitsStack;
    private readonly colorMaskStateStack;
    private immediateType;
    private immediateTexCoord;
    private immediateVertices;
    private lists;
    private recordingList;
    private recordingOption;
    private replayingList;
    private nextList;
    private textures;
    private currentTextureId;
    private nextTextureId;
    private screenClip;
    private worldClip;
    /** Initializes the renderer with a canvas and WebGL2 context attributes. */
    initialize(canvas: HTMLCanvasElement, options: RenderBackendOptions, logicalWidth?: number, logicalHeight?: number, backingWidth?: number, backingHeight?: number): void;
    /** Begins a frame by binding the default target, setting viewport, and clearing. */
    beginFrame(width: number, height: number, background: Color, backingWidth?: number, backingHeight?: number): void;
    /** Ends a frame by flushing pending work. */
    endFrame(): void;
    /** Returns the active framebuffer-backed render target, or null for the display. */
    getRenderTarget(): WebGLRenderTarget | null;
    /** @internal Returns the generation of the currently owned WebGL context. */
    __getContextGeneration(): number;
    /** Sets the active framebuffer-backed render target. */
    setRenderTarget(target: WebGLRenderTarget | null): void;
    /** Saves the active render target and switches to another target. */
    pushRenderTarget(target: WebGLRenderTarget | null): void;
    /** Restores the render target saved by pushRenderTarget(). */
    popRenderTarget(): void;
    /** Saves the exact WebGL state controlled by Graphics.setDrawMode(). */
    pushDrawModeState(): void;
    /** Saves the current draw-mode state and applies Graphics.MODE_NORMAL semantics. */
    pushNormalDrawModeState(): void;
    /** Restores the exact state saved by pushDrawModeState() or pushNormalDrawModeState(). */
    popDrawModeState(): void;
    /** Saves the current color mask and makes all four channels writable. */
    pushFullColorMask(): void;
    /** Restores the color mask saved by pushFullColorMask(). */
    popColorMask(): void;
    /** Draws a textured quad. */
    drawImage(image: Image, x: number, y: number, width: number, height: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, alpha: number, tint: Color | null, transform: Matrix3, useCornerColors?: boolean, useCurrentColorForNullTint?: boolean): void;
    /** Draws a textured quad as a Slick flash/silhouette. */
    drawImageFlash(image: Image, x: number, y: number, width: number, height: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, tint: Color, transform: Matrix3): void;
    /** Draws a textured quad with arbitrary corner positions. */
    drawImageWarped(image: Image, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, alpha: number, tint: Color | null, transform: Matrix3, useCornerColors?: boolean, useCurrentColorForNullTint?: boolean): void;
    private drawTexturedWarped;
    /** Draws a filled rectangle. */
    fillRect(x: number, y: number, width: number, height: number, color: Color, transform?: Matrix3): void;
    /** Draws a line as a thin quad so browser line-width limits do not matter. */
    drawLine(x1: number, y1: number, x2: number, y2: number, color: Color, width: number, transform?: Matrix3): void;
    /** Draws a line with endpoint color interpolation. */
    drawGradientLine(x1: number, y1: number, color1: Color, x2: number, y2: number, color2: Color, width: number, transform?: Matrix3): void;
    /** Draws connected line segments. */
    drawLineStrip(points: Array<[number, number]>, color: Color, width: number, transform?: Matrix3): void;
    /** Draws already-triangulated solid geometry. */
    fillTriangles(points: Array<[number, number]>, color: Color, transform?: Matrix3): void;
    /** Copies pixels from the active framebuffer into a render-target image texture. */
    copyAreaToRenderTarget(target: WebGLRenderTarget, x: number, y: number): void;
    /** Applies a screen-space scissor clip. */
    setClip(x: number, y: number, width: number, height: number): void;
    /** Clears the active screen-space clip. */
    clearClip(): void;
    /** Applies a transformed world-space clip by converting its bounds to a scissor rectangle. */
    setWorldClip(x: number, y: number, width: number, height: number, transform: Matrix3): void;
    /** Clears the active world-space clip. */
    clearWorldClip(): void;
    /** Browser extension: toggles RGB inversion for subsequent draw calls. */
    setColorInverted(inverted: boolean): void;
    /** Browser extension: reports the active RGB inversion state. */
    isColorInverted(): boolean;
    /**
     * Browser extension: maps rendered luminance between replacement colors.
     *
     * Palette programs are compiled lazily. The normal and inversion shader
     * programs remain untouched and active for callers that never opt in.
     */
    setMonochromePalette(blackReplacement: Color, whiteReplacement: Color): void;
    /** Browser extension: restores the normal programs active before the palette was enabled. */
    clearMonochromePalette(): void;
    /** Browser extension: reports whether the optional palette programs are active. */
    isMonochromePaletteEnabled(): boolean;
    /** Browser extension: disables whole-frame color effects until restored. */
    pushGlobalColorEffectsDisabled(): void;
    /** Browser extension: restores color effects saved by pushGlobalColorEffectsDisabled(). */
    popGlobalColorEffects(): void;
    /** Saves the current matrix. */
    pushTransform(): void;
    /** Restores the previous matrix. */
    popTransform(): void;
    /** Applies a translation to the current matrix. */
    translate(x: number, y: number): void;
    /** Applies a scale to the current matrix. */
    scale(x: number, y: number): void;
    /** Applies a clockwise degree rotation around a point to the current matrix. */
    rotate(x: number, y: number, angle: number): void;
    /** Reads RGBA pixels from the active target. */
    readPixels(x: number, y: number, width: number, height: number, target: Uint8Array): void;
    /** Binds a decoded WebGL texture resource to the active texture unit. */
    bindTextureResource(resource: WebGLTextureResource): void;
    /** Handles browser WebGL context loss. */
    handleContextLost(): void;
    /** Handles browser WebGL context restoration. */
    handleContextRestored(): void;
    /** Releases renderer-owned WebGL state. */
    dispose(): void;
    /** Java Slick2D counterpart: SGL.flush(). */
    flush(): void;
    /** Java Slick2D counterpart: SGL.initDisplay(int, int). */
    initDisplay(width: number, height: number, backingWidth?: number, backingHeight?: number): void;
    /** Java Slick2D counterpart: SGL.enterOrtho(int, int). */
    enterOrtho(xsize: number, ysize: number): void;
    /** Java Slick2D counterpart: SGL.glClearColor(float, float, float, float). */
    glClearColor(r: number, g: number, b: number, a: number): void;
    /** Java Slick2D counterpart: SGL.glClipPlane(int, DoubleBuffer). */
    glClipPlane(_plane: number, _buffer: Float64Array): void;
    /** Java Slick2D counterpart: SGL.glScissor(int, int, int, int). */
    glScissor(x: number, y: number, width: number, height: number): void;
    /** Java Slick2D counterpart: SGL.glLineWidth(float). */
    glLineWidth(width: number): void;
    /** Java Slick2D counterpart: SGL.glClear(int). */
    glClear(mask: number): void;
    /** Java Slick2D counterpart: SGL.glColorMask(boolean, boolean, boolean, boolean). */
    glColorMask(red: boolean, green: boolean, blue: boolean, alpha: boolean): void;
    /** Java Slick2D counterpart: SGL.glLoadIdentity(). */
    glLoadIdentity(): void;
    /** Java Slick2D counterpart: SGL.glGetInteger(int, IntBuffer). */
    glGetInteger(id: number, ret: Int32Array): void;
    /** Java Slick2D counterpart: SGL.glGetFloat(int, FloatBuffer). */
    glGetFloat(id: number, ret: Float32Array): void;
    /** Java Slick2D counterpart: SGL.glEnable(int). */
    glEnable(id: number): void;
    /** Java Slick2D counterpart: SGL.glDisable(int). */
    glDisable(id: number): void;
    /** Java Slick2D counterpart: SGL.glBindTexture(int, int). */
    glBindTexture(target: number, id: number): void;
    /** Java Slick2D counterpart: SGL.glGetTexImage(...). */
    glGetTexImage(target: number, level: number, format: number, type: number, pixels: Uint8Array): void;
    /** Java Slick2D counterpart: SGL.glDeleteTextures(IntBuffer). */
    glDeleteTextures(buffer: Int32Array): void;
    /** Java Slick2D counterpart: SGL.glColor4f(float, float, float, float). */
    glColor4f(r: number, g: number, b: number, a: number): void;
    /** Java Slick2D counterpart: SGL.glTexCoord2f(float, float). */
    glTexCoord2f(u: number, v: number): void;
    /** Java Slick2D counterpart: SGL.glVertex3f(float, float, float). */
    glVertex3f(x: number, y: number, _z: number): void;
    /** Java Slick2D counterpart: SGL.glVertex2f(float, float). */
    glVertex2f(x: number, y: number): void;
    /** Java Slick2D counterpart: SGL.glRotatef(float, float, float, float). */
    glRotatef(angle: number, x: number, y: number, z: number): void;
    /** Java Slick2D counterpart: SGL.glTranslatef(float, float, float). */
    glTranslatef(x: number, y: number, _z: number): void;
    /** Java Slick2D counterpart: SGL.glBegin(int). */
    glBegin(geomType: number): void;
    /** Java Slick2D counterpart: SGL.glEnd(). */
    glEnd(): void;
    /** Java Slick2D counterpart: SGL.glTexEnvi(int, int, int). */
    glTexEnvi(_target: number, _mode: number, _value: number): void;
    /** Java Slick2D counterpart: SGL.glPointSize(float). */
    glPointSize(size: number): void;
    /** Java Slick2D counterpart: SGL.glScalef(float, float, float). */
    glScalef(x: number, y: number, _z: number): void;
    /** Java Slick2D counterpart: SGL.glPushMatrix(). */
    glPushMatrix(): void;
    /** Java Slick2D counterpart: SGL.glPopMatrix(). */
    glPopMatrix(): void;
    /** Java Slick2D counterpart: SGL.glBlendFunc(int, int). */
    glBlendFunc(src: number, dest: number): void;
    /** Java Slick2D counterpart: SGL.glGenLists(int). */
    glGenLists(count: number): number;
    /** Java Slick2D counterpart: SGL.glNewList(int, int). */
    glNewList(id: number, option: number): void;
    /** Java Slick2D counterpart: SGL.glEndList(). */
    glEndList(): void;
    /** Java Slick2D counterpart: SGL.glCallList(int). */
    glCallList(id: number): void;
    /** Java Slick2D counterpart: SGL.glCopyTexImage2D(...). */
    glCopyTexImage2D(target: number, level: number, internalFormat: number, x: number, y: number, width: number, height: number, border: number): void;
    /** Java Slick2D counterpart: SGL.glReadPixels(...). */
    glReadPixels(x: number, y: number, width: number, height: number, format: number, type: number, pixels: Uint8Array): void;
    /** Java Slick2D counterpart: SGL.glTexParameteri(int, int, int). */
    glTexParameteri(target: number, param: number, value: number): void;
    /** Java Slick2D counterpart: SGL.getCurrentColor(). */
    getCurrentColor(): number[];
    /** Java Slick2D counterpart: SGL.glDeleteLists(int, int). */
    glDeleteLists(list: number, count: number): void;
    /** Java Slick2D counterpart: SGL.glDepthMask(boolean). */
    glDepthMask(mask: boolean): void;
    /** Java Slick2D counterpart: SGL.glClearDepth(float). */
    glClearDepth(value: number): void;
    /** Java Slick2D counterpart: SGL.glDepthFunc(int). */
    glDepthFunc(func: number): void;
    /** Java Slick2D counterpart: SGL.setGlobalAlphaScale(float). */
    setGlobalAlphaScale(alphaScale: number): void;
    /** Java Slick2D counterpart: SGL.glLoadMatrix(FloatBuffer). */
    glLoadMatrix(buffer: Float32Array): void;
    /** Java Slick2D counterpart: SGL.glGenTextures(IntBuffer). */
    glGenTextures(ids: Int32Array): void;
    /** Java Slick2D counterpart: SGL.glGetError(). */
    glGetError(): void;
    /** Java Slick2D counterpart: SGL.glTexImage2D(...). */
    glTexImage2D(target: number, level: number, dstPixelFormat: number, width: number, height: number, border: number, srcPixelFormat: number, type: number, textureBuffer: Uint8Array): void;
    /** Java Slick2D counterpart: SGL.glTexSubImage2D(...). */
    glTexSubImage2D(target: number, level: number, pageX: number, pageY: number, width: number, height: number, format: number, type: number, scratchByteBuffer: Uint8Array): void;
    /** Java Slick2D counterpart: SGL.canTextureMirrorClamp(). */
    canTextureMirrorClamp(): boolean;
    /** Java Slick2D counterpart: SGL.canSecondaryColor(). */
    canSecondaryColor(): boolean;
    /** Java Slick2D counterpart: SGL.glSecondaryColor3ubEXT(byte, byte, byte). */
    glSecondaryColor3ubEXT(_b: number, _c: number, _d: number): void;
    /** Returns the underlying WebGL2 context for compatibility shims. */
    getContext(): WebGL2RenderingContext | null;
    /** Returns the current renderer matrix. */
    getCurrentMatrix(): Matrix3;
    private recordListCommand;
    private ensureMonochromePalettePrograms;
    private applyMonochromePaletteUniforms;
    private disableMonochromePalette;
    private resetDrawModeStateTracking;
    /**
     * @internal Applies exact Graphics draw-mode state without display-list recording.
     *
     * A null blend factor preserves the currently tracked factor, matching
     * MODE_ALPHA_MAP's behavior of changing blend enablement and the write mask
     * without selecting a new blend function.
     */
    __applyDrawModeState(blendEnabled: boolean, sourceFactor: number | null, destinationFactor: number | null, colorMaskBits: number): void;
    private applyColorMaskBits;
    private static encodeColorMask;
    private static normalizeColorChannel;
    private static monochromePaletteMatches;
    private queueTextureQuad;
    private flushTextureBatch;
    private drawSolidPolygon;
    private drawImmediateSolidVertices;
    private drawSolidQuad;
    private submitSolidVertices;
    private ensureDynamicSolidCapacity;
    private combinedMatrix;
    private writeTextureVertex;
    private writeSolidVertex;
    private copyMatrix;
    private writeIdentity;
    private setScratchColor;
    private setDefaultDimensions;
    private useDefaultDimensions;
    private setActiveDimensions;
    private applyActiveClip;
    private static normalizeClip;
    private static intersectClips;
    private static isContextLost;
    private currentMatrix;
}
//# sourceMappingURL=WebGLRenderer.d.ts.map