import { WebGLRenderer } from "../../rendering/WebGLRenderer.js";
import type { SGL } from "./SGL.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.renderer.Renderer.
 *
 * Static access point for the active Slick OpenGL compatibility renderer.
 */
export class Renderer {
    public static readonly IMMEDIATE_RENDERER = 1;
    public static readonly VERTEX_ARRAY_RENDERER = 2;
    public static readonly DEFAULT_LINE_STRIP_RENDERER = 3;
    public static readonly QUAD_BASED_LINE_STRIP_RENDERER = 4;

    private static renderer: SGL = new WebGLRenderer();
    private static lineStripRenderer: unknown = null;

    /** Java Slick2D counterpart: Renderer.get(). */
    public static get(): SGL {
        return Renderer.renderer;
    }

    /** Browser parity helper: returns the concrete WebGL renderer when active. */
    public static getBackend(): WebGLRenderer {
        if (!(Renderer.renderer instanceof WebGLRenderer)) {
            Renderer.renderer = new WebGLRenderer();
        }
        return Renderer.renderer as WebGLRenderer;
    }

    /** Java Slick2D counterpart: Renderer.setRenderer(int). */
    public static setRenderer(type: number): void;
    /** Java Slick2D counterpart: Renderer.setRenderer(SGL). */
    public static setRenderer(renderer: SGL): void;
    public static setRenderer(typeOrRenderer: number | SGL): void {
        if (typeof typeOrRenderer === "number") {
            Renderer.renderer = new WebGLRenderer();
        } else {
            Renderer.renderer = typeOrRenderer;
        }
    }

    /** Java Slick2D counterpart: Renderer.setLineStripRenderer(int). */
    public static setLineStripRenderer(type: number): void;
    /** Java Slick2D counterpart: Renderer.setLineStripRenderer(LineStripRenderer). */
    public static setLineStripRenderer(renderer: unknown): void;
    public static setLineStripRenderer(typeOrRenderer: number | unknown): void {
        Renderer.lineStripRenderer = typeOrRenderer;
    }

    /** Java Slick2D counterpart: Renderer.getLineStripRenderer(). */
    public static getLineStripRenderer(): unknown {
        return Renderer.lineStripRenderer;
    }
}
