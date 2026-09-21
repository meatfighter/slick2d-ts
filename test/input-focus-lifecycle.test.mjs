import assert from "node:assert/strict";
import { test } from "node:test";
import { Input } from "../dist/index.js";

function eventTarget() {
    const listeners = new Map();
    return {
        addEventListener(type, listener) {
            listeners.set(type, listener);
        },
        removeEventListener(type, listener) {
            if (listeners.get(type) === listener) {
                listeners.delete(type);
            }
        },
        dispatch(type, event = {}) {
            listeners.get(type)?.(event);
        }
    };
}

function keyEvent(code, key) {
    return {
        code,
        key,
        defaultPrevented: false,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function pointerEvent(button) {
    return {
        button,
        clientX: 12,
        clientY: 34,
        currentTarget: null,
        target: null,
        defaultPrevented: false,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function gamepadButton(pressed = false) {
    return { pressed, touched: pressed, value: pressed ? 1 : 0 };
}

function gamepad(pressed = false) {
    const buttons = Array.from({ length: 16 }, () => gamepadButton(false));
    buttons[0] = gamepadButton(pressed);
    return {
        axes: [0, 0],
        buttons,
        connected: true,
        id: "focus-pad",
        index: 0,
        mapping: "standard",
        timestamp: 1,
        vibrationActuator: null
    };
}

test("blur and hidden-page lifecycle clear held browser input before focus returns", () => {
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const windowTarget = eventTarget();
    const documentTarget = {
        ...eventTarget(),
        visibilityState: "visible",
        hasFocus: () => true
    };
    globalThis.window = windowTarget;
    globalThis.document = documentTarget;

    try {
        const target = eventTarget();
        const input = new Input(600);
        input.bindToElement(target);

        target.dispatch("keydown", keyEvent("KeyW", "w"));
        target.dispatch("pointerdown", pointerEvent(0));
        assert.equal(input.isKeyDown(Input.KEY_W), true);
        assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), true);

        windowTarget.dispatch("blur");
        assert.equal(input.isKeyDown(Input.KEY_W), false);
        assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), false);
        assert.equal(input.isKeyPressed(Input.KEY_W), false);
        assert.equal(input.isMousePressed(Input.MOUSE_LEFT_BUTTON), false);

        target.dispatch("keydown", keyEvent("KeyW", "w"));
        target.dispatch("pointerdown", pointerEvent(0));
        documentTarget.visibilityState = "hidden";
        documentTarget.dispatch("visibilitychange");
        assert.equal(input.isKeyDown(Input.KEY_W), false);
        assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), false);
        assert.equal(input.isKeyPressed(Input.KEY_W), false);
        assert.equal(input.isMousePressed(Input.MOUSE_LEFT_BUTTON), false);

        input.unbind();
    } finally {
        if (previousWindow === undefined) {
            delete globalThis.window;
        } else {
            globalThis.window = previousWindow;
        }
        if (previousDocument === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = previousDocument;
        }
    }
});

test("keyboard key held through pause stays suppressed until a real keyup", () => {
    const target = eventTarget();
    const input = new Input(600);
    input.bindToElement(target);

    target.dispatch("keydown", keyEvent("KeyW", "w"));
    assert.equal(input.isKeyDown(Input.KEY_W), true);

    input.pause();
    input.resume();

    target.dispatch("keydown", keyEvent("KeyW", "w")); // browser repeat while still physically held
    input.poll(800, 600);
    assert.equal(input.isKeyDown(Input.KEY_W), false);
    assert.equal(input.isKeyPressed(Input.KEY_W), false);

    target.dispatch("keyup", keyEvent("KeyW", "w"));
    target.dispatch("keydown", keyEvent("KeyW", "w"));
    input.poll(800, 600);
    assert.equal(input.isKeyDown(Input.KEY_W), true);
    assert.equal(input.isKeyPressed(Input.KEY_W), true);

    input.unbind();
});

test("keyup on the PWA/menu window clears a suspended game-key latch", () => {
    const previousWindow = globalThis.window;
    const windowTarget = eventTarget();
    globalThis.window = windowTarget;

    try {
        const target = eventTarget();
        const input = new Input(600);
        input.bindToElement(target);

        target.dispatch("keydown", keyEvent("KeyW", "w"));
        input.pause();

        // Focus is on the PWA menu, so the game target never receives this keyup.
        windowTarget.dispatch("keyup", keyEvent("KeyW", "w"));

        input.resume();
        target.dispatch("keydown", keyEvent("KeyW", "w"));
        input.poll(800, 600);

        assert.equal(input.isKeyDown(Input.KEY_W), true);
        assert.equal(input.isKeyPressed(Input.KEY_W), true, "a key released in the menu must work on its first fresh post-Continue press");

        input.unbind();
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
});

test("game key first pressed while PWA menu owns focus stays suppressed after Continue", () => {
    const previousWindow = globalThis.window;
    const windowTarget = eventTarget();
    globalThis.window = windowTarget;

    try {
        const target = eventTarget();
        const input = new Input(600);
        input.bindToElement(target);

        input.pause();
        windowTarget.dispatch("keydown", keyEvent("KeyW", "w"));

        input.resume();
        target.dispatch("keydown", keyEvent("KeyW", "w")); // repeat/continued hold after canvas focus returns
        input.poll(800, 600);
        assert.equal(input.isKeyDown(Input.KEY_W), false);
        assert.equal(input.isKeyPressed(Input.KEY_W), false);

        windowTarget.dispatch("keyup", keyEvent("KeyW", "w"));
        target.dispatch("keydown", keyEvent("KeyW", "w"));
        input.poll(800, 600);
        assert.equal(input.isKeyPressed(Input.KEY_W), true);

        input.unbind();
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
    }
});

test("keyboard key first pressed while paused cannot leak into the resumed game", () => {
    const target = eventTarget();
    const input = new Input(600);
    input.bindToElement(target);

    input.pause();
    target.dispatch("keydown", keyEvent("KeyW", "w"));
    input.resume();

    target.dispatch("keydown", keyEvent("KeyW", "w")); // repeat after resume
    input.poll(800, 600);
    assert.equal(input.isKeyDown(Input.KEY_W), false);
    assert.equal(input.isKeyPressed(Input.KEY_W), false);

    target.dispatch("keyup", keyEvent("KeyW", "w"));
    target.dispatch("keydown", keyEvent("KeyW", "w"));
    input.poll(800, 600);
    assert.equal(input.isKeyPressed(Input.KEY_W), true);

    input.unbind();
});

test("controller held across browser blur is baselined instead of reported as a fresh press", () => {
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const previousNavigator = globalThis.navigator;
    const windowTarget = eventTarget();
    let focused = true;
    const documentTarget = {
        ...eventTarget(),
        visibilityState: "visible",
        hasFocus: () => focused
    };
    let pad = gamepad(false);
    globalThis.window = windowTarget;
    globalThis.document = documentTarget;
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { getGamepads: () => [pad] },
        writable: true
    });

    try {
        const target = eventTarget();
        const input = new Input(600);
        input.bindToElement(target);

        input.poll(800, 600);
        assert.equal(input.isControlPressed(4, 0), false);

        focused = false;
        windowTarget.dispatch("blur");
        pad = gamepad(true);

        focused = true;
        input.poll(800, 600);
        assert.equal(input.isButtonPressed(0, 0), true);
        assert.equal(input.isControlPressed(4, 0), false, "held button from unfocused time must only establish the resumed baseline");

        pad = gamepad(false);
        input.poll(800, 600);
        pad = gamepad(true);
        input.poll(800, 600);
        assert.equal(input.isControlPressed(4, 0), true, "a fresh press after release must still be reported");

        input.unbind();
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
        if (previousNavigator === undefined) delete globalThis.navigator;
        else Object.defineProperty(globalThis, "navigator", { configurable: true, value: previousNavigator, writable: true });
    }
});

test("polling while unfocused preserves controller baseline until focus returns", () => {
    const previousDocument = globalThis.document;
    const previousNavigator = globalThis.navigator;
    let focused = false;
    const documentTarget = {
        visibilityState: "visible",
        hasFocus: () => focused
    };
    let pad = gamepad(true);
    globalThis.document = documentTarget;
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { getGamepads: () => [pad] },
        writable: true
    });

    try {
        const input = new Input(600);

        input.poll(800, 600);
        focused = true;
        input.poll(800, 600);

        assert.equal(input.isButtonPressed(0, 0), true);
        assert.equal(input.isControlPressed(4, 0), false);

        pad = gamepad(false);
        input.poll(800, 600);
        pad = gamepad(true);
        input.poll(800, 600);
        assert.equal(input.isControlPressed(4, 0), true);
    } finally {
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
        if (previousNavigator === undefined) delete globalThis.navigator;
        else Object.defineProperty(globalThis, "navigator", { configurable: true, value: previousNavigator, writable: true });
    }
});
