import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Music, SoundStore } from "../dist/index.js";

class WorkingContext {
    static created = 0;

    constructor() {
        WorkingContext.created++;
        this.state = "suspended";
        this.destination = {};
        this.currentTime = 0;
    }

    createGain() {
        return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }

    resume() {
        this.state = "running";
        return Promise.resolve();
    }

    close() {
        this.state = "closed";
        return Promise.resolve();
    }
}

class FailedConstructor {
    constructor() {
        throw new Error("hardware unavailable");
    }
}

class FailedGain extends WorkingContext {
    createGain() {
        throw new Error("gain unavailable");
    }
}

function setAudioContext(value) {
    if (value === undefined) {
        delete globalThis.AudioContext;
        delete globalThis.webkitAudioContext;
        return;
    }
    Object.defineProperty(globalThis, "AudioContext", {
        configurable: true,
        value,
        writable: true
    });
}

function freshStore() {
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    return store;
}

afterEach(() => {
    Music.resetPlaybackState();
    try {
        SoundStore.get().destroy();
    } catch {
        // A test that deliberately latches unsafe retirement asserts that state itself.
    }
    WorkingContext.created = 0;
    delete globalThis.AudioContext;
    delete globalThis.webkitAudioContext;
});

for (const [name, ctor] of [
    ["missing API", undefined],
    ["constructor failure", FailedConstructor],
    ["gain-node failure", FailedGain]
]) {
    test(`first PWA ${name} preserves logical audio defaults`, async () => {
        setAudioContext(ctor);
        const store = freshStore();

        assert.equal(await store.beginPlaybackGenerationFromUserGesture(), false);
        assert.equal(store.hasPlaybackGeneration(), false);
        assert.equal(store.soundWorks(), false);
        assert.equal(store.musicOn(), true);
        assert.equal(store.soundsOn(), true);
    });

    test(`Continue can create a fresh generation after first PWA ${name}`, async () => {
        setAudioContext(ctor);
        const store = freshStore();
        assert.equal(await store.beginPlaybackGenerationFromUserGesture(), false);

        store.setMusicOn(false);
        store.setSoundsOn(true);
        store.endPlaybackGeneration();
        setAudioContext(WorkingContext);

        assert.equal(await store.beginPlaybackGenerationFromUserGesture(), true);
        assert.equal(store.hasPlaybackGeneration(), true);
        assert.equal(store.musicOn(), false);
        assert.equal(store.soundsOn(), true);
    });
}

test("successful PWA retry does not overwrite an intentional disabled-audio choice", async () => {
    setAudioContext(undefined);
    const store = freshStore();
    await store.beginPlaybackGenerationFromUserGesture();
    store.setMusicOn(false);
    store.setSoundsOn(false);

    setAudioContext(WorkingContext);
    assert.equal(await store.beginPlaybackGenerationFromUserGesture(), true);
    assert.equal(store.musicOn(), false);
    assert.equal(store.soundsOn(), false);
});

test("physical generation replacement retains independently selected music and sound flags", async () => {
    setAudioContext(WorkingContext);
    const store = freshStore();

    assert.equal(await store.beginPlaybackGenerationFromUserGesture(), true);
    const firstGeneration = store.getPlaybackGeneration();
    store.setMusicOn(false);
    store.setSoundsOn(true);
    store.endPlaybackGeneration(firstGeneration);

    assert.equal(store.hasPlaybackGeneration(), false);
    assert.equal(await store.beginPlaybackGenerationFromUserGesture(), true);
    assert.ok(store.getPlaybackGeneration() > firstGeneration);
    assert.equal(store.musicOn(), false);
    assert.equal(store.soundsOn(), true);
    assert.equal(WorkingContext.created, 2);
});
