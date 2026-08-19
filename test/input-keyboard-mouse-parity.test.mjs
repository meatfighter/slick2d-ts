import assert from "node:assert/strict";
import { test } from "node:test";
import { Input } from "../dist/index.js";

function eventTarget() {
    const listeners = new Map();
    return {
        addEventListener: (type, listener) => listeners.set(type, listener),
        removeEventListener: (type, listener) => {
            if (listeners.get(type) === listener) {
                listeners.delete(type);
            }
        },
        dispatch: (type, event) => listeners.get(type)?.(event)
    };
}

function keyEvent(code, key = "") {
    return {
        code,
        defaultPrevented: false,
        key,
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
        defaultPrevented: false,
        target: null,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function browserEvent() {
    return {
        defaultPrevented: false,
        target: null,
        preventDefault() {
            this.defaultPrevented = true;
        }
    };
}

function mouseListener(events) {
    return {
        inputEnded: () => undefined,
        inputStarted: () => undefined,
        isAcceptingInput: () => true,
        mouseClicked: (button, x, y, clickCount) => events.push(["clicked", button, x, y, clickCount]),
        mouseDragged: () => undefined,
        mouseMoved: () => undefined,
        mousePressed: (button, x, y) => events.push(["pressed", button, x, y]),
        mouseReleased: (button, x, y) => events.push(["released", button, x, y]),
        mouseWheelMoved: () => undefined,
        setInput: () => undefined
    };
}

test("public Input constants include Java Slick numpad and legacy key values", () => {
    const javaPublicConstants = [
        ["ANY_CONTROLLER", -1],
        ["MOUSE_LEFT_BUTTON", 0],
        ["MOUSE_RIGHT_BUTTON", 1],
        ["MOUSE_MIDDLE_BUTTON", 2],
        ["KEY_ESCAPE", 0x01],
        ["KEY_1", 0x02],
        ["KEY_2", 0x03],
        ["KEY_3", 0x04],
        ["KEY_4", 0x05],
        ["KEY_5", 0x06],
        ["KEY_6", 0x07],
        ["KEY_7", 0x08],
        ["KEY_8", 0x09],
        ["KEY_9", 0x0a],
        ["KEY_0", 0x0b],
        ["KEY_MINUS", 0x0c],
        ["KEY_EQUALS", 0x0d],
        ["KEY_BACK", 0x0e],
        ["KEY_TAB", 0x0f],
        ["KEY_Q", 0x10],
        ["KEY_W", 0x11],
        ["KEY_E", 0x12],
        ["KEY_R", 0x13],
        ["KEY_T", 0x14],
        ["KEY_Y", 0x15],
        ["KEY_U", 0x16],
        ["KEY_I", 0x17],
        ["KEY_O", 0x18],
        ["KEY_P", 0x19],
        ["KEY_LBRACKET", 0x1a],
        ["KEY_RBRACKET", 0x1b],
        ["KEY_RETURN", 0x1c],
        ["KEY_ENTER", 0x1c],
        ["KEY_LCONTROL", 0x1d],
        ["KEY_A", 0x1e],
        ["KEY_S", 0x1f],
        ["KEY_D", 0x20],
        ["KEY_F", 0x21],
        ["KEY_G", 0x22],
        ["KEY_H", 0x23],
        ["KEY_J", 0x24],
        ["KEY_K", 0x25],
        ["KEY_L", 0x26],
        ["KEY_SEMICOLON", 0x27],
        ["KEY_APOSTROPHE", 0x28],
        ["KEY_GRAVE", 0x29],
        ["KEY_LSHIFT", 0x2a],
        ["KEY_BACKSLASH", 0x2b],
        ["KEY_Z", 0x2c],
        ["KEY_X", 0x2d],
        ["KEY_C", 0x2e],
        ["KEY_V", 0x2f],
        ["KEY_B", 0x30],
        ["KEY_N", 0x31],
        ["KEY_M", 0x32],
        ["KEY_COMMA", 0x33],
        ["KEY_PERIOD", 0x34],
        ["KEY_SLASH", 0x35],
        ["KEY_RSHIFT", 0x36],
        ["KEY_MULTIPLY", 0x37],
        ["KEY_LMENU", 0x38],
        ["KEY_SPACE", 0x39],
        ["KEY_CAPITAL", 0x3a],
        ["KEY_F1", 0x3b],
        ["KEY_F2", 0x3c],
        ["KEY_F3", 0x3d],
        ["KEY_F4", 0x3e],
        ["KEY_F5", 0x3f],
        ["KEY_F6", 0x40],
        ["KEY_F7", 0x41],
        ["KEY_F8", 0x42],
        ["KEY_F9", 0x43],
        ["KEY_F10", 0x44],
        ["KEY_NUMLOCK", 0x45],
        ["KEY_SCROLL", 0x46],
        ["KEY_NUMPAD7", 0x47],
        ["KEY_NUMPAD8", 0x48],
        ["KEY_NUMPAD9", 0x49],
        ["KEY_SUBTRACT", 0x4a],
        ["KEY_NUMPAD4", 0x4b],
        ["KEY_NUMPAD5", 0x4c],
        ["KEY_NUMPAD6", 0x4d],
        ["KEY_ADD", 0x4e],
        ["KEY_NUMPAD1", 0x4f],
        ["KEY_NUMPAD2", 0x50],
        ["KEY_NUMPAD3", 0x51],
        ["KEY_NUMPAD0", 0x52],
        ["KEY_DECIMAL", 0x53],
        ["KEY_F11", 0x57],
        ["KEY_F12", 0x58],
        ["KEY_F13", 0x64],
        ["KEY_F14", 0x65],
        ["KEY_F15", 0x66],
        ["KEY_KANA", 0x70],
        ["KEY_CONVERT", 0x79],
        ["KEY_NOCONVERT", 0x7b],
        ["KEY_YEN", 0x7d],
        ["KEY_NUMPADEQUALS", 0x8d],
        ["KEY_CIRCUMFLEX", 0x90],
        ["KEY_AT", 0x91],
        ["KEY_COLON", 0x92],
        ["KEY_UNDERLINE", 0x93],
        ["KEY_KANJI", 0x94],
        ["KEY_STOP", 0x95],
        ["KEY_AX", 0x96],
        ["KEY_UNLABELED", 0x97],
        ["KEY_NUMPADENTER", 0x9c],
        ["KEY_RCONTROL", 0x9d],
        ["KEY_NUMPADCOMMA", 0xb3],
        ["KEY_DIVIDE", 0xb5],
        ["KEY_SYSRQ", 0xb7],
        ["KEY_RMENU", 0xb8],
        ["KEY_PAUSE", 0xc5],
        ["KEY_HOME", 0xc7],
        ["KEY_UP", 0xc8],
        ["KEY_PRIOR", 0xc9],
        ["KEY_LEFT", 0xcb],
        ["KEY_RIGHT", 0xcd],
        ["KEY_END", 0xcf],
        ["KEY_DOWN", 0xd0],
        ["KEY_NEXT", 0xd1],
        ["KEY_INSERT", 0xd2],
        ["KEY_DELETE", 0xd3],
        ["KEY_LWIN", 0xdb],
        ["KEY_RWIN", 0xdc],
        ["KEY_APPS", 0xdd],
        ["KEY_POWER", 0xde],
        ["KEY_SLEEP", 0xdf],
        ["KEY_LALT", 0x38],
        ["KEY_RALT", 0xb8]
    ];

    for (const [name, value] of javaPublicConstants) {
        assert.equal(Input[name], value, name);
    }

    assert.equal(Input.LEFT, undefined);
    assert.equal(Input.RIGHT, undefined);
    assert.equal(Input.UP, undefined);
    assert.equal(Input.DOWN, undefined);
    assert.equal(Input.BUTTON1, undefined);
    assert.equal(Input.MAX_BUTTONS, undefined);
});

test("browser numpad codes stay distinct from top-row digit codes", () => {
    const target = eventTarget();
    const input = new Input(600);
    input.bindToElement(target);

    target.dispatch("keydown", keyEvent("Numpad8", "8"));

    assert.equal(input.isKeyDown(Input.KEY_NUMPAD8), true);
    assert.equal(input.isKeyDown(Input.KEY_8), false);
    assert.equal(input.isKeyPressed(Input.KEY_NUMPAD8), true);
    assert.equal(input.isKeyPressed(Input.KEY_NUMPAD8), false);
    assert.equal(Input.getKeyName(Input.KEY_NUMPAD8), "Numpad8");

    target.dispatch("keyup", keyEvent("Numpad8", "8"));
    target.dispatch("keydown", keyEvent("Digit8", "8"));

    assert.equal(input.isKeyDown(Input.KEY_8), true);
    assert.equal(input.isKeyDown(Input.KEY_NUMPAD8), false);
    assert.equal(input.isKeyPressed(Input.KEY_8), true);
});

test("known but unmapped legacy Java key constants have stable names", () => {
    assert.equal(Input.getKeyName(Input.KEY_AT), "KEY_AT");
    assert.equal(Input.getKeyName(Input.KEY_CIRCUMFLEX), "KEY_CIRCUMFLEX");
    assert.equal(Input.getKeyName(Input.KEY_UNLABELED), "KEY_UNLABELED");
});

test("browser pointer buttons are translated to Slick mouse constants", () => {
    const target = eventTarget();
    const input = new Input(600);
    const events = [];
    input.bindToElement(target);
    input.addMouseListener(mouseListener(events));

    target.dispatch("pointerdown", pointerEvent(2));

    assert.equal(input.isMouseButtonDown(Input.MOUSE_RIGHT_BUTTON), true);
    assert.equal(input.isMouseButtonDown(Input.MOUSE_MIDDLE_BUTTON), false);
    assert.equal(input.isMousePressed(Input.MOUSE_RIGHT_BUTTON), true);

    target.dispatch("pointerup", pointerEvent(2));
    target.dispatch("pointerdown", pointerEvent(1));

    assert.equal(input.isMouseButtonDown(Input.MOUSE_RIGHT_BUTTON), false);
    assert.equal(input.isMouseButtonDown(Input.MOUSE_MIDDLE_BUTTON), true);

    assert.deepEqual(events, [
        ["pressed", Input.MOUSE_RIGHT_BUTTON, 12, 34],
        ["released", Input.MOUSE_RIGHT_BUTTON, 12, 34],
        ["clicked", Input.MOUSE_RIGHT_BUTTON, 12, 34, 1],
        ["pressed", Input.MOUSE_MIDDLE_BUTTON, 12, 34]
    ]);
});

test("unbind clears active keyboard and mouse state", () => {
    const target = eventTarget();
    const input = new Input(600);
    input.bindToElement(target);

    target.dispatch("keydown", keyEvent("KeyW", "w"));
    target.dispatch("pointerdown", pointerEvent(0));

    assert.equal(input.isKeyDown(Input.KEY_W), true);
    assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), true);

    input.unbind();

    assert.equal(input.isKeyDown(Input.KEY_W), false);
    assert.equal(input.isMouseButtonDown(Input.MOUSE_LEFT_BUTTON), false);
    assert.equal(input.isKeyPressed(Input.KEY_W), false);
    assert.equal(input.isMousePressed(Input.MOUSE_LEFT_BUTTON), false);
});

test("accepted wheel and context menu events suppress browser defaults", () => {
    const target = eventTarget();
    const input = new Input(600);
    const wheelMoves = [];
    input.bindToElement(target);
    input.addMouseListener({
        inputEnded: () => undefined,
        inputStarted: () => undefined,
        isAcceptingInput: () => true,
        mouseClicked: () => undefined,
        mouseDragged: () => undefined,
        mouseMoved: () => undefined,
        mousePressed: () => undefined,
        mouseReleased: () => undefined,
        mouseWheelMoved: (change) => wheelMoves.push(change),
        setInput: () => undefined
    });

    const wheel = { ...browserEvent(), deltaY: 4 };
    const contextMenu = browserEvent();
    target.dispatch("wheel", wheel);
    target.dispatch("contextmenu", contextMenu);

    assert.equal(wheel.defaultPrevented, true);
    assert.equal(contextMenu.defaultPrevented, true);
    assert.deepEqual(wheelMoves, [-4]);
});

test("prevent default element touch-action is restored", () => {
    const input = new Input(600);
    const element = { style: { touchAction: "pan-x" } };

    input.setPreventDefaultElement(element);
    assert.equal(element.style.touchAction, "none");

    input.setPreventDefaultElement(null);
    assert.equal(element.style.touchAction, "pan-x");
});
