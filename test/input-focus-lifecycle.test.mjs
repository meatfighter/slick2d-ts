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
