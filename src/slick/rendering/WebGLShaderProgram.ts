import { SlickException } from "../SlickException.js";

/**
 * Internal WebGL shader program wrapper.
 *
 * Compiles, links, and exposes locations used by the renderer.
 */
export class WebGLShaderProgram {
    public readonly program: WebGLProgram;

    /** Creates and links a WebGL program from vertex and fragment sources. */
    public constructor(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
        const vertex = WebGLShaderProgram.compile(gl, gl.VERTEX_SHADER, vertexSource);
        const fragment = WebGLShaderProgram.compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
        const program = gl.createProgram();
        if (!program) {
            throw new SlickException("Unable to create WebGL shader program");
        }
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program) ?? "unknown link error";
            gl.deleteProgram(program);
            throw new SlickException(`Unable to link WebGL shader program: ${info}`);
        }
        gl.deleteShader(vertex);
        gl.deleteShader(fragment);
        this.program = program;
    }

    /** Returns an attribute location, throwing if it is missing. */
    public getAttribLocation(gl: WebGL2RenderingContext, name: string): number {
        const location = gl.getAttribLocation(this.program, name);
        if (location < 0) {
            throw new SlickException(`Missing shader attribute: ${name}`);
        }
        return location;
    }

    /** Returns a uniform location, throwing if it is missing. */
    public getUniformLocation(gl: WebGL2RenderingContext, name: string): WebGLUniformLocation {
        const location = gl.getUniformLocation(this.program, name);
        if (!location) {
            throw new SlickException(`Missing shader uniform: ${name}`);
        }
        return location;
    }

    private static compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
        const shader = gl.createShader(type);
        if (!shader) {
            throw new SlickException("Unable to create WebGL shader");
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader) ?? "unknown compile error";
            gl.deleteShader(shader);
            throw new SlickException(`Unable to compile WebGL shader: ${info}`);
        }
        return shader;
    }
}
