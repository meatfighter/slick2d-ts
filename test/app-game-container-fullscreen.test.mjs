import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AppGameContainer, ApplicationGameContainer, Cursor, Display, Mouse, Renderer } from "../dist/index.js";

class FakeCanvas {
    constructor() {
        this.listeners = new Map();
        this.fullscreenError = null;
        this.parentNode = null;
        this.tabIndex = -1;
        this.width = 800;
        this.height = 600;
        this.clientWidth = 800;
        this.clientHeight = 600;
        this.style = {
            cursor: "",
            height: "600px",
            width: "800px"
        };
    }

    getContext() {
        return null;
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    removeEventListener(type, listener) {
        if (this.listeners.get(type) === listener) {
            this.listeners.delete(type);
        }
    }

    focus() {
        globalThis.document.activeElement = this;
    }

    getBoundingClientRect() {
        return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight };
    }

    requestFullscreen() {
        if (this.fullscreenError) {
            return Promise.reject(this.fullscreenError);
        }
        globalThis.document.fullscreenElement = this;
        return Promise.resolve();
    }
}

function createGame() {
    const resizeCalls = [];
    return {
        resizeCalls,
        closeRequested: () => true,
        containerSizeChanged: (container) => {
            resizeCalls.push([container.getWidth(), container.getHeight()]);
        },
        getTitle: () => "test",
        init: () => undefined,
        render: () => undefined,
        update: () => undefined
    };
}

function installBrowserGlobals() {
    const listeners = new Map();
    const windowListeners = new Map();
    const viewportListeners = new Map();
    const body = {
        children: [],
        appendChild(child) {
            this.children.push(child);
            child.parentNode = this;
            return child;
        },
        removeChild(child) {
            this.children = this.children.filter((entry) => entry !== child);
            child.parentNode = null;
            return child;
        }
    };
    const document = {
        activeElement: null,
        body,
        documentElement: {},
        exitFullscreenCalls: 0,
        exitPointerLockCalls: 0,
        fullscreenElement: null,
        head: {
            appendChild: () => undefined
        },
        pointerLockElement: null,
        title: "",
        visibilityState: "visible",
        addEventListener: (type, listener) => {
            const registered = listeners.get(type) ?? new Set();
            registered.add(listener);
            listeners.set(type, registered);
        },
        createElement: (tagName) =>
            tagName === "canvas"
                ? new FakeCanvas()
                : {
                      href: "",
                      rel: "",
                      style: {}
                  },
        exitFullscreen() {
            this.exitFullscreenCalls += 1;
            this.fullscreenElement = null;
            for (const listener of listeners.get("fullscreenchange") ?? []) {
                listener();
            }
            return Promise.resolve();
        },
        dispatch(type) {
            for (const listener of listeners.get(type) ?? []) {
                listener();
            }
        },
        exitPointerLock() {
            this.exitPointerLockCalls += 1;
            this.pointerLockElement = null;
            this.dispatch("pointerlockchange");
            return Promise.resolve();
        },
        hasFocus: () => true,
        querySelector: () => null,
        removeEventListener: (type, listener) => {
            listeners.get(type)?.delete(listener);
        }
    };
    const visualViewport = {
        height: 1080,
        width: 1920,
        addEventListener: (type, listener) => {
            const registered = viewportListeners.get(type) ?? new Set();
            registered.add(listener);
            viewportListeners.set(type, registered);
        },
        dispatch(type) {
            for (const listener of viewportListeners.get(type) ?? []) {
                listener();
            }
        },
        removeEventListener: (type, listener) => {
            viewportListeners.get(type)?.delete(listener);
        }
    };
    const window = {
        innerHeight: 1080,
        innerWidth: 1920,
        visualViewport,
        addEventListener: (type, listener) => {
            const registered = windowListeners.get(type) ?? new Set();
            registered.add(listener);
            windowListeners.set(type, registered);
        },
        dispatch(type, event = {}) {
            for (const listener of windowListeners.get(type) ?? []) {
                listener(event);
            }
        },
        listenerCount(type) {
            return windowListeners.get(type)?.size ?? 0;
        },
        removeEventListener: (type, listener) => {
            windowListeners.get(type)?.delete(listener);
        }
    };

    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: document,
        writable: true
    });
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: window,
        writable: true
    });
    Object.defineProperty(globalThis, "HTMLCanvasElement", {
        configurable: true,
        value: FakeCanvas,
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

    return { document, window };
}

function createContainer(width = 800, height = 600) {
    const game = createGame();
    const container = new AppGameContainer(game, width, height, false);
    const canvas = new FakeCanvas();
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    container.canvas = canvas;
    Mouse.setElement(canvas);
    Display.setActiveContainer(container);
    Display.create();
    return { canvas, container, game };
}

async function settleAsyncHandlers() {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

function installVisibleThenTransparentCursor(canvas) {
    Mouse.setNativeCursor(new Cursor(1, 1, 0, 0, 1, new Uint8Array([255, 255, 255, 255]), null));
    assert.equal(canvas.style.cursor, "default");
    Mouse.setNativeCursor(new Cursor(16, 16, 0, 0, 1, new Uint8Array(16 * 16 * 4), null));
    assert.equal(canvas.style.cursor, "none");
}

async function withMockedRenderer(callback) {
    const backend = Renderer.getBackend();
    const originalInitialize = backend.initialize;
    const originalInitDisplay = backend.initDisplay;
    const originalDispose = backend.dispose;
    backend.initialize = () => undefined;
    backend.initDisplay = () => undefined;
    backend.dispose = () => undefined;
    try {
        await callback();
    } finally {
        backend.initialize = originalInitialize;
        backend.initDisplay = originalInitDisplay;
        backend.dispose = originalDispose;
    }
}

afterEach(() => {
    Mouse.setNativeCursor(null);
    Mouse.setElement(null);
    Display.destroy();
    Display.setActiveContainer(null);
    Display.setParent(null);
    delete globalThis.cancelAnimationFrame;
    delete globalThis.document;
    delete globalThis.HTMLCanvasElement;
    delete globalThis.requestAnimationFrame;
    delete globalThis.window;
});

test("browser-forced fullscreen exit restores the last windowed canvas mode", async () => {
    installBrowserGlobals();
    const { canvas, container, game } = createContainer();
    const enterFullscreen = container.setDisplayMode(1280, 720, true);
    await Promise.resolve(enterFullscreen);

    assert.equal(container.isFullscreen(), true);
    assert.equal(container.getWidth(), 1920);
    assert.equal(container.getHeight(), 1080);
    assert.equal(canvas.style.width, "100vw");
    assert.equal(canvas.style.height, "100vh");

    globalThis.document.fullscreenElement = null;
    container.handleFullscreenChange();

    assert.equal(container.isFullscreen(), false);
    assert.equal(Display.isFullscreen(), false);
    assert.equal(container.getWidth(), 800);
    assert.equal(container.getHeight(), 600);
    assert.equal(canvas.width, 800);
    assert.equal(canvas.height, 600);
    assert.equal(canvas.style.width, "800px");
    assert.equal(canvas.style.height, "600px");
    assert.deepEqual(game.resizeCalls.at(-1), [800, 600]);
});

test("high-DPI sizing keeps display APIs logical and canvas backing capped", () => {
    installBrowserGlobals();
    globalThis.window.devicePixelRatio = 2.5;
    const { canvas, container } = createContainer(320, 200);

    container.applyCanvasSize(320, 200);

    assert.equal(container.getWidth(), 320);
    assert.equal(container.getHeight(), 200);
    assert.equal(container.getScreenWidth(), 320);
    assert.equal(container.getScreenHeight(), 200);
    assert.equal(Display.getWidth(), 320);
    assert.equal(Display.getHeight(), 200);
    assert.equal(container.getDevicePixelRatio(), 2);
    assert.equal(container.getBackingWidth(), 640);
    assert.equal(container.getBackingHeight(), 400);
    assert.equal(canvas.width, 640);
    assert.equal(canvas.height, 400);
    assert.equal(canvas.style.width, "320px");
    assert.equal(canvas.style.height, "200px");

    container.setMaxDevicePixelRatio(1.5);

    assert.equal(container.getDevicePixelRatio(), 1.5);
    assert.equal(canvas.width, 480);
    assert.equal(canvas.height, 300);

    container.setHighDpiEnabled(false);

    assert.equal(container.getDevicePixelRatio(), 1);
    assert.equal(canvas.width, 320);
    assert.equal(canvas.height, 200);
});

test("destroy removes internally owned canvases", () => {
    installBrowserGlobals();
    const { canvas, container } = createContainer();
    const parent = {
        removed: [],
        removeChild(child) {
            this.removed.push(child);
        }
    };
    canvas.parentNode = parent;
    container.ownsCanvas = true;

    container.destroy();

    assert.deepEqual(parent.removed, [canvas]);
    assert.equal(container.canvas, null);
});

test("owned canvas defaults to browser input capture", async () => {
    const { document } = installBrowserGlobals();
    const container = new AppGameContainer(createGame(), 320, 200, false);

    await withMockedRenderer(async () => {
        await container.start();
        try {
            assert.equal(document.body.children[0].style.touchAction, "none");
        } finally {
            container.destroy();
        }
    });
});

test("host canvas defaults to browser input non-capture", async () => {
    installBrowserGlobals();
    const canvas = new FakeCanvas();
    canvas.style.touchAction = "pan-x";
    Display.setParent(canvas);
    const container = new AppGameContainer(createGame(), 320, 200, false);

    await withMockedRenderer(async () => {
        await container.start();
        try {
            assert.equal(canvas.style.touchAction, "pan-x");
        } finally {
            container.destroy();
        }
    });
});

test("explicit browser input capture true overrides host canvas default", async () => {
    installBrowserGlobals();
    const canvas = new FakeCanvas();
    canvas.style.touchAction = "pan-x";
    Display.setParent(canvas);
    const container = new AppGameContainer(createGame(), 320, 200, false);
    container.getInput().setBrowserInputCaptureEnabled(true);

    await withMockedRenderer(async () => {
        await container.start();
        try {
            assert.equal(canvas.style.touchAction, "none");
        } finally {
            container.destroy();
        }
    });

    assert.equal(canvas.style.touchAction, "pan-x");
});

test("explicit browser input capture false overrides owned canvas default", async () => {
    const { document } = installBrowserGlobals();
    const container = new AppGameContainer(createGame(), 320, 200, false);
    container.getInput().setBrowserInputCaptureEnabled(false);

    await withMockedRenderer(async () => {
        await container.start();
        try {
            assert.equal(document.body.children[0].style.touchAction, undefined);
        } finally {
            container.destroy();
        }
    });
});

test("ApplicationGameContainer destroy resets resizable state", () => {
    installBrowserGlobals();
    const game = createGame();
    const container = new ApplicationGameContainer(game, 800, 600, false);

    container.setResizable(true);
    assert.equal(container.isResizable(), true);
    assert.equal(Display.isResizable(), true);

    container.destroy();

    assert.equal(container.isResizable(), false);
    assert.equal(Display.isResizable(), false);
});

test("ApplicationGameContainer uses the shared window and VisualViewport resize path", async () => {
    const { document, window } = installBrowserGlobals();
    const game = createGame();
    const container = new ApplicationGameContainer(game, 800, 600, false);
    container.setResizable(true);

    await withMockedRenderer(async () => {
        await container.start();
        try {
            const canvas = document.body.children[0];
            canvas.clientWidth = 960;
            canvas.clientHeight = 540;

            assert.equal(window.listenerCount("resize"), 1);
            window.visualViewport.dispatch("resize");

            assert.equal(container.getWidth(), 960);
            assert.equal(container.getHeight(), 540);
            assert.deepEqual(game.resizeCalls.at(-1), [960, 540]);
        } finally {
            container.destroy();
        }
    });
});

test("Mouse grabbed state follows browser pointer lock success and release", async () => {
    const { document } = installBrowserGlobals();
    const canvas = new FakeCanvas();
    canvas.requestPointerLock = () => {
        document.pointerLockElement = canvas;
        document.dispatch("pointerlockchange");
        return Promise.resolve();
    };
    Mouse.setElement(canvas);

    await Mouse.setGrabbed(true);

    assert.equal(Mouse.isGrabbed(), true);

    await Mouse.setGrabbed(false);

    assert.equal(Mouse.isGrabbed(), false);
    assert.equal(document.exitPointerLockCalls, 1);
});

test("Mouse grabbed state resets after rejected pointer lock requests", async () => {
    installBrowserGlobals();
    const canvas = new FakeCanvas();
    canvas.requestPointerLock = () => Promise.reject(new Error("gesture required"));
    Mouse.setElement(canvas);

    await assert.rejects(() => Mouse.setGrabbed(true), /gesture required/);

    assert.equal(Mouse.isGrabbed(), false);
});

test("high-DPI fullscreen restore preserves logical size and backing size separately", async () => {
    installBrowserGlobals();
    globalThis.window.devicePixelRatio = 2;
    const { canvas, container, game } = createContainer();

    await Promise.resolve(container.setDisplayMode(1280, 720, true));

    assert.equal(container.getWidth(), 1920);
    assert.equal(container.getHeight(), 1080);
    assert.equal(container.getBackingWidth(), 3840);
    assert.equal(container.getBackingHeight(), 2160);
    assert.equal(canvas.width, 3840);
    assert.equal(canvas.height, 2160);
    assert.equal(canvas.style.width, "100vw");
    assert.equal(canvas.style.height, "100vh");

    globalThis.document.fullscreenElement = null;
    container.handleFullscreenChange();

    assert.equal(container.isFullscreen(), false);
    assert.equal(container.getWidth(), 800);
    assert.equal(container.getHeight(), 600);
    assert.equal(container.getBackingWidth(), 1600);
    assert.equal(container.getBackingHeight(), 1200);
    assert.equal(canvas.width, 1600);
    assert.equal(canvas.height, 1200);
    assert.equal(canvas.style.width, "800px");
    assert.equal(canvas.style.height, "600px");
    assert.deepEqual(game.resizeCalls.at(-1), [800, 600]);
});

test("explicit fullscreen exit applies the restored size once", async () => {
    installBrowserGlobals();
    const { container, game } = createContainer();
    await Promise.resolve(container.setDisplayMode(1280, 720, true));
    const callCountBeforeExit = game.resizeCalls.length;

    await Promise.resolve(container.setDisplayMode(800, 600, false));

    assert.equal(container.isFullscreen(), false);
    assert.equal(game.resizeCalls.length, callCountBeforeExit + 1);
    assert.deepEqual(game.resizeCalls.at(-1), [800, 600]);
});

test("destroy exits browser fullscreen, clears display state, and restores a transparent cursor", async () => {
    installBrowserGlobals();
    const { canvas, container } = createContainer();
    await Promise.resolve(container.setDisplayMode(1280, 720, true));
    Mouse.setNativeCursor(new Cursor(16, 16, 0, 0, 1, new Uint8Array(16 * 16 * 4), null));

    assert.equal(canvas.style.cursor, "none");

    container.destroy();

    assert.equal(globalThis.document.exitFullscreenCalls, 1);
    assert.equal(Display.isCreated(), false);
    assert.equal(Display.isFullscreen(), false);
    assert.equal(container.isFullscreen(), false);
    assert.equal(canvas.width, 800);
    assert.equal(canvas.height, 600);
    assert.equal(canvas.style.width, "800px");
    assert.equal(canvas.style.height, "600px");
    assert.equal(canvas.style.cursor, "");
});

test("ignored rejected fullscreen display mode restores state and reports without unhandled rejection", async () => {
    installBrowserGlobals();
    const { canvas, container, game } = createContainer();
    const errors = [];
    const unhandled = [];
    const onUnhandled = (reason) => {
        unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
        container.setErrorHandler((error) => {
            errors.push(error);
        });
        canvas.fullscreenError = new Error("denied fullscreen");
        installVisibleThenTransparentCursor(canvas);

        container.setDisplayMode(1280, 720, true);
        await settleAsyncHandlers();

        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /Failed to enter fullscreen/);
        assert.equal(unhandled.length, 0);
        assert.equal(container.isFullscreen(), false);
        assert.equal(Display.isFullscreen(), false);
        assert.equal(container.getWidth(), 800);
        assert.equal(container.getHeight(), 600);
        assert.equal(canvas.width, 800);
        assert.equal(canvas.height, 600);
        assert.equal(canvas.style.width, "800px");
        assert.equal(canvas.style.height, "600px");
        assert.equal(canvas.style.cursor, "default");
        assert.deepEqual(game.resizeCalls.at(-1), [800, 600]);
    } finally {
        process.off("unhandledRejection", onUnhandled);
    }
});

test("ignored rejected Display.setFullscreen reports through the active container handler", async () => {
    installBrowserGlobals();
    const { canvas, container } = createContainer();
    const errors = [];
    const unhandled = [];
    const onUnhandled = (reason) => {
        unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    try {
        container.setErrorHandler((error) => {
            errors.push(error);
        });
        canvas.fullscreenError = new Error("denied fullscreen");
        installVisibleThenTransparentCursor(canvas);

        Display.setFullscreen(true);
        await settleAsyncHandlers();

        assert.equal(errors.length, 1);
        assert.match(errors[0].message, /Failed to enter fullscreen/);
        assert.equal(unhandled.length, 0);
        assert.equal(container.isFullscreen(), false);
        assert.equal(Display.isFullscreen(), false);
        assert.equal(canvas.style.cursor, "default");
    } finally {
        process.off("unhandledRejection", onUnhandled);
    }
});
