import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, test } from "node:test";
import { Music } from "../dist/slick/Music.js";
import { PwaAudioManager } from "../dist/slick/openal/PwaAudioManager.js";
import { ResourceLoader } from "../dist/slick/util/ResourceLoader.js";
import { SoundStore } from "../dist/slick/openal/SoundStore.js";

class FakeAudioBuffer {
    constructor() {
        this.duration = 8;
    }
}

class FakeAudioSource {
    static created = [];

    constructor() {
        this.buffer = null;
        this.loop = false;
        this.onended = null;
        this.playbackRate = { value: 1 };
        this.startCalls = [];
        FakeAudioSource.created.push(this);
    }

    connect() {}

    disconnect() {}

    start(when = 0, offset = 0) {
        this.startCalls.push({ when, offset });
    }

    stop() {}

    finish() {
        this.onended?.();
    }
}

class FakeOfflineAudioContext {
    static created = 0;
    static decodes = 0;

    constructor() {
        FakeOfflineAudioContext.created++;
    }

    decodeAudioData(_bytes, ok) {
        FakeOfflineAudioContext.decodes++;
        const buffer = new FakeAudioBuffer();
        ok?.(buffer);
        return Promise.resolve(buffer);
    }
}

class FakeAudioContext {
    static created = 0;
    static closed = 0;
    static resumed = 0;

    constructor() {
        FakeAudioContext.created++;
        this.state = "suspended";
        this.currentTime = 0;
        this.destination = {};
    }

    createBufferSource() {
        return new FakeAudioSource();
    }

    createGain() {
        return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }

    resume() {
        FakeAudioContext.resumed++;
        this.state = "running";
        return Promise.resolve();
    }

    close() {
        FakeAudioContext.closed++;
        this.state = "closed";
        return Promise.resolve();
    }
}

class DeferredResumeAudioContext extends FakeAudioContext {
    static pending = [];

    resume() {
        FakeAudioContext.resumed++;
        return new Promise((resolve) => {
            DeferredResumeAudioContext.pending.push(() => {
                this.state = "running";
                resolve();
            });
        });
    }
}

function installAudioGlobals({ offline = true, audioContext = FakeAudioContext } = {}) {
    if (offline) {
        Object.defineProperty(globalThis, "OfflineAudioContext", { configurable: true, value: FakeOfflineAudioContext });
    }
    Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: audioContext });
}

async function settleAudioStart() {
    for (let i = 0; i < 8; i++) {
        await Promise.resolve();
    }
}

afterEach(() => {
    Music.resetPlaybackState();
    SoundStore.get().destroy();
    ResourceLoader.clearCache();
    FakeOfflineAudioContext.created = 0;
    FakeOfflineAudioContext.decodes = 0;
    FakeAudioContext.created = 0;
    FakeAudioContext.closed = 0;
    FakeAudioContext.resumed = 0;
    FakeAudioSource.created = [];
    DeferredResumeAudioContext.pending = [];
    delete globalThis.OfflineAudioContext;
    delete globalThis.AudioContext;
});

test("PWA mode decodes without creating or lazily exposing a playback context", async () => {
    installAudioGlobals();
    const manager = PwaAudioManager.get();
    manager.install();
    ResourceLoader.registerResource("tone.ogg", new Uint8Array([1, 2, 3, 4]));

    assert.equal(SoundStore.get().getAudioContext(), null);
    await SoundStore.get().preloadAudioBuffer("tone.ogg");

    assert.equal(FakeOfflineAudioContext.decodes, 1);
    assert.equal(FakeAudioContext.created, 0);
    assert.equal(manager.hasPlaybackGeneration(), false);
    assert.equal(SoundStore.get().getAudioContext(), null);
    assert.equal(FakeAudioContext.created, 0);
});

test("PWA preload batch reuses one OfflineAudioContext and releases it after the batch", async () => {
    installAudioGlobals();
    const manager = PwaAudioManager.get();
    manager.install();
    ResourceLoader.registerResource("first.ogg", new Uint8Array([1]));
    ResourceLoader.registerResource("second.ogg", new Uint8Array([2]));
    ResourceLoader.registerResource("later.ogg", new Uint8Array([3]));

    await SoundStore.get().preloadAudioBuffers(["first.ogg", "second.ogg"], { concurrency: 1 });

    assert.equal(FakeOfflineAudioContext.created, 1);
    assert.equal(FakeOfflineAudioContext.decodes, 2);

    await SoundStore.get().preloadAudioBuffer("later.ogg");

    assert.equal(FakeOfflineAudioContext.created, 2);
    assert.equal(FakeOfflineAudioContext.decodes, 3);
    assert.equal(FakeAudioContext.created, 0);
});

test("PWA preload never falls back to a hardware playback context when OfflineAudioContext is unavailable", async () => {
    installAudioGlobals({ offline: false });
    const manager = PwaAudioManager.get();
    manager.install();
    ResourceLoader.registerResource("no-offline.ogg", new Uint8Array([1, 2, 3, 4]));

    await assert.rejects(
        SoundStore.get().preloadAudioBuffer("no-offline.ogg"),
        (error) => error?.kind === "decode" && error?.phase === "decode"
    );

    assert.equal(FakeAudioContext.created, 0);
    assert.equal(manager.hasPlaybackGeneration(), false);
});

test("PWA menu retirement preserves logical audio flags while replacing the physical context", async () => {
    installAudioGlobals();
    const manager = PwaAudioManager.get();
    manager.install();

    assert.equal(await manager.beginPlaybackGeneration(), true);
    const firstGeneration = manager.getGeneration();
    const firstContext = SoundStore.get().getAudioContext();
    SoundStore.get().setMusicOn(false);
    SoundStore.get().setSoundsOn(false);

    manager.endPlaybackGeneration();

    assert.equal(manager.hasPlaybackGeneration(), false);
    assert.equal(SoundStore.get().getAudioContext(), null);
    assert.equal(firstContext.state, "closed");
    assert.equal(FakeAudioContext.closed, 1);

    assert.equal(await manager.beginPlaybackGeneration(), true);
    assert.ok(manager.getGeneration() > firstGeneration);
    assert.equal(FakeAudioContext.created, 2);
    assert.equal(FakeAudioContext.resumed, 2);
    assert.notEqual(SoundStore.get().getAudioContext(), firstContext);
    assert.equal(SoundStore.get().musicOn(), false);
    assert.equal(SoundStore.get().soundsOn(), false);
});

test("late resume settlement from a retired playback generation cannot reclaim ownership", async () => {
    installAudioGlobals({ audioContext: DeferredResumeAudioContext });
    const manager = PwaAudioManager.get();
    manager.install();

    const activation = manager.beginPlaybackGeneration();
    const oldContext = SoundStore.get().getAudioContext();
    assert.equal(DeferredResumeAudioContext.pending.length, 1);
    assert.equal(manager.hasPlaybackGeneration(), true);

    manager.endPlaybackGeneration();
    assert.equal(manager.hasPlaybackGeneration(), false);
    assert.equal(SoundStore.get().getAudioContext(), null);

    DeferredResumeAudioContext.pending[0]();

    assert.equal(await activation, false);
    assert.equal(SoundStore.get().getAudioContext(), null);
    assert.equal(manager.hasPlaybackGeneration(), false);
    assert.equal(oldContext.state, "running");
});

test("PWA Continue rebuilds looping music at its preserved position on the fresh generation", async () => {
    installAudioGlobals();
    const manager = PwaAudioManager.get();
    manager.install();
    ResourceLoader.registerResource("music.ogg", new Uint8Array([1, 2, 3, 4]));
    await SoundStore.get().preloadAudioBuffer("music.ogg");
    assert.equal(await manager.beginPlaybackGeneration(), true);

    const music = new Music("music.ogg");
    await music.ready();
    music.loop();
    await settleAudioStart();
    const firstSource = FakeAudioSource.created.at(-1);
    SoundStore.get().getAudioContext().currentTime = 3.25;

    manager.endPlaybackGeneration();

    assert.equal(music.playing(), true);
    assert.equal(manager.hasPlaybackGeneration(), false);
    assert.equal(SoundStore.get().getAudioContext(), null);

    assert.equal(await manager.beginPlaybackGeneration(), true);
    await settleAudioStart();

    const resumedSource = FakeAudioSource.created.at(-1);
    assert.notEqual(resumedSource, firstSource);
    assert.equal(resumedSource.startCalls[0].offset, 3.25);
    assert.equal(music.playing(), true);
});

test("PWA generation replacement preserves an explicitly paused Music without restarting it", async () => {
    installAudioGlobals();
    const manager = PwaAudioManager.get();
    manager.install();
    ResourceLoader.registerResource("paused.ogg", new Uint8Array([1, 2, 3, 4]));
    await SoundStore.get().preloadAudioBuffer("paused.ogg");
    assert.equal(await manager.beginPlaybackGeneration(), true);

    const music = new Music("paused.ogg");
    await music.ready();
    music.loop();
    await settleAudioStart();
    music.pause();
    const sourceCount = FakeAudioSource.created.length;

    manager.endPlaybackGeneration();
    assert.equal(await manager.beginPlaybackGeneration(), true);
    await settleAudioStart();

    assert.equal(music.isPaused(), true);
    assert.equal(music.playing(), false);
    assert.equal(FakeAudioSource.created.length, sourceCount);
});

test("PWA retirement cannot resurrect a naturally ended track before the next Music poll", async () => {
    installAudioGlobals();
    const manager = PwaAudioManager.get();
    manager.install();
    ResourceLoader.registerResource("ended.ogg", new Uint8Array([1, 2, 3, 4]));
    await SoundStore.get().preloadAudioBuffer("ended.ogg");
    assert.equal(await manager.beginPlaybackGeneration(), true);

    const music = new Music("ended.ogg");
    await music.ready();
    music.play();
    await settleAudioStart();
    FakeAudioSource.created.at(-1).finish();
    const sourceCount = FakeAudioSource.created.length;

    SoundStore.get().setMusicOn(false);
    manager.endPlaybackGeneration();
    assert.equal(await manager.beginPlaybackGeneration(), true);
    SoundStore.get().setMusicOn(true);
    music.resume();
    await settleAudioStart();

    assert.equal(FakeAudioSource.created.length, sourceCount);
    assert.equal(music.playing(), true);
    Music.poll(0);
    assert.equal(music.playing(), false);
});

test("AppGameContainer teardown is idempotent and does not invoke legacy audio recovery", () => {
    const source = readFileSync(new URL("../src/slick/AppGameContainer.ts", import.meta.url), "utf8");
    const destroy = source.slice(source.indexOf("public destroy(): void"), source.indexOf("public override setDefaultMouseCursor"));
    assert.match(destroy, /if \(this\.destroyed\) \{\s*return;\s*\}/);
    assert.doesNotMatch(source, /BrowserAudioLifecycle/);
});
