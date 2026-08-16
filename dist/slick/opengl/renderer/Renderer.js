import { WebGLRenderer } from "../../rendering/WebGLRenderer.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.renderer.Renderer.
 *
 * Static access point for the active Slick OpenGL compatibility renderer.
 */
export class Renderer {
    static IMMEDIATE_RENDERER = 1;
    static VERTEX_ARRAY_RENDERER = 2;
    static DEFAULT_LINE_STRIP_RENDERER = 3;
    static QUAD_BASED_LINE_STRIP_RENDERER = 4;
    static renderer = new WebGLRenderer();
    static lineStripRenderer = null;
    /** Java Slick2D counterpart: Renderer.get(). */
    static get() {
        return Renderer.renderer;
    }
    /** Browser parity helper: returns the concrete WebGL renderer when active. */
    static getBackend() {
        if (!(Renderer.renderer instanceof WebGLRenderer)) {
            Renderer.renderer = new WebGLRenderer();
        }
        return Renderer.renderer;
    }
    static setRenderer(typeOrRenderer) {
        if (typeof typeOrRenderer === "number") {
            Renderer.renderer = new WebGLRenderer();
        }
        else {
            Renderer.renderer = typeOrRenderer;
        }
    }
    static setLineStripRenderer(typeOrRenderer) {
        Renderer.lineStripRenderer = typeOrRenderer;
    }
    /** Java Slick2D counterpart: Renderer.getLineStripRenderer(). */
    static getLineStripRenderer() {
        return Renderer.lineStripRenderer;
    }
}
//# sourceMappingURL=Renderer.js.map