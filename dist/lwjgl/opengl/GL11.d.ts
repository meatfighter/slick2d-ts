/**
 * Java LWJGL counterpart: org.lwjgl.opengl.GL11.
 *
 * Narrow OpenGL shim used by copied Slick2D helper code.
 */
export declare class GL11 {
    static readonly GL_COLOR_BUFFER_BIT = 16384;
    static readonly GL_DEPTH_BUFFER_BIT = 256;
    /** Java LWJGL counterpart: GL11.glClear(int). */
    static glClear(mask: number): void;
    /** Java LWJGL counterpart: GL11.glClearColor(float, float, float, float). */
    static glClearColor(r: number, g: number, b: number, a: number): void;
    /** Java LWJGL counterpart: GL11.glLoadIdentity(). */
    static glLoadIdentity(): void;
    /** Java LWJGL counterpart: GL11.glPushMatrix(). */
    static glPushMatrix(): void;
    /** Java LWJGL counterpart: GL11.glPopMatrix(). */
    static glPopMatrix(): void;
    /** Java LWJGL counterpart: GL11.glTranslatef(float, float, float). */
    static glTranslatef(x: number, y: number, z: number): void;
    /** Java LWJGL counterpart: GL11.glScalef(float, float, float). */
    static glScalef(x: number, y: number, z: number): void;
    /** Java LWJGL counterpart: GL11.glRotatef(float, float, float, float). */
    static glRotatef(angle: number, x: number, y: number, z: number): void;
    /** Java LWJGL counterpart: GL11.glViewport(int, int, int, int). */
    static glViewport(_x: number, _y: number, width: number, height: number): void;
    /** Java LWJGL counterpart: GL11.glScissor(int, int, int, int). */
    static glScissor(x: number, y: number, width: number, height: number): void;
}
//# sourceMappingURL=GL11.d.ts.map