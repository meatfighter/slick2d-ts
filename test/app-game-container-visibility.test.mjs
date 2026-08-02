import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AppGameContainer, Display, Mouse } from "../dist/index.js";

class FakeCanvas {
    constructor(width = 800, height = 600) {
        this.width = width;
        this.height = height;
        this.style = {
            cursor: "",
            height: `${height}px`,
            width: `${width}px`
        };
    }

    getContext() {
        return null;
    }
}

function installBrowserGlobals(visibilityState = "visible") {
    const document = {
        body: {},
        documentElement: {},
        fullscreenElement: null,
        hasFocus: () => true,
        visibilityState
    };
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: document,
        writable: true
    });
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            addEventListener: () => undefined,
            removeEventListener: () => undefined
        },
        writable: true
    });
    Object.defineProperty(globalThis, "requestAnimationFrame", {
        configurable: true,
        value: () => 1,
        writable: true
    });
    Object.defineProperty(globalThis, "cancelAnimationFrame", {
        configurable: true,
        value: () => undefined,
        writable: true
    });
    return document;
}

function createContainer() {
    const calls = {
        deltas: [],
        renders: 0,
        updates: 0
    };
    const game = {
        closeRequested: () => true,
        getTitle: () => "visibility",
        init: () => undefined,
        render: () => {
            calls.renders += 1;
        },
        update: (_container, delta) => {
            calls.updates += 1;
            calls.deltas.push(delta);
        }
    };
    const container = new AppGameContainer(game, 800, 600, false);
    container.canvas = new FakeCanvas();
    Mouse.setElement(container.canvas);
    Display.setActiveContainer(container);
    Display.create();
    return { calls, container };
}

afterEach(() => {
    Mouse.setElement(null);
    Display.destroy();
    Display.setActiveContainer(null);
    delete globalThis.cancelAnimationFrame;
    delete globalThis.document;
    delete globalThis.requestAnimationFrame;
    delete globalThis.window;
});

test("AppGameContainer defaults to Java visible-only updates", () => {
    installBrowserGlobals();
    const { container } = createContainer();

    assert.equal(container.isUpdatingOnlyWhenVisible(), true);
});

test("hidden frames skip update/render by default", () => {
    installBrowserGlobals("hidden");
    const { calls, container } = createContainer();

    container.loopFrame(1000);

    assert.equal(calls.updates, 0);
    assert.equal(calls.renders, 0);
});

test("setUpdateOnlyWhenVisible(false) allows hidden updates", () => {
    installBrowserGlobals("hidden");
    const { calls, container } = createContainer();
    container.setUpdateOnlyWhenVisible(false);

    container.loopFrame(1000);

    assert.equal(calls.updates, 1);
    assert.equal(calls.renders, 1);
});

test("hidden time is not accumulated into the next visible update", () => {
    const document = installBrowserGlobals("hidden");
    const { calls, container } = createContainer();

    container.loopFrame(10000);
    document.visibilityState = "visible";
    container.loopFrame(10016);

    assert.deepEqual(calls.deltas, [16]);
});
