import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AL, AudioContextLifecycle, Music, ResourceLoader, Sound, SoundStore } from "../dist/index.js";

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
        this.resumeError = null;
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
        if (this.resumeError !== null) {
            return Promise.reject(this.resumeError);
        }
        if (this.resumeDeferred === null) {
            this.state = "running";
            return Promise.resolve();
        }
        const deferred = this.resumeDeferred;
        return deferred.promise.then(() => {
            this.state = "running";
        });
    }

    suspend() {
        this.suspendCalls++;
        if (this.suspendDeferred === null) {
            this.state = "suspended";
            return Promise.resolve();
        }
        const deferred = this.suspendDeferred;
        return deferred.promise.then(() => {
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

test("AudioContext lifecycle starts the first resume synchronously and shares it with concurrent callers", async () => {
    const context = new FakeAudioContext();
    context.resumeDeferred = new Deferred();

    const first = AudioContextLifecycle.resume(context);
    assert.equal(context.resumeCalls, 1);
    const second = AudioContextLifecycle.resume(context);
    assert.equal(context.resumeCalls, 1);

    context.resumeDeferred.resolve();
    assert.equal(await first, true);
    assert.equal(await second, true);
    assert.equal(context.state, "running");
});

test("automatic resume supersedes an older pending suspend without waiting", async () => {
    const context = new FakeAudioContext();
    context.state = "running";
    const stalledSuspend = new Deferred();
    context.suspendDeferred = stalledSuspend;

    const oldSuspend = AudioContextLifecycle.suspend(context);
    assert.equal(context.suspendCalls, 1);

    const resumed = AudioContextLifecycle.resume(context);
    assert.equal(context.resumeCalls, 1, "foreground reversal must reach native resume immediately");
    assert.equal(await resumed, true, "foreground recovery must not wait behind the obsolete suspend promise");
    assert.equal(context.state, "running");

    stalledSuspend.resolve();
    assert.equal(await oldSuspend, false);
    await settle();
    assert.equal(context.resumeCalls, 2, "a late stale suspend must be corrected back to running");
    assert.equal(context.state, "running");
});

test("automatic suspend supersedes an older pending resume without waiting", async () => {
    const context = new FakeAudioContext();
    const stalledResume = new Deferred();
    context.resumeDeferred = stalledResume;

    const oldResume = AudioContextLifecycle.resume(context);
    assert.equal(context.resumeCalls, 1);

    const suspended = AudioContextLifecycle.suspend(context);
    assert.equal(context.suspendCalls, 1, "background reversal must reach native suspend immediately");
    assert.equal(await suspended, true, "background suspension must not wait behind the obsolete resume promise");
    assert.equal(context.state, "suspended");

    stalledResume.resolve();
    assert.equal(await oldResume, false);
    await settle();
    assert.equal(context.suspendCalls, 2, "a late stale resume must be corrected back to suspended");
    assert.equal(context.state, "suspended");
});

test("user-gesture resume bypasses an older pending automatic resume", async () => {
    const context = new FakeAudioContext();
    const stalledResume = new Deferred();
    context.resumeDeferred = stalledResume;

    const automatic = AudioContextLifecycle.resume(context);
    assert.equal(context.resumeCalls, 1);

    context.resumeDeferred = null;
    const gesture = AudioContextLifecycle.resumeFromUserGesture(context);
    assert.equal(context.resumeCalls, 2, "the real gesture must reach native resume synchronously");
    assert.equal(await gesture, true);
    assert.equal(context.state, "running");

    stalledResume.resolve();
    assert.equal(await automatic, true);
});

test("late stale native suspension is reconciled to the newest desired state", async () => {
    const context = new FakeAudioContext();
    context.state = "running";
    const stalledSuspend = new Deferred();
    context.suspendDeferred = stalledSuspend;

    const oldSuspend = AudioContextLifecycle.suspend(context);
    assert.equal(context.suspendCalls, 1);

    const gesture = AudioContextLifecycle.resumeFromUserGesture(context);
    assert.equal(context.resumeCalls, 1);
    assert.equal(await gesture, true);
    assert.equal(context.state, "running");

    stalledSuspend.resolve();
    assert.equal(await oldSuspend, false, "the superseded suspend must not report success after corrective resume wins");
    await settle();
    assert.equal(context.resumeCalls, 2, "the late stale suspend should trigger a corrective resume");
    assert.equal(context.state, "running");
});

test("a native transition timeout does not poison a later user-gesture recovery", async () => {
    const realSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (callback) => realSetTimeout(callback, 0);
    try {
        const context = new FakeAudioContext();
        context.resumeDeferred = new Deferred();

        assert.equal(await AudioContextLifecycle.resume(context), false);
        assert.equal(context.resumeCalls, 1);

        context.resumeDeferred = null;
        const gesture = AudioContextLifecycle.resumeFromUserGesture(context);
        assert.equal(context.resumeCalls, 2);
        assert.equal(await gesture, true);
        assert.equal(context.state, "running");
    } finally {
        globalThis.setTimeout = realSetTimeout;
    }
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

test("Music remains logically recoverable when Web Audio resume fails transiently", async () => {
    installAudioGlobals();
    registerTone();
    AL.create();
    const context = FakeAudioContext.created[0];
    context.resumeError = new Error("temporary resume failure");
    const music = new Music("tone.ogg");
    await music.ready();

    music.loop(1.25, 0.6);
    await settle();
    assert.equal(music.playing(), true);
    assert.equal(music.isLooped(), true);
    assert.equal(music.getPlaybackRate(), 1.25);
    assert.equal(music.getVolume(), 0.6);
    assert.equal(FakeAudioSource.created.length, 0);

    context.resumeError = null;
    SoundStore.get().setMusicOn(false);
    SoundStore.get().setMusicOn(true);
    await settle();

    assert.equal(music.playing(), true);
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
