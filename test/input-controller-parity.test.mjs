import assert from "node:assert/strict";
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

test("controller directional edge callbacks fire press and release", () => {
    const pad = gamepad();
    installGamepads([pad]);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

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

test("controller disconnect clears stale down state before reconnect", () => {
    const pad = gamepad();
    pad.buttons[0] = button(true);
    let snapshot = [pad];
    installGamepadProvider(() => snapshot);
    const input = new Input(600);
    const events = [];
    input.addControllerListener(listener(events));

    input.poll(800, 600);
    assert.equal(input.isControlPressed(4, 0), true);

    snapshot = [];
    input.poll(800, 600);

    snapshot = [pad];
    input.poll(800, 600);

    assert.deepEqual(events, [
        ["buttonPressed", 0, 1],
        ["buttonPressed", 0, 1]
    ]);
    assert.equal(input.isControlPressed(4, 0), true);
});
