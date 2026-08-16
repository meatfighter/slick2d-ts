import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AL, AppGameContainer, Display, InternalTextureLoader, Mouse, Music, Renderer, ResourceLoader, SoundStore } from "../dist/index.js";

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
        addEventListener: () => undefined,
        body: {},
        documentElement: {},
        fullscreenElement: null,
        hasFocus: () => true,
        removeEventListener: () => undefined,
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

test("minimum logic interval accumulates small frame deltas", () => {
    installBrowserGlobals();
    const { calls, container } = createContainer();
    container.setMinimumLogicUpdateInterval(50);

    container.loopFrame(16);
    container.loopFrame(32);
    container.loopFrame(48);

    assert.deepEqual(calls.deltas, []);

    container.loopFrame(64);

    assert.deepEqual(calls.deltas, [64]);
});

test("maximum logic interval splits large deltas into Java catch-up updates", () => {
    installBrowserGlobals();
    const { calls, container } = createContainer();
    container.setMinimumLogicUpdateInterval(1);
    container.setMaximumLogicUpdateInterval(20);

    container.loopFrame(55);

    assert.deepEqual(calls.deltas, [20, 20, 15]);
});

test("maximum logic interval retains small remainders", () => {
    installBrowserGlobals();
    const { calls, container } = createContainer();
    container.setMinimumLogicUpdateInterval(16);
    container.setMaximumLogicUpdateInterval(20);

    container.loopFrame(55);
    container.loopFrame(56);

    assert.deepEqual(calls.deltas, [20, 20]);

    container.loopFrame(57);

    assert.deepEqual(calls.deltas, [20, 20, 17]);
});

test("paused containers still receive a zero-delta update", () => {
    installBrowserGlobals();
    const { calls, container } = createContainer();
    container.setPaused(true);

    container.loopFrame(100);

    assert.deepEqual(calls.deltas, [0]);
});

test("paused containers still poll music and browser audio", () => {
    installBrowserGlobals();
    const { container } = createContainer();
    const musicPoll = Music.poll;
    const store = SoundStore.get();
    const soundPoll = store.poll;
    const musicDeltas = [];
    const soundDeltas = [];

    Music.poll = (delta) => {
        musicDeltas.push(delta);
    };
    store.poll = (delta) => {
        soundDeltas.push(delta);
    };
    try {
        container.setPaused(true);
        container.loopFrame(25);

        assert.deepEqual(musicDeltas, [25]);
        assert.deepEqual(soundDeltas, [25]);
    } finally {
        Music.poll = musicPoll;
        store.poll = soundPoll;
    }
});

test("target frame rate paces RAF frames and syncs processed frames", () => {
    installBrowserGlobals();
    const { calls, container } = createContainer();
    container.setTargetFrameRate(30);

    container.loopFrame(16);

    assert.deepEqual(calls.deltas, []);
    assert.equal(calls.renders, 0);

    container.loopFrame(34);

    assert.deepEqual(calls.deltas, [34]);
    assert.equal(calls.renders, 1);
    assert.equal(Display.getSyncFrameRate(), 30);
});

test("smooth deltas use Java FPS-derived timing when FPS is known", () => {
    installBrowserGlobals();
    const { calls, container } = createContainer();
    container.setSmoothDeltas(true);
    container.fps = 50;

    container.loopFrame(100);

    assert.deepEqual(calls.deltas, [20]);
});

test("default loop path updates once with the raw frame delta", () => {
    installBrowserGlobals();
    const { calls, container } = createContainer();

    container.loopFrame(17);

    assert.deepEqual(calls.deltas, [17]);
});

test("loop suspension cancels an existing RAF", () => {
    installBrowserGlobals();
    const { container } = createContainer();
    const canceled = [];
    globalThis.cancelAnimationFrame = (id) => {
        canceled.push(id);
    };
    container.animationFrame = 9;
    container.storedDelta = 44;

    container.setLoopSuspended(true);

    assert.deepEqual(canceled, [9]);
    assert.equal(container.animationFrame, 0);
    assert.equal(container.storedDelta, 0);
    assert.equal(container.isLoopSuspended(), true);
});

test("suspended RAF callback clears the frame id and performs no work", () => {
    installBrowserGlobals();
    const { calls, container } = createContainer();
    const store = SoundStore.get();
    const oldInputPoll = container.input.poll;
    const oldMusicPoll = Music.poll;
    const oldSoundPoll = store.poll;
    const backend = Renderer.getBackend();
    const oldBeginFrame = backend.beginFrame;
    const oldEndFrame = backend.endFrame;
    let inputPolls = 0;
    let musicPolls = 0;
    let soundPolls = 0;
    let beginFrames = 0;
    let endFrames = 0;

    container.input.poll = () => {
        inputPolls += 1;
    };
    Music.poll = () => {
        musicPolls += 1;
    };
    store.poll = () => {
        soundPolls += 1;
    };
    backend.beginFrame = () => {
        beginFrames += 1;
    };
    backend.endFrame = () => {
        endFrames += 1;
    };

    try {
        container.animationFrame = 12;
        container.setLoopSuspended(true);
        container.animationFrame = 12;

        container.loop(1000);

        assert.equal(container.animationFrame, 0);
        assert.equal(calls.updates, 0);
        assert.equal(calls.renders, 0);
        assert.equal(inputPolls, 0);
        assert.equal(musicPolls, 0);
        assert.equal(soundPolls, 0);
        assert.equal(beginFrames, 0);
        assert.equal(endFrames, 0);
    } finally {
        container.input.poll = oldInputPoll;
        Music.poll = oldMusicPoll;
        store.poll = oldSoundPoll;
        backend.beginFrame = oldBeginFrame;
        backend.endFrame = oldEndFrame;
    }
});

test("loop resume resets timing and schedules exactly one RAF when ready", () => {
    installBrowserGlobals();
    const { container } = createContainer();
    const frames = [];
    globalThis.requestAnimationFrame = (callback) => {
        frames.push(callback);
        return 33;
    };
    container.started = true;
    container.loopReady = true;
    container.loopSuspended = true;
    container.storedDelta = 44;
    container.framesThisSecond = 7;
    container.fps = 12;
    container.fpsWindowStart = 123;

    container.setLoopSuspended(false);
    container.setLoopSuspended(false);

    assert.equal(container.isLoopSuspended(), false);
    assert.equal(container.animationFrame, 33);
    assert.equal(container.storedDelta, 0);
    assert.equal(container.framesThisSecond, 0);
    assert.equal(container.fps, 0);
    assert.equal(container.fpsWindowStart, container.lastFrameTime);
    assert.equal(frames.length, 1);
});

test("loop resume does not schedule until the container is ready", () => {
    installBrowserGlobals();
    const { container } = createContainer();
    let frames = 0;
    globalThis.requestAnimationFrame = () => {
        frames += 1;
        return 33;
    };

    container.loopSuspended = true;
    container.loopReady = true;
    container.started = false;
    container.destroyed = false;
    container.waitingForResources = false;
    container.setLoopSuspended(false);
    assert.equal(frames, 0);

    container.loopSuspended = true;
    container.loopReady = false;
    container.started = true;
    container.destroyed = false;
    container.waitingForResources = false;
    container.setLoopSuspended(false);
    assert.equal(frames, 0);

    container.loopSuspended = true;
    container.loopReady = true;
    container.started = true;
    container.destroyed = true;
    container.waitingForResources = false;
    container.setLoopSuspended(false);
    assert.equal(frames, 0);

    container.loopSuspended = true;
    container.loopReady = true;
    container.started = true;
    container.destroyed = false;
    container.waitingForResources = true;
    container.setLoopSuspended(false);
    assert.equal(frames, 0);
});

test("resource completion does not restart the RAF loop while suspended", async () => {
    installBrowserGlobals();
    const { container } = createContainer();
    const frames = [];
    let resolveResource;
    const tracked = ResourceLoader.track(
        new Promise((resolve) => {
            resolveResource = resolve;
        }),
        "images/suspended.png"
    );
    globalThis.requestAnimationFrame = (callback) => {
        frames.push(callback);
        return 55;
    };
    container.started = true;
    container.loopReady = true;

    try {
        container.loopFrame(16);
        assert.equal(container.waitingForResources, true);

        container.setLoopSuspended(true);
        resolveResource();
        await tracked;
        await Promise.resolve();
        await Promise.resolve();

        assert.equal(container.waitingForResources, false);
        assert.equal(container.animationFrame, 0);
        assert.equal(frames.length, 0);

        container.setLoopSuspended(false);

        assert.equal(container.animationFrame, 55);
        assert.equal(frames.length, 1);
    } finally {
        ResourceLoader.clearCache();
    }
});

test("AppGameContainer.destroy uses the default audio teardown path by default", () => {
    installBrowserGlobals();
    const { container } = createContainer();
    const events = [];
    const oldDestroy = AL.destroy;
    const oldDestroyPreservingAudioCache = AL.destroyPreservingAudioCache;

    AL.destroy = () => {
        events.push("destroy");
    };
    AL.destroyPreservingAudioCache = () => {
        events.push("destroyPreservingAudioCache");
    };

    try {
        assert.equal(container.isPreservingAudioCacheOnDestroy(), false);

        container.destroy();

        assert.deepEqual(events, ["destroy"]);
    } finally {
        AL.destroy = oldDestroy;
        AL.destroyPreservingAudioCache = oldDestroyPreservingAudioCache;
    }
});

test("AppGameContainer.destroy can preserve decoded audio cache on request", () => {
    installBrowserGlobals();
    const { container } = createContainer();
    const events = [];
    const oldDestroy = AL.destroy;
    const oldDestroyPreservingAudioCache = AL.destroyPreservingAudioCache;

    AL.destroy = () => {
        events.push("destroy");
    };
    AL.destroyPreservingAudioCache = () => {
        events.push("destroyPreservingAudioCache");
    };

    try {
        container.setPreserveAudioCacheOnDestroy(true);

        assert.equal(container.isPreservingAudioCacheOnDestroy(), true);

        container.destroy();

        assert.deepEqual(events, ["destroyPreservingAudioCache"]);
    } finally {
        AL.destroy = oldDestroy;
        AL.destroyPreservingAudioCache = oldDestroyPreservingAudioCache;
    }
});

test("InternalTextureLoader.clear disposes registered texture resources", () => {
    installBrowserGlobals();
    const loader = InternalTextureLoader.get();
    const backend = Renderer.getBackend();
    const oldGetContext = backend.getContext;
    const fakeGl = { tag: "gl" };
    const disposed = [];
    const resource = {
        dispose: (gl) => {
            disposed.push(gl);
        },
        ref: "images/thing.png"
    };

    backend.getContext = () => fakeGl;
    try {
        loader.register(resource);
        loader.clear("images/thing.png");
        loader.clear("images/thing.png");

        assert.deepEqual(disposed, [fakeGl]);

        loader.register(resource);
        loader.clear();

        assert.deepEqual(disposed, [fakeGl, fakeGl]);
    } finally {
        loader.unregister(resource);
        backend.getContext = oldGetContext;
    }
});

test("AppGameContainer.reinit rebuilds Java container state before game init", async () => {
    installBrowserGlobals();
    const { calls, container } = createContainer();
    const events = [];
    const backend = Renderer.getBackend();
    const oldBackendDispose = backend.dispose;
    const oldBackendInitialize = backend.initialize;
    const oldBackendInitDisplay = backend.initDisplay;
    const oldEnterOrtho = backend.enterOrtho;
    const oldTextureClear = InternalTextureLoader.get().clear;
    const store = SoundStore.get();
    const oldSoundClear = store.clear;
    const oldAlCreate = AL.create;
    const oldRequestAnimationFrame = globalThis.requestAnimationFrame;
    const oldCancelAnimationFrame = globalThis.cancelAnimationFrame;
    const handleStops = [];
    const fakeHandle = {
        pause: () => undefined,
        playing: () => true,
        stop: () => {
            handleStops.push("stop");
        }
    };
    let nextFrame = 40;

    container.started = true;
    container.animationFrame = 9;
    container.storedDelta = 44;
    container.framesThisSecond = 7;
    container.fps = 12;
    container.fpsWindowStart = 123;
    container.waitingForResources = true;
    container.resourceError = new Error("old resource error");
    container.setMusicVolume(0.25);
    container.setSoundVolume(0.5);
    store.track(fakeHandle);
    const oldGraphics = container.getGraphics();
    await assert.rejects(ResourceLoader.track(Promise.reject(new Error("decode failed")), "images/bad.png"));
    assert.equal(ResourceLoader.hasFailed(), true);

    calls.deltas.length = 0;
    container.game.init = () => {
        events.push("game.init");
        assert.deepEqual(handleStops, ["stop"]);
        assert.equal(ResourceLoader.hasFailed(), false);
        assert.equal(container.storedDelta, 0);
        assert.equal(container.waitingForResources, false);
        assert.equal(container.resourceError, null);
        assert.equal(container.getMusicVolume(), 1);
        assert.equal(container.getSoundVolume(), 1);
        assert.notEqual(container.getGraphics(), oldGraphics);
        assert.equal(container.getDefaultFont(), container.getGraphics().getFont());
    };
    backend.dispose = () => {
        events.push("renderer.dispose");
    };
    backend.initialize = () => {
        events.push("renderer.initialize");
    };
    backend.initDisplay = (width, height) => {
        events.push(`renderer.initDisplay:${width}x${height}`);
    };
    backend.enterOrtho = (width, height) => {
        events.push(`renderer.enterOrtho:${width}x${height}`);
    };
    InternalTextureLoader.get().clear = () => {
        events.push("texture.clear");
    };
    store.clear = () => {
        events.push("sound.clear");
        oldSoundClear.call(store);
    };
    AL.create = () => {
        events.push("al.create");
    };
    globalThis.cancelAnimationFrame = (id) => {
        events.push(`cancel:${id}`);
    };
    globalThis.requestAnimationFrame = () => {
        events.push(`raf:${nextFrame}`);
        return nextFrame++;
    };

    try {
        await container.reinit();

        assert.deepEqual(events, [
            "cancel:9",
            "texture.clear",
            "sound.clear",
            "renderer.dispose",
            "renderer.initialize",
            "al.create",
            "renderer.enterOrtho:800x600",
            "game.init",
            "raf:40"
        ]);
        assert.equal(container.animationFrame, 40);
        assert.equal(container.fps, 0);
        assert.equal(container.framesThisSecond, 0);
        assert.equal(calls.deltas.length, 0);
    } finally {
        backend.dispose = oldBackendDispose;
        backend.initialize = oldBackendInitialize;
        backend.initDisplay = oldBackendInitDisplay;
        backend.enterOrtho = oldEnterOrtho;
        InternalTextureLoader.get().clear = oldTextureClear;
        store.clear = oldSoundClear;
        AL.create = oldAlCreate;
        globalThis.requestAnimationFrame = oldRequestAnimationFrame;
        globalThis.cancelAnimationFrame = oldCancelAnimationFrame;
        ResourceLoader.clearCache();
        store.clear();
    }
});
