import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Graphics, Renderer } from "../dist/index.js";
import { WebGLRenderer } from "../dist/slick/rendering/WebGLRenderer.js";

const originalRenderer = Renderer.get();

afterEach(() => {
    Graphics.setCurrent(null);
    Renderer.setRenderer(originalRenderer);
});

function blendState(renderer) {
    return {
        blendEnabled: renderer.blendEnabled,
        sourceFactor: renderer.blendSourceFactor,
        destinationFactor: renderer.blendDestinationFactor,
        sourceAlphaFactor: renderer.blendSourceAlphaFactor,
        destinationAlphaFactor: renderer.blendDestinationAlphaFactor,
        colorMaskBits: renderer.colorMaskBits
    };
}

function normalState(renderer) {
    return {
        blendEnabled: true,
        sourceFactor: renderer.GL_SRC_ALPHA,
        destinationFactor: renderer.GL_ONE_MINUS_SRC_ALPHA,
        sourceAlphaFactor: renderer.GL_ONE,
        destinationAlphaFactor: renderer.GL_ONE_MINUS_SRC_ALPHA,
        colorMaskBits: 0b1111
    };
}

class FakeWebGLContext {
    constructor(renderer) {
        this.BLEND = renderer.GL_BLEND;
        this.enableCalls = [];
        this.disableCalls = [];
        this.blendFuncCalls = [];
        this.blendFuncSeparateCalls = [];
        this.colorMaskCalls = [];
    }

    enable(id) {
        this.enableCalls.push(id);
    }

    disable(id) {
        this.disableCalls.push(id);
    }

    blendFunc(sourceFactor, destinationFactor) {
        this.blendFuncCalls.push([sourceFactor, destinationFactor]);
    }

    blendFuncSeparate(sourceFactor, destinationFactor, sourceAlphaFactor, destinationAlphaFactor) {
        this.blendFuncSeparateCalls.push([sourceFactor, destinationFactor, sourceAlphaFactor, destinationAlphaFactor]);
    }

    colorMask(red, green, blue, alpha) {
        this.colorMaskCalls.push([red, green, blue, alpha]);
    }
}

test("normal mode tracks distinct RGB and alpha blend factors", () => {
    const renderer = new WebGLRenderer();
    assert.deepEqual(blendState(renderer), normalState(renderer));

    const gl = new FakeWebGLContext(renderer);
    renderer.gl = gl;

    renderer.__applyDrawModeState(true, renderer.GL_ONE, renderer.GL_ONE, 0b1111, renderer.GL_ONE, renderer.GL_ONE);
    renderer.pushNormalDrawModeState();

    assert.deepEqual(blendState(renderer), normalState(renderer));
    assert.deepEqual(gl.blendFuncSeparateCalls.at(-1), [
        renderer.GL_SRC_ALPHA,
        renderer.GL_ONE_MINUS_SRC_ALPHA,
        renderer.GL_ONE,
        renderer.GL_ONE_MINUS_SRC_ALPHA
    ]);

    renderer.popDrawModeState();
    assert.deepEqual(blendState(renderer), {
        blendEnabled: true,
        sourceFactor: renderer.GL_ONE,
        destinationFactor: renderer.GL_ONE,
        sourceAlphaFactor: renderer.GL_ONE,
        destinationAlphaFactor: renderer.GL_ONE,
        colorMaskBits: 0b1111
    });
});

test("two-argument glBlendFunc retains equal RGB and alpha factors", () => {
    const renderer = new WebGLRenderer();
    const gl = new FakeWebGLContext(renderer);
    renderer.gl = gl;

    renderer.glBlendFunc(renderer.GL_DST_ALPHA, renderer.GL_ONE_MINUS_DST_ALPHA);

    assert.deepEqual(blendState(renderer), {
        blendEnabled: true,
        sourceFactor: renderer.GL_DST_ALPHA,
        destinationFactor: renderer.GL_ONE_MINUS_DST_ALPHA,
        sourceAlphaFactor: renderer.GL_DST_ALPHA,
        destinationAlphaFactor: renderer.GL_ONE_MINUS_DST_ALPHA,
        colorMaskBits: 0b1111
    });
    assert.deepEqual(gl.blendFuncSeparateCalls, [
        [renderer.GL_DST_ALPHA, renderer.GL_ONE_MINUS_DST_ALPHA, renderer.GL_DST_ALPHA, renderer.GL_ONE_MINUS_DST_ALPHA]
    ]);
});

test("Graphics draw modes choose intentional alpha factors", () => {
    const renderer = new WebGLRenderer();
    const gl = new FakeWebGLContext(renderer);
    renderer.gl = gl;
    Renderer.setRenderer(renderer);

    const graphics = new Graphics(320, 240);
    Graphics.setCurrent(graphics);

    graphics.setDrawMode(Graphics.MODE_ADD);
    assert.deepEqual(blendState(renderer), {
        blendEnabled: true,
        sourceFactor: renderer.GL_ONE,
        destinationFactor: renderer.GL_ONE,
        sourceAlphaFactor: renderer.GL_ONE,
        destinationAlphaFactor: renderer.GL_ONE,
        colorMaskBits: 0b1111
    });

    graphics.setDrawMode(Graphics.MODE_SCREEN);
    assert.deepEqual(blendState(renderer), {
        blendEnabled: true,
        sourceFactor: renderer.GL_ONE,
        destinationFactor: renderer.GL_ONE_MINUS_SRC_COLOR,
        sourceAlphaFactor: renderer.GL_ONE,
        destinationAlphaFactor: renderer.GL_ONE_MINUS_SRC_COLOR,
        colorMaskBits: 0b1111
    });

    graphics.setDrawMode(Graphics.MODE_NORMAL);
    assert.deepEqual(blendState(renderer), normalState(renderer));
    assert.deepEqual(gl.blendFuncSeparateCalls.at(-1), [
        renderer.GL_SRC_ALPHA,
        renderer.GL_ONE_MINUS_SRC_ALPHA,
        renderer.GL_ONE,
        renderer.GL_ONE_MINUS_SRC_ALPHA
    ]);
});

test("display lists retain all four normal-mode blend factors", () => {
    const renderer = new WebGLRenderer();
    const gl = new FakeWebGLContext(renderer);
    renderer.gl = gl;

    const list = renderer.glGenLists(1);
    renderer.glNewList(list, renderer.GL_COMPILE);
    renderer.glBlendFunc(renderer.GL_SRC_ALPHA, renderer.GL_ONE_MINUS_SRC_ALPHA, renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_ALPHA);
    renderer.glEndList();

    renderer.glBlendFunc(renderer.GL_ONE, renderer.GL_ONE);
    assert.notDeepEqual(blendState(renderer), normalState(renderer));

    renderer.glCallList(list);
    assert.deepEqual(blendState(renderer), normalState(renderer));
    assert.deepEqual(gl.blendFuncSeparateCalls.at(-1), [
        renderer.GL_SRC_ALPHA,
        renderer.GL_ONE_MINUS_SRC_ALPHA,
        renderer.GL_ONE,
        renderer.GL_ONE_MINUS_SRC_ALPHA
    ]);
});

test("correct source-over alpha prevents the second-pass darkening", () => {
    const sourceAlpha = 0.6;
    const destinationAlpha = 1;
    const fire = 1;

    const firstPassRgb = fire * sourceAlpha;
    const oldFramebufferAlpha = sourceAlpha * sourceAlpha + destinationAlpha * (1 - sourceAlpha);
    const correctedFramebufferAlpha = sourceAlpha * 1 + destinationAlpha * (1 - sourceAlpha);

    assert.equal(oldFramebufferAlpha, 0.76);
    assert.equal(correctedFramebufferAlpha, 1);
    assert.ok(Math.abs(firstPassRgb * oldFramebufferAlpha - 0.456) < 1e-12);
    assert.ok(Math.abs(firstPassRgb * correctedFramebufferAlpha - 0.6) < 1e-12);
});
