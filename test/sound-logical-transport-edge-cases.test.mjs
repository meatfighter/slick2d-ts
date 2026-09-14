import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ResourceLoader, Sound, SoundStore } from "../dist/index.js";

class FakeAudioBuffer {
    constructor() {
        this.duration = 10;
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

    stop() {
        this.onended?.();
    }
}

class FakeAudioContext {
    static created = [];

    constructor() {
        this.currentTime = 0;
        this.destination = {};
        this.state = "suspended";
        FakeAudioContext.created.push(this);
    }

    createGain() {
        return { connect() {}, disconnect() {}, gain: { value: 1 } };
    }

    createBufferSource() {
        return new FakeAudioSource();
    }

    resume() {
        this.state = "running";
        return Promise.resolve();
    }

    close() {
        this.state = "closed";
        return Promise.resolve();
    }

    addEventListener() {}
    removeEventListener() {}
}

class FailFirstSourceAudioContext extends FakeAudioContext {
    static sourceCalls = 0;

    createBufferSource() {
        if (FailFirstSourceAudioContext.sourceCalls++ === 0) {
            throw new Error("source creation failed");
        }
        return super.createBufferSource();
    }
}

class AlwaysFailSourceAudioContext extends FakeAudioContext {
    createBufferSource() {
        throw new Error("source creation failed");
    }
}

class FakeOfflineAudioContext {
    decodeAudioData(_bytes, ok) {
        const buffer = new FakeAudioBuffer();
        ok?.(buffer);
        return Promise.resolve(buffer);
    }
}

class DelayedOfflineAudioContext {
    static pending = [];

    decodeAudioData(_bytes, ok) {
        return new Promise((resolve) => {
            DelayedOfflineAudioContext.pending.push(() => {
                const buffer = new FakeAudioBuffer();
                ok?.(buffer);
                resolve(buffer);
            });
        });
    }
}

function installAudioGlobals(offlineContext = FakeOfflineAudioContext, playbackContext = FakeAudioContext) {
    Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: playbackContext, writable: true });
    Object.defineProperty(globalThis, "OfflineAudioContext", { configurable: true, value: offlineContext, writable: true });
}

function registerTone() {
    ResourceLoader.registerResource("tone.ogg", new Uint8Array([1, 2, 3, 4]));
}

async function settle() {
    for (let i = 0; i < 12; i++) {
        await Promise.resolve();
    }
}

async function beginCommitted(store) {
    assert.equal(await store.beginPlaybackGenerationFromUserGesture(true), true);
    assert.equal(await store.commitPlaybackGeneration(store.getPlaybackGeneration()), true);
}

afterEach(() => {
    try {
        SoundStore.get().destroy();
    } catch {
        // The final teardown-hardening test intentionally latches a retirement failure.
    }
    try {
        SoundStore.get().setMaxSources(64);
    } catch {
        // A latched failure is confined to this test-file worker.
    }
    ResourceLoader.clearCache();
    FakeAudioSource.created = [];
    FakeAudioContext.created = [];
    FailFirstSourceAudioContext.sourceCalls = 0;
    DelayedOfflineAudioContext.pending = [];
    delete globalThis.AudioContext;
    delete globalThis.OfflineAudioContext;
});

test("exact-end completion survives generation retirement without running during retirement or commit", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    await store.preloadAudioBuffer("tone.ogg");
    await beginCommitted(store);
    let ended = 0;

    const voice = store.playSound("tone.ogg", 1, 1, false, () => ended++);
    assert.notEqual(voice, null);
    await settle();
    FakeAudioContext.created.at(-1).currentTime = 10;

    store.endPlaybackGeneration();

    assert.equal(ended, 0, "retirement must not execute a game completion callback");
    assert.equal(voice.playing(), true);

    await beginCommitted(store);
    await settle();

    assert.equal(ended, 0, "audio commit must not execute a game completion callback");
    assert.equal(voice.playing(), true);
    assert.equal(store.getPlaybackDiagnostics().effects, 0, "an already-finished sample must not be restarted");
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 1);

    store.poll(0);

    assert.equal(ended, 1);
    assert.equal(voice.playing(), false);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 0);
});

test("stopping a voice while decode is pending prevents any late generation attachment", async () => {
    installAudioGlobals(DelayedOfflineAudioContext);
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await beginCommitted(store);

    sound.play();
    const voice = sound.active;
    assert.notEqual(voice, null);
    assert.equal(FakeAudioSource.created.length, 0);

    sound.stop();
    assert.equal(voice.playing(), false);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 0);

    DelayedOfflineAudioContext.pending[0]();
    await sound.ready();
    await settle();

    assert.equal(FakeAudioSource.created.length, 0);
    assert.equal(sound.playing(), false);

    store.endPlaybackGeneration();
    await beginCommitted(store);
    await settle();

    assert.equal(FakeAudioSource.created.length, 0);
});

test("failed initial native Sound graph releases its logical source slot for a later play", async () => {
    installAudioGlobals(FakeOfflineAudioContext, FailFirstSourceAudioContext);
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(3);
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.play();
    await settle();

    assert.equal(sound.playing(), false);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 0);

    sound.play();
    await settle();

    assert.equal(sound.playing(), true);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 1);
    assert.equal(store.getPlaybackDiagnostics().effects, 1);
});

test("SFX reattach failure retires the partial graph and preserves the logical voice for silent gameplay", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.loop();
    await settle();
    FakeAudioContext.created.at(-1).currentTime = 1.75;
    store.endPlaybackGeneration();

    Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: AlwaysFailSourceAudioContext, writable: true });
    assert.equal(await store.beginPlaybackGenerationFromUserGesture(true), true);
    assert.equal(await store.commitPlaybackGeneration(store.getPlaybackGeneration()), false);

    assert.equal(store.hasPlaybackGeneration(), false);
    assert.equal(store.isSilentPlaybackActive(), true);
    assert.equal(store.getPlaybackDiagnostics().effects, 0);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 1);
    assert.equal(sound.capturePlaybackState().voices[0].positionSeconds, 1.75);

    store.poll(250);

    assert.equal(sound.capturePlaybackState().voices[0].positionSeconds, 2);
});

test("terminal cache-preserving destroy still stops logical handles when generation detach fails", async () => {
    installAudioGlobals();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    await beginCommitted(store);
    let stopped = 0;

    store.track({
        playing: () => true,
        stop: () => stopped++,
        detachPlaybackGeneration: () => {
            throw new Error("detach failed");
        }
    });

    assert.throws(() => store.destroyPreservingAudioCache(), /retire the playback generation safely/);
    assert.equal(stopped, 1, "terminal teardown must still attempt logical stop after retirement failure");
});
