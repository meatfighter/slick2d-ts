import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AL, Music, ResourceLoader, Sound, SoundStore } from "../dist/index.js";

class FakeAudioBuffer {
    constructor() {
        this.duration = 60;
    }
}

class FakeAudioSource {
    constructor() {
        this.buffer = null;
        this.loop = false;
        this.onended = null;
        this.playbackRate = { value: 1 };
        this.started = false;
        this.stopped = false;
    }

    connect() {
    }

    start() {
        this.started = true;
    }

    stop() {
        this.stopped = true;
        this.onended?.();
    }
}

class FakePanner {
    constructor() {
        this.distanceModel = "";
        this.maxDistance = 0;
        this.panningModel = "";
        this.positionX = { value: 0 };
        this.positionY = { value: 0 };
        this.positionZ = { value: 0 };
        this.refDistance = 0;
        this.rolloffFactor = 0;
    }

    connect() {
    }
}

class FakeAudioContext {
    static decodeError = null;
    static lastPanner = null;
    static resumeCalls = 0;

    constructor() {
        this.currentTime = 0;
        this.destination = {};
        this.state = "suspended";
    }

    close() {
        this.state = "closed";
        return Promise.resolve();
    }

    createBufferSource() {
        return new FakeAudioSource();
    }

    createGain() {
        return {
            connect: () => undefined,
            gain: { value: 1 }
        };
    }

    createPanner() {
        FakeAudioContext.lastPanner = new FakePanner();
        return FakeAudioContext.lastPanner;
    }

    decodeAudioData() {
        if (FakeAudioContext.decodeError) {
            return Promise.reject(FakeAudioContext.decodeError);
        }
        return Promise.resolve(new FakeAudioBuffer());
    }

    resume() {
        FakeAudioContext.resumeCalls += 1;
        this.state = "running";
        return Promise.resolve();
    }
}

function installAudioGlobals() {
    Object.defineProperty(globalThis, "AudioContext", {
        configurable: true,
        value: FakeAudioContext,
        writable: true
    });
}

function registerTone() {
    ResourceLoader.registerResource("tone.ogg", new Uint8Array([1, 2, 3, 4]));
}

async function settleAudioStart() {
    await Promise.resolve();
    await Promise.resolve();
}

afterEach(() => {
    AL.destroy();
    FakeAudioContext.decodeError = null;
    FakeAudioContext.lastPanner = null;
    FakeAudioContext.resumeCalls = 0;
    SoundStore.get().setMaxSources(64);
    ResourceLoader.clearCache();
    delete globalThis.AudioContext;
});

test("pre-init sound and music toggles are ignored until init enables audio", () => {
    installAudioGlobals();
    const store = SoundStore.get();

    store.setSoundsOn(false);
    store.setMusicOn(false);

    assert.equal(store.soundsOn(), false);
    assert.equal(store.musicOn(), false);

    AL.create();

    assert.equal(store.soundWorks(), true);
    assert.equal(store.soundsOn(), true);
    assert.equal(store.musicOn(), true);
});

test("post-init sound toggle drops new effects", () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    AL.create();

    store.setSoundsOn(false);

    assert.equal(store.playSound("tone.ogg", 1, 1, false), null);
});

test("sound effects use a finite Java-style source pool", () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(3);
    AL.create();

    const first = store.playSound("tone.ogg", 1, 1, true);
    const second = store.playSound("tone.ogg", 1, 1, true);
    const third = store.playSound("tone.ogg", 1, 1, true);

    assert.equal(store.getSourceCount(), 3);
    assert.notEqual(first, null);
    assert.equal(second, null);
    assert.equal(third, null);

    first?.stop();

    assert.notEqual(store.playSound("tone.ogg", 1, 1, true), null);
});

test("Sound.stop and Sound.playing track only the latest source for that Sound", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(4);
    AL.create();
    const sound = new Sound("tone.ogg");
    await sound.ready();

    sound.loop();
    const first = sound.active;
    sound.loop();
    const second = sound.active;

    assert.notEqual(first, null);
    assert.notEqual(second, null);
    assert.notEqual(first, second);
    assert.equal(sound.playing(), true);

    sound.stop();

    assert.equal(second.playing(), false);
    assert.equal(first.playing(), true);
    assert.equal(sound.playing(), false);

    const third = store.playSound("tone.ogg", 1, 1, true);
    const fourth = store.playSound("tone.ogg", 1, 1, true);

    assert.notEqual(third, null);
    assert.equal(fourth, null);

    store.clear();

    assert.notEqual(store.playSound("tone.ogg", 1, 1, true), null);
    assert.notEqual(store.playSound("tone.ogg", 1, 1, true), null);
    assert.equal(store.playSound("tone.ogg", 1, 1, true), null);
});

test("failed Sound play clears the remembered source while the older handle keeps playing", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(3);
    AL.create();
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

test("disabled sound failed play clears the remembered source", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(4);
    AL.create();
    const sound = new Sound("tone.ogg");
    await sound.ready();

    sound.loop();
    const first = sound.active;
    store.setSoundsOn(false);
    sound.play();

    assert.equal(sound.active, null);
    assert.equal(sound.playing(), false);
    assert.equal(first.playing(), true);
});

test("setMaxSources does not preserve handles in the unavailable last source slot", () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(4);
    AL.create();

    const first = store.playSound("tone.ogg", 1, 1, true);
    const second = store.playSound("tone.ogg", 1, 1, true);

    assert.notEqual(first, null);
    assert.notEqual(second, null);

    store.setMaxSources(3);

    assert.equal(first.playing(), true);
    assert.equal(second.playing(), false);
    assert.equal(store.playSound("tone.ogg", 1, 1, true), null);
});

test("stopSoundEffect stops the matching logical source", () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(4);
    AL.create();

    const first = store.playSound("tone.ogg", 1, 1, true);
    const second = store.playSound("tone.ogg", 1, 1, true);

    assert.notEqual(first, null);
    assert.notEqual(second, null);

    store.stopSoundEffect(second.sourceId);

    assert.equal(first.playing(), true);
    assert.equal(second.playing(), false);
    assert.notEqual(store.playSound("tone.ogg", 1, 1, true), null);
});

test("sound-effect gain matches Java's double sound-volume application and is not retroactive", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(3);
    AL.create();
    store.setSoundVolume(0.5);
    const sound = new Sound("tone.ogg");
    await sound.ready();

    sound.play(1, 1);
    const handle = sound.active;
    await settleAudioStart();

    assert.equal(handle.getGain(), 0.25);

    store.setSoundVolume(0.25);

    assert.equal(handle.getGain(), 0.25);
});

test("sound effects can be muted with zero global or per-sound volume", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    store.setMaxSources(4);
    AL.create();
    const sound = new Sound("tone.ogg");
    await sound.ready();

    store.setSoundVolume(0);
    sound.play(1, 1);
    const globalMuteHandle = sound.active;
    await settleAudioStart();

    assert.notEqual(globalMuteHandle, null);
    assert.equal(globalMuteHandle.getGain(), 0);

    globalMuteHandle.stop();
    store.setSoundVolume(1);
    sound.play(1, 0);
    const localMuteHandle = sound.active;
    await settleAudioStart();

    assert.notEqual(localMuteHandle, null);
    assert.equal(localMuteHandle.getGain(), 0);
});

test("audio decode failures remain visible after tracked preload promises settle", async () => {
    installAudioGlobals();
    registerTone();
    FakeAudioContext.decodeError = new Error("decode failed");
    AL.create();

    await assert.rejects(
        SoundStore.get().preloadAudioBuffer("tone.ogg"),
        /Failed to load audio: tone\.ogg/
    );

    assert.equal(ResourceLoader.hasPending(), false);
    assert.equal(ResourceLoader.hasFailed(), true);
    assert.equal(ResourceLoader.getTrackedErrors()[0].label, "tone.ogg");
    await assert.rejects(ResourceLoader.waitForAll(), /tone\.ogg/);
});

test("Sound.playAt routes coordinates to a Web Audio panner when available", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const sound = new Sound("tone.ogg");
    await sound.ready();

    sound.playAt(1, 1, 3, 4, 5);
    await settleAudioStart();

    assert.notEqual(FakeAudioContext.lastPanner, null);
    assert.equal(FakeAudioContext.lastPanner.positionX.value, 3);
    assert.equal(FakeAudioContext.lastPanner.positionY.value, 4);
    assert.equal(FakeAudioContext.lastPanner.positionZ.value, 5);
});

test("Music no-argument play and loop reset instance volume to Java default", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const music = new Music("tone.ogg");
    await music.ready();

    music.setVolume(0);
    music.play();

    assert.equal(music.getVolume(), 1);

    music.setVolume(0);
    music.loop();

    assert.equal(music.getVolume(), 1);
});

test("Music explicit-volume play and loop preserve the supplied volume", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const music = new Music("tone.ogg");
    await music.ready();

    music.play(1, 0.25);

    assert.equal(music.getVolume(), 0.25);

    music.loop(1, 0.5);

    assert.equal(music.getVolume(), 0.5);
});

test("SoundStore.unlock resumes audio from a user gesture and supports restart after destroy", async () => {
    installAudioGlobals();
    const store = SoundStore.get();

    assert.equal(await store.unlock(), true);
    const firstContext = store.getAudioContext();

    assert.equal(store.soundWorks(), true);
    assert.equal(store.soundsOn(), true);
    assert.equal(store.musicOn(), true);
    assert.equal(firstContext.state, "running");
    assert.equal(FakeAudioContext.resumeCalls, 1);

    store.setSoundsOn(false);

    assert.equal(await store.unlock(), true);
    assert.equal(store.soundsOn(), false);
    assert.equal(FakeAudioContext.resumeCalls, 2);

    AL.destroy();

    assert.equal(firstContext.state, "closed");
    assert.equal(await store.unlock(), true);
    assert.notEqual(store.getAudioContext(), firstContext);
    assert.equal(store.soundWorks(), true);
    assert.equal(store.soundsOn(), true);
    assert.equal(store.musicOn(), true);
});
