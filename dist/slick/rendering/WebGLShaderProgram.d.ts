/**
 * Internal WebGL shader program wrapper.
 *
 * Compiles, links, and exposes locations used by the renderer.
 */
export declare class WebGLShaderProgram {
    readonly program: WebGLProgram;
    private readonly attribLocations;
    private readonly uniformLocations;
    /** Creates and links a WebGL program from vertex and fragment sources. */
    constructor(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string);
    /** Returns an attribute location, throwing if it is missing. */
    getAttribLocation(gl: WebGL2RenderingContext, name: string): number;
    /** Returns a uniform location, throwing if it is missing. */
    getUniformLocation(gl: WebGL2RenderingContext, name: string): WebGLUniformLocation;
    /** Releases the linked WebGL program. */
    dispose(gl: WebGL2RenderingContext): void;
    private static compile;
}
//# sourceMappingURL=WebGLShaderProgram.d.ts.map