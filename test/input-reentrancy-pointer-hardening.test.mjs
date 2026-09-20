import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Input } from "../dist/index.js";

function eventTarget() {
    const listeners = new Map();
    return {
        addEventListener(type, listener) {
            const list = listeners.get(type) ?? [];
            list.push(listener);
            listeners.set(type, list);
        },
        removeEventListener(type, listener) {
            const list = listeners.get(type) ?? [];
            listeners.set(
                type,
                list.filter((candidate) => candidate !== listener)
            );
        },
        dispatch(type, event = {}) {
            event.currentTarget = this;
            for (const listener of [...(listeners.get(type) ?? [])]) {
                listener(event);
            }
        },
        listenerCount(type) {
            return (listeners.get(type) ?? []).length;
        }
    };
}

function keyEvent(code, key = code) {
    return {
        code,
        key,
        defaultPrevented: false,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function pointerEvent(pointerId, button = 0, clientX = 12, clientY = 34) {
    return {
        pointerId,
        button,
        clientX,
        clientY,
        target: null,
        currentTarget: null,
        defaultPrevented: false,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function inputListener(overrides = {}) {
    return {
        inputEnded: () => undefined,
        inputStarted: () => undefined,
        isAcceptingInput: () => true,
        keyPressed: () => undefined,
        keyReleased: () => undefined,
        mouseClicked: () => undefined,
        mouseDragged: () => undefined,
        mouseMoved: () => undefined,
        mousePressed: () => undefined,
        mouseReleased: () => undefined,
        mouseWheelMoved: () => undefined,
        controllerButtonPressed: () => undefined,
        controllerButtonReleased: () => undefined,
        controllerDownPressed: () => undefined,
        controllerDownReleased: () => undefined,
        controllerLeftPressed: () => undefined,
        controllerLeftReleased: () => undefined,
        controllerRightPressed: () => undefined,
        controllerRightReleased: () => undefined,
        controllerUpPressed: () => undefined,
        controllerUpReleased: () => undefined,
        setInput: () => undefined,
        ...overrides
    };
}

function gamepad() {
    return {
        axes: [0, 0],
        buttons: Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 })),
        connected: true,
        id: "hardening-pad",
        index: 0,
        mapping: "standard",
        timestamp: 1,
        vibrationActuator: null
    };
}

afterEach(() => {
    Input.controllersDisabled = false;
    Input.gamepadCacheGeneration = 0;
    delete globalThis.navigator;
});

test("reentrant suspension cannot underflow the queued-event ring", () => {
    const target = eventTarget();
    const input = new Input(600);
    const events = [];
    input.bindToElement(target);
    input.addKeyListener(
        inputListener({
            keyPressed(key) {
                events.push(key);
                input.pause();
            }
        })
    );

    target.dispatch("keydown", keyEvent("KeyA", "a"));
    target.dispatch("keydown", keyEvent("KeyB", "b"));
    input.poll(800, 600);

    assert.deepEqual(events, [Input.KEY_A]);
    assert.equal(input.eventCount, 0);
    assert.equal(input.eventHead, 0);

    target.dispatch("keyup", keyEvent("KeyA", "a"));
    target.dispatch("keyup", keyEvent("KeyB", "b"));
    input.resume();
    target.dispatch("keydown", keyEvent("KeyC", "c"));
    input.poll(800, 600);
    assert.deepEqual(events, [Input.KEY_A, Input.KEY_C]);
    input.unbind();
});

test("events enqueued by a callback wait for the next poll", () => {
    const target = eventTarget();
    const input = new Input(600);
    const events = [];
    input.bindToElement(target);
    input.addKeyListener(
        inputListener({
            keyPressed(key) {
                events.push(key);
                if (key === Input.KEY_A) {
                    target.dispatch("keydown", keyEvent("KeyB", "b"));
                }
            }
        })
    );

    target.dispatch("keydown", keyEvent("KeyA", "a"));
    input.poll(800, 600);
    assert.deepEqual(events, [Input.KEY_A]);
    assert.equal(input.eventCount, 1);

    input.poll(800, 600);
    assert.deepEqual(events, [Input.KEY_A, Input.KEY_B]);
    input.unbind();
});

test("nested poll is rejected and completed lifecycle starts are balanced", () => {
    const target = eventTarget();
    const input = new Input(600);
    const lifecycle = [];
    input.bindToElement(target);
    input.addKeyListener(
        inputListener({
            inputStarted() {
                lifecycle.push("start");
            },
            inputEnded() {
                lifecycle.push("end");
            },
            keyPressed() {
                input.poll(800, 600);
            }
        })
    );

    target.dispatch("keydown", keyEvent("KeyA", "a"));
    assert.throws(() => input.poll(800, 600), /not reentrant/);
    assert.deepEqual(lifecycle, ["start", "end"]);

    target.dispatch("keyup", keyEvent("KeyA", "a"));
    assert.doesNotThrow(() => input.poll(800, 600));
    input.unbind();
});

test("inputStarted failure ends all listeners that already started", () => {
    const input = new Input(600);
    const lifecycle = [];
    input.addKeyListener(
        inputListener({
            inputStarted() {
                lifecycle.push("first-start");
            },
            inputEnded() {
                lifecycle.push("first-end");
            }
        })
    );
    input.addKeyListener(
        inputListener({
            inputStarted() {
                lifecycle.push("second-start");
                throw new Error("start failure");
            },
            inputEnded() {
                lifecycle.push("second-end");
            }
        })
    );

    assert.throws(() => input.poll(800, 600), /start failure/);
    assert.deepEqual(lifecycle, ["first-start", "second-start", "first-end"]);
    assert.doesNotThrow(() => {
        input.removeAllListeners();
        input.poll(800, 600);
    });
});

test("inputEnded failures do not prevent later lifecycle cleanup", () => {
    const input = new Input(600);
    const lifecycle = [];
    input.addKeyListener(
        inputListener({
            inputStarted() {
                lifecycle.push("first-start");
            },
            inputEnded() {
                lifecycle.push("first-end");
                throw new Error("end failure");
            }
        })
    );
    input.addKeyListener(
        inputListener({
            inputStarted() {
                lifecycle.push("second-start");
            },
            inputEnded() {
                lifecycle.push("second-end");
            }
        })
    );

    assert.throws(() => input.poll(800, 600), /end failure/);
    assert.deepEqual(lifecycle, ["first-start", "second-start", "first-end", "second-end"]);
});

test("listener removal during inputStarted prevents a later lifecycle start", () => {
    const input = new Input(600);
    const lifecycle = [];
    const second = inputListener({
        inputStarted() {
            lifecycle.push("second-start");
        },
        inputEnded() {
            lifecycle.push("second-end");
        }
    });
    const first = inputListener({
        inputStarted() {
            lifecycle.push("first-start");
            input.removeKeyListener(second);
        },
        inputEnded() {
            lifecycle.push("first-end");
        }
    });
    input.addKeyListener(first);
    input.addKeyListener(second);

    input.poll(800, 600);

    assert.deepEqual(lifecycle, ["first-start", "first-end"]);
});

test("listener removal during dispatch takes effect before the next listener callback", () => {
    const target = eventTarget();
    const input = new Input(600);
    const calls = [];
    input.bindToElement(target);
    const second = inputListener({
        keyPressed() {
            calls.push("second");
        }
    });
    const first = inputListener({
        keyPressed() {
            calls.push("first");
            input.removeKeyListener(second);
        }
    });
    input.addKeyListener(first);
    input.addKeyListener(second);

    target.dispatch("keydown", keyEvent("KeyA", "a"));
    input.poll(800, 600);

    assert.deepEqual(calls, ["first"]);
    input.unbind();
});

test("controller disable during a callback stops later controller callbacks without suppressing keyboard dispatch", () => {
    const pad = gamepad();
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { getGamepads: () => [pad] },
        writable: true
    });
    const target = eventTarget();
    const input = new Input(600);
    const calls = [];
    input.bindToElement(target);
    input.addControllerListener(
        inputListener({
            controllerButtonPressed(_controller, buttonIndex) {
                calls.push(buttonIndex);
                Input.disableControllers();
            }
        })
    );
    input.poll(800, 600);

    pad.buttons[0] = { pressed: true, touched: true, value: 1 };
    pad.buttons[1] = { pressed: true, touched: true, value: 1 };
    input.poll(800, 600);
    assert.deepEqual(calls, [1]);

    const keyCalls = [];
    input.addKeyListener(
        inputListener({
            keyPressed(key) {
                keyCalls.push(key);
            }
        })
    );
    target.dispatch("keydown", keyEvent("KeyA", "a"));
    input.poll(800, 600);
    assert.deepEqual(keyCalls, [Input.KEY_A]);
    input.unbind();
});

test("pointer cancellation releases held state without synthesizing a click", () => {
    const target = eventTarget();
    const input = new Input(600);
    const events = [];
    input.bindToElement(target);
    input.addMouseListener(
        inputListener({
            mousePressed(button) {
                events.push(["pressed", button]);
            },
            mouseReleased(button) {
                events.push(["released", button]);
            },
            mouseClicked(button) {
                events.push(["clicked", button]);
            }
        })
    );

    target.dispatch("pointerdown", pointerEvent(7));
    input.poll(800, 600);
    assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), true);

    target.dispatch("pointercancel", pointerEvent(7));
    input.poll(800, 600);

    assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), false);
    assert.deepEqual(events, [
        ["pressed", Input.MOUSE_LEFT_BUTTON],
        ["released", Input.MOUSE_LEFT_BUTTON]
    ]);
    input.unbind();
});

test("outside-window release clears the pointer owner without preventing unrelated page interaction", () => {
    const previousWindow = globalThis.window;
    const windowTarget = eventTarget();
    globalThis.window = windowTarget;
    try {
        const target = eventTarget();
        const input = new Input(600);
        input.bindToElement(target);

        target.dispatch("pointerdown", pointerEvent(3, 0, 12, 34));
        input.poll(800, 600);
        const outsideRelease = pointerEvent(3, 0, 500, 500);
        windowTarget.dispatch("pointerup", outsideRelease);
        input.poll(800, 600);

        assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), false);
        assert.equal(outsideRelease.defaultPrevented, false);
        input.unbind();
        assert.equal(windowTarget.listenerCount("pointerup"), 0);
        assert.equal(windowTarget.listenerCount("pointercancel"), 0);
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
});

test("single-primary-pointer policy ignores a second simultaneous pointer", () => {
    const target = eventTarget();
    const input = new Input(600);
    const presses = [];
    input.bindToElement(target);
    input.addMouseListener(
        inputListener({
            mousePressed(button) {
                presses.push(button);
            }
        })
    );

    target.dispatch("pointerdown", pointerEvent(1));
    target.dispatch("pointerdown", pointerEvent(2));
    input.poll(800, 600);

    assert.deepEqual(presses, [Input.MOUSE_LEFT_BUTTON]);
    assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), true);

    target.dispatch("pointerup", pointerEvent(2));
    assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), true);
    target.dispatch("pointerup", pointerEvent(1));
    input.poll(800, 600);
    assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), false);
    input.unbind();
});
