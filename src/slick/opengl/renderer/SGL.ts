/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.renderer.SGL.
 *
 * OpenGL-like compatibility interface backed by the active browser renderer.
 */
export interface SGL {
    readonly GL_TEXTURE_2D: number;
    readonly GL_RGBA: number;
    readonly GL_RGB: number;
    readonly GL_UNSIGNED_BYTE: number;
    readonly GL_LINEAR: number;
    readonly GL_NEAREST: number;
    readonly GL_TEXTURE_MIN_FILTER: number;
    readonly GL_TEXTURE_MAG_FILTER: number;
    readonly GL_POINT_SMOOTH: number;
    readonly GL_POLYGON_SMOOTH: number;
    readonly GL_LINE_SMOOTH: number;
    readonly GL_SCISSOR_TEST: number;
    readonly GL_MODULATE: number;
    readonly GL_TEXTURE_ENV: number;
    readonly GL_TEXTURE_ENV_MODE: number;
    readonly GL_QUADS: number;
    readonly GL_TRIANGLES: number;
    readonly GL_LINES: number;
    readonly GL_SRC_ALPHA: number;
    readonly GL_ONE: number;
    readonly GL_ONE_MINUS_DST_ALPHA: number;
    readonly GL_DST_ALPHA: number;
    readonly GL_ONE_MINUS_SRC_ALPHA: number;
    readonly GL_COMPILE: number;
    readonly GL_MAX_TEXTURE_SIZE: number;
    readonly GL_COLOR_BUFFER_BIT: number;
    readonly GL_DEPTH_BUFFER_BIT: number;
    readonly GL_BLEND: number;
    readonly GL_COLOR_CLEAR_VALUE: number;
    readonly GL_LINE_WIDTH: number;
    readonly GL_CLIP_PLANE0: number;
    readonly GL_CLIP_PLANE1: number;
    readonly GL_CLIP_PLANE2: number;
    readonly GL_CLIP_PLANE3: number;
    readonly GL_COMPILE_AND_EXECUTE: number;
    readonly GL_RGBA8: number;
    readonly GL_RGBA16: number;
    readonly GL_BGRA: number;
    readonly GL_MIRROR_CLAMP_TO_EDGE_EXT: number;
    readonly GL_TEXTURE_WRAP_S: number;
    readonly GL_TEXTURE_WRAP_T: number;
    readonly GL_CLAMP: number;
    readonly GL_COLOR_SUM_EXT: number;
    readonly GL_ALWAYS: number;
    readonly GL_DEPTH_TEST: number;
    readonly GL_NOTEQUAL: number;
    readonly GL_EQUAL: number;
    readonly GL_SRC_COLOR: number;
    readonly GL_ONE_MINUS_SRC_COLOR: number;
    readonly GL_MODELVIEW_MATRIX: number;

    /** Java Slick2D counterpart: SGL.flush(). */
    flush(): void;
    /** Java Slick2D counterpart: SGL.initDisplay(int, int). */
    initDisplay(width: number, height: number, backingWidth?: number, backingHeight?: number): void;
    /** Java Slick2D counterpart: SGL.enterOrtho(int, int). */
    enterOrtho(xsize: number, ysize: number): void;
    /** Java Slick2D counterpart: SGL.glClearColor(float, float, float, float). */
    glClearColor(r: number, g: number, b: number, a: number): void;
    /** Java Slick2D counterpart: SGL.glClipPlane(int, DoubleBuffer). */
    glClipPlane(plane: number, buffer: Float64Array): void;
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
    glVertex3f(x: number, y: number, z: number): void;
    /** Java Slick2D counterpart: SGL.glVertex2f(float, float). */
    glVertex2f(x: number, y: number): void;
    /** Java Slick2D counterpart: SGL.glRotatef(float, float, float, float). */
    glRotatef(angle: number, x: number, y: number, z: number): void;
    /** Java Slick2D counterpart: SGL.glTranslatef(float, float, float). */
    glTranslatef(x: number, y: number, z: number): void;
    /** Java Slick2D counterpart: SGL.glBegin(int). */
    glBegin(geomType: number): void;
    /** Java Slick2D counterpart: SGL.glEnd(). */
    glEnd(): void;
    /** Java Slick2D counterpart: SGL.glTexEnvi(int, int, int). */
    glTexEnvi(target: number, mode: number, value: number): void;
    /** Java Slick2D counterpart: SGL.glPointSize(float). */
    glPointSize(size: number): void;
    /** Java Slick2D counterpart: SGL.glScalef(float, float, float). */
    glScalef(x: number, y: number, z: number): void;
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
    glTexImage2D(
        target: number,
        level: number,
        dstPixelFormat: number,
        width: number,
        height: number,
        border: number,
        srcPixelFormat: number,
        type: number,
        textureBuffer: Uint8Array
    ): void;
    /** Java Slick2D counterpart: SGL.glTexSubImage2D(...). */
    glTexSubImage2D(
        target: number,
        level: number,
        pageX: number,
        pageY: number,
        width: number,
        height: number,
        format: number,
        type: number,
        scratchByteBuffer: Uint8Array
    ): void;
    /** Java Slick2D counterpart: SGL.canTextureMirrorClamp(). */
    canTextureMirrorClamp(): boolean;
    /** Java Slick2D counterpart: SGL.canSecondaryColor(). */
    canSecondaryColor(): boolean;
    /** Java Slick2D counterpart: SGL.glSecondaryColor3ubEXT(byte, byte, byte). */
    glSecondaryColor3ubEXT(b: number, c: number, d: number): void;
}
