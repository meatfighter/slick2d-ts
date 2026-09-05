import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AL, Music, ResourceLoader, Sound, SoundStore } from "../dist/index.js";

class FakeAudioBuffer {
    constructor() {
        this.duration = 10;
    }
}

class FakeGain {
    static created = [];

    constructor() {
        this.connectCalls = 0;
        this.disconnectCalls = 0;
        this.gain = { value: 1 };
        FakeGain.created.push(this);
    }

    connect() {
        this.connectCalls++;
    }

    disconnect() {
        this.disconnectCalls++;
    }
}

class FakeAudioSource {
    static created = [];
    static startError = null;

    constructor() {
        this.buffer = null;
        this.connectCalls = 0;
        this.disconnectCalls = 0;
        this.loop = false;
        this.onended = null;
        this.playbackRate = { value: 1 };
        this.startCalls = [];
        this.stopped = false;
        FakeAudioSource.created.push(this);
    }

    connect() {
        this.connectCalls++;
    }

    disconnect() {
        this.disconnectCalls++;
    }

    start(when = 0, offset = 0) {
        this.startCalls.push({ when, offset });
        if (FakeAudioSource.startError) {
            throw FakeAudioSource.startError;
        }
    }

    stop() {
        this.stopped = true;
        this.onended?.();
    }

    finish() {
        this.onended?.();
    }
}

class FakeAudioContext {
    static created = [];
    static failCreateGainAt = 0;

    constructor() {
        this.createGainCalls = 0;
        this.currentTime = 0;
        this.destination = {};
        this.state = "suspended";
        FakeAudioContext.created.push(this);
    }

    close() {
        this.state = "closed";
        return Promise.resolve();
    }

    createBufferSource() {
        return new FakeAudioSource();
    }

    createGain() {
        this.createGainCalls++;
        if (FakeAudioContext.failCreateGainAt === this.createGainCalls) {
            throw new Error(`injected createGain failure ${this.createGainCalls}`);
        }
        return new FakeGain();
    }

    decodeAudioData() {
        return Promise.resolve(new FakeAudioBuffer());
    }

    resume() {
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
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

function listenerEvents() {
    const events = [];
    return {
        events,
        listener: {
            musicEnded: () => events.push("ended"),
            musicSwapped: () => events.push("swapped")
        }
    };
}

afterEach(() => {
    AL.destroy();
    FakeAudioContext.created = [];
    FakeAudioContext.failCreateGainAt = 0;
    FakeAudioSource.created = [];
    FakeAudioSource.startError = null;
    FakeGain.created = [];
    SoundStore.get().setMaxSources(64);
    ResourceLoader.clearCache();
    delete globalThis.AudioContext;
});

test("idle Music fades do not advance and fresh play clears the dormant fade", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const music = new Music("tone.ogg");
    await music.ready();

    music.setVolume(0.8);
    music.fade(100, 0, false);
    Music.poll(50);
    assert.equal(music.getVolume(), 0.8);

    music.play(1, 0.8);
    await settleAudioStart();
    Music.poll(50);
    assert.equal(music.getVolume(), 0.8);
});

test("current Music fades continue while explicitly paused", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    AL.create();
    const music = new Music("tone.ogg");
    await music.ready();

    music.play();
    await settleAudioStart();
    music.fade(100, 0, false);
    music.pause();

    assert.equal(music.playing(), false);
    assert.equal(store.isMusicPlaying(), true);

    Music.poll(50);
    assert.equal(music.getVolume(), 0.5);
    Music.poll(50);
    assert.equal(music.getVolume(), 0);
    assert.equal(music.isPaused(), true);
});

test("explicit Music stop reports musicEnded on the next poll", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const music = new Music("tone.ogg");
    const { events, listener } = listenerEvents();
    music.addListener(listener);
    await music.ready();

    music.play();
    await settleAudioStart();
    music.stop();

    assert.equal(music.playing(), false);
    assert.deepEqual(events, []);

    Music.poll(1);
    assert.deepEqual(events, ["ended"]);
});

test("a new Music before the post-stop poll reports swap instead of end", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const first = new Music("tone.ogg");
    const second = new Music("tone.ogg");
    const { events, listener } = listenerEvents();
    first.addListener(listener);
    await Promise.all([first.ready(), second.ready()]);

    first.play();
    await settleAudioStart();
    first.stop();
    second.play();

    assert.deepEqual(events, ["swapped"]);
    Music.poll(1);
    assert.deepEqual(events, ["swapped"]);
});

test("natural non-looping Music completion is reported by the next poll", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    AL.create();
    const music = new Music("tone.ogg");
    const { events, listener } = listenerEvents();
    music.addListener(listener);
    await music.ready();

    music.play();
    await settleAudioStart();
    const source = FakeAudioSource.created.at(-1);
    source.finish();

    assert.deepEqual(events, []);
    assert.equal(music.playing(), true);
    assert.equal(store.isMusicPlaying(), false);

    Music.poll(1);
    assert.deepEqual(events, ["ended"]);
    assert.equal(music.playing(), false);
});

test("Music startup failure disconnects its partial Web Audio graph", async () => {
    installAudioGlobals();
    registerTone();
    const store = SoundStore.get();
    AL.create();
    const music = new Music("tone.ogg");
    await music.ready();
    FakeAudioSource.startError = new Error("injected source.start failure");

    music.play();
    await settleAudioStart();

    const source = FakeAudioSource.created.at(-1);
    const gain = FakeGain.created.at(-1);
    assert.equal(source.onended, null);
    assert.equal(source.disconnectCalls, 1);
    assert.equal(gain.disconnectCalls, 1);
    assert.equal(music.source, null);
    assert.equal(music.gain, null);
    assert.equal(music.playing(), false);
    assert.equal(store.isMusicPlaying(), false);
});

test("Sound startup failure disconnects its graph and clears the remembered handle", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const sound = new Sound("tone.ogg");
    await sound.ready();
    FakeAudioSource.startError = new Error("injected source.start failure");

    sound.play();
    const handle = sound.active;
    assert.notEqual(handle, null);
    await settleAudioStart();

    const source = FakeAudioSource.created.at(-1);
    const gain = FakeGain.created.at(-1);
    assert.equal(handle.playing(), false);
    assert.equal(sound.active, null);
    assert.equal(source.onended, null);
    assert.equal(source.disconnectCalls, 1);
    assert.equal(gain.disconnectCalls, 1);
});

test("partial Web Audio initialization rolls back and a later AL.create retries", () => {
    installAudioGlobals();
    const store = SoundStore.get();
    FakeAudioContext.failCreateGainAt = 2;

    AL.create();

    const failedContext = FakeAudioContext.created[0];
    const partialBus = FakeGain.created[0];
    assert.equal(store.soundWorks(), false);
    assert.equal(store.inited, false);
    assert.equal(store.context, null);
    assert.equal(store.soundBus, null);
    assert.equal(store.musicBus, null);
    assert.equal(failedContext.state, "closed");
    assert.equal(partialBus.disconnectCalls, 1);

    FakeAudioContext.failCreateGainAt = 0;
    AL.create();

    assert.equal(store.soundWorks(), true);
    assert.equal(store.inited, true);
    assert.notEqual(store.getAudioContext(), failedContext);
    assert.notEqual(store.soundBus, null);
    assert.notEqual(store.musicBus, null);
});

test("AL.create does not publish created state if SoundStore.init throws", () => {
    const store = SoundStore.get();
    const originalInit = store.init;
    store.init = () => {
        throw new Error("injected init failure");
    };
    try {
        assert.throws(() => AL.create(), /injected init failure/);
        assert.equal(AL.isCreated(), false);
    } finally {
        store.init = originalInit;
    }
});

test("AL.destroy clears pending static Music end state without listener callbacks", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const first = new Music("tone.ogg");
    const { events, listener } = listenerEvents();
    first.addListener(listener);
    await first.ready();
    first.play();
    await settleAudioStart();
    first.stop();

    AL.destroy();
    assert.deepEqual(events, []);

    AL.create();
    const second = new Music("tone.ogg");
    await second.ready();
    second.play();
    await settleAudioStart();

    assert.deepEqual(events, []);
});
