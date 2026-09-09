import assert from "node:assert/strict";
import { after, test } from "node:test";
import { AL, BrowserAudioLifecycle, Music, ResourceLoader, SoundStore } from "../dist/index.js";

const documentListeners = new Map();
const windowListeners = new Map();
const sources = [];
let context = null;

class FakeGain {
    constructor() {
        this.gain = { value: 1 };
    }

    connect() {}
    disconnect() {}
}

class FakeSource {
    constructor() {
        this.buffer = null;
        this.loop = false;
        this.onended = null;
        this.playbackRate = { value: 1 };
        this.started = false;
        sources.push(this);
    }

    connect() {}
    disconnect() {}
    stop() {}

    start() {
        this.started = true;
    }
}

class FakeAudioContext {
    constructor() {
        this.currentTime = 0;
        this.destination = {};
        this.state = "suspended";
        this.resumeCalls = 0;
        this.suspendCalls = 0;
        context = this;
    }

    close() {
        this.state = "closed";
        return Promise.resolve();
    }

    createBufferSource() {
        return new FakeSource();
    }

    createGain() {
        return new FakeGain();
    }

    decodeAudioData() {
        return Promise.resolve({ duration: 10 });
    }

    resume() {
        this.resumeCalls++;
        this.state = "running";
        return Promise.resolve();
    }

    suspend() {
        this.suspendCalls++;
        this.state = "suspended";
        return Promise.resolve();
    }
}

globalThis.document = {
    visibilityState: "visible",
    addEventListener(type, listener) {
        documentListeners.set(type, listener);
    }
};

globalThis.window = {
    addEventListener(type, listener) {
        windowListeners.set(type, listener);
    }
};

globalThis.AudioContext = FakeAudioContext;

async function settle() {
    for (let i = 0; i < 12; i++) {
        await Promise.resolve();
    }
}

after(() => {
    AL.destroy();
    ResourceLoader.clearCache();
    delete globalThis.AudioContext;
    delete globalThis.document;
    delete globalThis.window;
});

test("background recovery uses automatic resume plus a real-gesture graph refresh", async () => {
    const lifecycle = BrowserAudioLifecycle.get();
    lifecycle.install();
    ResourceLoader.registerResource("tone.ogg", new Uint8Array([1, 2, 3, 4]));
    AL.create();
    assert.ok(context);
    await SoundStore.get().unlock();

    const music = new Music("tone.ogg");
    await music.ready();
    music.loop();
    await settle();
    assert.equal(sources.length, 1);
    assert.equal(sources[0].started, true);

    globalThis.document.visibilityState = "hidden";
    documentListeners.get("visibilitychange")();
    SoundStore.get().setMusicOn(false);
    await settle();
    assert.equal(context.state, "suspended");
    assert.equal(context.suspendCalls, 1);

    globalThis.document.visibilityState = "visible";
    documentListeners.get("visibilitychange")();
    SoundStore.get().setMusicOn(true);
    await settle();
    assert.equal(context.state, "running");
    assert.equal(music.playing(), true);

    const resumeCallsBeforeGesture = context.resumeCalls;
    const sourcesBeforeGesture = sources.length;
    documentListeners.get("pointerdown")();
    assert.equal(context.resumeCalls, resumeCallsBeforeGesture + 1, "forced recovery must call native resume inside the gesture");
    await settle();
    assert.ok(sources.length > sourcesBeforeGesture, "forced recovery should recreate the current music source");
    assert.equal(music.playing(), true);

    const suspendCallsBeforePageHide = context.suspendCalls;
    windowListeners.get("pagehide")();
    await settle();
    assert.equal(context.suspendCalls, suspendCallsBeforePageHide + 1, "pagehide must suspend even while visibilityState still says visible");
});
