import assert from "node:assert/strict";
import { test } from "node:test";
import { Color, Graphics, Renderer } from "../dist/index.js";
import { WebGLRenderer } from "../dist/slick/rendering/WebGLRenderer.js";
import { identityMatrix3 } from "../dist/slick/rendering/RenderBackend.js";

class FakeBatchGL {
    constructor() {
        this.ARRAY_BUFFER = 0x8892;
        this.COLOR_BUFFER_BIT = 0x4000;
        this.FRAMEBUFFER = 0x8d40;
        this.SCISSOR_TEST = 0x0c11;
        this.STREAM_DRAW = 0x88e0;
        this.TEXTURE_2D = 0x0de1;
        this.FLOAT = 0x1406;
        this.TRIANGLES = 0x0004;
        this.drawArraysCalls = [];
        this.uniform1fCalls = [];
        this.uniform3fCalls = [];
    }

    bindBuffer() {}
    bindFramebuffer() {}
    bindTexture() {}
    bufferData() {}
    bufferSubData() {}
    clear() {}
    clearColor() {}
    disable() {}
    enableVertexAttribArray() {}
    scissor() {}
    useProgram() {}
    vertexAttribPointer() {}
    viewport() {}

    drawArrays(mode, first, count) {
        this.drawArraysCalls.push({ mode, first, count });
    }

    uniform1f(location, value) {
        this.uniform1fCalls.push({ location, value });
    }

    uniform3f(location, red, green, blue) {
        this.uniform3fCalls.push({ location, red, green, blue });
    }

    uniform4f() {}
}

class FakeShaderGL extends FakeBatchGL {
    constructor() {
        super();
        this.VERTEX_SHADER = 0x8b31;
        this.FRAGMENT_SHADER = 0x8b30;
        this.COMPILE_STATUS = 0x8b81;
        this.LINK_STATUS = 0x8b82;
        this.nextId = 1;
        this.programs = [];
        this.shaderSources = [];
        this.deletedPrograms = [];
    }

    attachShader() {}
    compileShader() {}
    deleteShader() {}
    linkProgram() {}

    createProgram() {
        const program = { id: this.nextId++ };
        this.programs.push(program);
        return program;
    }

    createShader(type) {
        return { id: this.nextId++, type };
    }

    deleteProgram(program) {
        this.deletedPrograms.push(program);
    }

    getProgramInfoLog() {
        return null;
    }

    getProgramParameter() {
        return true;
    }

    getShaderInfoLog() {
        return null;
    }

    getShaderParameter() {
        return true;
    }

    getUniformLocation(program, name) {
        return { program, name };
    }

    shaderSource(shader, source) {
        this.shaderSources.push({ shader, source });
    }
}

function fakeProgram() {
    return {
        dispose: () => undefined,
        program: {},
        getAttribLocation: (_gl, name) => ({ a_position: 0, a_texCoord: 1, a_color: 2 })[name] ?? 0,
        getUniformLocation: (_gl, name) => name
    };
}

function fakeImageForTexture(texture) {
    return {
        __getCornerColors: () => null,
        __getTextureResource: () => ({
            ensureTexture: () => texture,
            height: 16,
            width: 16
        })
    };
}

function installPrograms(renderer, gl) {
    const solid = fakeProgram();
    const texture = fakeProgram();
    renderer.gl = gl;
    renderer.normalSolidProgram = solid;
    renderer.normalTextureProgram = texture;
    renderer.solidProgram = solid;
    renderer.textureProgram = texture;
    renderer.buffer = {};
    renderer.initDisplay(64, 64);
}

test("palette programs do not exist or activate on a fresh renderer", () => {
    const renderer = new WebGLRenderer();
    assert.equal(renderer.isMonochromePaletteEnabled(), false);
    assert.equal(renderer.monochromeSolidProgram, null);
    assert.equal(renderer.monochromeTextureProgram, null);
});

test("palette programs compile lazily and unchanged endpoints reuse programs and uniforms", () => {
    const gl = new FakeShaderGL();
    const renderer = new WebGLRenderer();
    const normalSolid = fakeProgram();
    const normalTexture = fakeProgram();
    renderer.gl = gl;
    renderer.normalSolidProgram = normalSolid;
    renderer.normalTextureProgram = normalTexture;
    renderer.solidProgram = normalSolid;
    renderer.textureProgram = normalTexture;

    assert.equal(gl.programs.length, 0);
    renderer.setMonochromePalette(Color.black, Color.white);

    assert.equal(renderer.isMonochromePaletteEnabled(), true);
    assert.equal(gl.programs.length, 2);
    assert.equal(gl.shaderSources.length, 4);
    assert.equal(gl.shaderSources.filter(({ source }) => source.includes("u_paletteBlack")).length, 2);
    assert.equal(gl.uniform3fCalls.length, 4);
    assert.notEqual(renderer.solidProgram, normalSolid);
    assert.notEqual(renderer.textureProgram, normalTexture);
    const cachedPalette = renderer.monochromePalette;

    renderer.clearMonochromePalette();
    assert.equal(renderer.solidProgram, normalSolid);
    assert.equal(renderer.textureProgram, normalTexture);

    renderer.setMonochromePalette(Color.black, Color.white);
    assert.equal(gl.programs.length, 2);
    assert.equal(gl.uniform3fCalls.length, 4);
    assert.equal(renderer.monochromePalette, cachedPalette);

    renderer.setMonochromePalette(Color.red, Color.white);
    assert.equal(gl.programs.length, 2);
    assert.equal(gl.uniform3fCalls.length, 8);
});

test("monochrome palette clamps endpoint RGB channels and ignores endpoint alpha", () => {
    const gl = new FakeShaderGL();
    const renderer = new WebGLRenderer();
    const normalSolid = fakeProgram();
    const normalTexture = fakeProgram();
    renderer.gl = gl;
    renderer.normalSolidProgram = normalSolid;
    renderer.normalTextureProgram = normalTexture;
    renderer.solidProgram = normalSolid;
    renderer.textureProgram = normalTexture;

    renderer.setMonochromePalette(Color.fromFloats(-1, 0.25, Number.NaN, 0), Color.fromFloats(2, 0.5, Number.POSITIVE_INFINITY, 0));

    assert.deepEqual(
        gl.uniform3fCalls.map(({ red, green, blue }) => [red, green, blue]),
        [
            [0, 0.25, 0],
            [1, 0.5, 0],
            [0, 0.25, 0],
            [1, 0.5, 0]
        ]
    );
});

test("enabling and clearing a palette split pending texture batches", () => {
    const gl = new FakeBatchGL();
    const renderer = new WebGLRenderer();
    installPrograms(renderer, gl);
    renderer.monochromeSolidProgram = fakeProgram();
    renderer.monochromeTextureProgram = fakeProgram();

    const texture = {};
    const image = fakeImageForTexture(texture);
    const transform = identityMatrix3();
    renderer.drawImageWarped(image, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 8, 8, 1, null, transform);
    renderer.setMonochromePalette(Color.black, Color.white);
    assert.equal(gl.drawArraysCalls.length, 1);

    renderer.drawImageWarped(image, 8, 0, 16, 0, 16, 8, 8, 8, 0, 0, 8, 8, 1, null, transform);
    renderer.clearMonochromePalette();
    assert.equal(gl.drawArraysCalls.length, 2);
    assert.equal(renderer.isMonochromePaletteEnabled(), false);
});

test("context loss and disposal clear optional palette state and program references", () => {
    const renderer = new WebGLRenderer();
    renderer.setMonochromePalette(Color.black, Color.white);
    assert.equal(renderer.isMonochromePaletteEnabled(), true);
    renderer.handleContextLost();
    assert.equal(renderer.isMonochromePaletteEnabled(), false);
    assert.equal(renderer.monochromePalette, null);
    assert.equal(renderer.monochromeSolidProgram, null);
    assert.equal(renderer.monochromeTextureProgram, null);

    renderer.setMonochromePalette(Color.black, Color.white);
    renderer.dispose();
    assert.equal(renderer.isMonochromePaletteEnabled(), false);
    assert.equal(renderer.monochromePalette, null);
});

test("Graphics monochrome-palette facade controls the active renderer state", () => {
    const renderer = Renderer.getBackend();
    const graphics = new Graphics(32, 16);
    try {
        graphics.setMonochromePalette(Color.black, Color.white);
        assert.equal(graphics.isMonochromePaletteEnabled(), true);
        assert.equal(renderer.isMonochromePaletteEnabled(), true);
    } finally {
        graphics.clearMonochromePalette();
    }
    assert.equal(renderer.isMonochromePaletteEnabled(), false);
});
