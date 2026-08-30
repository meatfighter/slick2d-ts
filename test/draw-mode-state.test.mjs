import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { BufferedScalableGame, Graphics, Renderer } from "../dist/index.js";
import { WebGLRenderer } from "../dist/slick/rendering/WebGLRenderer.js";

class Fake2DContext {
    constructor(canvas) {
        this.canvas = canvas;
    }

    clearRect() {}

    drawImage() {}

    fillText() {}

    putImageData() {}

    getImageData(_x, _y, width, height) {
        return { data: new Uint8ClampedArray(width * height * 4) };
    }

    measureText(text) {
        return { width: text.length * 8 };
    }
}

class FakeCanvas {
    constructor(width = 1, height = 1) {
        this.width = width;
        this.height = height;
    }

    getContext(type) {
        return type === "2d" ? new Fake2DContext(this) : null;
    }
}

class FakeInput {
    addListener() {}

    setScale() {}

    setOffset() {}
}

class FakeWebGLContext {
    constructor(renderer) {
        this.BLEND = renderer.GL_BLEND;
        this.SRC_ALPHA = renderer.GL_SRC_ALPHA;
        this.ONE_MINUS_SRC_ALPHA = renderer.GL_ONE_MINUS_SRC_ALPHA;
        this.FRAMEBUFFER = 0x8d40;
        this.COLOR_BUFFER_BIT = renderer.GL_COLOR_BUFFER_BIT;
        this.SCISSOR_TEST = renderer.GL_SCISSOR_TEST;
        this.blendEnabled = true;
        this.sourceFactor = renderer.GL_SRC_ALPHA;
        this.destinationFactor = renderer.GL_ONE_MINUS_SRC_ALPHA;
        this.colorMaskBits = 0b1111;
        this.clearState = null;
        this.resetCalls();
    }

    resetCalls() {
        this.enableCalls = [];
        this.disableCalls = [];
        this.blendFuncCalls = [];
        this.colorMaskCalls = [];
    }

    enable(id) {
        this.enableCalls.push(id);
        if (id === this.BLEND) {
            this.blendEnabled = true;
        }
    }

    disable(id) {
        this.disableCalls.push(id);
        if (id === this.BLEND) {
            this.blendEnabled = false;
        }
    }

    blendFunc(sourceFactor, destinationFactor) {
        this.blendFuncCalls.push([sourceFactor, destinationFactor]);
        this.sourceFactor = sourceFactor;
        this.destinationFactor = destinationFactor;
    }

    colorMask(red, green, blue, alpha) {
        this.colorMaskCalls.push([red, green, blue, alpha]);
        this.colorMaskBits = (red ? 0b0001 : 0) | (green ? 0b0010 : 0) | (blue ? 0b0100 : 0) | (alpha ? 0b1000 : 0);
    }

    bindFramebuffer() {}

    viewport() {}

    clearColor() {}

    scissor() {}

    clear() {
        this.clearState = {
            blendEnabled: this.blendEnabled,
            sourceFactor: this.sourceFactor,
            destinationFactor: this.destinationFactor,
            colorMaskBits: this.colorMaskBits
        };
    }
}

const originalOffscreenCanvas = globalThis.OffscreenCanvas;
const originalRenderer = Renderer.get();

afterEach(() => {
    Graphics.setCurrent(null);
    Renderer.setRenderer(originalRenderer);
    if (originalOffscreenCanvas === undefined) {
        delete globalThis.OffscreenCanvas;
    } else {
        globalThis.OffscreenCanvas = originalOffscreenCanvas;
    }
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

function addState(renderer) {
    return {
        blendEnabled: true,
        sourceFactor: renderer.GL_ONE,
        destinationFactor: renderer.GL_ONE,
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

test("draw-mode scopes restore exact state and no-op save/restore does not flush", () => {
    const renderer = new WebGLRenderer();
    let flushCalls = 0;
    renderer.flushTextureBatch = () => {
        flushCalls++;
    };

    renderer.glDisable(renderer.GL_BLEND);
    renderer.glBlendFunc(renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR);
    renderer.glColorMask(false, true, false, true);
    const original = rendererDrawModeState(renderer);

    flushCalls = 0;
    renderer.pushDrawModeState();
    renderer.popDrawModeState();
    assert.equal(flushCalls, 0);
    assert.deepEqual(rendererDrawModeState(renderer), original);

    renderer.pushNormalDrawModeState();
    assert.deepEqual(rendererDrawModeState(renderer), normalState(renderer));

    renderer.glBlendFunc(renderer.GL_ONE, renderer.GL_ONE);
    renderer.glColorMask(true, false, true, false);
    const nested = rendererDrawModeState(renderer);

    renderer.pushDrawModeState();
    renderer.glEnable(renderer.GL_BLEND);
    renderer.glBlendFunc(renderer.GL_DST_ALPHA, renderer.GL_ONE_MINUS_DST_ALPHA);
    renderer.glColorMask(false, false, false, true);
    renderer.popDrawModeState();
    assert.deepEqual(rendererDrawModeState(renderer), nested);

    renderer.popDrawModeState();
    assert.deepEqual(rendererDrawModeState(renderer), original);
    assert.throws(() => renderer.popDrawModeState(), /underflow|corruption/i);
});

test("full-color-mask scope preserves blend state and avoids no-op batch boundaries", () => {
    const renderer = new WebGLRenderer();
    const gl = new FakeWebGLContext(renderer);
    renderer.gl = gl;

    let flushCalls = 0;
    renderer.flushTextureBatch = () => {
        flushCalls++;
    };

    renderer.glDisable(renderer.GL_BLEND);
    renderer.glBlendFunc(renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR);
    renderer.glColorMask(false, true, false, true);
    const persistent = rendererDrawModeState(renderer);

    gl.resetCalls();
    flushCalls = 0;
    renderer.pushFullColorMask();
    assert.deepEqual(rendererDrawModeState(renderer), {
        ...persistent,
        colorMaskBits: 0b1111
    });
    assert.equal(flushCalls, 1);
    assert.deepEqual(
        gl.enableCalls.filter((id) => id === renderer.GL_BLEND),
        []
    );
    assert.deepEqual(
        gl.disableCalls.filter((id) => id === renderer.GL_BLEND),
        []
    );
    assert.equal(gl.blendFuncCalls.length, 0);
    assert.equal(gl.colorMaskCalls.length, 1);

    renderer.popColorMask();
    assert.deepEqual(rendererDrawModeState(renderer), persistent);
    assert.equal(flushCalls, 2);
    assert.deepEqual(
        gl.enableCalls.filter((id) => id === renderer.GL_BLEND),
        []
    );
    assert.deepEqual(
        gl.disableCalls.filter((id) => id === renderer.GL_BLEND),
        []
    );
    assert.equal(gl.blendFuncCalls.length, 0);
    assert.equal(gl.colorMaskCalls.length, 2);
    assert.throws(() => renderer.popColorMask(), /underflow/i);

    renderer.glColorMask(true, true, true, true);
    gl.resetCalls();
    flushCalls = 0;
    renderer.pushFullColorMask();
    renderer.popColorMask();
    assert.equal(flushCalls, 0);
    assert.equal(gl.colorMaskCalls.length, 0);
});

test("beginFrame clears every channel without changing persistent blend state", () => {
    const renderer = new WebGLRenderer();
    const gl = new FakeWebGLContext(renderer);
    renderer.gl = gl;

    renderer.glDisable(renderer.GL_BLEND);
    renderer.glBlendFunc(renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR);
    renderer.glColorMask(false, true, false, true);
    const persistent = rendererDrawModeState(renderer);

    gl.resetCalls();
    renderer.beginFrame(320, 240, { r: 0, g: 0, b: 0, a: 1 }, 640, 480);

    assert.deepEqual(gl.clearState, {
        blendEnabled: persistent.blendEnabled,
        sourceFactor: persistent.sourceFactor,
        destinationFactor: persistent.destinationFactor,
        colorMaskBits: 0b1111
    });
    assert.deepEqual(rendererDrawModeState(renderer), persistent);
    assert.deepEqual(
        gl.enableCalls.filter((id) => id === renderer.GL_BLEND),
        []
    );
    assert.deepEqual(
        gl.disableCalls.filter((id) => id === renderer.GL_BLEND),
        []
    );
    assert.equal(gl.blendFuncCalls.length, 0);
    assert.deepEqual(gl.colorMaskCalls, [
        [true, true, true, true],
        [false, true, false, true]
    ]);
});

test("Graphics context switches activate local modes and restore the enclosing exact state", () => {
    const renderer = new WebGLRenderer();
    Renderer.setRenderer(renderer);

    const outerTarget = { width: 320, height: 240 };
    const innerTarget = { width: 64, height: 64 };
    const outer = new Graphics(outerTarget);
    const inner = new Graphics(innerTarget);

    renderer.pushRenderTarget(outerTarget);
    Graphics.setCurrent(outer);
    outer.setDrawMode(Graphics.MODE_ADD);
    assert.deepEqual(rendererDrawModeState(renderer), addState(renderer));

    inner.setDrawMode(Graphics.MODE_SCREEN);
    assert.equal(inner.getDrawMode(), Graphics.MODE_SCREEN);
    assert.deepEqual(rendererDrawModeState(renderer), addState(renderer));

    Graphics.setCurrent(inner);
    assert.deepEqual(rendererDrawModeState(renderer), screenState(renderer));
    Graphics.setCurrent(outer);
    assert.deepEqual(rendererDrawModeState(renderer), addState(renderer));

    let stateDuringInnerDraw = null;
    const originalFillRect = renderer.fillRect.bind(renderer);
    renderer.fillRect = (...args) => {
        stateDuringInnerDraw = rendererDrawModeState(renderer);
        return originalFillRect(...args);
    };

    inner.fillRect(0, 0, 4, 4);
    assert.deepEqual(stateDuringInnerDraw, screenState(renderer));
    assert.deepEqual(rendererDrawModeState(renderer), addState(renderer));
    assert.equal(renderer.getRenderTarget(), outerTarget);
    assert.equal(Graphics.getCurrent(), outer);

    renderer.popRenderTarget();
});

test("Graphics.setCurrent reapplies the selected mode after renderer state tracking resets", () => {
    const renderer = new WebGLRenderer();
    Renderer.setRenderer(renderer);

    const graphics = new Graphics(320, 240);
    Graphics.setCurrent(graphics);
    graphics.setDrawMode(Graphics.MODE_ADD);
    assert.deepEqual(rendererDrawModeState(renderer), addState(renderer));

    renderer.resetDrawModeStateTracking();
    assert.deepEqual(rendererDrawModeState(renderer), normalState(renderer));

    Graphics.setCurrent(graphics);
    assert.deepEqual(rendererDrawModeState(renderer), addState(renderer));
});

test("BufferedScalableGame clears native framebuffer with WebGL clear and avoids redundant setCurrent transitions", async (t) => {
    globalThis.OffscreenCanvas = FakeCanvas;

    const renderer = new WebGLRenderer();
    Renderer.setRenderer(renderer);

    let heldRenderCount = 0;
    let secondHeldRenderStart = null;
    const held = {
        init() {},
        update() {},
        render(_container, graphics) {
            heldRenderCount++;
            if (heldRenderCount === 1) {
                graphics.setDrawMode(Graphics.MODE_ADD);
            } else {
                secondHeldRenderStart = rendererDrawModeState(renderer);
            }
        },
        closeRequested() {
            return false;
        },
        getTitle() {
            return "draw-mode test";
        }
    };

    let overlayState = null;
    class TestBufferedScalableGame extends BufferedScalableGame {
        renderOverlay() {
            overlayState = rendererDrawModeState(renderer);
        }
    }

    const input = new FakeInput();
    const container = {
        getWidth: () => 640,
        getHeight: () => 480,
        getInput: () => input
    };
    const game = new TestBufferedScalableGame(held, 320, 240, true);
    await game.init(container);

    const screenGraphics = new Graphics(640, 480);
    Graphics.setCurrent(screenGraphics);
    screenGraphics.setDrawMode(Graphics.MODE_SCREEN);
    assert.deepEqual(rendererDrawModeState(renderer), screenState(renderer));

    const originalSetCurrent = Graphics.setCurrent;
    let setCurrentCallsDuringRender = 0;
    Graphics.setCurrent = function (current) {
        setCurrentCallsDuringRender++;
        return originalSetCurrent.call(Graphics, current);
    };
    t.after(() => {
        Graphics.setCurrent = originalSetCurrent;
    });

    const nativeClearStates = [];
    const originalGlClear = renderer.glClear;
    renderer.glClear = (mask) => {
        assert.equal(mask, renderer.GL_COLOR_BUFFER_BIT);
        nativeClearStates.push(rendererDrawModeState(renderer));
        return originalGlClear.call(renderer, mask);
    };
    t.after(() => {
        renderer.glClear = originalGlClear;
    });

    let presentationState = null;
    const nativeFrame = game.nativeFrame;
    assert.ok(nativeFrame);
    nativeFrame.draw = () => {
        presentationState = rendererDrawModeState(renderer);
    };

    game.render(container, screenGraphics);
    assert.equal(setCurrentCallsDuringRender, 0);
    assert.deepEqual(nativeClearStates[0], normalState(renderer));
    assert.deepEqual(presentationState, normalState(renderer));
    assert.deepEqual(overlayState, screenState(renderer));
    assert.deepEqual(rendererDrawModeState(renderer), screenState(renderer));
    assert.equal(game.nativeGraphics.getDrawMode(), Graphics.MODE_ADD);

    presentationState = null;
    overlayState = null;
    game.render(container, screenGraphics);
    assert.equal(setCurrentCallsDuringRender, 0);
    assert.deepEqual(nativeClearStates[1], addState(renderer));
    assert.deepEqual(secondHeldRenderStart, addState(renderer));
    assert.deepEqual(presentationState, normalState(renderer));
    assert.deepEqual(overlayState, screenState(renderer));
    assert.deepEqual(rendererDrawModeState(renderer), screenState(renderer));

    nativeFrame.destroy();
});
