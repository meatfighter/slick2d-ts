import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AppGameContainer, Display, Mouse } from "../dist/index.js";

class FakeCanvas {
    constructor() {
        this.height = 600;
        this.width = 800;
        this.style = { cursor: "default", height: "600px", width: "800px" };
    }
}

function installDocument() {
    const document = {
        exitFullscreenCalls: 0,
        fullscreenElement: null,
        hasFocus: () => true,
        exitFullscreen() {
            this.exitFullscreenCalls++;
            this.fullscreenElement = null;
            return Promise.resolve();
        }
    };
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: document,
        writable: true
    });
    Object.defineProperty(globalThis, "HTMLCanvasElement", {
        configurable: true,
        value: FakeCanvas,
        writable: true
    });
    return document;
}

function createContainer() {
    const resizeCalls = [];
    const game = {
        closeRequested: () => true,
        containerSizeChanged: (container) => resizeCalls.push([container.getWidth(), container.getHeight()]),
        getTitle: () => "external-fullscreen",
        init: () => undefined,
        render: () => undefined,
        update: () => undefined
    };
    const container = new AppGameContainer(game, 800, 600, false);
    const canvas = new FakeCanvas();
    container.canvas = canvas;
    AppGameContainer.resourceOwner = container;
    Mouse.setElement(canvas);
    Display.setActiveContainer(container);
    return { canvas, container, resizeCalls };
}

afterEach(() => {
    AppGameContainer.resourceOwner = null;
    Mouse.setNativeCursor(null);
    Mouse.setElement(null);
    Display.destroy();
    Display.setActiveContainer(null);
    delete globalThis.document;
    delete globalThis.HTMLCanvasElement;
});

test("wrapper-owned fullscreen transitions do not mutate a windowed Slick canvas", () => {
    const document = installDocument();
    const { canvas, container, resizeCalls } = createContainer();
    const wrapper = {};

    document.fullscreenElement = wrapper;
    container.handleFullscreenChange();

    assert.equal(container.isFullscreen(), false);
    assert.equal(container.getWidth(), 800);
    assert.equal(container.getHeight(), 600);
    assert.equal(canvas.style.width, "800px");
    assert.equal(canvas.style.height, "600px");
    assert.equal(canvas.style.cursor, "default");
    assert.deepEqual(resizeCalls, []);

    document.fullscreenElement = null;
    container.handleFullscreenChange();

    assert.equal(container.isFullscreen(), false);
    assert.equal(container.getWidth(), 800);
    assert.equal(container.getHeight(), 600);
    assert.equal(canvas.style.width, "800px");
    assert.equal(canvas.style.height, "600px");
    assert.equal(canvas.style.cursor, "default");
    assert.deepEqual(resizeCalls, []);
});

test("terminal fullscreen cleanup does not rewrite or exit wrapper-owned presentation", () => {
    const document = installDocument();
    const { canvas, container, resizeCalls } = createContainer();
    const wrapper = {};

    // Simulate host-managed responsive sizing that is deliberately independent of
    // Slick's remembered 800x600 windowed mode.
    container.width = 1280;
    container.height = 720;
    canvas.width = 1280;
    canvas.height = 720;
    canvas.style.width = "1280px";
    canvas.style.height = "720px";
    document.fullscreenElement = wrapper;

    container.exitBrowserFullscreenForDestroy();

    assert.equal(container.getWidth(), 1280);
    assert.equal(container.getHeight(), 720);
    assert.equal(canvas.width, 1280);
    assert.equal(canvas.height, 720);
    assert.equal(canvas.style.width, "1280px");
    assert.equal(canvas.style.height, "720px");
    assert.equal(document.fullscreenElement, wrapper);
    assert.equal(document.exitFullscreenCalls, 0);
    assert.deepEqual(resizeCalls, []);
});
