import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { PwaAudioManager } from "../dist/slick/openal/PwaAudioManager.js";
import { ResourceLoader } from "../dist/slick/util/ResourceLoader.js";
import { SoundStore } from "../dist/slick/openal/SoundStore.js";

class FakeAudioBuffer {
    constructor() {
        this.duration = 8;
    }
}
class FakeOfflineAudioContext {
    static decodes = 0;
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

function installAudioGlobals() {
    Object.defineProperty(globalThis, "OfflineAudioContext", { configurable: true, value: FakeOfflineAudioContext });
    Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: FakeAudioContext });
}

afterEach(() => {
    SoundStore.get().destroy();
    ResourceLoader.clearCache();
    FakeOfflineAudioContext.decodes = 0;
    FakeAudioContext.created = 0;
    FakeAudioContext.closed = 0;
    FakeAudioContext.resumed = 0;
    delete globalThis.OfflineAudioContext;
    delete globalThis.AudioContext;
});

test("PWA preload decodes without creating a playback context", async () => {
    installAudioGlobals();
    const manager = PwaAudioManager.get();
    manager.install();
    ResourceLoader.registerResource("tone.ogg", new Uint8Array([1, 2, 3, 4]));

    await SoundStore.get().preloadAudioBuffer("tone.ogg");

    assert.equal(FakeOfflineAudioContext.decodes, 1);
    assert.equal(FakeAudioContext.created, 0);
    assert.equal(manager.hasPlaybackGeneration(), false);
});

test("PWA menu retirement closes the old context and next start creates a fresh one", async () => {
    installAudioGlobals();
    const manager = PwaAudioManager.get();
    manager.install();

    assert.equal(await manager.beginPlaybackGeneration(), true);
    const firstGeneration = manager.getGeneration();
    assert.equal(FakeAudioContext.created, 1);
    assert.equal(manager.hasPlaybackGeneration(), true);

    manager.endPlaybackGeneration();
    assert.equal(manager.hasPlaybackGeneration(), false);
    assert.equal(FakeAudioContext.closed, 1);

    assert.equal(await manager.beginPlaybackGeneration(), true);
    assert.ok(manager.getGeneration() > firstGeneration);
    assert.equal(FakeAudioContext.created, 2);
    assert.equal(FakeAudioContext.resumed, 2);
});
