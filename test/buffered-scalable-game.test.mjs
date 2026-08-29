import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { BufferedScalableGame, Color, Graphics, Image, Renderer } from "../dist/index.js";
import { WebGLRenderer } from "../dist/slick/rendering/WebGLRenderer.js";

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
    assert.throws(() => new BufferedScalableGame(fakeGame(), 0, 240), RangeError);
    assert.throws(() => new BufferedScalableGame(fakeGame(), 320.5, 240), RangeError);
    assert.throws(() => new BufferedScalableGame(fakeGame(), 320, 240, { sourceX: Number.NaN }), RangeError);
    assert.throws(() => new BufferedScalableGame(fakeGame(), 320, 240, { sourceWidth: Number.POSITIVE_INFINITY }), RangeError);
});

test("BufferedScalableGame rejects source rectangle updates before mutating state", async () => {
    installOffscreenCanvas();
    const game = new BufferedScalableGame(fakeGame(), 320, 240, {
        sourceHeight: 120,
        sourceWidth: 160,
        sourceX: 16,
        sourceY: 8
    });

    await game.init(fakeContainer(800, 600));

    assert.throws(() => game.setSourceRectangle(300, 0, 32, 32), RangeError);
    assert.equal(game.sourceX, 16);
    assert.equal(game.sourceY, 8);
    assert.equal(game.sourceWidth, 160);
    assert.equal(game.sourceHeight, 120);
});

test("BufferedScalableGame releases the previous native frame during reinit", async () => {
    installOffscreenCanvas();
    let initCalls = 0;
    const game = new BufferedScalableGame(
        fakeGame({
            init: () => {
                initCalls++;
            }
        }),
        320,
        240
    );
    const container = fakeContainer(640, 480);

    await game.init(container);
    const firstNativeFrame = game.nativeFrame;
    assert.ok(firstNativeFrame instanceof Image);

    let destroyCalls = 0;
    const originalDestroy = firstNativeFrame.destroy.bind(firstNativeFrame);
    firstNativeFrame.destroy = () => {
        destroyCalls++;
        originalDestroy();
    };

    await game.init(container);

    assert.equal(destroyCalls, 1);
    assert.notEqual(game.nativeFrame, firstNativeFrame);
    assert.equal(initCalls, 2);
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

test("BufferedScalableGame preserves caller display clip state during presentation", async () => {
    installOffscreenCanvas();
    const screenGraphics = new Graphics(800, 600);
    const container = fakeContainer(800, 600, new FakeInput(), screenGraphics);
    const game = new BufferedScalableGame(fakeGame(), 320, 240, true);

    await game.init(container);

    Graphics.setCurrent(screenGraphics);
    screenGraphics.setClip(7, 8, 500, 300);
    screenGraphics.setWorldClip(11, 12, 200, 100);

    game.render(container, screenGraphics);

    assert.deepEqual(screenGraphics.getClip(), { x: 7, y: 8, width: 500, height: 300 });
    assert.deepEqual(screenGraphics.getWorldClip(), { x: 11, y: 12, width: 200, height: 100 });
});

test("display Graphics used inside an offscreen scope restores target, current Graphics, and clips", () => {
    const previousRenderer = Renderer.get();
    const renderer = new WebGLRenderer();
    Renderer.setRenderer(renderer);

    try {
        const nativeTarget = { width: 320, height: 240 };
        const nativeGraphics = new Graphics(nativeTarget);
        const displayGraphics = new Graphics(1280, 720);

        renderer.pushRenderTarget(nativeTarget);
        Graphics.setCurrent(nativeGraphics);

        nativeGraphics.setClip(1, 2, 300, 200);
        nativeGraphics.setWorldClip(3, 4, 100, 80);

        displayGraphics.fillRect(0, 0, 10, 10);

        assert.equal(renderer.getRenderTarget(), nativeTarget);
        assert.equal(Graphics.getCurrent(), nativeGraphics);
        assert.deepEqual(renderer.screenClip, { x: 1, y: 2, width: 300, height: 200 });
        assert.deepEqual(renderer.worldClip, { x: 3, y: 4, width: 100, height: 80 });

        renderer.popRenderTarget();
    } finally {
        Graphics.setCurrent(null);
        Renderer.setRenderer(previousRenderer);
    }
});

test("render-target scopes restore nested targets and reject underflow", () => {
    const renderer = new WebGLRenderer();
    const outerTarget = { width: 320, height: 240 };
    const innerTarget = { width: 64, height: 64 };

    assert.equal(renderer.getRenderTarget(), null);
    renderer.pushRenderTarget(outerTarget);
    assert.equal(renderer.getRenderTarget(), outerTarget);
    renderer.pushRenderTarget(innerTarget);
    assert.equal(renderer.getRenderTarget(), innerTarget);
    renderer.popRenderTarget();
    assert.equal(renderer.getRenderTarget(), outerTarget);
    renderer.popRenderTarget();
    assert.equal(renderer.getRenderTarget(), null);
    assert.throws(() => renderer.popRenderTarget(), /underflow/i);
});

test("global color-effect scopes disable presentation effects and restore exact prior state", () => {
    const renderer = new WebGLRenderer();

    renderer.setColorInverted(true);
    renderer.setMonochromePalette(Color.black, Color.white);
    const originalPalette = renderer.monochromePalette;

    renderer.pushGlobalColorEffectsDisabled();
    assert.equal(renderer.isColorInverted(), false);
    assert.equal(renderer.isMonochromePaletteEnabled(), false);

    renderer.setColorInverted(true);
    renderer.setMonochromePalette(Color.red, Color.white);
    assert.notEqual(renderer.monochromePalette, originalPalette);

    renderer.popGlobalColorEffects();
    assert.equal(renderer.isColorInverted(), true);
    assert.equal(renderer.isMonochromePaletteEnabled(), true);
    assert.equal(renderer.monochromePalette, originalPalette);
    assert.throws(() => renderer.popGlobalColorEffects(), /underflow/i);
});

test("nested Graphics operations restore the enclosing render target, current Graphics, and clip state", () => {
    const renderer = new WebGLRenderer();
    Renderer.setRenderer(renderer);

    const outerTarget = { width: 320, height: 240 };
    const innerTarget = { width: 64, height: 64 };
    const outer = new Graphics(outerTarget);
    const inner = new Graphics(innerTarget);

    Graphics.setCurrent(outer);
    outer.setClip(1, 2, 30, 40);
    outer.setWorldClip(3, 4, 20, 10);

    renderer.pushRenderTarget(outerTarget);
    inner.setClip(5, 6, 7, 8);

    assert.equal(renderer.getRenderTarget(), outerTarget);
    assert.equal(Graphics.getCurrent(), outer);
    assert.deepEqual(renderer.screenClip, { x: 1, y: 2, width: 30, height: 40 });
    assert.deepEqual(renderer.worldClip, { x: 3, y: 4, width: 20, height: 10 });

    renderer.popRenderTarget();
});

test("destroying a writable Image disposes its framebuffer and texture resource exactly once", () => {
    installOffscreenCanvas();

    const image = new Image(16, 8, Image.FILTER_NEAREST);
    const renderTarget = image.__getRenderTarget();
    const textureResource = image.__getTextureResource();
    assert.ok(renderTarget);
    assert.ok(textureResource);

    let renderTargetDisposeCalls = 0;
    let textureDisposeCalls = 0;
    const originalTargetDispose = renderTarget.dispose.bind(renderTarget);
    const originalTextureDispose = textureResource.dispose.bind(textureResource);

    renderTarget.dispose = (gl) => {
        renderTargetDisposeCalls++;
        originalTargetDispose(gl);
    };
    textureResource.dispose = (gl) => {
        textureDisposeCalls++;
        originalTextureDispose(gl);
    };

    image.destroy();
    image.destroy();

    assert.equal(renderTargetDisposeCalls, 1);
    assert.equal(textureDisposeCalls, 1);
    assert.equal(image.isDestroyed(), true);
    assert.equal(image.__getRenderTarget(), null);
    assert.equal(image.__getTextureResource(), null);
    assert.throws(() => image.getGraphics(), /destroyed/i);
});
