import { Renderer } from "../../slick/opengl/renderer/Renderer.js";

/**
 * Java LWJGL counterpart: org.lwjgl.opengl.GL11.
 *
 * Narrow OpenGL shim used by copied Slick2D helper code.
 */
export class GL11 {
    public static readonly GL_COLOR_BUFFER_BIT = 0x4000;
    public static readonly GL_DEPTH_BUFFER_BIT = 0x0100;

    /** Java LWJGL counterpart: GL11.glClear(int). */
    public static glClear(mask: number): void {
        Renderer.get().glClear(mask);
    }

    /** Java LWJGL counterpart: GL11.glClearColor(float, float, float, float). */
    public static glClearColor(r: number, g: number, b: number, a: number): void {
        Renderer.get().glClearColor(r, g, b, a);
    }

    /** Java LWJGL counterpart: GL11.glLoadIdentity(). */
    public static glLoadIdentity(): void {
        Renderer.get().glLoadIdentity();
    }

    /** Java LWJGL counterpart: GL11.glPushMatrix(). */
    public static glPushMatrix(): void {
        Renderer.get().glPushMatrix();
    }

    /** Java LWJGL counterpart: GL11.glPopMatrix(). */
    public static glPopMatrix(): void {
        Renderer.get().glPopMatrix();
    }

    /** Java LWJGL counterpart: GL11.glTranslatef(float, float, float). */
    public static glTranslatef(x: number, y: number, z: number): void {
        Renderer.get().glTranslatef(x, y, z);
    }

    /** Java LWJGL counterpart: GL11.glScalef(float, float, float). */
    public static glScalef(x: number, y: number, z: number): void {
        Renderer.get().glScalef(x, y, z);
    }

    /** Java LWJGL counterpart: GL11.glRotatef(float, float, float, float). */
    public static glRotatef(angle: number, x: number, y: number, z: number): void {
        Renderer.get().glRotatef(angle, x, y, z);
    }

    /** Java LWJGL counterpart: GL11.glViewport(int, int, int, int). */
    public static glViewport(_x: number, _y: number, width: number, height: number): void {
        Renderer.get().initDisplay(width, height);
    }

    /** Java LWJGL counterpart: GL11.glScissor(int, int, int, int). */
    public static glScissor(x: number, y: number, width: number, height: number): void {
        Renderer.get().glScissor(x, y, width, height);
    }
}
