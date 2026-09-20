import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, test } from "node:test";
import { Input } from "../dist/index.js";

function button(pressed = false) {
    return { pressed, touched: pressed, value: pressed ? 1 : 0 };
}

function gamepad(overrides = {}) {
    return {
        axes: [0, 0],
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

function installGamepads(gamepads) {
    return installGamepadProvider(() => gamepads);
}

function installGamepadProvider(provider) {
    let calls = 0;
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: {
            getGamepads: () => {
                calls++;
                return provider();
            }
        },
        writable: true
    });
    return {
        get calls() {
            return calls;
        }
    };
}

function listener(events) {
    return {
        controllerButtonPressed: (controller, buttonIndex) => events.push(["buttonPressed", controller, buttonIndex]),
        controllerButtonReleased: (controller, buttonIndex) => events.push(["buttonReleased", controller, buttonIndex]),
        controllerDownPressed: (controller) => events.push(["downPressed", controller]),
        controllerDownReleased: (controller) => events.push(["downReleased", controller]),
        controllerLeftPressed: (controller) => events.push(["leftPressed", controller]),
        controllerLeftReleased: (controller) => events.push(["leftReleased", controller]),
        controllerRightPressed: (controller) => events.push(["rightPressed", controller]),
        controllerRightReleased: (controller) => events.push(["rightReleased", controller]),
        controllerUpPressed: (controller) => events.push(["upPressed", controller]),
        controllerUpReleased: (controller) => events.push(["upReleased", controller]),
        inputEnded: () => undefined,
        inputStarted: () => undefined,
        isAcceptingInput: () => true,
        setInput: () => undefined
    };
}

afterEach(() => {
    Input.controllersDisabled = false;
    Input.gamepadCacheGeneration = 0;
    delete globalThis.navigator;
});

test("controller directions use axes and standard D-pad buttons", () => {
    const axisPad = gamepad({ axes: [-1, 0] });
    installGamepads([axisPad]);
    const input = new Input(600);

    assert.equal(input.isControllerLeft(0), true);
    assert.equal(input.isControllerRight(0), false);

    const dpadPad = gamepad();
    dpadPad.buttons[14] = button(true);
    installGamepads([dpadPad]);
    const dpadInput = new Input(600);

    assert.equal(dpadInput.isControllerLeft(0), true);
    assert.equal(dpadInput.isControllerUp(0), false);

    dpadPad.buttons[14] = button(false);
    dpadPad.buttons[12] = button(true);

    assert.equal(dpadInput.isControllerUp(0), true);
});

test("controller directions use browser POV hat axis values", () => {
    const cases = [
        [-1, { up: true, right: false, down: false, left: false }],
        [-5 / 7, { up: true, right: true, down: false, left: false }],
        [-3 / 7, { up: false, right: true, down: false, left: false }],
        [-1 / 7, { up: false, right: true, down: true, left: false }],
        [1 / 7, { up: false, right: false, down: true, left: false }],
        [3 / 7, { up: false, right: false, down: true, left: true }],
        [5 / 7, { up: false, right: false, down: false, left: true }],
        [1, { up: true, right: false, down: false, left: true }]
    ];

    for (const [hatValue, expected] of cases) {
        const pad = gamepad({ axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, hatValue] });
        installGamepads([pad]);
        const input = new Input(600);

        assert.equal(input.isControllerUp(0), expected.up, `up for ${hatValue}`);
        assert.equal(input.isControllerRight(0), expected.right, `right for ${hatValue}`);
        assert.equal(input.isControllerDown(0), expected.down, `down for ${hatValue}`);
        assert.equal(input.isControllerLeft(0), expected.left, `left for ${hatValue}`);
    }

    const neutralPad = gamepad({ axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 3.2857142857142856] });
    installGamepads([neutralPad]);
    const input = new Input(600);

    assert.equal(input.isControllerUp(Input.ANY_CONTROLLER), false);
    assert.equal(input.isControllerRight(Input.ANY_CONTROLLER), false);
    assert.equal(input.isControllerDown(Input.ANY_CONTROLLER), false);
    assert.equal(input.isControllerLeft(Input.ANY_CONTROLLER), false);
});

test("controller press and release callbacks use separate down and one-shot state", () => {
    const pad = gamepad();
    installGamepads([pad]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.poll(800, 600); // establish the initial connected-device baseline
    pad.buttons[0] = button(true);
    input.poll(800, 600);

    assert.equal(input.isControlPressed(4, 0), true);
    assert.equal(input.isControlPressed(4, 0), false);

    input.poll(800, 600);
    pad.buttons[0] = button(false);
    input.poll(800, 600);
    pad.buttons[0] = button(true);
    input.poll(800, 600);

    assert.deepEqual(events, [
        ["buttonPressed", 0, 1],
        ["buttonReleased", 0, 1],
        ["buttonPressed", 0, 1]
    ]);
});

test("redundant resume while already running does not suppress a fresh controller press", () => {
    const pad = gamepad();
    installGamepads([pad]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.poll(800, 600); // establish the initial connected-device baseline
    input.resume();
    pad.buttons[0] = button(true);
    input.poll(800, 600);

    assert.equal(input.isControlPressed(4, 0), true);
    assert.deepEqual(events, [["buttonPressed", 0, 1]]);
});

test("resume baselines held controller state without synthesizing a pressed edge", () => {
    const pad = gamepad();
    installGamepads([pad]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.poll(800, 600);
    pad.buttons[0] = button(true);
    input.poll(800, 600);
    assert.equal(input.isControlPressed(4, 0), true);
    events.length = 0;

    input.pause();
    input.resume();
    input.poll(800, 600);

    assert.equal(input.isButtonPressed(0, 0), true, "held physical state must still be visible after resume");
    assert.equal(input.isControlPressed(4, 0), false, "resume baseline must not synthesize a one-shot press");
    assert.deepEqual(events, [], "resume baseline must not dispatch a controllerPressed callback");

    pad.buttons[0] = button(false);
    input.poll(800, 600);
    assert.deepEqual(events, [["buttonReleased", 0, 1]], "release after resume baseline must still be observable");

    pad.buttons[0] = button(true);
    input.poll(800, 600);
    assert.equal(input.isControlPressed(4, 0), true);
    assert.deepEqual(events, [
        ["buttonReleased", 0, 1],
        ["buttonPressed", 0, 1]
    ]);
});

test("resume baselines held controller directions without synthesizing directional edges", () => {
    const pad = gamepad();
    installGamepads([pad]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.pause();
    pad.buttons[14] = button(true);
    input.resume();
    input.poll(800, 600);

    assert.equal(input.isControllerLeft(0), true);
    assert.equal(input.isControlPressed(0, 0), false);
    assert.deepEqual(events, []);

    pad.buttons[14] = button(false);
    input.poll(800, 600);
    pad.buttons[14] = button(true);
    input.poll(800, 600);

    assert.deepEqual(events, [
        ["leftReleased", 0],
        ["leftPressed", 0]
    ]);
});

test("controller directional edge callbacks fire press and release", () => {
    const pad = gamepad();
    installGamepads([pad]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.poll(800, 600);
    pad.buttons[14] = button(true);
    input.poll(800, 600);
    pad.buttons[14] = button(false);
    input.poll(800, 600);

    assert.deepEqual(events, [
        ["leftPressed", 0],
        ["leftReleased", 0]
    ]);
});

test("controller poll refreshes gamepads once and helpers reuse the frame snapshot", () => {
    const firstPad = gamepad({ axes: [-1, 0.25] });
    firstPad.buttons[0] = button(true);
    const secondPad = gamepad({ axes: [0, 0] });
    const snapshots = [[firstPad], [secondPad]];
    let index = 0;
    const provider = installGamepadProvider(() => snapshots[Math.min(index++, snapshots.length - 1)]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.poll(800, 600);

    assert.equal(provider.calls, 1);
    assert.equal(input.isButtonPressed(0, 0), true);
    assert.equal(input.isControllerLeft(0), true);
    assert.equal(input.getControllerCount(), 1);
    assert.equal(input.getAxisValue(0, 1), 0.25);
    assert.equal(provider.calls, 1);
    assert.deepEqual(events, [
        ["leftPressed", 0],
        ["buttonPressed", 0, 1]
    ]);
});

test("normal gameplay enumeration failure baselines the next successful controller poll", () => {
    const pad = gamepad();
    let calls = 0;
    installGamepadProvider(() => {
        calls++;
        if (calls === 2) {
            throw new Error("transient enumeration failure");
        }
        return [pad];
    });
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.poll(800, 600);
    pad.buttons[0] = button(true);
    input.poll(800, 600); // enumeration fails; transition is unknowable
    input.poll(800, 600); // held state becomes the new baseline

    assert.equal(input.isButtonPressed(0, 0), true);
    assert.equal(input.isControlPressed(4, 0), false);
    assert.deepEqual(events, []);

    pad.buttons[0] = button(false);
    input.poll(800, 600);
    pad.buttons[0] = button(true);
    input.poll(800, 600);
    assert.equal(input.isControlPressed(4, 0), true);
    assert.deepEqual(events, [
        ["buttonReleased", 0, 1],
        ["buttonPressed", 0, 1]
    ]);
});

test("resume baseline survives a transient gamepad enumeration failure", () => {
    const pad = gamepad();
    pad.buttons[0] = button(true);
    let calls = 0;
    installGamepadProvider(() => {
        calls++;
        if (calls === 1) {
            throw new Error("transient enumeration failure");
        }
        return [pad];
    });
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.pause();
    input.resume();

    assert.doesNotThrow(() => input.poll(800, 600));
    assert.equal(input.getControllerCount(), 0, "the failed enumeration is cached as no controllers for that frame");

    input.poll(800, 600);

    assert.equal(input.getControllerCount(), 1);
    assert.equal(input.isButtonPressed(0, 0), true);
    assert.equal(input.isControlPressed(4, 0), false, "held controller must still be baselined after transient enumeration failure");
    assert.deepEqual(events, []);
});

test("browser gamepad enumeration failure is contained as no connected controllers", () => {
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: {
            getGamepads() {
                throw new Error("gamepad enumeration failed");
            }
        },
        writable: true
    });
    const input = new Input(600);

    assert.doesNotThrow(() => input.poll(800, 600));
    assert.equal(input.getControllerCount(), 0);
    assert.equal(input.isControllerLeft(Input.ANY_CONTROLLER), false);
    assert.equal(input.isButtonPressed(0, Input.ANY_CONTROLLER), false);
});

test("controller sampling reuses scratch storage instead of allocating per frame", () => {
    const source = readFileSync(new URL("../src/slick/Input.ts", import.meta.url), "utf8");
    assert.match(source, /private readonly pendingGamepads: Gamepad\[\] = \[\]/);
    assert.match(source, /Input\.copyArray\(this\.pendingGamepads, this\.cachedGamepads\)/);
    assert.doesNotMatch(source, /const nextGamepads: Gamepad\[\] = \[\]/);
    assert.doesNotMatch(source, /const owner = `\$\{gamepad\.id/);
    assert.match(source, /additionalControllerAxisOwnerSlotGenerations/);
});

test("browser controller enumeration is capped at the public 16-controller limit", () => {
    const pads = Array.from({ length: 20 }, (_, index) => gamepad({ id: `pad-${index}`, index }));
    installGamepads(pads);
    const input = new Input(600);

    input.poll(800, 600);

    assert.equal(input.getControllerCount(), Input.BROWSER_CONTROLLER_LIMIT);
    assert.equal(input.getControllerConnectionGeneration(Input.BROWSER_CONTROLLER_LIMIT - 1) > 0, true);
    assert.equal(input.getControllerConnectionGeneration(Input.BROWSER_CONTROLLER_LIMIT), 0);
});

test("sparse physical gamepad slots outside the tracked range are ignored", () => {
    const sparse = Array.from({ length: 18 }, () => null);
    sparse[0] = gamepad({ id: "in-range", index: 0 });
    sparse[17] = gamepad({ id: "out-of-range", index: 17 });
    installGamepads(sparse);
    const input = new Input(600);

    input.poll(800, 600);

    assert.equal(input.getControllerCount(), 1);
    assert.equal(input.getControllerConnectionGeneration(0) > 0, true);
});

test("controller helpers lazily refresh once before the first poll", () => {
    const firstPad = gamepad({ axes: [0, -1] });
    firstPad.buttons[2] = button(true);
    const secondPad = gamepad({ axes: [0, 0] });
    const snapshots = [[firstPad], [secondPad]];
    let index = 0;
    const provider = installGamepadProvider(() => snapshots[Math.min(index++, snapshots.length - 1)]);
    const input = new Input(600);

    assert.equal(input.isButtonPressed(2, 0), true);
    assert.equal(input.isControllerUp(0), true);
    assert.equal(input.getAxisCount(0), 2);
    assert.equal(provider.calls, 1);

    input.poll(800, 600);

    assert.equal(provider.calls, 2);
    assert.equal(input.isButtonPressed(2, 0), false);
    assert.equal(input.isControllerUp(0), false);
    assert.equal(provider.calls, 2);
});

test("later controller polls refresh the cached frame snapshot", () => {
    const firstPad = gamepad();
    const secondPad = gamepad({ axes: [0, 1] });
    secondPad.buttons[1] = button(true);
    const snapshots = [[firstPad], [secondPad]];
    let index = 0;
    const provider = installGamepadProvider(() => snapshots[Math.min(index++, snapshots.length - 1)]);
    const input = new Input(600);

    input.poll(800, 600);

    assert.equal(input.isButtonPressed(1, 0), false);
    assert.equal(input.isControllerDown(0), false);
    assert.equal(provider.calls, 1);

    input.poll(800, 600);

    assert.equal(input.isButtonPressed(1, 0), true);
    assert.equal(input.isControllerDown(0), true);
    assert.equal(provider.calls, 2);
});

test("ANY_CONTROLLER and specific controller helpers share the cached snapshot", () => {
    const firstPad = gamepad({ index: 0 });
    const secondPad = gamepad({ axes: [0, -1], index: 1 });
    secondPad.buttons[2] = button(true);
    const provider = installGamepads([firstPad, secondPad]);
    const input = new Input(600);

    input.poll(800, 600);

    assert.equal(input.isButtonPressed(2, Input.ANY_CONTROLLER), true);
    assert.equal(input.isButtonPressed(2, 1), true);
    assert.equal(input.isControllerUp(Input.ANY_CONTROLLER), true);
    assert.equal(input.isControllerUp(1), true);
    assert.equal(input.getControllerCount(), 2);
    assert.equal(provider.calls, 1);
});

test("controller reconnect baselines held state instead of synthesizing a press", () => {
    const pad = gamepad();
    let snapshot = [pad];
    installGamepadProvider(() => snapshot);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.poll(800, 600);
    pad.buttons[0] = button(true);
    input.poll(800, 600);
    assert.equal(input.isControlPressed(4, 0), true);

    snapshot = [];
    input.poll(800, 600);

    snapshot = [pad];
    input.poll(800, 600);

    assert.deepEqual(events, [["buttonPressed", 0, 1]]);
    assert.equal(input.isButtonPressed(0, 0), true);
    assert.equal(input.isControlPressed(4, 0), false);
});

test("additional calibrated controller axes feed the normal directional state once per poll", () => {
    const pad = gamepad({ axes: [0, 0, 0.75, -0.4] });
    installGamepads([pad]);
    const input = new Input(600);
    input.setAdditionalControllerDirectionAxes([{ horizontalAxis: 2, verticalAxis: 3 }]);

    input.poll(800, 600); // learns the unusual neutral position
    assert.equal(input.isControllerLeft(0), false);
    assert.equal(input.isControllerUp(0), false);

    pad.axes[2] = -0.1;
    pad.axes[3] = -1;
    input.poll(800, 600);

    assert.equal(input.isControllerLeft(0), true);
    assert.equal(input.isControllerUp(0), true);
});

test("additional-axis recalibration can be reset explicitly", () => {
    const pad = gamepad({ axes: [0, 0, 0.8, 0] });
    installGamepads([pad]);
    const input = new Input(600);
    input.setAdditionalControllerDirectionAxes([{ horizontalAxis: 2, verticalAxis: 3 }]);
    input.poll(800, 600);

    pad.axes[2] = 0;
    input.resetAdditionalControllerDirectionAxisCalibration();
    input.poll(800, 600);

    assert.equal(input.isControllerLeft(0), false);
    assert.equal(input.isControllerRight(0), false);
});

test("disabled controllers do not report stale cached directions", () => {
    const pad = gamepad({ axes: [-1, 0] });
    pad.buttons[2] = button(true);
    installGamepads([pad]);
    const input = new Input(600);

    input.poll(800, 600);
    assert.equal(input.getControllerCount(), 1);
    assert.equal(input.getAxisCount(0), 2);
    assert.equal(input.getAxisValue(0, 0), -1);
    assert.equal(input.isButtonPressed(2, 0), true);
    assert.equal(input.isControllerLeft(0), true);

    Input.disableControllers();

    assert.equal(input.getControllerCount(), 0);
    assert.equal(input.getAxisCount(0), 0);
    assert.equal(input.getAxisValue(0, 0), 0);
    assert.equal(input.isButtonPressed(2, 0), false);
    assert.equal(input.isControlPressed(6, 0), false);
    assert.equal(input.isControllerLeft(0), false);
    assert.equal(input.isControllerLeft(Input.ANY_CONTROLLER), false);
});


test("controller sample status distinguishes enumeration uncertainty from a valid empty sample", () => {
    const pad = gamepad();
    let mode = "pad";
    installGamepadProvider(() => {
        if (mode === "throw") throw new Error("temporary Gamepad API failure");
        return mode === "empty" ? [] : [pad];
    });
    const input = new Input(600);

    input.poll(800, 600);
    const initial = { ...input.getControllerSampleStatus() };
    assert.equal(initial.valid, true);
    assert.equal(initial.available, true);
    assert.equal(input.getControllerCount(), 1);

    mode = "throw";
    input.poll(800, 600);
    const failed = { ...input.getControllerSampleStatus() };
    assert.equal(failed.valid, false);
    assert.equal(failed.available, true);
    assert.equal(input.getControllerCount(), 1, "uncertainty retains the last valid physical baseline");

    mode = "empty";
    input.poll(800, 600);
    const empty = { ...input.getControllerSampleStatus() };
    assert.equal(empty.valid, true);
    assert.equal(input.getControllerCount(), 0);
    assert.ok(empty.sequence > failed.sequence);
});

test("same-index reconnect event changes connection generation and baselines a held replacement", () => {
    const previousWindow = globalThis.window;
    const windowListeners = new Map();
    globalThis.window = {
        addEventListener(type, fn) {
            windowListeners.set(type, fn);
        },
        removeEventListener(type, fn) {
            if (windowListeners.get(type) === fn) windowListeners.delete(type);
        }
    };
    const first = gamepad({ id: "same", index: 0 });
    let current = first;
    installGamepadProvider(() => [current]);
    try {
        const input = new Input(600);
        input.bindToElement({
            addEventListener() {},
            removeEventListener() {}
        });
        input.poll(800, 600);
        const firstGeneration = input.getControllerConnectionGeneration(0);

        const replacement = gamepad({ id: "same", index: 0 });
        replacement.buttons[0] = button(true);
        current = replacement;
        windowListeners.get("gamepaddisconnected")?.({ gamepad: first });
        windowListeners.get("gamepadconnected")?.({ gamepad: replacement });
        input.poll(800, 600);

        assert.ok(input.getControllerConnectionGeneration(0) > firstGeneration);
        assert.equal(input.isButtonPressed(0, 0), true);
        assert.equal(input.isControlPressed(4, 0), false);
        input.unbind();
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
});

test("raw-layout buttons 12 through 15 remain action buttons instead of standardized D-pad aliases", () => {
    const pad = gamepad({ mapping: "" });
    installGamepads([pad]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));
    input.poll(800, 600);

    pad.buttons[14] = button(true);
    input.poll(800, 600);

    assert.equal(input.isControllerLeft(0), false);
    assert.equal(input.isControllerButtonDirectional(14, 0), false);
    assert.equal(input.isControlPressed(18, 0), true);
    assert.deepEqual(events, [["buttonPressed", 0, 15]]);
});

test("standard-layout D-pad buttons remain directional and are not duplicated as action buttons", () => {
    const pad = gamepad();
    installGamepads([pad]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));
    input.poll(800, 600);

    pad.buttons[14] = button(true);
    input.poll(800, 600);

    assert.equal(input.isControllerButtonDirectional(14, 0), true);
    assert.equal(input.isControllerLeft(0), true);
    assert.equal(input.isControlPressed(0, 0), true);
    assert.equal(input.isControlPressed(18, 0), false);
    assert.deepEqual(events, [["leftPressed", 0]]);
});

test("explicit baseline sampling seeds calibrated axes without dispatching controller actions", () => {
    const pad = gamepad({ axes: [0, 0, 0.8, -0.7] });
    installGamepads([pad]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));
    input.setAdditionalControllerDirectionAxes([{ horizontalAxis: 2, verticalAxis: 3 }]);

    const status = input.sampleControllersForBaseline();

    assert.equal(status.valid, true);
    assert.equal(status.baselineOnly, true);
    assert.equal(input.isControllerLeft(0), false);
    assert.equal(input.isControllerUp(0), false);
    assert.deepEqual(events, []);
});
