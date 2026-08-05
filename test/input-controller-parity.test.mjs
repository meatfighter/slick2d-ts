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
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: {
            getGamepads: () => gamepads
        },
        writable: true
    });
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

    assert.equal(input.isControllerLeft(0), true);
    assert.equal(input.isControllerUp(0), false);

    dpadPad.buttons[14] = button(false);
    dpadPad.buttons[12] = button(true);

    assert.equal(input.isControllerUp(0), true);
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
