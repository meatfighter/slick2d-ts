import { SlickException } from "../SlickException.js";
/**
 * Internal WebGL shader program wrapper.
 *
 * Compiles, links, and exposes locations used by the renderer.
 */
export class WebGLShaderProgram {
    program;
    attribLocations = new Map();
    uniformLocations = new Map();
    /** Creates and links a WebGL program from vertex and fragment sources. */
    constructor(gl, vertexSource, fragmentSource) {
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
    getAttribLocation(gl, name) {
        const cached = this.attribLocations.get(name);
        if (cached !== undefined) {
            return cached;
        }
        const location = gl.getAttribLocation(this.program, name);
        if (location < 0) {
            throw new SlickException(`Missing shader attribute: ${name}`);
        }
        this.attribLocations.set(name, location);
        return location;
    }
    /** Returns a uniform location, throwing if it is missing. */
    getUniformLocation(gl, name) {
        const cached = this.uniformLocations.get(name);
        if (cached) {
            return cached;
        }
        const location = gl.getUniformLocation(this.program, name);
        if (!location) {
            throw new SlickException(`Missing shader uniform: ${name}`);
        }
        this.uniformLocations.set(name, location);
        return location;
    }
    /** Releases the linked WebGL program. */
    dispose(gl) {
        gl.deleteProgram(this.program);
        this.attribLocations.clear();
        this.uniformLocations.clear();
    }
    static compile(gl, type, source) {
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
//# sourceMappingURL=WebGLShaderProgram.js.map