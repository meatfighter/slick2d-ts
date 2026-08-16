import { Renderer } from "../../slick/opengl/renderer/Renderer.js";
/**
 * Java LWJGL counterpart: org.lwjgl.opengl.GL11.
 *
 * Narrow OpenGL shim used by copied Slick2D helper code.
 */
export class GL11 {
    static GL_COLOR_BUFFER_BIT = 0x4000;
    static GL_DEPTH_BUFFER_BIT = 0x0100;
    /** Java LWJGL counterpart: GL11.glClear(int). */
    static glClear(mask) {
        Renderer.get().glClear(mask);
    }
    /** Java LWJGL counterpart: GL11.glClearColor(float, float, float, float). */
    static glClearColor(r, g, b, a) {
        Renderer.get().glClearColor(r, g, b, a);
    }
    /** Java LWJGL counterpart: GL11.glLoadIdentity(). */
    static glLoadIdentity() {
        Renderer.get().glLoadIdentity();
    }
    /** Java LWJGL counterpart: GL11.glPushMatrix(). */
    static glPushMatrix() {
        Renderer.get().glPushMatrix();
    }
    /** Java LWJGL counterpart: GL11.glPopMatrix(). */
    static glPopMatrix() {
        Renderer.get().glPopMatrix();
    }
    /** Java LWJGL counterpart: GL11.glTranslatef(float, float, float). */
    static glTranslatef(x, y, z) {
        Renderer.get().glTranslatef(x, y, z);
    }
    /** Java LWJGL counterpart: GL11.glScalef(float, float, float). */
    static glScalef(x, y, z) {
        Renderer.get().glScalef(x, y, z);
    }
    /** Java LWJGL counterpart: GL11.glRotatef(float, float, float, float). */
    static glRotatef(angle, x, y, z) {
        Renderer.get().glRotatef(angle, x, y, z);
    }
    /** Java LWJGL counterpart: GL11.glViewport(int, int, int, int). */
    static glViewport(_x, _y, width, height) {
        Renderer.get().initDisplay(width, height);
    }
    /** Java LWJGL counterpart: GL11.glScissor(int, int, int, int). */
    static glScissor(x, y, width, height) {
        Renderer.get().glScissor(x, y, width, height);
    }
}
//# sourceMappingURL=GL11.js.map