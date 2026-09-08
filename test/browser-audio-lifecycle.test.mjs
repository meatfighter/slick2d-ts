import assert from "node:assert/strict";
import { after, test } from "node:test";
import { BrowserAudioLifecycle } from "../dist/index.js";

const documentListeners = new Map();
const windowListeners = new Map();
let audioContextCreations = 0;

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

globalThis.AudioContext = class {
    constructor() {
        audioContextCreations++;
        throw new Error("AudioContext must not be created before user activation");
    }
};

after(() => {
    delete globalThis.AudioContext;
    delete globalThis.document;
    delete globalThis.window;
});

test("browser audio lifecycle does not create Web Audio before activation", async () => {
    const lifecycle = BrowserAudioLifecycle.get();
    lifecycle.install();

    assert.equal(documentListeners.has("visibilitychange"), true);
    assert.equal(windowListeners.has("pagehide"), true);
    assert.equal(windowListeners.has("pageshow"), true);

    documentListeners.get("visibilitychange")();
    windowListeners.get("pageshow")();
    globalThis.document.visibilityState = "hidden";
    documentListeners.get("visibilitychange")();
    await Promise.resolve();

    assert.equal(audioContextCreations, 0);
});
