import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { BufferedScalableGame, Color, Graphics, Renderer } from "../dist/index.js";

class FakeOffscreenCanvas {
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }

    getContext() {
        return null;
    }
}

class FakeInput {
    constructor() {
        this.listeners = [];
        this.offsets = [];
        this.scales = [];
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    setOffset(x, y) {
        this.offsets.push([x, y]);
    }

    setScale(x, y) {
        this.scales.push([x, y]);
    }
}

function fakeContainer(width, height, input = new FakeInput(), graphics = null) {
    return {
        graphics,
        input,
        height,
        width,
        getGraphics() {
            return this.graphics;
        },
        getHeight() {
            return this.height;
        },
        getInput() {
            return this.input;
        },
        getWidth() {
            return this.width;
        }
    };
}

function fakeGame(overrides = {}) {
    return {
        closeRequested: () => false,
        getTitle: () => "held",
        init: () => undefined,
        render: () => undefined,
        update: () => undefined,
        ...overrides
    };
}

function installOffscreenCanvas() {
    Object.defineProperty(globalThis, "OffscreenCanvas", {
        configurable: true,
        value: FakeOffscreenCanvas,
        writable: true
    });
}

function restoreRendererMethods(renderer, originals) {
    for (const [name, method] of Object.entries(originals)) {
        renderer[name] = method;
    }
}

afterEach(() => {
    delete globalThis.OffscreenCanvas;
    Graphics.setCurrent(null);
});

test("BufferedScalableGame scales source rectangles and maps input into source coordinates", async () => {
    installOffscreenCanvas();
    const input = new FakeInput();
    const container = fakeContainer(800, 600, input);
    const game = new BufferedScalableGame(fakeGame(), 320, 240, {
        maintainAspect: true,
        sourceHeight: 120,
        sourceWidth: 160,
        sourceX: 16,
        sourceY: 8
    });

    await game.init(container);

    assert.equal(game.targetWidth, 800);
    assert.equal(game.targetHeight, 600);
    assert.equal(game.xoffset, 0);
    assert.equal(game.yoffset, 0);
    assert.deepEqual(input.scales.at(-1), [0.2, 0.2]);
    assert.deepEqual(input.offsets.at(-1), [16, 8]);

    game.setSourceRectangle(16, 8, 80, 120);

    assert.equal(game.targetWidth, 400);
    assert.equal(game.targetHeight, 600);
    assert.equal(game.xoffset, 200);
    assert.equal(game.yoffset, 0);
    assert.deepEqual(input.scales.at(-1), [0.2, 0.2]);
    assert.deepEqual(input.offsets.at(-1), [-24, 8]);

    container.width = 500;
    game.containerSizeChanged(container);

    assert.equal(game.targetWidth, 400);
    assert.equal(game.targetHeight, 600);
    assert.equal(game.xoffset, 50);
    assert.deepEqual(input.offsets.at(-1), [6, 8]);
});

test("BufferedScalableGame validates source rectangles against the native frame", () => {
    assert.throws(() => new BufferedScalableGame(fakeGame(), 320, 240, { sourceWidth: 321 }), RangeError);
    assert.throws(() => new BufferedScalableGame(fakeGame(), 320, 240, { sourceHeight: 0 }), RangeError);
});

test("BufferedScalableGame renders into the native target before the presentation blit", async () => {
    installOffscreenCanvas();
    const input = new FakeInput();
    const screenGraphics = new Graphics(800, 600);
    screenGraphics.setBackground(Color.blue);
    const container = fakeContainer(800, 600, input, screenGraphics);
    const renderer = Renderer.getBackend();
    const calls = [];
    const drawCalls = [];
    const fillCalls = [];
    const targetStack = [];
    let activeTarget = null;
    const originals = {};
    for (const name of [
        "clearClip",
        "clearWorldClip",
        "drawImage",
        "fillRect",
        "flush",
        "getRenderTarget",
        "glLoadIdentity",
        "popGlobalColorEffects",
        "popRenderTarget",
        "popTransform",
        "pushGlobalColorEffectsDisabled",
        "pushRenderTarget",
        "pushTransform",
        "setClip",
        "setRenderTarget"
    ]) {
        originals[name] = renderer[name];
    }

    renderer.clearClip = () => calls.push(["clearClip", activeTarget]);
    renderer.clearWorldClip = () => calls.push(["clearWorldClip", activeTarget]);
    renderer.drawImage = (...args) => {
        drawCalls.push({ args, target: activeTarget });
        calls.push(["drawImage", activeTarget]);
    };
    renderer.fillRect = (...args) => {
        fillCalls.push({ args, target: activeTarget });
        calls.push(["fillRect", activeTarget]);
    };
    renderer.flush = () => calls.push(["flush", activeTarget]);
    renderer.getRenderTarget = () => activeTarget;
    renderer.glLoadIdentity = () => calls.push(["loadIdentity", activeTarget]);
    renderer.popGlobalColorEffects = () => calls.push(["popEffects", activeTarget]);
    renderer.popRenderTarget = () => {
        calls.push(["popTarget", activeTarget]);
        activeTarget = targetStack.pop() ?? null;
    };
    renderer.popTransform = () => calls.push(["popTransform", activeTarget]);
    renderer.pushGlobalColorEffectsDisabled = () => calls.push(["pushEffects", activeTarget]);
    renderer.pushRenderTarget = (target) => {
        targetStack.push(activeTarget);
        activeTarget = target;
        calls.push(["pushTarget", activeTarget]);
    };
    renderer.pushTransform = () => calls.push(["pushTransform", activeTarget]);
    renderer.setClip = (x, y, width, height) => calls.push(["setClip", activeTarget, x, y, width, height]);
    renderer.setRenderTarget = (target) => {
        activeTarget = target;
        calls.push(["setTarget", activeTarget]);
    };

    const held = fakeGame({
        render: (heldContainer, g) => {
            assert.equal(Graphics.getCurrent(), g);
            heldContainer.getGraphics().fillRect(9, 10, 11, 12);
            assert.equal(Graphics.getCurrent(), g);
            g.fillRect(1, 2, 3, 4);
            assert.equal(Graphics.getCurrent(), g);
        }
    });
    const game = new BufferedScalableGame(held, 320, 240, {
        maintainAspect: true,
        sourceHeight: 120,
        sourceWidth: 160,
        sourceX: 16,
        sourceY: 8
    });

    try {
        await game.init(container);
        Graphics.setCurrent(screenGraphics);
        game.render(container, screenGraphics);

        assert.equal(activeTarget, null);
        assert.equal(Graphics.getCurrent(), screenGraphics);
        assert.equal(targetStack.length, 0);
        assert.ok(fillCalls.length >= 3);
        const nativeClearFill = fillCalls[0];
        const screenFill = fillCalls.find(({ args }) => args[0] === 9);
        const nativeHeldFill = fillCalls.find(({ args }) => args[0] === 1);
        assert.notEqual(nativeClearFill.target, null);
        assert.equal(screenFill?.target, null);
        assert.equal(nativeHeldFill?.target, nativeClearFill.target);
        assert.equal(drawCalls.length, 1);
        assert.equal(drawCalls[0].target, null);
        assert.deepEqual(drawCalls[0].args.slice(1, 10), [0, 0, 800, 600, 16, 128, 160, -120, 1]);
        assert.ok(calls.findIndex(([name]) => name === "pushEffects") < calls.findIndex(([name]) => name === "drawImage"));
        assert.ok(calls.findIndex(([name]) => name === "drawImage") < calls.findIndex(([name]) => name === "popEffects"));
    } finally {
        restoreRendererMethods(renderer, originals);
    }
});
