import assert from "node:assert/strict";
import { test } from "node:test";
import { Renderer } from "../dist/index.js";
import { identityMatrix3 } from "../dist/slick/rendering/RenderBackend.js";

class FakeGL {
    constructor() {
        this.SCISSOR_TEST = 0x0C11;
        this.scissors = [];
        this.disabled = [];
        this.enabled = [];
        this.viewports = [];
    }

    disable(capability) {
        this.disabled.push(capability);
    }

    enable(capability) {
        this.enabled.push(capability);
    }

    scissor(x, y, width, height) {
        this.scissors.push([x, y, width, height]);
    }

    viewport(x, y, width, height) {
        this.viewports.push([x, y, width, height]);
    }
}

function createRenderer(width = 200, height = 100) {
    const renderer = Renderer.getBackend();
    const gl = new FakeGL();
    renderer.gl = gl;
    renderer.initDisplay(width, height);
    renderer.glLoadIdentity();
    return { gl, renderer };
}

test("WebGLRenderer world clip follows active camera translation", () => {
    const { gl, renderer } = createRenderer();

    renderer.glTranslatef(-20, -10, 0);
    renderer.setWorldClip(30, 25, 40, 20, identityMatrix3());

    assert.deepEqual(gl.scissors.at(-1), [10, 65, 40, 20]);
    assert.equal(gl.enabled.at(-1), gl.SCISSOR_TEST);

    renderer.clearWorldClip();

    assert.equal(gl.disabled.at(-1), gl.SCISSOR_TEST);
});

test("WebGLRenderer world clip follows active scalable-game scale", () => {
    const { gl, renderer } = createRenderer();

    renderer.glScalef(2, 2, 1);
    renderer.setWorldClip(10, 5, 20, 10, identityMatrix3());

    assert.deepEqual(gl.scissors.at(-1), [20, 70, 40, 20]);
    assert.equal(gl.enabled.at(-1), gl.SCISSOR_TEST);
});

test("clearWorldClip preserves an outer scalable-game screen clip", () => {
    const { gl, renderer } = createRenderer();

    renderer.setClip(10, 20, 100, 80);
    renderer.glTranslatef(-20, -10, 0);
    renderer.setWorldClip(30, 25, 40, 20, identityMatrix3());

    assert.deepEqual(gl.scissors.at(-1), [10, 65, 40, 15]);

    renderer.clearWorldClip();

    assert.deepEqual(gl.scissors.at(-1), [10, 0, 100, 80]);
    assert.notEqual(gl.disabled.at(-1), gl.SCISSOR_TEST);
});

test("clearClip leaves a remaining world clip active", () => {
    const { gl, renderer } = createRenderer();

    renderer.setClip(10, 20, 100, 80);
    renderer.glTranslatef(-20, -10, 0);
    renderer.setWorldClip(30, 25, 40, 20, identityMatrix3());
    renderer.clearClip();

    assert.deepEqual(gl.scissors.at(-1), [10, 65, 40, 20]);

    renderer.clearWorldClip();

    assert.equal(gl.disabled.at(-1), gl.SCISSOR_TEST);
});

test("world clip intersects scaled viewport and survives inner clear", () => {
    const { gl, renderer } = createRenderer(300, 200);

    renderer.setClip(30, 20, 240, 180);
    renderer.glTranslatef(30, 20, 0);
    renderer.glScalef(2, 2, 1);
    renderer.glTranslatef(-10, -5, 0);
    renderer.setWorldClip(25, 10, 80, 40, identityMatrix3());

    assert.deepEqual(gl.scissors.at(-1), [60, 90, 160, 80]);

    renderer.clearWorldClip();

    assert.deepEqual(gl.scissors.at(-1), [30, 0, 240, 180]);
});
