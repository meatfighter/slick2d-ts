import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AL, AudioContextLifecycle, Music, ResourceLoader, Sound } from "../dist/index.js";

class Deferred {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

class FakeAudioBuffer {
    constructor() {
        this.duration = 10;
    }
}

class FakeGain {
    constructor() {
        this.gain = { value: 1 };
    }

    connect() {}
    disconnect() {}
}

class FakeAudioSource {
    static created = [];

    constructor() {
        this.buffer = null;
        this.loop = false;
        this.onended = null;
        this.playbackRate = { value: 1 };
        this.startCalls = 0;
        FakeAudioSource.created.push(this);
    }

    connect() {}
    disconnect() {}

    start() {
        this.startCalls++;
    }

    stop() {}
}

class FakeAudioContext {
    static created = [];

    constructor() {
        this.currentTime = 0;
        this.destination = {};
        this.state = "suspended";
        this.resumeCalls = 0;
        this.suspendCalls = 0;
        this.resumeDeferred = null;
        this.suspendDeferred = null;
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
        return new FakeGain();
    }

    decodeAudioData() {
        return Promise.resolve(new FakeAudioBuffer());
    }

    resume() {
        this.resumeCalls++;
        if (this.resumeDeferred === null) {
            this.state = "running";
            return Promise.resolve();
        }
        return this.resumeDeferred.promise.then(() => {
            this.state = "running";
        });
    }

    suspend() {
        this.suspendCalls++;
        if (this.suspendDeferred === null) {
            this.state = "suspended";
            return Promise.resolve();
        }
        return this.suspendDeferred.promise.then(() => {
            this.state = "suspended";
        });
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

async function settle() {
    for (let i = 0; i < 10; i++) {
        await Promise.resolve();
    }
}

afterEach(() => {
    AL.destroy();
    FakeAudioContext.created = [];
    FakeAudioSource.created = [];
    ResourceLoader.clearCache();
    delete globalThis.AudioContext;
});

test("AudioContext lifecycle shares one native resume operation between concurrent callers", async () => {
    const context = new FakeAudioContext();
    context.resumeDeferred = new Deferred();

    const first = AudioContextLifecycle.resume(context);
    const second = AudioContextLifecycle.resume(context);
    await settle();

    assert.equal(context.resumeCalls, 1);
    context.resumeDeferred.resolve();
    assert.equal(await first, true);
    assert.equal(await second, true);
    assert.equal(context.state, "running");
});

test("AudioContext lifecycle serializes suspend behind an in-flight resume", async () => {
    const context = new FakeAudioContext();
    context.resumeDeferred = new Deferred();
    context.suspendDeferred = new Deferred();

    const resumed = AudioContextLifecycle.resume(context);
    const suspended = AudioContextLifecycle.suspend(context);
    await settle();
    assert.equal(context.resumeCalls, 1);
    assert.equal(context.suspendCalls, 0);

    context.resumeDeferred.resolve();
    assert.equal(await resumed, true);
    await settle();
    assert.equal(context.suspendCalls, 1);

    context.suspendDeferred.resolve();
    assert.equal(await suspended, true);
    assert.equal(context.state, "suspended");
});

test("Music does not create a source until Web Audio resume completes", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const context = FakeAudioContext.created[0];
    context.resumeDeferred = new Deferred();
    const music = new Music("tone.ogg");
    await music.ready();

    music.loop();
    await settle();
    assert.equal(context.resumeCalls, 1);
    assert.equal(FakeAudioSource.created.length, 0);

    context.resumeDeferred.resolve();
    await settle();
    assert.equal(FakeAudioSource.created.length, 1);
    assert.equal(FakeAudioSource.created[0].startCalls, 1);
});

test("Sound does not create a source until Web Audio resume completes", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const context = FakeAudioContext.created[0];
    context.resumeDeferred = new Deferred();
    const sound = new Sound("tone.ogg");
    await sound.ready();

    sound.play();
    await settle();
    assert.equal(context.resumeCalls, 1);
    assert.equal(FakeAudioSource.created.length, 0);

    context.resumeDeferred.resolve();
    await settle();
    assert.equal(FakeAudioSource.created.length, 1);
    assert.equal(FakeAudioSource.created[0].startCalls, 1);
});
