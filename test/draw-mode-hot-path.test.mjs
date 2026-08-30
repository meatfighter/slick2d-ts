import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Graphics, Renderer } from "../dist/index.js";
import { WebGLRenderer } from "../dist/slick/rendering/WebGLRenderer.js";

const originalRenderer = Renderer.get();

afterEach(() => {
    Graphics.setCurrent(null);
    Renderer.setRenderer(originalRenderer);
});

function rendererDrawModeState(renderer) {
    return {
        blendEnabled: renderer.blendEnabled,
        sourceFactor: renderer.blendSourceFactor,
        destinationFactor: renderer.blendDestinationFactor,
        colorMaskBits: renderer.colorMaskBits
    };
}

function normalState(renderer) {
    return {
        blendEnabled: true,
        sourceFactor: renderer.GL_SRC_ALPHA,
        destinationFactor: renderer.GL_ONE_MINUS_SRC_ALPHA,
        colorMaskBits: 0b1111
    };
}

function screenState(renderer) {
    return {
        blendEnabled: true,
        sourceFactor: renderer.GL_ONE,
        destinationFactor: renderer.GL_ONE_MINUS_SRC_COLOR,
        colorMaskBits: 0b1111
    };
}

class FakeWebGLContext {
    constructor(renderer) {
        this.BLEND = renderer.GL_BLEND;
        this.blendFuncCalls = [];
        this.colorMaskCalls = [];
        this.enableCalls = [];
        this.disableCalls = [];
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

    colorMask(red, green, blue, alpha) {
        this.colorMaskCalls.push([red, green, blue, alpha]);
    }
}

test("same-current Graphics primitives bypass renderer and GPU state machinery", () => {
    const renderer = new WebGLRenderer();
    Renderer.setRenderer(renderer);

    const target = { width: 320, height: 240 };
    const graphics = new Graphics(target);
    renderer.pushRenderTarget(target);
    Graphics.setCurrent(graphics);

    const originals = {
        pushRenderTarget: renderer.pushRenderTarget.bind(renderer),
        popRenderTarget: renderer.popRenderTarget.bind(renderer),
        setRenderTarget: renderer.setRenderTarget.bind(renderer),
        pushDrawModeState: renderer.pushDrawModeState.bind(renderer),
        popDrawModeState: renderer.popDrawModeState.bind(renderer),
        __applyDrawModeState: renderer.__applyDrawModeState.bind(renderer),
        flushTextureBatch: renderer.flushTextureBatch.bind(renderer),
        clearClip: renderer.clearClip.bind(renderer),
        clearWorldClip: renderer.clearWorldClip.bind(renderer),
        setClip: renderer.setClip.bind(renderer),
        setWorldClip: renderer.setWorldClip.bind(renderer)
    };
    const calls = {
        pushRenderTarget: 0,
        popRenderTarget: 0,
        setRenderTarget: 0,
        pushDrawModeState: 0,
        popDrawModeState: 0,
        __applyDrawModeState: 0,
        flushTextureBatch: 0,
        clearClip: 0,
        clearWorldClip: 0,
        setClip: 0,
        setWorldClip: 0
    };

    for (const name of Object.keys(calls)) {
        renderer[name] = (...args) => {
            calls[name]++;
            return originals[name](...args);
        };
    }
    renderer.fillRect = () => {};

    for (let index = 0; index < 1000; index++) {
        graphics.fillRect(0, 0, 1, 1);
    }

    assert.deepEqual(calls, {
        pushRenderTarget: 0,
        popRenderTarget: 0,
        setRenderTarget: 0,
        pushDrawModeState: 0,
        popDrawModeState: 0,
        __applyDrawModeState: 0,
        flushTextureBatch: 0,
        clearClip: 0,
        clearWorldClip: 0,
        setClip: 0,
        setWorldClip: 0
    });
    assert.equal(graphics.renderContextFastPathStack.length, 0);
    assert.equal(Graphics.currentStack.length, 0);
    assert.equal(Graphics.getCurrent(), graphics);
    assert.equal(renderer.getRenderTarget(), target);

    originals.popRenderTarget();
});

test("normal-mode context activation is a cached renderer no-op", () => {
    const renderer = new WebGLRenderer();
    const gl = new FakeWebGLContext(renderer);
    renderer.gl = gl;
    Renderer.setRenderer(renderer);

    let flushCalls = 0;
    const originalFlush = renderer.flushTextureBatch.bind(renderer);
    renderer.flushTextureBatch = (...args) => {
        flushCalls++;
        return originalFlush(...args);
    };

    Graphics.setCurrent(new Graphics(320, 240));

    assert.equal(flushCalls, 0);
    assert.deepEqual(gl.enableCalls, []);
    assert.deepEqual(gl.disableCalls, []);
    assert.deepEqual(gl.blendFuncCalls, []);
    assert.deepEqual(gl.colorMaskCalls, []);
});

test("fast-path markers remain correct across cross-Graphics reentrancy", () => {
    const renderer = new WebGLRenderer();
    Renderer.setRenderer(renderer);

    const targetA = { width: 320, height: 240 };
    const targetB = { width: 64, height: 64 };
    const graphicsA = new Graphics(targetA);
    const graphicsB = new Graphics(targetB);

    renderer.pushRenderTarget(targetA);
    Graphics.setCurrent(graphicsA);

    graphicsA.__beginRenderContext();
    graphicsB.__beginRenderContext();
    graphicsA.__beginRenderContext();

    assert.equal(Graphics.getCurrent(), graphicsA);
    assert.equal(renderer.getRenderTarget(), targetA);

    graphicsA.__endRenderContext();
    assert.equal(Graphics.getCurrent(), graphicsB);
    assert.equal(renderer.getRenderTarget(), targetB);

    graphicsB.__endRenderContext();
    assert.equal(Graphics.getCurrent(), graphicsA);
    assert.equal(renderer.getRenderTarget(), targetA);

    graphicsA.__endRenderContext();
    assert.equal(Graphics.getCurrent(), graphicsA);
    assert.equal(renderer.getRenderTarget(), targetA);
    assert.equal(graphicsA.renderContextFastPathStack.length, 0);
    assert.equal(graphicsB.renderContextFastPathStack.length, 0);

    renderer.popRenderTarget();
});

test("internal Graphics activation bypasses public display-list-aware GL methods", () => {
    const renderer = new WebGLRenderer();
    Renderer.setRenderer(renderer);

    const outer = new Graphics(320, 240);
    const inner = new Graphics({ width: 64, height: 64 });
    outer.drawMode = Graphics.MODE_ADD;
    inner.drawMode = Graphics.MODE_SCREEN;

    Graphics.setCurrent(outer);

    const publicCalls = {
        enable: 0,
        disable: 0,
        blend: 0,
        mask: 0
    };
    const originalEnable = renderer.glEnable.bind(renderer);
    const originalDisable = renderer.glDisable.bind(renderer);
    const originalBlend = renderer.glBlendFunc.bind(renderer);
    const originalMask = renderer.glColorMask.bind(renderer);

    renderer.glEnable = (...args) => {
        publicCalls.enable++;
        return originalEnable(...args);
    };
    renderer.glDisable = (...args) => {
        publicCalls.disable++;
        return originalDisable(...args);
    };
    renderer.glBlendFunc = (...args) => {
        publicCalls.blend++;
        return originalBlend(...args);
    };
    renderer.glColorMask = (...args) => {
        publicCalls.mask++;
        return originalMask(...args);
    };
    renderer.fillRect = () => {};

    Graphics.setCurrent(inner);
    assert.deepEqual(rendererDrawModeState(renderer), screenState(renderer));
    Graphics.setCurrent(outer);

    inner.fillRect(0, 0, 4, 4);
    assert.deepEqual(rendererDrawModeState(renderer), {
        blendEnabled: true,
        sourceFactor: renderer.GL_ONE,
        destinationFactor: renderer.GL_ONE,
        colorMaskBits: 0b1111
    });
    assert.deepEqual(publicCalls, {
        enable: 0,
        disable: 0,
        blend: 0,
        mask: 0
    });

    inner.setDrawMode(Graphics.MODE_NORMAL);
    assert.equal(publicCalls.enable, 1);
    assert.equal(publicCalls.disable, 0);
    assert.equal(publicCalls.blend, 1);
    assert.equal(publicCalls.mask, 1);
});

test("internal alpha-map activation preserves the tracked blend function", () => {
    const renderer = new WebGLRenderer();
    Renderer.setRenderer(renderer);

    renderer.__applyDrawModeState(true, renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR, 0b1111);

    const alphaMap = new Graphics(320, 240);
    alphaMap.drawMode = Graphics.MODE_ALPHA_MAP;
    Graphics.setCurrent(alphaMap);

    assert.deepEqual(rendererDrawModeState(renderer), {
        blendEnabled: false,
        sourceFactor: renderer.GL_ONE,
        destinationFactor: renderer.GL_ONE_MINUS_SRC_COLOR,
        colorMaskBits: 0b1000
    });
});

test("setDrawMode skips the old stored mode during a temporary context switch", () => {
    const renderer = new WebGLRenderer();
    const gl = new FakeWebGLContext(renderer);
    renderer.gl = gl;
    Renderer.setRenderer(renderer);

    const outer = new Graphics(320, 240);
    const inner = new Graphics(320, 240);
    Graphics.setCurrent(outer);

    inner.drawMode = Graphics.MODE_ADD;
    inner.setDrawMode(Graphics.MODE_SCREEN);

    assert.deepEqual(gl.blendFuncCalls, [
        [renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR],
        [renderer.GL_SRC_ALPHA, renderer.GL_ONE_MINUS_SRC_ALPHA]
    ]);
    assert.ok(!gl.blendFuncCalls.some(([source, destination]) => source === renderer.GL_ONE && destination === renderer.GL_ONE));
    assert.deepEqual(rendererDrawModeState(renderer), normalState(renderer));
});
