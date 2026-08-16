import { WebGLRenderer } from "../../rendering/WebGLRenderer.js";
import type { SGL } from "./SGL.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.renderer.Renderer.
 *
 * Static access point for the active Slick OpenGL compatibility renderer.
 */
export declare class Renderer {
    static readonly IMMEDIATE_RENDERER = 1;
    static readonly VERTEX_ARRAY_RENDERER = 2;
    static readonly DEFAULT_LINE_STRIP_RENDERER = 3;
    static readonly QUAD_BASED_LINE_STRIP_RENDERER = 4;
    private static renderer;
    private static lineStripRenderer;
    /** Java Slick2D counterpart: Renderer.get(). */
    static get(): SGL;
    /** Browser parity helper: returns the concrete WebGL renderer when active. */
    static getBackend(): WebGLRenderer;
    /** Java Slick2D counterpart: Renderer.setRenderer(int). */
    static setRenderer(type: number): void;
    /** Java Slick2D counterpart: Renderer.setRenderer(SGL). */
    static setRenderer(renderer: SGL): void;
    /** Java Slick2D counterpart: Renderer.setLineStripRenderer(int). */
    static setLineStripRenderer(type: number): void;
    /** Java Slick2D counterpart: Renderer.setLineStripRenderer(LineStripRenderer). */
    static setLineStripRenderer(renderer: unknown): void;
    /** Java Slick2D counterpart: Renderer.getLineStripRenderer(). */
    static getLineStripRenderer(): unknown;
}
//# sourceMappingURL=Renderer.d.ts.map