import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Color, GameContainer, Graphics, GraphicsFactory, Image, Input, InternalTextureLoader, Renderer, ResourceLoader, SoundStore } from "../dist/index.js";
import { WebGLTextureResource } from "../dist/slick/rendering/WebGLTextureResource.js";

class Fake2DContext {
    constructor(pixelReads = null) {
        this.pixelReads = pixelReads;
    }

    drawImage() {}

    getImageData() {
        if (this.pixelReads) {
            this.pixelReads.count++;
        }
        return { data: new Uint8ClampedArray([17, 34, 51, 68]) };
    }

    putImageData() {}
}

class FakeCanvas {
    constructor(width = 1, height = 1, pixelReads = null) {
        this.width = width;
        this.height = height;
        this.context = new Fake2DContext(pixelReads);
    }

    getContext(type) {
        return type === "2d" ? this.context : null;
    }
}

function installCanvasDocument(pixelReads = null) {
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: {
            createElement: (tagName) => (tagName === "canvas" ? new FakeCanvas(1, 1, pixelReads) : { style: {} })
        },
        writable: true
    });
}

function eventTarget() {
    const listeners = new Map();
    return {
        addEventListener(type, listener) {
            listeners.set(type, listener);
        },
        removeEventListener(type, listener) {
            if (listeners.get(type) === listener) {
                listeners.delete(type);
            }
        },
        dispatch(type, event) {
            listeners.get(type)?.(event);
        }
    };
}

function keyEvent(code, key, timeStamp) {
    return {
        code,
        defaultPrevented: false,
        key,
        target: null,
        timeStamp,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function pointerEvent(button, x, y, timeStamp) {
    return {
        button,
        clientX: x,
        clientY: y,
        currentTarget: null,
        defaultPrevented: false,
        target: null,
        timeStamp,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function keyListener(overrides = {}) {
    return {
        inputEnded: () => undefined,
        inputStarted: () => undefined,
        isAcceptingInput: () => true,
        keyPressed: () => undefined,
        keyReleased: () => undefined,
        setInput: () => undefined,
        ...overrides
    };
}

function mouseListener(overrides = {}) {
    return {
        inputEnded: () => undefined,
        inputStarted: () => undefined,
        isAcceptingInput: () => true,
        mouseClicked: () => undefined,
        mouseDragged: () => undefined,
        mouseMoved: () => undefined,
        mousePressed: () => undefined,
        mouseReleased: () => undefined,
        mouseWheelMoved: () => undefined,
        setInput: () => undefined,
        ...overrides
    };
}

function button(pressed = false) {
    return { pressed, touched: pressed, value: pressed ? 1 : 0 };
}

function gamepad(index, id, axes = [0, 0]) {
    return {
        axes,
        buttons: Array.from({ length: 16 }, () => button(false)),
        connected: true,
        id,
        index,
        mapping: "standard",
        timestamp: 1,
        vibrationActuator: null
    };
}

function installGamepads(snapshot) {
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { getGamepads: () => snapshot },
        writable: true
    });
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, reject, resolve };
}

class DeferredTextureResource extends WebGLTextureResource {
    constructor(width, height, completion) {
        super(new FakeCanvas(1, 1), Image.FILTER_NEAREST, null);
        this.width = width;
        this.height = height;
        this.completion = completion;
    }

    ready() {
        return this.completion;
    }
}

const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
const originalCreateImageBitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");

function restoreGlobal(name, descriptor) {
    if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
    } else {
        delete globalThis[name];
    }
}

afterEach(() => {
    Graphics.setCurrent(null);
    InternalTextureLoader.get().clear();
    ResourceLoader.clearCache();
    Input.controllersDisabled = false;
    Input.gamepadCacheGeneration = 0;
    SoundStore.get().setMaxSources(64);
    restoreGlobal("navigator", originalNavigatorDescriptor);
    restoreGlobal("document", originalDocumentDescriptor);
    restoreGlobal("createImageBitmap", originalCreateImageBitmapDescriptor);
});

test("Input dispatches queued events inside one poll lifecycle and honors consumption", () => {
    const target = eventTarget();
    const input = new Input(600);
    const calls = [];
    input.bindToElement(target);

    let listenerInput = null;
    input.addKeyListener(
        keyListener({
            inputStarted: () => calls.push("first:start"),
            inputEnded: () => calls.push("first:end"),
            keyPressed: () => {
                calls.push("first:key");
                listenerInput.consumeEvent();
            },
            setInput: (value) => {
                listenerInput = value;
            }
        })
    );
    input.addKeyListener(
        keyListener({
            inputStarted: () => calls.push("second:start"),
            inputEnded: () => calls.push("second:end"),
            keyPressed: () => calls.push("second:key")
        })
    );

    target.dispatch("keydown", keyEvent("KeyA", "a", 125));
    assert.deepEqual(calls, []);
    assert.equal(input.isKeyDown(Input.KEY_A), true);

    input.poll(800, 600);

    assert.deepEqual(calls, ["first:start", "second:start", "first:key", "first:end", "second:end"]);
    assert.equal(input.isKeyPressed(Input.KEY_A), true);
});

test("Input defers events enqueued during listener dispatch until the next poll", () => {
    const target = eventTarget();
    const input = new Input(600);
    const calls = [];
    input.bindToElement(target);
    input.addKeyListener(
        keyListener({
            keyPressed: (_key, character) => {
                calls.push(character);
                if (character === "a") {
                    target.dispatch("keydown", keyEvent("KeyB", "b", 20));
                }
            }
        })
    );

    target.dispatch("keydown", keyEvent("KeyA", "a", 10));
    input.poll(800, 600);
    assert.deepEqual(calls, ["a"]);

    input.poll(800, 600);
    assert.deepEqual(calls, ["a", "b"]);

    input.poll(800, 600);
    assert.deepEqual(calls, ["a", "b"]);
});

test("Input listener additions are staged until the next poll", () => {
    const target = eventTarget();
    const input = new Input(600);
    const calls = [];
    input.bindToElement(target);

    const added = keyListener({ keyPressed: (_key, character) => calls.push(`added:${character}`) });
    input.addKeyListener(
        keyListener({
            keyPressed: (_key, character) => {
                calls.push(`first:${character}`);
                input.addKeyListener(added);
            }
        })
    );

    target.dispatch("keydown", keyEvent("KeyA", "a", 10));
    target.dispatch("keyup", keyEvent("KeyA", "a", 11));
    target.dispatch("keydown", keyEvent("KeyB", "b", 12));
    input.poll(800, 600);
    assert.deepEqual(calls, ["first:a", "first:b"]);

    target.dispatch("keyup", keyEvent("KeyB", "b", 13));
    target.dispatch("keydown", keyEvent("KeyC", "c", 14));
    input.poll(800, 600);
    assert.deepEqual(calls, ["first:a", "first:b", "first:c", "added:c"]);
});

test("Input double-click timing uses queued DOM timestamps and click tolerance", () => {
    const target = eventTarget();
    const input = new Input(600);
    const clicks = [];
    input.bindToElement(target);
    input.setDoubleClickInterval(150);
    input.setMouseClickTolerance(4);
    input.addMouseListener(mouseListener({ mouseClicked: (_button, x, y, count) => clicks.push([x, y, count]) }));

    target.dispatch("pointerdown", pointerEvent(0, 10, 20, 100));
    target.dispatch("pointerup", pointerEvent(0, 10, 20, 110));
    target.dispatch("pointerdown", pointerEvent(0, 12, 22, 200));
    target.dispatch("pointerup", pointerEvent(0, 12, 22, 210));
    target.dispatch("pointerdown", pointerEvent(0, 30, 40, 300));
    target.dispatch("pointerup", pointerEvent(0, 40, 40, 310));

    input.poll(800, 600);

    assert.deepEqual(clicks, [
        [10, 20, 1],
        [12, 22, 2]
    ]);
});

test("controller APIs use dense logical indexes for sparse browser slots", () => {
    const first = gamepad(0, "first", [0, 0]);
    const second = gamepad(3, "second", [0.75, -0.25, 0.5]);
    second.buttons[2] = button(true);
    installGamepads([first, null, null, second]);
    const input = new Input(600);

    input.poll(800, 600);

    assert.equal(input.getControllerCount(), 2);
    assert.equal(input.getAxisCount(1), 3);
    assert.equal(input.getAxisValue(1, 0), 0.75);
    assert.equal(input.isButtonPressed(2, 1), true);
    assert.equal(input.getAxisCount(3), 0);
});

test("controller replacement clears unconsumed presses left after release", () => {
    const first = gamepad(0, "first", [0, 0]);
    first.buttons[2] = button(true);
    const snapshot = [first];
    installGamepads(snapshot);
    const input = new Input(600);

    input.poll(800, 600);
    first.buttons[2] = button(false);
    input.poll(800, 600);

    const replacement = gamepad(3, "replacement", [0, 0]);
    snapshot.splice(0, snapshot.length, null, null, null, replacement);
    input.poll(800, 600);

    assert.equal(input.isButtonPressed(2, 0), false);
});

test("Image corner colors are persistent and RGB-only updates preserve alpha", () => {
    installCanvasDocument();
    const image = new Image(8, 8);

    image.setColor(Image.TOP_LEFT, 0.1, 0.2, 0.3, 0.25);
    const colors = image.__getCornerColors();
    const topLeft = colors[Image.TOP_LEFT];
    image.setColor(Image.TOP_LEFT, 0.9, 0.8, 0.7);

    assert.strictEqual(image.__getCornerColors(), colors);
    assert.strictEqual(image.__getCornerColors()[Image.TOP_LEFT], topLeft);
    assert.deepEqual([topLeft.r, topLeft.g, topLeft.b, topLeft.a], [0.9, 0.8, 0.7, 0.25]);

    image.setImageColor(0.4, 0.5, 0.6);
    assert.equal(topLeft.a, 0.25);
    assert.deepEqual(
        image.__getCornerColors().map((color) => [color.r, color.g, color.b]),
        Array.from({ length: 4 }, () => [0.4, 0.5, 0.6])
    );
    image.destroy();
});

test("flipped subimages and partial draws use signed Java texture coordinates", () => {
    installCanvasDocument();
    const renderer = Renderer.getBackend();
    const originalDrawImage = renderer.drawImage;
    const calls = [];
    try {
        renderer.drawImage = (...args) => calls.push(args);
        const image = new Image(100, 50);
        const flipped = image.getFlippedCopy(true, true);
        const sub = flipped.getSubImage(10, 5, 20, 10);

        assert.equal(sub.getTextureOffsetX(), 0.9);
        assert.equal(sub.getTextureOffsetY(), 0.9);
        assert.equal(sub.getTextureWidth(), -0.2);
        assert.equal(sub.getTextureHeight(), -0.2);

        flipped.draw(1, 2, 10, 5, 30, 15);
        assert.deepEqual(calls[0].slice(1, 9), [1, 2, 100, 50, 90, 45, -20, -10]);
        image.destroy();
    } finally {
        renderer.drawImage = originalDrawImage;
    }
});

test("GraphicsFactory returns one Graphics and target per shared texture even when a copy asks first", () => {
    installCanvasDocument();
    const image = new Image(8, 8);
    const copy = image.copy();

    const copyGraphics = copy.getGraphics();
    const imageGraphics = image.getGraphics();

    assert.strictEqual(imageGraphics, copyGraphics);
    assert.strictEqual(image.__getRenderTarget(), copy.__getRenderTarget());
    assert.strictEqual(image.__getRenderTarget(), image.__getOwnedRenderTarget());
    image.destroy();
});

test("InternalTextureLoader.clear releases GraphicsFactory entries for disposed textures", () => {
    installCanvasDocument();
    const image = new Image(8, 8);
    const resource = image.__getTextureResource();

    image.getGraphics();
    assert.notStrictEqual(GraphicsFactory.getRenderTarget(resource), null);

    InternalTextureLoader.get().clear();

    assert.strictEqual(GraphicsFactory.getRenderTarget(resource), null);
    image.destroy();
});

test("setTexture reinitializes dimensions and ignores completion from an obsolete texture", async () => {
    installCanvasDocument();
    const oldCompletion = deferred();
    const newCompletion = deferred();
    const oldTexture = new DeferredTextureResource(0, 0, oldCompletion.promise);
    const newTexture = new DeferredTextureResource(0, 0, newCompletion.promise);
    const image = new Image(oldTexture);

    image.setTexture(newTexture);
    oldTexture.width = 40;
    oldTexture.height = 30;
    oldCompletion.resolve();
    await Promise.resolve();
    assert.deepEqual([image.getWidth(), image.getHeight()], [0, 0]);

    newTexture.width = 16;
    newTexture.height = 10;
    newCompletion.resolve();
    await Promise.resolve();
    assert.deepEqual([image.getWidth(), image.getHeight()], [16, 10]);
    assert.deepEqual([image.getCenterOfRotationX(), image.getCenterOfRotationY()], [8, 5]);

    oldTexture.dispose(null);
    image.destroy();
});

test("ordinary image pixel data is materialized lazily and flushPixelData invalidates it", async () => {
    const reads = { count: 0 };
    installCanvasDocument(reads);
    Object.defineProperty(globalThis, "createImageBitmap", {
        configurable: true,
        value: async () => ({ width: 1, height: 1 }),
        writable: true
    });
    ResourceLoader.registerResource("images/v1-5-lazy-pixel.png", new Uint8Array([1, 2, 3, 4]));
    const image = new Image("images/v1-5-lazy-pixel.png");

    await ResourceLoader.waitForAll();
    assert.equal(reads.count, 0);
    assert.equal(image.getColor(0, 0).getRed(), 17);
    assert.equal(image.getColor(0, 0).getGreen(), 34);
    assert.equal(reads.count, 1);

    image.flushPixelData();
    assert.equal(image.getColor(0, 0).getBlue(), 51);
    assert.equal(reads.count, 2);
    image.destroy();
});

test("InternalTextureLoader cache identity separates filter, transparency, and flip", () => {
    const loader = InternalTextureLoader.get();
    const created = [];
    const factory = () => {
        const texture = { ref: "cache-test", dispose: () => undefined, invalidateTexture: () => undefined };
        created.push(texture);
        return texture;
    };
    const transparent = Color.fromInts(1, 2, 3);

    const linear = loader.getTexture("cache-test", Image.FILTER_LINEAR, null, false, factory);
    assert.strictEqual(loader.getTexture("cache-test", Image.FILTER_LINEAR, null, false, factory), linear);
    const nearest = loader.getTexture("cache-test", Image.FILTER_NEAREST, null, false, factory);
    const flipped = loader.getTexture("cache-test", Image.FILTER_LINEAR, null, true, factory);
    const keyed = loader.getTexture("cache-test", Image.FILTER_LINEAR, transparent, false, factory);

    assert.equal(new Set([linear, nearest, flipped, keyed]).size, 4);
    assert.equal(created.length, 4);
    for (const texture of created) {
        loader.unregister(texture);
    }
});

test("InternalTextureLoader evicts failed asynchronous texture loads from the path cache", async () => {
    installCanvasDocument();
    const loader = InternalTextureLoader.get();
    const created = [];
    const failure = deferred();
    const failed = loader.getTexture("failed-cache-test", Image.FILTER_LINEAR, null, false, () => {
        const texture = new DeferredTextureResource(0, 0, failure.promise);
        created.push(texture);
        return texture;
    });

    failure.reject(new Error("decode failed"));
    await assert.rejects(failed.ready(), /decode failed/);
    await Promise.resolve();

    const retry = loader.getTexture("failed-cache-test", Image.FILTER_LINEAR, null, false, () => {
        const completion = deferred();
        completion.resolve();
        const texture = new DeferredTextureResource(1, 1, completion.promise);
        created.push(texture);
        return texture;
    });

    assert.notStrictEqual(retry, failed);
    assert.equal(created.length, 2);
});

test("Color.decode enforces Java Integer.decode grammar and signed int range", () => {
    assert.equal(Color.decode("0x00ff0000").getRed(), 255);
    assert.equal(Color.decode("#0000ff").getBlue(), 255);
    assert.doesNotThrow(() => Color.decode("-0x80000000"));

    for (const value of ["", " 123", "123 ", "123junk", "09", "0x-1", "+", "2147483648", "-2147483649", "0x80000000"]) {
        assert.throws(() => Color.decode(value), Error, value);
    }
});

test("Graphics and GameContainer share the lazy system font while setDefaultFont preserves the active graphics font", () => {
    const first = new Graphics(10, 10);
    const second = new Graphics(20, 20);
    assert.strictEqual(first.getFont(), second.getFont());

    const game = {
        closeRequested: () => true,
        containerSizeChanged: () => undefined,
        getTitle: () => "font test",
        init: () => undefined,
        render: () => undefined,
        update: () => undefined
    };
    const container = new GameContainer(game);
    const originalGraphicsFont = container.getGraphics().getFont();
    const customFont = {
        drawString: () => undefined,
        getHeight: () => 12,
        getLineHeight: () => 12,
        getWidth: () => 8,
        getYOffset: () => 0
    };

    container.setDefaultFont(customFont);
    assert.strictEqual(container.getDefaultFont(), customFont);
    assert.strictEqual(container.getGraphics().getFont(), originalGraphicsFont);
    assert.throws(() => container.setDefaultFont(null), TypeError);
});

test("SoundStore rejects values outside Java's positive integer source-count domain", () => {
    const store = SoundStore.get();
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => store.setMaxSources(value), RangeError, String(value));
    }
    store.setMaxSources(8);
    assert.equal(store.getSourceCount(), 8);
});
