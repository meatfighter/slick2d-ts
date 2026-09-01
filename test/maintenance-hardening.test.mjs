import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AL, Color, Graphics, Input, ResourceLoader, SoundStore } from "../dist/index.js";

const originalAudioContextDescriptor = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

function restoreGlobal(name, descriptor) {
    if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
    } else {
        delete globalThis[name];
    }
}

function button(pressed = false) {
    return { pressed, touched: pressed, value: pressed ? 1 : 0 };
}

function gamepad(overrides = {}) {
    return {
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 16 }, () => button(false)),
        connected: true,
        id: "pad",
        index: 0,
        mapping: "standard",
        timestamp: 1,
        vibrationActuator: null,
        ...overrides
    };
}

function installGamepadProvider(provider) {
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { getGamepads: provider },
        writable: true
    });
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, reject, resolve };
}

async function waitForCount(values, count) {
    for (let attempt = 0; attempt < 20; attempt++) {
        if (values.length >= count) {
            return;
        }
        await Promise.resolve();
    }
    assert.fail(`Expected ${count} value(s), received ${values.length}.`);
}

afterEach(() => {
    AL.destroy();
    Input.controllersDisabled = false;
    Input.gamepadCacheGeneration = 0;
    ResourceLoader.setRetryOptions(0, 250);
    ResourceLoader.clearCache();
    restoreGlobal("AudioContext", originalAudioContextDescriptor);
    restoreGlobal("navigator", originalNavigatorDescriptor);
});

test("Color chooses one Java numeric overload for the whole component tuple", () => {
    const byteColor = new Color(255, 1, 0, 255);

    assert.equal(byteColor.r, 1);
    assert.equal(byteColor.g, 1 / 255);
    assert.equal(byteColor.b, 0);
    assert.equal(byteColor.a, 1);

    const promotedFloatColor = new Color(255, 0.5, 0, 255);

    assert.equal(promotedFloatColor.r, 1);
    assert.equal(promotedFloatColor.g, 0.5);
    assert.equal(promotedFloatColor.b, 0);
    assert.equal(promotedFloatColor.a, 1);
});

test("Color explicit float constructors preserve Slick2D three- and four-component behavior", () => {
    const threeComponent = Color.fromFloats(2, -0.25, 0.5);
    const fourComponent = Color.fromFloats(2, -0.25, 0.5, 3);

    assert.deepEqual([threeComponent.r, threeComponent.g, threeComponent.b, threeComponent.a], [2, -0.25, 0.5, 1]);
    assert.deepEqual([fourComponent.r, fourComponent.g, fourComponent.b, fourComponent.a], [1, -0.25, 0.5, 1]);
});

test("Color copies retain mutable channel state while float arithmetic uses Java four-float clamping", () => {
    const mutable = Color.fromFloats(0.5, 0.25, 0.125);
    mutable.scale(4);
    const copy = mutable.copy();

    assert.deepEqual([copy.r, copy.g, copy.b, copy.a], [2, 1, 0.5, 4]);

    const brighter = Color.fromFloats(0.75, 0.5, 0.25, 1).brighter(1);
    assert.deepEqual([brighter.r, brighter.g, brighter.b, brighter.a], [1, 1, 0.5, 1]);
});

test("Graphics reuses its owned colors without sharing caller mutation", (context) => {
    const originalBind = Color.prototype.bind;
    Color.prototype.bind = () => undefined;
    context.after(() => {
        Color.prototype.bind = originalBind;
    });

    const graphics = new Graphics(16, 16);
    const ownedColor = graphics.color;
    const ownedBackground = graphics.__getBackgroundReference();
    const source = Color.fromFloats(0.25, 0.5, 0.75, 0.8);

    graphics.setColor(source);
    graphics.setBackground(source);

    assert.strictEqual(graphics.color, ownedColor);
    assert.strictEqual(graphics.__getBackgroundReference(), ownedBackground);
    assert.deepEqual([graphics.getColor().r, graphics.getColor().g, graphics.getColor().b, graphics.getColor().a], [0.25, 0.5, 0.75, 0.8]);

    source.r = 1;
    source.g = 1;
    assert.deepEqual([graphics.getColor().r, graphics.getColor().g], [0.25, 0.5]);
    assert.deepEqual([graphics.getBackground().r, graphics.getBackground().g], [0.25, 0.5]);

    graphics.setColor(null);
    assert.strictEqual(graphics.color, ownedColor);
});

test("ResourceLoader rejects invalid retry configuration", () => {
    for (const retries of [Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => ResourceLoader.setRetryOptions(retries), RangeError);
    }
    for (const delay of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
        assert.throws(() => ResourceLoader.setRetryOptions(1, delay), RangeError);
    }

    assert.doesNotThrow(() => ResourceLoader.setRetryOptions(2, 0.5));
});

test("additional controller-axis configuration rejects invalid values but permits calibrated displacement above one", () => {
    const input = new Input(600);
    const pair = [{ horizontalAxis: 2, verticalAxis: 3 }];

    assert.doesNotThrow(() => input.setAdditionalControllerDirectionAxes(pair, 1.5, 0.05));
    assert.throws(() => input.setAdditionalControllerDirectionAxes([{ horizontalAxis: Number.NaN, verticalAxis: 3 }]), RangeError);
    assert.throws(() => input.setAdditionalControllerDirectionAxes([{ horizontalAxis: 2.5, verticalAxis: 3 }]), RangeError);
    assert.throws(() => input.setAdditionalControllerDirectionAxes([{ horizontalAxis: 16, verticalAxis: 3 }]), RangeError);
    assert.throws(() => input.setAdditionalControllerDirectionAxes(pair, Number.NaN, 0.05), RangeError);
    assert.throws(() => input.setAdditionalControllerDirectionAxes(pair, -0.1, 0.05), RangeError);
    assert.throws(() => input.setAdditionalControllerDirectionAxes(pair, 2.01, 0.05), RangeError);
    assert.throws(() => input.setAdditionalControllerDirectionAxes(pair, 0.5, Number.NaN), RangeError);
    assert.throws(() => input.setAdditionalControllerDirectionAxes(pair, 0.5, 1.01), RangeError);
});

test("controller replacement at the same index does not inherit an incompatible calibrated baseline", () => {
    let snapshot = [gamepad({ axes: [0, 0, -1, 0], id: "controller-a" })];
    installGamepadProvider(() => snapshot);
    const input = new Input(600);
    input.setAdditionalControllerDirectionAxes([{ horizontalAxis: 2, verticalAxis: 3 }]);

    input.poll(800, 600);
    assert.equal(input.isControllerRight(0), false);

    snapshot = [gamepad({ axes: [0, 0, 0.2, 0], id: "controller-b", timestamp: 2 })];
    input.poll(800, 600);
    assert.equal(input.isControllerRight(0), false);

    snapshot[0].axes[2] = 1;
    input.poll(800, 600);
    assert.equal(input.isControllerRight(0), true);
});

test("controller disconnection clears calibration even when the same model reconnects", () => {
    let snapshot = [gamepad({ axes: [0, 0, -1, 0], id: "same-model" })];
    installGamepadProvider(() => snapshot);
    const input = new Input(600);
    input.setAdditionalControllerDirectionAxes([{ horizontalAxis: 2, verticalAxis: 3 }]);

    input.poll(800, 600);
    snapshot = [];
    input.poll(800, 600);
    snapshot = [gamepad({ axes: [0, 0, 0.2, 0], id: "same-model", timestamp: 2 })];
    input.poll(800, 600);

    assert.equal(input.isControllerRight(0), false);
});

test("disconnected and non-finite gamepads are ignored by direct controller queries", () => {
    installGamepadProvider(() => [gamepad({ axes: [Number.NaN, 0], connected: false })]);
    const input = new Input(600);

    assert.equal(input.getControllerCount(), 0);
    assert.equal(input.getAxisCount(0), 0);
    assert.equal(input.getAxisValue(0, 0), 0);
    assert.equal(input.isButtonPressed(0, 0), false);
    assert.equal(input.isControllerLeft(0), false);
});

test("an obsolete audio failure cannot evict a newer decoded-buffer request", async () => {
    class DeferredAudioContext {
        static decodes = [];

        constructor() {
            this.destination = {};
            this.state = "running";
        }

        close() {
            this.state = "closed";
            return Promise.resolve();
        }

        createGain() {
            return { connect: () => undefined, gain: { value: 1 } };
        }

        decodeAudioData() {
            const value = deferred();
            DeferredAudioContext.decodes.push(value);
            return value.promise;
        }

        resume() {
            this.state = "running";
            return Promise.resolve();
        }
    }

    Object.defineProperty(globalThis, "AudioContext", {
        configurable: true,
        value: DeferredAudioContext,
        writable: true
    });
    ResourceLoader.registerResource("audio/cache-race.ogg", new Uint8Array([1, 2, 3, 4]));
    AL.create();
    const store = SoundStore.get();

    const first = store.loadAudioBuffer("audio/cache-race.ogg");
    await waitForCount(DeferredAudioContext.decodes, 1);

    store.clearDecodedBuffers();
    const second = store.loadAudioBuffer("audio/cache-race.ogg");
    await waitForCount(DeferredAudioContext.decodes, 2);

    DeferredAudioContext.decodes[0].reject(new Error("obsolete decode failed"));
    await assert.rejects(first);

    const sharedSecond = store.loadAudioBuffer("audio/cache-race.ogg");
    await Promise.resolve();
    assert.equal(DeferredAudioContext.decodes.length, 2);

    const buffer = { duration: 1 };
    DeferredAudioContext.decodes[1].resolve(buffer);
    assert.strictEqual(await second, buffer);
    assert.strictEqual(await sharedSecond, buffer);
});
