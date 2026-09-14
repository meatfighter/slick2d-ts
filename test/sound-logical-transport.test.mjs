import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, test } from "node:test";
import { ResourceLoader, Sound, SoundStore } from "../dist/index.js";

class FakeAudioBuffer {
    static duration = 10;

    constructor() {
        this.duration = FakeAudioBuffer.duration;
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
        this.stopped = false;
        FakeAudioSource.created.push(this);
    }

    connect() {}
    disconnect() {}

    start(when = 0, offset = 0) {
        this.startCalls.push({ when, offset });
    }

    stop() {
        this.stopped = true;
        this.onended?.();
    }

    finish() {
        this.onended?.();
    }
}

class FakePanner {
    constructor() {
        this.panningModel = "";
        this.distanceModel = "";
        this.refDistance = 0;
        this.maxDistance = 0;
        this.rolloffFactor = 0;
        this.positionX = { value: 0 };
        this.positionY = { value: 0 };
        this.positionZ = { value: 0 };
    }

    connect() {}
    disconnect() {}
}

class FakeAudioContext {
    static created = [];

    constructor() {
        this.state = "suspended";
        this.currentTime = 0;
        this.destination = {};
        FakeAudioContext.created.push(this);
    }

    createGain() {
        return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }

    createBufferSource() {
        return new FakeAudioSource();
    }

    createPanner() {
        return new FakePanner();
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

function installAudioGlobals(offline = FakeOfflineAudioContext) {
    Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: FakeAudioContext, writable: true });
    Object.defineProperty(globalThis, "OfflineAudioContext", { configurable: true, value: offline, writable: true });
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
        // No test in this file intentionally latches an unsafe retirement failure.
    }
    SoundStore.get().setMaxSources(64);
    ResourceLoader.clearCache();
    FakeAudioBuffer.duration = 10;
    FakeAudioSource.created = [];
    FakeAudioContext.created = [];
    DelayedOfflineAudioContext.pending = [];
    delete globalThis.AudioContext;
    delete globalThis.OfflineAudioContext;
});

test("PWA generation replacement resumes one-shot Sound at its exact logical offset", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.play();
    await settle();
    FakeAudioContext.created.at(-1).currentTime = 1.5;

    store.endPlaybackGeneration();

    assert.equal(sound.playing(), true);
    assert.equal(sound.capturePlaybackState().voices[0].positionSeconds, 1.5);
    assert.equal(store.getPlaybackDiagnostics().effects, 0);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 1);

    store.poll(5000);
    assert.equal(sound.capturePlaybackState().voices[0].positionSeconds, 1.5);

    await beginCommitted(store);
    await settle();

    assert.equal(FakeAudioSource.created.at(-1).startCalls.at(-1).offset, 1.5);
    assert.equal(store.getPlaybackDiagnostics().effects, 1);
});

test("repeated generation replacement does not compound Sound offsets", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.play();
    await settle();
    FakeAudioContext.created.at(-1).currentTime = 1.25;
    store.endPlaybackGeneration();
    await beginCommitted(store);
    await settle();
    assert.equal(FakeAudioSource.created.at(-1).startCalls.at(-1).offset, 1.25);

    FakeAudioContext.created.at(-1).currentTime = 2;
    store.endPlaybackGeneration();
    assert.equal(sound.capturePlaybackState().voices[0].positionSeconds, 3.25);
    await beginCommitted(store);
    await settle();
    assert.equal(FakeAudioSource.created.at(-1).startCalls.at(-1).offset, 3.25);
});

test("Sound keeps every overlapping voice while stop and playing remain latest-voice-only", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.loop();
    const first = sound.active;
    sound.loop();
    const second = sound.active;
    await settle();

    sound.stop();

    assert.equal(second.playing(), false);
    assert.equal(first.playing(), true);
    assert.equal(sound.playing(), false);
    const snapshot = sound.capturePlaybackState();
    assert.equal(snapshot.voices.length, 1);
    assert.equal(snapshot.activeVoiceIndex, null);
});

test("restoring active-null polyphony preserves Sound.playing semantics", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.loop();
    sound.loop();
    sound.stop();
    const snapshot = sound.capturePlaybackState();
    store.stopSoundEffects();

    sound.restorePlaybackState(snapshot);

    assert.equal(sound.playing(), false);
    assert.equal(sound.capturePlaybackState().voices.length, 1);
    store.endPlaybackGeneration();
    await beginCommitted(store);
    await settle();
    assert.equal(store.getPlaybackDiagnostics().effects, 1);
    assert.equal(sound.playing(), false);
});

test("detached logical source retains sourceId and can be explicitly stopped in the menu", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.loop();
    const sourceId = sound.active.sourceId;
    store.endPlaybackGeneration();

    store.stopSoundEffect(sourceId);

    assert.equal(sound.playing(), false);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 0);
});

test("global sounds-off remains non-retroactive across generation replacement", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.loop();
    await settle();
    store.setSoundsOn(false);
    store.endPlaybackGeneration();
    await beginCommitted(store);
    await settle();

    assert.equal(sound.playing(), true);
    assert.equal(store.getPlaybackDiagnostics().effects, 1);
    sound.play();
    assert.equal(sound.active, null);
});

test("restored Sound gain and playAt coordinates survive generation replacement", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    store.setSoundVolume(0.5);
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.playAt(1, 0.5, 4, 5, 6);
    await settle();
    const snapshot = sound.capturePlaybackState();
    assert.equal(snapshot.voices[0].gain, 0.125);
    assert.deepEqual(snapshot.voices[0].spatialPosition, { x: 4, y: 5, z: 6 });

    store.setSoundVolume(0.1);
    store.endPlaybackGeneration();
    await beginCommitted(store);
    await settle();

    assert.equal(sound.capturePlaybackState().voices[0].gain, 0.125);
    assert.deepEqual(sound.capturePlaybackState().voices[0].spatialPosition, { x: 4, y: 5, z: 6 });
});

test("accepted silent gameplay advances detached Sound and completes a one-shot", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.play();
    await settle();
    FakeAudioContext.created.at(-1).currentTime = 2;
    store.endPlaybackGeneration();
    delete globalThis.AudioContext;

    assert.equal(await store.beginPlaybackGenerationFromUserGesture(true), false);
    assert.equal(await store.commitPlaybackGeneration(store.getPlaybackGeneration()), false);
    store.poll(1000);
    assert.equal(sound.capturePlaybackState().voices[0].positionSeconds, 3);
    store.poll(7000);
    assert.equal(sound.capturePlaybackState().voices.length, 0);
});

test("accepted silent gameplay wraps a detached looping Sound", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.loop();
    await settle();
    FakeAudioContext.created.at(-1).currentTime = 9;
    store.endPlaybackGeneration();
    delete globalThis.AudioContext;
    await store.beginPlaybackGenerationFromUserGesture(true);
    await store.commitPlaybackGeneration(store.getPlaybackGeneration());

    store.poll(2500);

    assert.equal(sound.capturePlaybackState().voices[0].positionSeconds, 1.5);
});

test("restore capacity failure leaves the old Sound voices untouched", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(3);
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.loop();
    const before = sound.capturePlaybackState();

    assert.throws(
        () => sound.restorePlaybackState({ voices: [before.voices[0], before.voices[0]], activeVoiceIndex: 1 }),
        /Insufficient sound-effect source capacity/
    );
    assert.equal(sound.capturePlaybackState().voices.length, 1);
    assert.equal(sound.playing(), true);
});

test("stale async decode completion cannot attach a Sound to a retired generation", async () => {
    installAudioGlobals(DelayedOfflineAudioContext);
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await beginCommitted(store);

    sound.play();
    assert.equal(sound.playing(), true);
    assert.equal(FakeAudioSource.created.length, 0);
    store.endPlaybackGeneration();

    DelayedOfflineAudioContext.pending[0]();
    await sound.ready();
    await settle();

    assert.equal(FakeAudioSource.created.length, 0);
    assert.equal(sound.playing(), true);

    await beginCommitted(store);
    await settle();

    assert.equal(FakeAudioSource.created.length, 1);
    assert.equal(FakeAudioSource.created[0].startCalls.length, 1);
});

test("explicit stop APIs remain destructive rather than becoming generation suspension", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.loop();
    sound.loop();
    await settle();
    assert.equal(sound.capturePlaybackState().voices.length, 2);

    store.stopSoundEffects();

    assert.equal(sound.capturePlaybackState().voices.length, 0);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 0);
});

test("Sound pitch scales captured and resumed playback position", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.play(2, 1);
    await settle();
    FakeAudioContext.created.at(-1).currentTime = 1.25;
    store.endPlaybackGeneration();

    assert.equal(sound.capturePlaybackState().voices[0].positionSeconds, 2.5);
    await beginCommitted(store);
    await settle();
    assert.equal(FakeAudioSource.created.at(-1).startCalls.at(-1).offset, 2.5);
});

test("natural one-shot completion releases logical voice and latest Sound state", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.play();
    await settle();
    FakeAudioSource.created.at(-1).finish();

    assert.equal(sound.playing(), false);
    assert.equal(sound.capturePlaybackState().voices.length, 0);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 0);
});

test("generation detach does not synthesize Sound completion", async () => {
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
    store.endPlaybackGeneration();

    assert.equal(ended, 0);
    assert.equal(voice.playing(), true);

    delete globalThis.AudioContext;
    await store.beginPlaybackGenerationFromUserGesture(true);
    await store.commitPlaybackGeneration(store.getPlaybackGeneration());
    store.poll(10_000);
    assert.equal(ended, 1);
    assert.equal(voice.playing(), false);
});

test("restored one-shot at the decoded duration is dropped instead of restarted", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();

    sound.restorePlaybackState({
        voices: [{ looped: false, playbackRate: 1, positionSeconds: 10, gain: 1, spatialPosition: null }],
        activeVoiceIndex: 0
    });

    assert.equal(sound.playing(), false);
    assert.equal(sound.capturePlaybackState().voices.length, 0);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 0);
});

test("shrinking the source pool destructively releases out-of-range logical voices", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(4);
    store.enableExplicitPlaybackGenerations();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    await beginCommitted(store);

    sound.loop();
    sound.loop();
    await settle();
    assert.equal(sound.capturePlaybackState().voices.length, 2);

    store.setMaxSources(3);

    assert.equal(sound.capturePlaybackState().voices.length, 1);
    assert.equal(store.getPlaybackDiagnostics().logicalEffects, 1);
});

test("failed newest Sound play preserves an older voice but clears latest Sound state", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(3);
    await beginCommitted(store);
    const sound = new Sound("tone.ogg");
    await sound.ready();

    sound.loop();
    const first = sound.active;
    assert.notEqual(first, null);
    assert.equal(sound.playing(), true);

    sound.loop();

    assert.equal(sound.active, null);
    assert.equal(sound.playing(), false);
    assert.equal(first.playing(), true);
});

test("disabled newest Sound play preserves an older voice but clears latest Sound state", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(4);
    await beginCommitted(store);
    const sound = new Sound("tone.ogg");
    await sound.ready();

    sound.loop();
    const first = sound.active;
    assert.notEqual(first, null);
    store.setSoundsOn(false);

    sound.play();

    assert.equal(sound.active, null);
    assert.equal(sound.playing(), false);
    assert.equal(first.playing(), true);
});

test("AppGameContainer advances Sound logical time beside Music before game update", () => {
    const source = readFileSync(new URL("../src/slick/AppGameContainer.ts", import.meta.url), "utf8");
    assert.match(source, /Music\.poll\(delta\);\s*SoundStore\.get\(\)\.poll\(delta\);\s*this\.updateGame\(delta\);/);
});
