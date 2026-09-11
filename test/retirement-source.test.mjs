import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Load complete production modules, not copied/extracted methods. Browser and
// rendering services are explicit test doubles; this is not browser qualification.
function loadModule(path, imports, globals = {}) {
    const source = readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        fileName: path,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        reportDiagnostics: true
    });
    assert.equal(compiled.diagnostics?.length ?? 0, 0);
    const exports = {};
    vm.runInNewContext(compiled.outputText, {
        exports,
        require(name) {
            assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
            return imports[name];
        },
        AbortController, ArrayBuffer, AggregateError, Error, RangeError, TypeError,
        URL, performance, setTimeout, clearTimeout,
        console: { error() {}, warn() {} },
        ...globals
    }, { filename: path });
    return exports;
}

function audioFixture() {
    const trace = [];
    const contexts = [];
    class FakeContext {
        state = "running";
        currentTime = 0;
        destination = {};
        nodes = [];
        constructor() { contexts.push(this); }
        createGain() {
            const node = {
                gain: { value: 1 },
                connect() {},
                disconnect() { trace.push("disconnect"); }
            };
            this.nodes.push(node);
            return node;
        }
        resume() { trace.push("resume"); return Promise.resolve(); }
        close() { trace.push("close"); this.state = "closed"; return Promise.resolve(); }
        addEventListener() {}
        removeEventListener() { trace.push("remove-listener"); }
    }
    const { SoundStore } = loadModule("slick/openal/SoundStore.ts", {
        "../util/ResourceLoader.js": {
            ResourceLoadException: Error,
            ResourceLoader: { getResource: () => null, track: (promise) => promise }
        },
        "../util/BatchLoader.js": { runSettledBatch: () => { throw new Error("Unexpected load"); } },
        "../util/Log.js": { Log: { error() {} } }
    }, { AudioContext: FakeContext });
    const store = SoundStore.get();
    return { store, SoundStore, FakeContext, trace, contexts };
}

async function begin(f) {
    assert.equal(await f.store.beginPlaybackGenerationFromUserGesture(true), true);
    return f.store.getPlaybackGeneration();
}

function containerFixture(failAt = null) {
    const trace = [];
    const operation = (label, result) => () => {
        trace.push(label);
        if (label === failAt) throw new Error(`${label} failed`);
        return result;
    };
    const input = {
        unbind: operation("input"),
        setPreventDefaultElement: operation("input-capture")
    };
    class BaseContainer {
        constructor(game) { this.game = game; this.input = input; }
        setDimensions(w, h) { this.width = w; this.height = h; }
    }
    class DprMonitor { stop = operation("dpr"); }
    const backend = { dispose: operation("renderer"), handleContextLost: operation("lost-renderer") };
    const { AppGameContainer } = loadModule("slick/AppGameContainer.ts", {
        "../lwjgl/input/Mouse.js": { Mouse: { setGrabbed: operation("pointer", Promise.resolve()), setElement: operation("mouse") } },
        "../lwjgl/input/Cursor.js": { Cursor: class {} },
        "../lwjgl/openal/AL.js": { AL: { destroy: operation("audio"), destroyPreservingAudioCache: operation("audio-cache") } },
        "../lwjgl/opengl/Display.js": { Display: { destroy: operation("display"), setActiveContainer: operation("display-owner") } },
        "./Color.js": { Color: {} },
        "./GameContainer.js": { GameContainer: BaseContainer },
        "./Graphics.js": { Graphics: { __resetSharedState: operation("graphics") } },
        "./Image.js": { Image: { __resetUseState: operation("images") } },
        "./Music.js": { Music: {} },
        "./SpriteSheet.js": { SpriteSheet: { __resetUseState: operation("sprites") } },
        "./openal/SoundStore.js": { SoundStore: { get: () => ({ endPlaybackGeneration: operation("audio-generation") }) } },
        "./opengl/InternalTextureLoader.js": { InternalTextureLoader: { get: () => ({ clear: operation("textures"), invalidate: operation("invalidate-textures") }) } },
        "./opengl/renderer/Renderer.js": { Renderer: { getBackend: () => backend } },
        "./SlickException.js": { SlickException: Error },
        "./util/DevicePixelRatioMonitor.js": { DevicePixelRatioMonitor: DprMonitor },
        "./util/Log.js": { Log: { error: operation("log") } },
        "./util/ResourceLoader.js": { ResourceLoader: {} }
    }, {
        window: { removeEventListener: operation("window-listener"), visualViewport: { removeEventListener: operation("viewport-listener") } },
        document: { removeEventListener: operation("document-listener"), visibilityState: "visible" },
        requestAnimationFrame: operation("raf", 1),
        cancelAnimationFrame: operation("cancel-raf")
    });
    const app = new AppGameContainer({ getTitle: () => "test" });
    AppGameContainer.resourceOwner = app;
    return { app, AppGameContainer, trace };
}

test("normal retirement disconnects output, preserves decoded assets and logical preferences", async () => {
    const f = audioFixture();
    f.store.enableExplicitPlaybackGenerations();
    f.store.setMusicOn(false);
    f.store.setSoundsOn(false);
    f.store.setMusicVolume(0.35);
    const buffer = {};
    f.store.decodedBuffers.set("music", buffer);
    const generation = await begin(f);
    const gate = f.contexts[0].nodes[0];
    f.store.endPlaybackGeneration(generation);
    assert.equal(gate.gain.value, 0);
    assert.equal(f.store.hasPlaybackGeneration(), false);
    assert.equal(f.store.isLogicalPlaybackActive(), false);
    assert.equal(f.store.getDecodedAudioBuffer("music"), buffer);
    assert.equal(f.store.musicOn(), false);
    assert.equal(f.store.soundsOn(), false);
    assert.equal(f.store.getMusicVolume(), 0.35);
    assert.equal(f.trace.filter((step) => step === "close").length, 1);
});

test("stale retirement leaves a replacement context and generation untouched", async () => {
    const f = audioFixture();
    const first = await begin(f);
    const second = await begin(f);
    const context = f.store.getAudioContext();
    f.store.endPlaybackGeneration(first);
    assert.equal(f.store.getPlaybackGeneration(), second);
    assert.equal(f.store.getAudioContext(), context);
    f.store.endPlaybackGeneration(second);
});

test("a music detach failure cannot skip another handle, SFX, output disconnection or close", async () => {
    const f = audioFixture();
    const generation = await begin(f);
    f.store.track({ playing: () => true, stop() {}, detachPlaybackGeneration() { f.trace.push("music-fail"); throw new Error("detach failed"); } });
    f.store.track({ playing: () => true, stop() {}, detachPlaybackGeneration() { f.trace.push("music-second"); } });
    f.store.activeHandles.add({ playing: () => true, stop() { f.trace.push("sfx"); } });
    assert.throws(() => f.store.endPlaybackGeneration(generation), AggregateError);
    for (const label of ["music-fail", "music-second", "sfx", "disconnect", "close"]) assert.ok(f.trace.includes(label), label);
    assert.equal(f.store.hasPlaybackGeneration(), false);
    assert.equal(f.store.isPlaybackCommitted(), false);
    assert.ok(f.store.soundSources.every((handle) => handle === null));
    assert.throws(() => f.store.endPlaybackGeneration(), AggregateError);
    assert.throws(() => f.store.beginPlaybackGenerationFromUserGesture(), AggregateError);
    await assert.rejects(f.store.commitPlaybackGeneration(f.store.getPlaybackGeneration()), AggregateError);
    assert.equal(f.contexts.length, 1);
});

test("all output nodes and close are attempted even when one disconnect fails", async () => {
    const f = audioFixture();
    const generation = await begin(f);
    f.contexts[0].nodes[1].disconnect = () => { f.trace.push("failed-disconnect"); throw new Error("disconnect failed"); };
    assert.throws(() => f.store.endPlaybackGeneration(generation), AggregateError);
    assert.equal(f.trace.filter((step) => step === "disconnect").length, 2);
    assert.equal(f.trace.at(-1), "close");
    assert.equal(f.store.hasPlaybackGeneration(), false);
});

test("a rejected attach with safe graph retirement permits a logical silent session", async () => {
    const f = audioFixture();
    const generation = await begin(f);
    f.store.track({ playing: () => true, stop() {}, attachPlaybackGeneration: () => Promise.reject(new Error("attach failed")), detachPlaybackGeneration() {} });
    assert.equal(await f.store.commitPlaybackGeneration(generation), false);
    assert.equal(f.store.isSilentPlaybackActive(), true);
    assert.equal(f.store.hasPlaybackGeneration(), false);
    f.store.endPlaybackGeneration();
});

test("a rejected attach plus failed detach is not a successful silent session", async () => {
    const f = audioFixture();
    const generation = await begin(f);
    f.store.track({ playing: () => true, stop() {}, attachPlaybackGeneration: () => Promise.reject(new Error("attach failed")), detachPlaybackGeneration() { throw new Error("detach failed"); } });
    await assert.rejects(f.store.commitPlaybackGeneration(generation), AggregateError);
    assert.ok(f.trace.includes("close"));
    assert.equal(f.store.hasPlaybackGeneration(), false);
    assert.equal(f.store.isSilentPlaybackActive(), false);
    assert.throws(() => f.store.beginPlaybackGenerationFromUserGesture(), AggregateError);
});

test("ordinary init cannot bypass a latched retirement failure", async () => {
    const f = audioFixture();
    // Exercise the ordinary-container API, without changing private mode flags.
    f.store.init();
    f.store.soundBus.disconnect = () => { throw new Error("disconnect failed"); };
    assert.throws(() => f.store.endPlaybackGeneration(), AggregateError);
    assert.throws(() => f.store.init(), AggregateError);
    assert.equal(f.contexts.length, 1);
});

test("native close rejection does not undo already completed synchronous output retirement", async () => {
    const f = audioFixture();
    await begin(f);
    f.contexts[0].close = () => Promise.reject(new Error("native close rejected"));
    assert.doesNotThrow(() => f.store.endPlaybackGeneration());
    // The native promise and module live in separate VM realms in this fixture.
    for (let i = 0; i < 8; i++) await Promise.resolve();
    assert.equal(f.store.getPlaybackDiagnostics().closesSettled, 1);
    assert.equal(f.store.hasPlaybackGeneration(), false);
});

test("normal container destruction releases the shared owner and is idempotent", () => {
    const f = containerFixture();
    f.app.destroy();
    assert.equal(f.app.isDestroyed(), true);
    assert.equal(f.AppGameContainer.resourceOwner, null);
    const steps = f.trace.length;
    f.app.destroy();
    assert.equal(f.trace.length, steps);
});

for (const fault of ["input", "input-capture", "dpr", "window-listener", "viewport-listener", "document-listener", "pointer", "mouse", "textures", "renderer", "audio", "display"]) {
    test(`container teardown continues after ${fault} fails, but keeps replacement startup blocked`, async () => {
        const f = containerFixture(fault);
        let failure;
        assert.throws(() => f.app.destroy(), (error) => { failure = error; return true; });
        assert.equal(f.app.isDestroyed(), true);
        assert.ok(f.trace.includes("audio"));
        assert.ok(f.trace.includes("display-owner"));
        assert.equal(f.AppGameContainer.resourceOwner, f.app);
        assert.throws(() => f.app.destroy(), (error) => error === failure);
        const next = new f.AppGameContainer({ getTitle: () => "replacement" });
        await assert.rejects(next.start(), /Destroy the previous/);
    });
}

test("destroying a stale container cannot destroy a different shared owner", () => {
    const f = containerFixture();
    const stale = new f.AppGameContainer({ getTitle: () => "stale" });
    stale.destroy();
    assert.equal(f.AppGameContainer.resourceOwner, f.app);
    assert.ok(!f.trace.includes("audio"));
    assert.ok(!f.trace.includes("renderer"));
    f.app.destroy();
});

test("frame error reporting still reaches the shell when teardown also fails", () => {
    const f = containerFixture("audio");
    const original = new Error("game frame failed");
    let reported;
    f.app.setErrorHandler((error) => { reported = error; });
    assert.doesNotThrow(() => f.app.reportError(original));
    assert.ok(reported instanceof AggregateError);
    assert.equal(reported.errors[0], original);
    assert.equal(f.AppGameContainer.resourceOwner, f.app);
});

test("a failed graphics-loss cleanup cannot leave a resumable container", () => {
    const f = containerFixture("lost-renderer");
    let notified = 0;
    let reported;
    f.app.setGraphicsLifecycleHandler(() => notified++);
    f.app.setErrorHandler((error) => { reported = error; });
    assert.doesNotThrow(() => f.app.handleWebGLContextLost({ preventDefault() {} }));
    assert.equal(notified, 1);
    assert.equal(f.app.isDestroyed(), true);
    assert.ok(reported instanceof Error);
    f.app.setLoopSuspended(false);
    assert.ok(!f.trace.includes("raf"));
});

function playbackFixture() {
    const f = audioFixture();
    const { PwaAudioManager } = loadModule("slick/openal/PwaAudioManager.ts", {
        "./SoundStore.js": { SoundStore: f.SoundStore }
    });
    const { PlaybackSession } = loadModule("slick/openal/PlaybackSession.ts", {
        "./PwaAudioManager.js": { PwaAudioManager }
    });
    return { ...f, session: new PlaybackSession() };
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

async function flush() {
    for (let i = 0; i < 16; i++) await Promise.resolve();
}

test("actual facade/session wiring creates audio synchronously, then opens output only on commit", async () => {
    const f = playbackFixture();
    const attempt = f.session.begin();
    assert.equal(f.contexts.length, 1);
    assert.equal(f.trace.filter((label) => label === "resume").length, 1);
    assert.equal(await attempt.ready, true);
    assert.equal(f.contexts[0].nodes[0].gain.value, 0);
    assert.equal(f.store.isLogicalPlaybackActive(), false);
    assert.equal(await f.session.commit(attempt), true);
    assert.equal(f.contexts[0].nodes[0].gain.value, 1);
    f.session.cancel();
});

test("actual retirement failure is visible on cancellation and on every subsequent safety check", async () => {
    const f = playbackFixture();
    const attempt = f.session.begin();
    await attempt.ready;
    await f.session.commit(attempt);
    f.store.track({ playing: () => true, stop() {}, detachPlaybackGeneration() { throw new Error("detach failed"); } });
    assert.throws(() => f.session.cancel(), /Playback retirement failed/);
    assert.throws(() => f.session.cancel(), /Playback retirement failed/);
    assert.throws(() => f.session.assertRetirementSafe(), /Playback retirement failed/);
    assert.equal(await f.session.begin().ready, false);
    assert.equal(f.contexts.length, 1);
    assert.equal(f.store.hasPlaybackGeneration(), false);
});

test("a missing audio output is accepted only as an explicitly committed silent clock", async () => {
    const f = playbackFixture();
    f.FakeContext.prototype.resume = () => Promise.reject(new Error("output unavailable"));
    const attempt = f.session.begin();
    assert.equal(await attempt.ready, true);
    assert.equal(f.store.isLogicalPlaybackActive(), false);
    assert.equal(await f.session.commit(attempt), true);
    assert.equal(f.store.isSilentPlaybackActive(), true);
    f.session.cancel();
    assert.equal(f.store.isSilentPlaybackActive(), false);
});

test("cancellation during native resume cannot leave a newly constructed context owned", async () => {
    const f = playbackFixture();
    f.FakeContext.prototype.resume = () => { f.session.cancel(); return Promise.resolve(); };
    const attempt = f.session.begin();
    assert.equal(await attempt.ready, false);
    assert.equal(await f.session.commit(attempt), false);
    assert.equal(f.store.hasPlaybackGeneration(), false);
    assert.equal(f.store.isLogicalPlaybackActive(), false);
});

for (const outcome of ["resolve", "reject"]) {
    test(`late ${outcome} from an old attach cannot disturb a newer committed context`, async () => {
        const f = playbackFixture();
        const pending = deferred();
        let count = 0;
        f.store.track({
            playing: () => true, stop() {}, detachPlaybackGeneration() {},
            attachPlaybackGeneration() { return ++count === 1 ? pending.promise : Promise.resolve(); }
        });
        const first = f.session.begin();
        await first.ready;
        const oldCommit = f.session.commit(first);
        await flush();
        assert.equal(count, 1);
        f.session.cancel();
        const second = f.session.begin();
        await second.ready;
        assert.equal(await f.session.commit(second), true);
        const context = f.store.getAudioContext();
        pending[outcome](outcome === "reject" ? new Error("obsolete failure") : undefined);
        assert.equal(await oldCommit, false);
        assert.equal(f.session.isCurrent(second), true);
        assert.equal(f.store.getAudioContext(), context);
        assert.equal(f.contexts[1].nodes[0].gain.value, 1);
        f.session.cancel();
    });
}

test("failed attachment and unsafe retirement cannot pass the session's silent-fallback boundary", async () => {
    const f = playbackFixture();
    const attempt = f.session.begin();
    await attempt.ready;
    f.store.track({
        playing: () => true, stop() {},
        detachPlaybackGeneration() { throw new Error("detach failed"); },
        attachPlaybackGeneration() { return Promise.reject(new Error("attach failed")); }
    });
    assert.equal(await f.session.commit(attempt), false);
    assert.equal(f.store.isSilentPlaybackActive(), false);
    assert.throws(() => f.session.assertRetirementSafe(), /Playback retirement failed/);
    assert.equal(await f.session.begin().ready, false);
});

for (const preserve of [false, true]) {
    test(`OpenAL teardown still retires hardware after logical music reset fails (preserve=${preserve})`, () => {
        const trace = [];
        const store = { init() {}, destroy() { trace.push("destroy"); }, destroyPreservingAudioCache() { trace.push("cache"); } };
        const { AL } = loadModule("lwjgl/openal/AL.ts", {
            "../../slick/Music.js": { Music: { resetPlaybackState() { throw new Error("music reset failed"); } } },
            "../../slick/openal/SoundStore.js": { SoundStore: { get: () => store } }
        });
        AL.create();
        assert.equal(AL.isCreated(), true);
        assert.throws(() => preserve ? AL.destroyPreservingAudioCache() : AL.destroy(), AggregateError);
        assert.deepEqual(trace, [preserve ? "cache" : "destroy"]);
        assert.equal(AL.isCreated(), false);
    });
}
