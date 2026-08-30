import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { BufferedScalableGame, BufferedScalingMode, Color, Graphics, Image, Renderer } from "../dist/index.js";
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

function fakeContainer(width, height, input = new FakeInput(), graphics = null, backingWidth = null, backingHeight = null) {
    return {
        backingHeight,
        backingWidth,
        graphics,
        input,
        height,
        width,
        getBackingHeight() {
            return this.backingHeight ?? this.height;
        },
        getBackingWidth() {
            return this.backingWidth ?? this.width;
        },
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

function assertClose(actual, expected) {
    assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${actual} to be within tolerance of ${expected}`);
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

test("BufferedScalableGame defaults to nearest scaling and reports presentation info", async () => {
    installOffscreenCanvas();
    const input = new FakeInput();
    const container = fakeContainer(800, 600, input);
    const game = new BufferedScalableGame(fakeGame(), 320, 240, true);

    await game.init(container);

    assert.equal(game.getScalingMode(), BufferedScalingMode.Nearest);
    assert.equal(game.nativeFrame.getFilter(), Image.FILTER_NEAREST);
    assert.deepEqual(game.getPresentationInfo(), {
        filter: Image.FILTER_NEAREST,
        integerScale: null,
        logicalHeight: 600,
        logicalWidth: 800,
        logicalX: 0,
        logicalY: 0,
        physicalHeight: 600,
        physicalWidth: 800,
        physicalX: 0,
        physicalY: 0,
        scaleX: 2.5,
        scaleY: 2.5,
        scalingMode: BufferedScalingMode.Nearest
    });
    assert.equal(Object.isFrozen(game.getPresentationInfo()), true);
    assert.deepEqual(input.scales.at(-1), [0.4, 0.4]);
    assert.deepEqual(input.offsets.at(-1), [0, 0]);
});

test("BufferedScalableGame linear mode uses linear presentation filtering and snapped physical geometry", async () => {
    installOffscreenCanvas();
    const input = new FakeInput();
    const container = fakeContainer(501, 400, input, null, 751, 600);
    const game = new BufferedScalableGame(fakeGame(), 320, 240, {
        maintainAspect: true,
        scalingMode: BufferedScalingMode.Linear
    });

    await game.init(container);

    const info = game.getPresentationInfo();
    assert.equal(game.nativeFrame.getFilter(), Image.FILTER_LINEAR);
    assert.equal(info.filter, Image.FILTER_LINEAR);
    assert.equal(info.physicalX, 0);
    assert.equal(info.physicalY, 18);
    assert.equal(info.physicalWidth, 751);
    assert.equal(info.physicalHeight, 564);
    assert.equal(info.integerScale, null);
    assert.equal(info.scalingMode, BufferedScalingMode.Linear);
    assertClose(info.logicalX, 0);
    assertClose(info.logicalY, 12);
    assertClose(info.logicalWidth, 501);
    assertClose(info.logicalHeight, 376);
});

test("BufferedScalableGame integer mode uses source rectangle dimensions and matching input mapping", async () => {
    installOffscreenCanvas();
    const input = new FakeInput();
    const container = fakeContainer(700, 500, input, null, 1400, 1000);
    const game = new BufferedScalableGame(fakeGame(), 320, 240, {
        maintainAspect: false,
        scalingMode: BufferedScalingMode.Integer,
        sourceHeight: 120,
        sourceWidth: 160,
        sourceX: 16,
        sourceY: 8
    });

    await game.init(container);

    const info = game.getPresentationInfo();
    assert.equal(game.nativeFrame.getFilter(), Image.FILTER_NEAREST);
    assert.equal(game.targetWidth, 640);
    assert.equal(game.targetHeight, 480);
    assert.equal(game.xoffset, 30);
    assert.equal(game.yoffset, 10);
    assert.deepEqual(input.scales.at(-1), [0.25, 0.25]);
    assert.deepEqual(input.offsets.at(-1), [8.5, 5.5]);
    assert.deepEqual(info, {
        filter: Image.FILTER_NEAREST,
        integerScale: 8,
        logicalHeight: 480,
        logicalWidth: 640,
        logicalX: 30,
        logicalY: 10,
        physicalHeight: 960,
        physicalWidth: 1280,
        physicalX: 60,
        physicalY: 20,
        scaleX: 8,
        scaleY: 8,
        scalingMode: BufferedScalingMode.Integer
    });
});

test("BufferedScalableGame integer mode falls back to linear downscaling when one-to-one does not fit", async () => {
    installOffscreenCanvas();
    const input = new FakeInput();
    const container = fakeContainer(400, 300, input, null, 800, 600);
    const game = new BufferedScalableGame(fakeGame(), 1024, 960, {
        maintainAspect: false,
        scalingMode: BufferedScalingMode.Integer
    });

    await game.init(container);

    const info = game.getPresentationInfo();
    assert.equal(game.nativeFrame.getFilter(), Image.FILTER_LINEAR);
    assert.equal(info.filter, Image.FILTER_LINEAR);
    assert.equal(info.integerScale, null);
    assert.equal(info.physicalX, 80);
    assert.equal(info.physicalY, 0);
    assert.equal(info.physicalWidth, 640);
    assert.equal(info.physicalHeight, 600);
    assert.deepEqual(input.scales.at(-1), [3.2, 3.2]);
    assert.deepEqual(input.offsets.at(-1), [-128, 0]);
});

test("BufferedScalableGame mode changes do not recreate the native framebuffer", async () => {
    installOffscreenCanvas();
    const container = fakeContainer(800, 600);
    const game = new BufferedScalableGame(fakeGame(), 320, 240, true);

    await game.init(container);

    const nativeFrame = game.nativeFrame;
    const nativeTarget = nativeFrame.__getRenderTarget();
    let setFilterCalls = 0;
    const originalSetFilter = nativeFrame.setFilter.bind(nativeFrame);
    nativeFrame.setFilter = (filter) => {
        setFilterCalls++;
        originalSetFilter(filter);
    };

    game.setScalingMode(BufferedScalingMode.Linear);

    assert.equal(game.nativeFrame, nativeFrame);
    assert.equal(game.nativeFrame.__getRenderTarget(), nativeTarget);
    assert.equal(game.nativeFrame.getFilter(), Image.FILTER_LINEAR);
    assert.equal(setFilterCalls, 1);

    game.setScalingMode(BufferedScalingMode.Linear);

    assert.equal(game.nativeFrame, nativeFrame);
    assert.equal(game.nativeFrame.__getRenderTarget(), nativeTarget);
    assert.equal(setFilterCalls, 1);

    game.setScalingMode(BufferedScalingMode.Integer);

    assert.equal(game.nativeFrame, nativeFrame);
    assert.equal(game.nativeFrame.__getRenderTarget(), nativeTarget);
    assert.equal(game.nativeFrame.getFilter(), Image.FILTER_NEAREST);
    assert.equal(game.getPresentationInfo().integerScale, 2);
    assert.equal(setFilterCalls, 2);
});

test("BufferedScalableGame refreshes presentation when backing size changes without logical resize", async () => {
    installOffscreenCanvas();
    const container = fakeContainer(500, 400, new FakeInput(), null, 1000, 800);
    const game = new BufferedScalableGame(fakeGame(), 320, 240, {
        scalingMode: BufferedScalingMode.Integer
    });

    await game.init(container);

    assert.equal(game.getPresentationInfo().physicalX, 20);
    assert.equal(game.xoffset, 10);

    container.backingWidth = 1200;
    game.update(container, 16);

    assert.equal(game.getPresentationInfo().physicalX, 120);
    assert.equal(game.xoffset, 50);
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
    assert.throws(() => new BufferedScalableGame(fakeGame(), 320, 240, { scalingMode: "soft-ish" }), RangeError);
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
    const clearCalls = [];
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
        "glClear",
        "glClearColor",
        "getRenderTarget",
        "glLoadIdentity",
        "popColorMask",
        "popGlobalColorEffects",
        "popRenderTarget",
        "popTransform",
        "pushFullColorMask",
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
    renderer.glClear = (mask) => {
        clearCalls.push({ mask, target: activeTarget });
        calls.push(["clear", activeTarget, mask]);
    };
    renderer.glClearColor = (r, g, b, a) => calls.push(["clearColor", activeTarget, r, g, b, a]);
    renderer.getRenderTarget = () => activeTarget;
    renderer.glLoadIdentity = () => calls.push(["loadIdentity", activeTarget]);
    renderer.popColorMask = () => calls.push(["popColorMask", activeTarget]);
    renderer.popGlobalColorEffects = () => calls.push(["popEffects", activeTarget]);
    renderer.popRenderTarget = () => {
        calls.push(["popTarget", activeTarget]);
        activeTarget = targetStack.pop() ?? null;
    };
    renderer.popTransform = () => calls.push(["popTransform", activeTarget]);
    renderer.pushFullColorMask = () => calls.push(["pushFullColorMask", activeTarget]);
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
        assert.equal(clearCalls.length, 1);
        assert.equal(clearCalls[0].mask, renderer.GL_COLOR_BUFFER_BIT);
        assert.notEqual(clearCalls[0].target, null);
        assert.deepEqual(calls.find(([name]) => name === "clearColor")?.slice(2), [0, 0, 1, 1]);
        assert.ok(fillCalls.length >= 2);
        const screenFill = fillCalls.find(({ args }) => args[0] === 9);
        const nativeHeldFill = fillCalls.find(({ args }) => args[0] === 1);
        assert.equal(screenFill?.target, null);
        assert.equal(nativeHeldFill?.target, clearCalls[0].target);
        assert.equal(drawCalls.length, 1);
        assert.equal(drawCalls[0].target, null);
        assert.deepEqual(drawCalls[0].args.slice(1, 10), [0, 0, 800, 600, 16, 128, 160, -120, 1]);
        assert.ok(calls.findIndex(([name]) => name === "pushFullColorMask") < calls.findIndex(([name]) => name === "clear"));
        assert.ok(calls.findIndex(([name]) => name === "clear") < calls.findIndex(([name]) => name === "popColorMask"));
        assert.equal(
            calls.some(([name]) => name === "pushEffects" || name === "popEffects"),
            false
        );
        assert.equal(
            calls.some(([name, target]) => name === "setClip" && target === null),
            false
        );
    } finally {
        restoreRendererMethods(renderer, originals);
    }
});

test("BufferedScalableGame preserves caller display clip state during presentation", async () => {
    installOffscreenCanvas();
    const renderer = Renderer.getBackend();
    const screenGraphics = new Graphics(800, 600);
    const container = fakeContainer(800, 600, new FakeInput(), screenGraphics);
    let overlayClipState = null;
    class TestBufferedScalableGame extends BufferedScalableGame {
        renderOverlay() {
            overlayClipState = {
                screen: renderer.screenClip,
                world: renderer.worldClip
            };
        }
    }
    const game = new TestBufferedScalableGame(fakeGame(), 320, 240, true);

    await game.init(container);

    Graphics.setCurrent(screenGraphics);
    screenGraphics.setClip(7, 8, 500, 300);
    screenGraphics.setWorldClip(11, 12, 200, 100);

    let presentationClipState = null;
    game.nativeFrame.draw = () => {
        presentationClipState = {
            screen: renderer.screenClip,
            world: renderer.worldClip
        };
    };

    game.render(container, screenGraphics);

    assert.deepEqual(presentationClipState, { screen: null, world: null });
    assert.deepEqual(overlayClipState, {
        screen: { x: 7, y: 8, width: 500, height: 300 },
        world: { x: 11, y: 12, width: 200, height: 100 }
    });
    assert.deepEqual(screenGraphics.getClip(), { x: 7, y: 8, width: 500, height: 300 });
    assert.deepEqual(screenGraphics.getWorldClip(), { x: 11, y: 12, width: 200, height: 100 });
});

test("BufferedScalableGame disables active color effects only around presentation", async () => {
    installOffscreenCanvas();
    const renderer = Renderer.getBackend();
    const screenGraphics = new Graphics(800, 600);
    const container = fakeContainer(800, 600, new FakeInput(), screenGraphics);
    let overlayEffectState = null;
    class TestBufferedScalableGame extends BufferedScalableGame {
        renderOverlay() {
            overlayEffectState = {
                inverted: renderer.isColorInverted(),
                palette: renderer.isMonochromePaletteEnabled()
            };
        }
    }
    const game = new TestBufferedScalableGame(fakeGame(), 320, 240, true);

    await game.init(container);

    try {
        Graphics.setCurrent(screenGraphics);
        renderer.setColorInverted(true);
        renderer.setMonochromePalette(Color.red, Color.white);

        let presentationEffectState = null;
        game.nativeFrame.draw = () => {
            presentationEffectState = {
                inverted: renderer.isColorInverted(),
                palette: renderer.isMonochromePaletteEnabled()
            };
        };

        game.render(container, screenGraphics);

        assert.deepEqual(presentationEffectState, { inverted: false, palette: false });
        assert.deepEqual(overlayEffectState, { inverted: true, palette: true });
        assert.equal(renderer.isColorInverted(), true);
        assert.equal(renderer.isMonochromePaletteEnabled(), true);
    } finally {
        renderer.setColorInverted(false);
        renderer.clearMonochromePalette();
    }
});

test("BufferedScalableGame refreshes native background every frame without stale held changes", async () => {
    installOffscreenCanvas();
    const screenGraphics = new Graphics(800, 600);
    screenGraphics.setBackground(Color.blue);
    const container = fakeContainer(800, 600, new FakeInput(), screenGraphics);
    let renderCount = 0;
    const game = new BufferedScalableGame(
        fakeGame({
            render: (_heldContainer, graphics) => {
                renderCount++;
                if (renderCount === 1) {
                    graphics.setBackground(Color.red);
                }
            }
        }),
        320,
        240,
        true
    );

    await game.init(container);

    const renderer = Renderer.getBackend();
    const originalClearColor = renderer.glClearColor;
    const clearColors = [];
    renderer.glClearColor = (r, g, b, a) => {
        clearColors.push([r, g, b, a]);
        originalClearColor.call(renderer, r, g, b, a);
    };

    try {
        Graphics.setCurrent(screenGraphics);
        game.render(container, screenGraphics);
        game.render(container, screenGraphics);
    } finally {
        renderer.glClearColor = originalClearColor;
    }

    assert.deepEqual(clearColors, [
        [0, 0, 1, 1],
        [0, 0, 1, 1]
    ]);
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
