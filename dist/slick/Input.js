function isAccepting(listener) {
    return listener.isAcceptingInput();
}
/**
 * Java Slick2D counterpart: org.newdawn.slick.Input.
 *
 * Browser keyboard, mouse, and Gamepad API adapter using Slick/LWJGL constants.
 */
export class Input {
    height;
    static ANY_CONTROLLER = -1;
    static MOUSE_LEFT_BUTTON = 0;
    static MOUSE_RIGHT_BUTTON = 1;
    static MOUSE_MIDDLE_BUTTON = 2;
    static KEY_ESCAPE = 0x01;
    static KEY_1 = 0x02;
    static KEY_2 = 0x03;
    static KEY_3 = 0x04;
    static KEY_4 = 0x05;
    static KEY_5 = 0x06;
    static KEY_6 = 0x07;
    static KEY_7 = 0x08;
    static KEY_8 = 0x09;
    static KEY_9 = 0x0a;
    static KEY_0 = 0x0b;
    static KEY_MINUS = 0x0c;
    static KEY_EQUALS = 0x0d;
    static KEY_BACK = 0x0e;
    static KEY_TAB = 0x0f;
    static KEY_Q = 0x10;
    static KEY_W = 0x11;
    static KEY_E = 0x12;
    static KEY_R = 0x13;
    static KEY_T = 0x14;
    static KEY_Y = 0x15;
    static KEY_U = 0x16;
    static KEY_I = 0x17;
    static KEY_O = 0x18;
    static KEY_P = 0x19;
    static KEY_LBRACKET = 0x1a;
    static KEY_RBRACKET = 0x1b;
    static KEY_RETURN = 0x1c;
    static KEY_ENTER = 0x1c;
    static KEY_LCONTROL = 0x1d;
    static KEY_A = 0x1e;
    static KEY_S = 0x1f;
    static KEY_D = 0x20;
    static KEY_F = 0x21;
    static KEY_G = 0x22;
    static KEY_H = 0x23;
    static KEY_J = 0x24;
    static KEY_K = 0x25;
    static KEY_L = 0x26;
    static KEY_SEMICOLON = 0x27;
    static KEY_APOSTROPHE = 0x28;
    static KEY_GRAVE = 0x29;
    static KEY_LSHIFT = 0x2a;
    static KEY_BACKSLASH = 0x2b;
    static KEY_Z = 0x2c;
    static KEY_X = 0x2d;
    static KEY_C = 0x2e;
    static KEY_V = 0x2f;
    static KEY_B = 0x30;
    static KEY_N = 0x31;
    static KEY_M = 0x32;
    static KEY_COMMA = 0x33;
    static KEY_PERIOD = 0x34;
    static KEY_SLASH = 0x35;
    static KEY_RSHIFT = 0x36;
    static KEY_MULTIPLY = 0x37;
    static KEY_LMENU = 0x38;
    static KEY_SPACE = 0x39;
    static KEY_CAPITAL = 0x3a;
    static KEY_F1 = 0x3b;
    static KEY_F2 = 0x3c;
    static KEY_F3 = 0x3d;
    static KEY_F4 = 0x3e;
    static KEY_F5 = 0x3f;
    static KEY_F6 = 0x40;
    static KEY_F7 = 0x41;
    static KEY_F8 = 0x42;
    static KEY_F9 = 0x43;
    static KEY_F10 = 0x44;
    static KEY_NUMLOCK = 0x45;
    static KEY_SCROLL = 0x46;
    static KEY_NUMPAD7 = 0x47;
    static KEY_NUMPAD8 = 0x48;
    static KEY_NUMPAD9 = 0x49;
    static KEY_SUBTRACT = 0x4a;
    static KEY_NUMPAD4 = 0x4b;
    static KEY_NUMPAD5 = 0x4c;
    static KEY_NUMPAD6 = 0x4d;
    static KEY_ADD = 0x4e;
    static KEY_NUMPAD1 = 0x4f;
    static KEY_NUMPAD2 = 0x50;
    static KEY_NUMPAD3 = 0x51;
    static KEY_NUMPAD0 = 0x52;
    static KEY_DECIMAL = 0x53;
    static KEY_F11 = 0x57;
    static KEY_F12 = 0x58;
    static KEY_F13 = 0x64;
    static KEY_F14 = 0x65;
    static KEY_F15 = 0x66;
    static KEY_KANA = 0x70;
    static KEY_CONVERT = 0x79;
    static KEY_NOCONVERT = 0x7b;
    static KEY_YEN = 0x7d;
    static KEY_NUMPADEQUALS = 0x8d;
    static KEY_CIRCUMFLEX = 0x90;
    static KEY_AT = 0x91;
    static KEY_COLON = 0x92;
    static KEY_UNDERLINE = 0x93;
    static KEY_KANJI = 0x94;
    static KEY_STOP = 0x95;
    static KEY_AX = 0x96;
    static KEY_UNLABELED = 0x97;
    static KEY_NUMPADENTER = 0x9c;
    static KEY_RCONTROL = 0x9d;
    static KEY_NUMPADCOMMA = 0xb3;
    static KEY_DIVIDE = 0xb5;
    static KEY_SYSRQ = 0xb7;
    static KEY_RMENU = 0xb8;
    static KEY_PAUSE = 0xc5;
    static KEY_HOME = 0xc7;
    static KEY_UP = 0xc8;
    static KEY_PRIOR = 0xc9;
    static KEY_LEFT = 0xcb;
    static KEY_RIGHT = 0xcd;
    static KEY_END = 0xcf;
    static KEY_DOWN = 0xd0;
    static KEY_NEXT = 0xd1;
    static KEY_INSERT = 0xd2;
    static KEY_DELETE = 0xd3;
    static KEY_LWIN = 0xdb;
    static KEY_RWIN = 0xdc;
    static KEY_APPS = 0xdd;
    static KEY_POWER = 0xde;
    static KEY_SLEEP = 0xdf;
    static KEY_LALT = Input.KEY_LMENU;
    static KEY_RALT = Input.KEY_RMENU;
    static POV_HAT_AXIS = 9;
    static POV_HAT_TOLERANCE = 0.04;
    static POV_HAT_UP = [-1, -5 / 7, 1];
    static POV_HAT_RIGHT = [-5 / 7, -3 / 7, -1 / 7];
    static POV_HAT_DOWN = [-1 / 7, 1 / 7, 3 / 7];
    static POV_HAT_LEFT = [3 / 7, 5 / 7, 1];
    static controllersDisabled = false;
    static gamepadCacheGeneration = 0;
    downKeys = new Set();
    pressedKeys = new Set();
    downMouse = new Set();
    pressedMouse = new Set();
    controlPressed = new Set();
    controlDown = new Set();
    seenControllers = new Set();
    staleControlKeys = [];
    keyListeners = [];
    mouseListeners = [];
    controllerListeners = [];
    target = null;
    paused = false;
    scaleX = 1;
    scaleY = 1;
    offsetX = 0;
    offsetY = 0;
    mouseX = 0;
    mouseY = 0;
    absoluteMouseX = 0;
    absoluteMouseY = 0;
    keyRepeat = false;
    keyRepeatInitial = 400;
    keyRepeatInterval = 50;
    doubleClickDelay = 250;
    mouseClickTolerance = 5;
    preventDefaultElement = null;
    cachedGamepads = [];
    gamepadsCached = false;
    gamepadCacheGeneration = -1;
    /**
     * Java Slick2D counterpart: Input.disableControllers().
     *
     * Disables controller polling for this page session.
     */
    static disableControllers() {
        Input.controllersDisabled = true;
        Input.gamepadCacheGeneration++;
    }
    /**
     * Java Slick2D counterpart: Input.getKeyName(int).
     *
     * Returns a stable diagnostic key name for LWJGL key codes.
     */
    static getKeyName(code) {
        return Input.keyNames.get(code) ?? `KEY_${code}`;
    }
    /**
     * Java Slick2D counterpart: Input(int height).
     *
     * Creates an input adapter for a container of the supplied height.
     */
    constructor(height) {
        this.height = height;
    }
    /** Browser parity helper: attaches DOM listeners to an element/window. */
    bindToElement(target) {
        this.unbind();
        this.target = target;
        target.addEventListener("keydown", this.handleKeyDown);
        target.addEventListener("keyup", this.handleKeyUp);
        target.addEventListener("pointerdown", this.handlePointerDown);
        target.addEventListener("pointerup", this.handlePointerUp);
        target.addEventListener("pointermove", this.handlePointerMove);
        target.addEventListener("wheel", this.handleWheel);
        if (typeof window !== "undefined") {
            window.addEventListener("blur", this.handleFocusLost);
        }
        if (typeof document !== "undefined") {
            document.addEventListener("visibilitychange", this.handleVisibilityChange);
        }
    }
    /** Browser parity helper: element whose focused game keys should suppress browser defaults. */
    setPreventDefaultElement(element) {
        this.preventDefaultElement = element;
    }
    /** Browser parity helper: removes attached DOM listeners. */
    unbind() {
        if (!this.target) {
            return;
        }
        this.target.removeEventListener("keydown", this.handleKeyDown);
        this.target.removeEventListener("keyup", this.handleKeyUp);
        this.target.removeEventListener("pointerdown", this.handlePointerDown);
        this.target.removeEventListener("pointerup", this.handlePointerUp);
        this.target.removeEventListener("pointermove", this.handlePointerMove);
        this.target.removeEventListener("wheel", this.handleWheel);
        if (typeof window !== "undefined") {
            window.removeEventListener("blur", this.handleFocusLost);
        }
        if (typeof document !== "undefined") {
            document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        }
        this.target = null;
    }
    /** Java Slick2D counterpart: Input.setDoubleClickInterval(int). */
    setDoubleClickInterval(delay) {
        this.doubleClickDelay = delay;
    }
    /** Java Slick2D counterpart: Input.setMouseClickTolerance(int). */
    setMouseClickTolerance(mouseClickTolerance) {
        this.mouseClickTolerance = mouseClickTolerance;
    }
    /** Java Slick2D counterpart: Input.initControllers(). */
    initControllers() {
        this.invalidateGamepads();
    }
    /** Java Slick2D counterpart: Input.addListener(InputListener). */
    addListener(listener) {
        this.addKeyListener(listener);
        this.addMouseListener(listener);
        this.addControllerListener(listener);
    }
    /** Java Slick2D counterpart: Input.removeListener(InputListener). */
    removeListener(listener) {
        this.removeKeyListener(listener);
        this.removeMouseListener(listener);
        this.removeControllerListener(listener);
    }
    /** Java Slick2D counterpart: Input.removeAllListeners(). */
    removeAllListeners() {
        this.removeAllKeyListeners();
        this.removeAllMouseListeners();
        this.removeAllControllerListeners();
    }
    /** Java Slick2D counterpart: Input.removeAllKeyListeners(). */
    removeAllKeyListeners() {
        this.keyListeners.length = 0;
    }
    /** Java Slick2D counterpart: Input.removeAllMouseListeners(). */
    removeAllMouseListeners() {
        this.mouseListeners.length = 0;
    }
    /** Java Slick2D counterpart: Input.removeAllControllerListeners(). */
    removeAllControllerListeners() {
        this.controllerListeners.length = 0;
    }
    /** Java Slick2D counterpart: Input.addPrimaryListener(InputListener). */
    addPrimaryListener(listener) {
        this.removeListener(listener);
        this.keyListeners.unshift(listener);
        this.mouseListeners.unshift(listener);
        this.controllerListeners.unshift(listener);
        listener.setInput(this);
    }
    /** Java Slick2D counterpart: Input.addKeyListener(KeyListener). */
    addKeyListener(listener) {
        if (!this.keyListeners.includes(listener)) {
            this.keyListeners.push(listener);
            listener.setInput(this);
        }
    }
    /** Java Slick2D counterpart: Input.removeKeyListener(KeyListener). */
    removeKeyListener(listener) {
        this.removeFrom(this.keyListeners, listener);
    }
    /** Java Slick2D counterpart: Input.addMouseListener(MouseListener). */
    addMouseListener(listener) {
        if (!this.mouseListeners.includes(listener)) {
            this.mouseListeners.push(listener);
            listener.setInput(this);
        }
    }
    /** Java Slick2D counterpart: Input.removeMouseListener(MouseListener). */
    removeMouseListener(listener) {
        this.removeFrom(this.mouseListeners, listener);
    }
    /** Java Slick2D counterpart: Input.addControllerListener(ControllerListener). */
    addControllerListener(listener) {
        if (!this.controllerListeners.includes(listener)) {
            this.controllerListeners.push(listener);
            listener.setInput(this);
        }
    }
    /** Java Slick2D counterpart: Input.removeControllerListener(ControllerListener). */
    removeControllerListener(listener) {
        this.removeFrom(this.controllerListeners, listener);
    }
    /** Java Slick2D counterpart: Input.setScale(float, float). */
    setScale(xscale, yscale) {
        this.scaleX = xscale;
        this.scaleY = yscale;
    }
    /** Java Slick2D counterpart: Input.setOffset(float, float). */
    setOffset(xoffset, yoffset) {
        this.offsetX = xoffset;
        this.offsetY = yoffset;
    }
    /** Java Slick2D counterpart: Input.resetInputTransform(). */
    resetInputTransform() {
        this.scaleX = 1;
        this.scaleY = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }
    /** Java Slick2D counterpart: Input.isKeyPressed(int). */
    isKeyPressed(key) {
        const pressed = this.pressedKeys.has(key);
        this.pressedKeys.delete(key);
        return pressed;
    }
    /** Java Slick2D counterpart: Input.isKeyDown(int). */
    isKeyDown(key) {
        return this.downKeys.has(key);
    }
    /** Java Slick2D counterpart: Input.clearKeyPressedRecord(). */
    clearKeyPressedRecord() {
        this.pressedKeys.clear();
    }
    /** Java Slick2D counterpart: Input.clearControlPressedRecord(). */
    clearControlPressedRecord() {
        this.controlPressed.clear();
    }
    /** Java Slick2D counterpart: Input.clearMousePressedRecord(). */
    clearMousePressedRecord() {
        this.pressedMouse.clear();
    }
    isControlPressed(button, controller = 0) {
        const key = Input.controlKey(controller, button);
        const pressed = this.controlPressed.has(key);
        this.controlPressed.delete(key);
        return pressed;
    }
    /** Java Slick2D counterpart: Input.isButtonPressed(int, int). */
    isButtonPressed(index, controller) {
        const gamepads = this.getFrameGamepads();
        if (controller === Input.ANY_CONTROLLER) {
            for (const gamepad of gamepads) {
                if (gamepad?.buttons[index]?.pressed === true) {
                    return true;
                }
            }
            return false;
        }
        return gamepads[controller]?.buttons[index]?.pressed === true;
    }
    /** Java Slick2D counterpart: Input.isButton1Pressed(int). */
    isButton1Pressed(controller) {
        return this.isButtonPressed(0, controller);
    }
    /** Java Slick2D counterpart: Input.isButton2Pressed(int). */
    isButton2Pressed(controller) {
        return this.isButtonPressed(1, controller);
    }
    /** Java Slick2D counterpart: Input.isButton3Pressed(int). */
    isButton3Pressed(controller) {
        return this.isButtonPressed(2, controller);
    }
    /** Java Slick2D counterpart: Input.isButtonDown(int, int). */
    isButtonDown(index, controller) {
        return this.isButtonPressed(index, controller);
    }
    /** Java Slick2D counterpart: Input.getControllerCount(). */
    getControllerCount() {
        if (Input.controllersDisabled) {
            return 0;
        }
        let count = 0;
        const gamepads = this.getFrameGamepads();
        for (const gamepad of gamepads) {
            if (gamepad) {
                count++;
            }
        }
        return count;
    }
    /** Java Slick2D counterpart: Input.getAxisCount(int). */
    getAxisCount(controller) {
        return this.getFrameGamepads()[controller]?.axes.length ?? 0;
    }
    /** Java Slick2D counterpart: Input.getAxisValue(int, int). */
    getAxisValue(controller, axis) {
        return this.getFrameGamepads()[controller]?.axes[axis] ?? 0;
    }
    /** Java Slick2D counterpart: Input.getAxisName(int, int). */
    getAxisName(_controller, axis) {
        return `Axis ${axis}`;
    }
    /** Java Slick2D counterpart: Input.isControllerLeft(int). */
    isControllerLeft(controller) {
        return this.anyController(controller, Input.isGamepadLeft);
    }
    /** Java Slick2D counterpart: Input.isControllerRight(int). */
    isControllerRight(controller) {
        return this.anyController(controller, Input.isGamepadRight);
    }
    /** Java Slick2D counterpart: Input.isControllerUp(int). */
    isControllerUp(controller) {
        return this.anyController(controller, Input.isGamepadUp);
    }
    /** Java Slick2D counterpart: Input.isControllerDown(int). */
    isControllerDown(controller) {
        return this.anyController(controller, Input.isGamepadDown);
    }
    /** Java Slick2D counterpart: Input.isControllerLeftPressed(int). */
    isControllerLeftPressed(controller) {
        return this.isControlPressed(0, controller);
    }
    /** Java Slick2D counterpart: Input.isControllerRightPressed(int). */
    isControllerRightPressed(controller) {
        return this.isControlPressed(1, controller);
    }
    /** Java Slick2D counterpart: Input.isControllerUpPressed(int). */
    isControllerUpPressed(controller) {
        return this.isControlPressed(2, controller);
    }
    /** Java Slick2D counterpart: Input.isControllerDownPressed(int). */
    isControllerDownPressed(controller) {
        return this.isControlPressed(3, controller);
    }
    /** Java Slick2D counterpart: Input.getAbsoluteMouseX(). */
    getAbsoluteMouseX() {
        return this.absoluteMouseX;
    }
    /** Java Slick2D counterpart: Input.getAbsoluteMouseY(). */
    getAbsoluteMouseY() {
        return this.absoluteMouseY;
    }
    /** Java Slick2D counterpart: Input.getMouseX(). */
    getMouseX() {
        return this.mouseX;
    }
    /** Java Slick2D counterpart: Input.getMouseY(). */
    getMouseY() {
        return this.mouseY;
    }
    /** Java Slick2D counterpart: Input.isMouseButtonDown(int). */
    isMouseButtonDown(button) {
        return this.downMouse.has(button);
    }
    /** Java Slick2D counterpart: Input.isMousePressed(int). */
    isMousePressed(button) {
        const pressed = this.pressedMouse.has(button);
        this.pressedMouse.delete(button);
        return pressed;
    }
    /** Java Slick2D counterpart: Input.consumeEvent(). */
    consumeEvent() { }
    /** Java Slick2D counterpart: Input.considerDoubleClick(int, int, int). */
    considerDoubleClick(_button, _x, _y) { }
    /** Java Slick2D counterpart: Input.poll(int, int). */
    poll(_width, height) {
        this.height = height;
        if (!Input.browserHasInputFocus()) {
            this.clearAllInputState();
            return;
        }
        if (this.paused) {
            this.clearPressedRecords();
            this.invalidateGamepads();
            return;
        }
        if (Input.controllersDisabled) {
            this.invalidateGamepads();
        }
        else {
            this.refreshGamepads();
        }
        this.pollControllers();
    }
    enableKeyRepeat(initial = 400, interval = 50) {
        this.keyRepeat = true;
        this.keyRepeatInitial = initial;
        this.keyRepeatInterval = interval;
    }
    /** Java Slick2D counterpart: Input.disableKeyRepeat(). */
    disableKeyRepeat() {
        this.keyRepeat = false;
    }
    /** Java Slick2D counterpart: Input.isKeyRepeatEnabled(). */
    isKeyRepeatEnabled() {
        return this.keyRepeat;
    }
    /** Java Slick2D counterpart: Input.pause(). */
    pause() {
        this.paused = true;
        this.clearAllInputState();
    }
    /** Java Slick2D counterpart: Input.resume(). */
    resume() {
        this.paused = false;
    }
    handleKeyDown = (event) => {
        const key = Input.keyCodeFromEvent(event);
        if (key === 0) {
            return;
        }
        if (this.shouldPreventDefault(event, key)) {
            event.preventDefault();
        }
        if (this.paused || !this.shouldAcceptGameKey(event)) {
            return;
        }
        const wasDown = this.downKeys.has(key);
        this.downKeys.add(key);
        if (!wasDown || this.keyRepeat) {
            this.pressedKeys.add(key);
            for (const listener of this.keyListeners) {
                if (isAccepting(listener)) {
                    listener.keyPressed(key, event.key?.length === 1 ? event.key : "\0");
                }
            }
        }
    };
    handleKeyUp = (event) => {
        const key = Input.keyCodeFromEvent(event);
        if (key === 0) {
            return;
        }
        if (this.shouldPreventDefault(event, key)) {
            event.preventDefault();
        }
        this.downKeys.delete(key);
        if (this.paused || !this.shouldAcceptGameKey(event)) {
            return;
        }
        for (const listener of this.keyListeners) {
            if (isAccepting(listener)) {
                listener.keyReleased(key, event.key?.length === 1 ? event.key : "\0");
            }
        }
    };
    handlePointerDown = (event) => {
        if (this.paused || !this.shouldAcceptPointerEvent(event)) {
            return;
        }
        const button = Input.mouseButtonFromEvent(event);
        this.updateMouse(event);
        this.downMouse.add(button);
        this.pressedMouse.add(button);
        for (const listener of this.mouseListeners) {
            if (isAccepting(listener)) {
                listener.mousePressed(button, this.mouseX, this.mouseY);
            }
        }
    };
    handlePointerUp = (event) => {
        if (this.paused || (!this.shouldAcceptPointerEvent(event) && this.downMouse.size === 0)) {
            return;
        }
        const button = Input.mouseButtonFromEvent(event);
        this.updateMouse(event);
        this.downMouse.delete(button);
        for (const listener of this.mouseListeners) {
            if (isAccepting(listener)) {
                listener.mouseReleased(button, this.mouseX, this.mouseY);
                listener.mouseClicked(button, this.mouseX, this.mouseY, 1);
            }
        }
    };
    handlePointerMove = (event) => {
        if (this.paused || (!this.shouldAcceptPointerEvent(event) && this.downMouse.size === 0)) {
            return;
        }
        const oldX = this.mouseX;
        const oldY = this.mouseY;
        this.updateMouse(event);
        for (const listener of this.mouseListeners) {
            if (isAccepting(listener)) {
                if (this.downMouse.size > 0) {
                    listener.mouseDragged(oldX, oldY, this.mouseX, this.mouseY);
                }
                else {
                    listener.mouseMoved(oldX, oldY, this.mouseX, this.mouseY);
                }
            }
        }
    };
    handleWheel = (event) => {
        if (this.paused || !this.shouldAcceptPointerEvent(event)) {
            return;
        }
        for (const listener of this.mouseListeners) {
            if (isAccepting(listener)) {
                listener.mouseWheelMoved(Math.trunc(-event.deltaY));
            }
        }
    };
    handleFocusLost = () => {
        this.clearAllInputState();
    };
    handleVisibilityChange = () => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            this.clearAllInputState();
        }
    };
    clearPressedRecords() {
        this.clearKeyPressedRecord();
        this.clearMousePressedRecord();
        this.clearControlPressedRecord();
    }
    clearAllInputState() {
        this.downKeys.clear();
        this.downMouse.clear();
        this.controlDown.clear();
        this.clearPressedRecords();
        this.invalidateGamepads();
    }
    updateMouse(event) {
        const currentTarget = event.currentTarget;
        const target = typeof Element !== "undefined" && currentTarget instanceof Element ? currentTarget : this.preventDefaultElement;
        const rect = target && "getBoundingClientRect" in target ? target.getBoundingClientRect() : { left: 0, top: 0 };
        this.absoluteMouseX = Math.floor(event.clientX - rect.left);
        this.absoluteMouseY = Math.floor(event.clientY - rect.top);
        this.mouseX = Math.floor(this.absoluteMouseX * this.scaleX + this.offsetX);
        this.mouseY = Math.floor(this.absoluteMouseY * this.scaleY + this.offsetY);
    }
    pollControllers() {
        if (Input.controllersDisabled) {
            return;
        }
        const seenControllers = this.seenControllers;
        seenControllers.clear();
        const gamepads = this.getFrameGamepads();
        for (const gamepad of gamepads) {
            if (!gamepad) {
                continue;
            }
            const controller = gamepad.index;
            seenControllers.add(controller);
            this.updateControlState(controller, 0, Input.isGamepadLeft(gamepad));
            this.updateControlState(controller, 1, Input.isGamepadRight(gamepad));
            this.updateControlState(controller, 2, Input.isGamepadUp(gamepad));
            this.updateControlState(controller, 3, Input.isGamepadDown(gamepad));
            for (let index = 0; index < gamepad.buttons.length; index++) {
                const button = gamepad.buttons[index];
                if (Input.isStandardDpadButton(index)) {
                    continue;
                }
                const control = 4 + index;
                this.updateControlState(controller, control, button.pressed);
            }
        }
        this.staleControlKeys.length = 0;
        for (const key of this.controlDown) {
            if (!seenControllers.has(Input.controllerFromControlKey(key))) {
                this.staleControlKeys.push(key);
            }
        }
        for (let i = 0; i < this.staleControlKeys.length; i++) {
            this.controlDown.delete(this.staleControlKeys[i]);
        }
    }
    updateControlState(controller, control, down) {
        const key = Input.controlKey(controller, control);
        const wasDown = this.controlDown.has(key);
        if (down) {
            if (!wasDown) {
                this.controlDown.add(key);
                this.controlPressed.add(key);
                for (const listener of this.controllerListeners) {
                    if (isAccepting(listener)) {
                        Input.dispatchControllerPressed(listener, controller, control);
                    }
                }
            }
            return;
        }
        if (wasDown) {
            this.controlDown.delete(key);
            for (const listener of this.controllerListeners) {
                if (isAccepting(listener)) {
                    Input.dispatchControllerReleased(listener, controller, control);
                }
            }
        }
    }
    anyController(controller, predicate) {
        if (Input.controllersDisabled) {
            return false;
        }
        const gamepads = this.getFrameGamepads();
        if (controller === Input.ANY_CONTROLLER) {
            for (const gamepad of gamepads) {
                if (gamepad && predicate(gamepad)) {
                    return true;
                }
            }
            return false;
        }
        const gamepad = gamepads[controller];
        return !!gamepad && predicate(gamepad);
    }
    refreshGamepads() {
        if (typeof navigator === "undefined" || !navigator.getGamepads) {
            this.cachedGamepads = [];
        }
        else {
            this.cachedGamepads = navigator.getGamepads();
        }
        this.gamepadsCached = true;
        this.gamepadCacheGeneration = Input.gamepadCacheGeneration;
        return this.cachedGamepads;
    }
    getFrameGamepads() {
        if (!this.gamepadsCached || this.gamepadCacheGeneration !== Input.gamepadCacheGeneration) {
            return this.refreshGamepads();
        }
        return this.cachedGamepads;
    }
    invalidateGamepads() {
        this.cachedGamepads = [];
        this.gamepadsCached = false;
        this.gamepadCacheGeneration = Input.gamepadCacheGeneration;
    }
    removeFrom(array, item) {
        const index = array.indexOf(item);
        if (index >= 0) {
            array.splice(index, 1);
        }
    }
    static keyCodeFromEvent(event) {
        return Input.eventCodeToKey.get(event.code) ?? 0;
    }
    static mouseButtonFromEvent(event) {
        switch (event.button) {
            case 0:
                return Input.MOUSE_LEFT_BUTTON;
            case 1:
                return Input.MOUSE_MIDDLE_BUTTON;
            case 2:
                return Input.MOUSE_RIGHT_BUTTON;
            default:
                return event.button;
        }
    }
    static isGamepadLeft(gamepad) {
        return (gamepad.axes[0] ?? 0) < -0.5 || gamepad.buttons[14]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_LEFT);
    }
    static isGamepadRight(gamepad) {
        return (gamepad.axes[0] ?? 0) > 0.5 || gamepad.buttons[15]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_RIGHT);
    }
    static isGamepadUp(gamepad) {
        return (gamepad.axes[1] ?? 0) < -0.5 || gamepad.buttons[12]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_UP);
    }
    static isGamepadDown(gamepad) {
        return (gamepad.axes[1] ?? 0) > 0.5 || gamepad.buttons[13]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_DOWN);
    }
    static isGamepadPovHat(gamepad, values) {
        const value = gamepad.axes[Input.POV_HAT_AXIS];
        if (typeof value !== "number") {
            return false;
        }
        for (let index = 0; index < values.length; index++) {
            if (Math.abs(value - values[index]) <= Input.POV_HAT_TOLERANCE) {
                return true;
            }
        }
        return false;
    }
    static dispatchControllerPressed(listener, controller, control) {
        switch (control) {
            case 0:
                listener.controllerLeftPressed(controller);
                break;
            case 1:
                listener.controllerRightPressed(controller);
                break;
            case 2:
                listener.controllerUpPressed(controller);
                break;
            case 3:
                listener.controllerDownPressed(controller);
                break;
            default:
                listener.controllerButtonPressed(controller, control - 3);
                break;
        }
    }
    static dispatchControllerReleased(listener, controller, control) {
        switch (control) {
            case 0:
                listener.controllerLeftReleased(controller);
                break;
            case 1:
                listener.controllerRightReleased(controller);
                break;
            case 2:
                listener.controllerUpReleased(controller);
                break;
            case 3:
                listener.controllerDownReleased(controller);
                break;
            default:
                listener.controllerButtonReleased(controller, control - 3);
                break;
        }
    }
    static isStandardDpadButton(index) {
        return index >= 12 && index <= 15;
    }
    static controlKey(controller, control) {
        return controller * 1024 + control;
    }
    static controllerFromControlKey(key) {
        return Math.trunc(key / 1024);
    }
    static browserHasInputFocus() {
        if (typeof document === "undefined") {
            return true;
        }
        return document.visibilityState !== "hidden" && document.hasFocus();
    }
    shouldPreventDefault(event, key) {
        if (!Input.defaultPreventedKeys.has(key) || event.defaultPrevented) {
            return false;
        }
        const active = typeof document !== "undefined" ? document.activeElement : null;
        if (active && Input.isInteractiveElement(active)) {
            return false;
        }
        if (!this.preventDefaultElement) {
            return true;
        }
        return (active === this.preventDefaultElement ||
            active === document.body ||
            active === document.documentElement ||
            event.target === this.preventDefaultElement);
    }
    shouldAcceptGameKey(event) {
        const target = event.target;
        if (typeof Element !== "undefined" && target instanceof Element && Input.isInteractiveElement(target)) {
            return false;
        }
        const active = typeof document !== "undefined" ? document.activeElement : null;
        if (active && Input.isInteractiveElement(active)) {
            return false;
        }
        if (!this.preventDefaultElement || typeof document === "undefined") {
            return true;
        }
        if (active === this.preventDefaultElement || active === document.body || active === document.documentElement || target === this.preventDefaultElement) {
            return true;
        }
        return typeof Node !== "undefined" && target instanceof Node && this.preventDefaultElement.contains(target);
    }
    shouldAcceptPointerEvent(event) {
        if (!this.preventDefaultElement) {
            return true;
        }
        const target = event.target;
        if (typeof Element !== "undefined" && target instanceof Element && Input.isInteractiveElement(target)) {
            return false;
        }
        return typeof Node !== "undefined" && target instanceof Node && (target === this.preventDefaultElement || this.preventDefaultElement.contains(target));
    }
    static isInteractiveElement(element) {
        const tag = element.tagName.toUpperCase();
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || element.isContentEditable;
    }
    static eventCodeToKey = new Map([
        ["Escape", Input.KEY_ESCAPE],
        ["Digit1", Input.KEY_1],
        ["Digit2", Input.KEY_2],
        ["Digit3", Input.KEY_3],
        ["Digit4", Input.KEY_4],
        ["Digit5", Input.KEY_5],
        ["Digit6", Input.KEY_6],
        ["Digit7", Input.KEY_7],
        ["Digit8", Input.KEY_8],
        ["Digit9", Input.KEY_9],
        ["Digit0", Input.KEY_0],
        ["Minus", Input.KEY_MINUS],
        ["Equal", Input.KEY_EQUALS],
        ["Backspace", Input.KEY_BACK],
        ["Tab", Input.KEY_TAB],
        ["KeyQ", Input.KEY_Q],
        ["KeyW", Input.KEY_W],
        ["KeyE", Input.KEY_E],
        ["KeyR", Input.KEY_R],
        ["KeyT", Input.KEY_T],
        ["KeyY", Input.KEY_Y],
        ["KeyU", Input.KEY_U],
        ["KeyI", Input.KEY_I],
        ["KeyO", Input.KEY_O],
        ["KeyP", Input.KEY_P],
        ["BracketLeft", Input.KEY_LBRACKET],
        ["BracketRight", Input.KEY_RBRACKET],
        ["Enter", Input.KEY_ENTER],
        ["ControlLeft", Input.KEY_LCONTROL],
        ["KeyA", Input.KEY_A],
        ["KeyS", Input.KEY_S],
        ["KeyD", Input.KEY_D],
        ["KeyF", Input.KEY_F],
        ["KeyG", Input.KEY_G],
        ["KeyH", Input.KEY_H],
        ["KeyJ", Input.KEY_J],
        ["KeyK", Input.KEY_K],
        ["KeyL", Input.KEY_L],
        ["Semicolon", Input.KEY_SEMICOLON],
        ["Quote", Input.KEY_APOSTROPHE],
        ["Backquote", Input.KEY_GRAVE],
        ["ShiftLeft", Input.KEY_LSHIFT],
        ["Backslash", Input.KEY_BACKSLASH],
        ["KeyZ", Input.KEY_Z],
        ["KeyX", Input.KEY_X],
        ["KeyC", Input.KEY_C],
        ["KeyV", Input.KEY_V],
        ["KeyB", Input.KEY_B],
        ["KeyN", Input.KEY_N],
        ["KeyM", Input.KEY_M],
        ["Comma", Input.KEY_COMMA],
        ["Period", Input.KEY_PERIOD],
        ["Slash", Input.KEY_SLASH],
        ["ShiftRight", Input.KEY_RSHIFT],
        ["NumpadMultiply", Input.KEY_MULTIPLY],
        ["AltLeft", Input.KEY_LMENU],
        ["Space", Input.KEY_SPACE],
        ["CapsLock", Input.KEY_CAPITAL],
        ["F1", Input.KEY_F1],
        ["F2", Input.KEY_F2],
        ["F3", Input.KEY_F3],
        ["F4", Input.KEY_F4],
        ["F5", Input.KEY_F5],
        ["F6", Input.KEY_F6],
        ["F7", Input.KEY_F7],
        ["F8", Input.KEY_F8],
        ["F9", Input.KEY_F9],
        ["F10", Input.KEY_F10],
        ["NumLock", Input.KEY_NUMLOCK],
        ["ScrollLock", Input.KEY_SCROLL],
        ["Numpad7", Input.KEY_NUMPAD7],
        ["Numpad8", Input.KEY_NUMPAD8],
        ["Numpad9", Input.KEY_NUMPAD9],
        ["NumpadSubtract", Input.KEY_SUBTRACT],
        ["Numpad4", Input.KEY_NUMPAD4],
        ["Numpad5", Input.KEY_NUMPAD5],
        ["Numpad6", Input.KEY_NUMPAD6],
        ["NumpadAdd", Input.KEY_ADD],
        ["Numpad1", Input.KEY_NUMPAD1],
        ["Numpad2", Input.KEY_NUMPAD2],
        ["Numpad3", Input.KEY_NUMPAD3],
        ["Numpad0", Input.KEY_NUMPAD0],
        ["NumpadDecimal", Input.KEY_DECIMAL],
        ["F11", Input.KEY_F11],
        ["F12", Input.KEY_F12],
        ["F13", Input.KEY_F13],
        ["F14", Input.KEY_F14],
        ["F15", Input.KEY_F15],
        ["KanaMode", Input.KEY_KANA],
        ["Convert", Input.KEY_CONVERT],
        ["NonConvert", Input.KEY_NOCONVERT],
        ["IntlYen", Input.KEY_YEN],
        ["NumpadEqual", Input.KEY_NUMPADEQUALS],
        ["NumpadEnter", Input.KEY_NUMPADENTER],
        ["ControlRight", Input.KEY_RCONTROL],
        ["NumpadComma", Input.KEY_NUMPADCOMMA],
        ["NumpadDivide", Input.KEY_DIVIDE],
        ["PrintScreen", Input.KEY_SYSRQ],
        ["AltRight", Input.KEY_RMENU],
        ["Pause", Input.KEY_PAUSE],
        ["Home", Input.KEY_HOME],
        ["ArrowUp", Input.KEY_UP],
        ["PageUp", Input.KEY_PRIOR],
        ["ArrowLeft", Input.KEY_LEFT],
        ["ArrowRight", Input.KEY_RIGHT],
        ["End", Input.KEY_END],
        ["ArrowDown", Input.KEY_DOWN],
        ["PageDown", Input.KEY_NEXT],
        ["Insert", Input.KEY_INSERT],
        ["Delete", Input.KEY_DELETE],
        ["MetaLeft", Input.KEY_LWIN],
        ["MetaRight", Input.KEY_RWIN],
        ["ContextMenu", Input.KEY_APPS],
        ["Power", Input.KEY_POWER],
        ["Sleep", Input.KEY_SLEEP]
    ]);
    static keyNames = new Map([
        [Input.KEY_CIRCUMFLEX, "KEY_CIRCUMFLEX"],
        [Input.KEY_AT, "KEY_AT"],
        [Input.KEY_COLON, "KEY_COLON"],
        [Input.KEY_UNDERLINE, "KEY_UNDERLINE"],
        [Input.KEY_KANJI, "KEY_KANJI"],
        [Input.KEY_STOP, "KEY_STOP"],
        [Input.KEY_AX, "KEY_AX"],
        [Input.KEY_UNLABELED, "KEY_UNLABELED"],
        ...Array.from(Input.eventCodeToKey.entries()).map(([name, code]) => [code, name])
    ]);
    static defaultPreventedKeys = new Set([
        Input.KEY_ESCAPE,
        Input.KEY_2,
        Input.KEY_4,
        Input.KEY_6,
        Input.KEY_8,
        Input.KEY_NUMPAD2,
        Input.KEY_NUMPAD4,
        Input.KEY_NUMPAD6,
        Input.KEY_NUMPAD8,
        Input.KEY_W,
        Input.KEY_A,
        Input.KEY_S,
        Input.KEY_D,
        Input.KEY_I,
        Input.KEY_J,
        Input.KEY_K,
        Input.KEY_L,
        Input.KEY_P,
        Input.KEY_RETURN,
        Input.KEY_NUMPADENTER,
        Input.KEY_SPACE,
        Input.KEY_UP,
        Input.KEY_LEFT,
        Input.KEY_RIGHT,
        Input.KEY_DOWN
    ]);
}
//# sourceMappingURL=Input.js.map