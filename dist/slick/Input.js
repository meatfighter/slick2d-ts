const ACTIVE_EVENT_OPTIONS = { passive: false };
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
    static BROWSER_CONTROLLER_LIMIT = 16;
    static BROWSER_AXIS_LIMIT = 16;
    static controllersDisabled = false;
    static gamepadCacheGeneration = 0;
    static INITIAL_EVENT_CAPACITY = 32;
    static EVENT_KEY_PRESSED = 1;
    static EVENT_KEY_RELEASED = 2;
    static EVENT_MOUSE_PRESSED = 3;
    static EVENT_MOUSE_RELEASED = 4;
    static EVENT_MOUSE_MOVED = 5;
    static EVENT_MOUSE_DRAGGED = 6;
    static EVENT_MOUSE_WHEEL = 7;
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
    dispatchKeyListeners = [];
    dispatchMouseListeners = [];
    dispatchControllerListeners = [];
    lifecycleListeners = [];
    startedListeners = [];
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
    doubleClickDelay = 250;
    mouseClickTolerance = 5;
    lastClickButton = -1;
    lastClickX = 0;
    lastClickY = 0;
    lastClickTime = Number.NEGATIVE_INFINITY;
    mousePressX = new Map();
    mousePressY = new Map();
    preventDefaultElement = null;
    preventDefaultTouchAction = null;
    browserInputCapture = true;
    browserInputCaptureConfigured = false;
    cachedGamepads = [];
    gamepadsCached = false;
    gamepadCacheGeneration = -1;
    controllerStateSnapshotReady = false;
    controllerPhysicalIndices = new Int32Array(Input.BROWSER_CONTROLLER_LIMIT).fill(-1);
    controllerPhysicalIds = new Array(Input.BROWSER_CONTROLLER_LIMIT).fill(null);
    additionalControllerDirectionAxes = [];
    additionalControllerAxisBaselines = new Float64Array(Input.BROWSER_CONTROLLER_LIMIT * Input.BROWSER_AXIS_LIMIT);
    additionalControllerAxisOwners = new Array(Input.BROWSER_CONTROLLER_LIMIT).fill(null);
    additionalControllerAxisThreshold = 0.5;
    additionalControllerAxisRecenterThreshold = 0.05;
    eventTypes = new Uint8Array(Input.INITIAL_EVENT_CAPACITY);
    eventA = new Int32Array(Input.INITIAL_EVENT_CAPACITY);
    eventB = new Int32Array(Input.INITIAL_EVENT_CAPACITY);
    eventC = new Int32Array(Input.INITIAL_EVENT_CAPACITY);
    eventD = new Int32Array(Input.INITIAL_EVENT_CAPACITY);
    eventCharacters = new Uint32Array(Input.INITIAL_EVENT_CAPACITY);
    eventTimes = new Float64Array(Input.INITIAL_EVENT_CAPACITY);
    eventHead = 0;
    eventCount = 0;
    dispatchingEvent = false;
    eventConsumed = false;
    dispatchedEventTime = 0;
    /**
     * Java Slick2D counterpart: Input.disableControllers().
     *
     * Disables controller polling for this page session.
     */
    static disableControllers() {
        Input.controllersDisabled = true;
        Input.gamepadCacheGeneration++;
    }
    /** Java Slick2D counterpart: Input.getKeyName(int). */
    static getKeyName(code) {
        return Input.keyNames.get(code) ?? `KEY_${code}`;
    }
    /** Java Slick2D counterpart: Input(int height). */
    constructor(height) {
        this.height = height;
        this.additionalControllerAxisBaselines.fill(Number.NaN);
    }
    /**
     * Browser controller helper: adds calibrated axis pairs that contribute to
     * the four Slick directional controls during the normal input poll.
     */
    setAdditionalControllerDirectionAxes(axes, threshold = 0.5, recenterThreshold = 0.05) {
        const values = [];
        for (const pair of axes) {
            const horizontal = pair.horizontalAxis;
            const vertical = pair.verticalAxis;
            if (!Number.isFinite(horizontal) ||
                !Number.isInteger(horizontal) ||
                horizontal < 0 ||
                horizontal >= Input.BROWSER_AXIS_LIMIT ||
                !Number.isFinite(vertical) ||
                !Number.isInteger(vertical) ||
                vertical < 0 ||
                vertical >= Input.BROWSER_AXIS_LIMIT) {
                throw new RangeError(`Controller direction axes must be finite integers between 0 and ${Input.BROWSER_AXIS_LIMIT - 1}.`);
            }
            values.push(horizontal, vertical);
        }
        if (!Number.isFinite(threshold) || threshold < 0 || threshold > 2) {
            throw new RangeError("Controller direction threshold must be a finite number between 0 and 2.");
        }
        if (!Number.isFinite(recenterThreshold) || recenterThreshold < 0 || recenterThreshold > 1) {
            throw new RangeError("Controller recenter threshold must be a finite number between 0 and 1.");
        }
        this.additionalControllerDirectionAxes = values;
        this.additionalControllerAxisThreshold = threshold;
        this.additionalControllerAxisRecenterThreshold = recenterThreshold;
        this.resetAdditionalControllerDirectionAxisCalibration();
    }
    /** Browser controller helper: clears learned neutral positions for configured additional axes. */
    resetAdditionalControllerDirectionAxisCalibration() {
        this.additionalControllerAxisBaselines.fill(Number.NaN);
        this.additionalControllerAxisOwners.fill(null);
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
        target.addEventListener("wheel", this.handleWheel, ACTIVE_EVENT_OPTIONS);
        target.addEventListener("contextmenu", this.handleContextMenu, ACTIVE_EVENT_OPTIONS);
        if (typeof window !== "undefined") {
            window.addEventListener("blur", this.handleFocusLost);
        }
        if (typeof document !== "undefined") {
            document.addEventListener("visibilitychange", this.handleVisibilityChange);
        }
    }
    /** Browser parity helper: element whose focused game keys should suppress browser defaults. */
    setPreventDefaultElement(element) {
        if (this.preventDefaultElement === element) {
            return;
        }
        this.restorePreventDefaultElementStyle();
        this.preventDefaultElement = element;
        this.applyPreventDefaultElementStyle();
    }
    /** Browser parity helper: controls whether accepted canvas input suppresses browser gestures. */
    setBrowserInputCaptureEnabled(enabled) {
        this.browserInputCaptureConfigured = true;
        this.setBrowserInputCapture(enabled);
    }
    /** Browser parity helper: applies a container default unless the caller chose explicitly. */
    setBrowserInputCaptureDefault(enabled) {
        if (!this.browserInputCaptureConfigured) {
            this.setBrowserInputCapture(enabled);
        }
    }
    setBrowserInputCapture(enabled) {
        if (this.browserInputCapture === enabled) {
            return;
        }
        this.browserInputCapture = enabled;
        this.restorePreventDefaultElementStyle();
        this.applyPreventDefaultElementStyle();
    }
    /** Browser parity helper: removes attached DOM listeners. */
    unbind() {
        if (!this.target) {
            this.clearAllInputState();
            this.setPreventDefaultElement(null);
            return;
        }
        this.target.removeEventListener("keydown", this.handleKeyDown);
        this.target.removeEventListener("keyup", this.handleKeyUp);
        this.target.removeEventListener("pointerdown", this.handlePointerDown);
        this.target.removeEventListener("pointerup", this.handlePointerUp);
        this.target.removeEventListener("pointermove", this.handlePointerMove);
        this.target.removeEventListener("wheel", this.handleWheel);
        this.target.removeEventListener("contextmenu", this.handleContextMenu);
        if (typeof window !== "undefined") {
            window.removeEventListener("blur", this.handleFocusLost);
        }
        if (typeof document !== "undefined") {
            document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        }
        this.target = null;
        this.clearAllInputState();
        this.setPreventDefaultElement(null);
    }
    /** Java Slick2D counterpart: Input.setDoubleClickInterval(int). */
    setDoubleClickInterval(delay) {
        if (!Number.isSafeInteger(delay) || delay < 0) {
            throw new RangeError("Double-click interval must be a non-negative safe integer");
        }
        this.doubleClickDelay = delay;
    }
    /** Java Slick2D counterpart: Input.setMouseClickTolerance(int). */
    setMouseClickTolerance(mouseClickTolerance) {
        if (!Number.isSafeInteger(mouseClickTolerance) || mouseClickTolerance < 0) {
            throw new RangeError("Mouse click tolerance must be a non-negative safe integer");
        }
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
        if (Input.controllersDisabled) {
            return false;
        }
        const key = Input.controlKey(controller, button);
        const pressed = this.controlPressed.has(key);
        this.controlPressed.delete(key);
        return pressed;
    }
    /** Java Slick2D counterpart: Input.isButtonPressed(int, int). */
    isButtonPressed(index, controller) {
        if (Input.controllersDisabled) {
            return false;
        }
        const gamepads = this.getFrameGamepads();
        if (controller === Input.ANY_CONTROLLER) {
            for (const gamepad of gamepads) {
                if (gamepad.buttons[index]?.pressed === true) {
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
        return Input.controllersDisabled ? 0 : this.getFrameGamepads().length;
    }
    /** Java Slick2D counterpart: Input.getAxisCount(int). */
    getAxisCount(controller) {
        if (Input.controllersDisabled) {
            return 0;
        }
        return this.getFrameGamepads()[controller]?.axes.length ?? 0;
    }
    /** Java Slick2D counterpart: Input.getAxisValue(int, int). */
    getAxisValue(controller, axis) {
        if (Input.controllersDisabled) {
            return 0;
        }
        const gamepad = this.getFrameGamepads()[controller];
        return gamepad ? Input.readGamepadAxis(gamepad, axis) : 0;
    }
    /** Java Slick2D counterpart: Input.getAxisName(int, int). */
    getAxisName(_controller, axis) {
        return `Axis ${axis}`;
    }
    /** Java Slick2D counterpart: Input.isControllerLeft(int). */
    isControllerLeft(controller) {
        return this.controllerStateSnapshotReady ? this.isControllerControlDown(0, controller) : this.anyController(controller, Input.isGamepadLeft);
    }
    /** Java Slick2D counterpart: Input.isControllerRight(int). */
    isControllerRight(controller) {
        return this.controllerStateSnapshotReady ? this.isControllerControlDown(1, controller) : this.anyController(controller, Input.isGamepadRight);
    }
    /** Java Slick2D counterpart: Input.isControllerUp(int). */
    isControllerUp(controller) {
        return this.controllerStateSnapshotReady ? this.isControllerControlDown(2, controller) : this.anyController(controller, Input.isGamepadUp);
    }
    /** Java Slick2D counterpart: Input.isControllerDown(int). */
    isControllerDown(controller) {
        return this.controllerStateSnapshotReady ? this.isControllerControlDown(3, controller) : this.anyController(controller, Input.isGamepadDown);
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
    consumeEvent() {
        if (this.dispatchingEvent) {
            this.eventConsumed = true;
        }
    }
    /** Java Slick2D counterpart: Input.considerDoubleClick(int, int, int). */
    considerDoubleClick(button, x, y) {
        this.considerDoubleClickAt(button, x, y, this.dispatchingEvent ? this.dispatchedEventTime : Input.now());
    }
    /** Java Slick2D counterpart: Input.poll(int, int). */
    poll(_width, height) {
        this.height = height;
        if (!Input.browserHasInputFocus()) {
            this.clearAllInputState();
            return;
        }
        if (this.paused) {
            this.clearPressedRecords();
            this.clearQueuedEvents();
            this.invalidateGamepads();
            return;
        }
        this.snapshotListeners();
        this.startedListeners.length = 0;
        for (const listener of this.lifecycleListeners) {
            if (isAccepting(listener)) {
                listener.inputStarted();
                this.startedListeners.push(listener);
            }
        }
        try {
            this.dispatchQueuedEvents();
            if (Input.controllersDisabled) {
                this.invalidateGamepads();
                this.clearAllControllerState();
            }
            else {
                this.refreshGamepads();
                this.pollControllers();
            }
        }
        finally {
            this.dispatchingEvent = false;
            this.eventConsumed = false;
            for (const listener of this.startedListeners) {
                listener.inputEnded();
            }
        }
    }
    enableKeyRepeat(_initial = 400, _interval = 50) {
        this.keyRepeat = true;
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
            this.enqueueEvent(Input.EVENT_KEY_PRESSED, key, 0, 0, 0, event.key?.length === 1 ? event.key.charCodeAt(0) : 0, Input.eventTimestamp(event));
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
        if (!this.paused && this.shouldAcceptGameKey(event)) {
            this.enqueueEvent(Input.EVENT_KEY_RELEASED, key, 0, 0, 0, event.key?.length === 1 ? event.key.charCodeAt(0) : 0, Input.eventTimestamp(event));
        }
    };
    handlePointerDown = (event) => {
        if (this.paused || !this.shouldAcceptPointerEvent(event)) {
            return;
        }
        this.preventBrowserDefault(event);
        const button = Input.mouseButtonFromEvent(event);
        this.updateMouse(event);
        this.downMouse.add(button);
        this.enqueueEvent(Input.EVENT_MOUSE_PRESSED, button, this.mouseX, this.mouseY, 0, 0, Input.eventTimestamp(event));
    };
    handlePointerUp = (event) => {
        const accepted = this.shouldAcceptPointerEvent(event);
        if (this.paused || (!accepted && this.downMouse.size === 0)) {
            return;
        }
        if (accepted || this.downMouse.size > 0) {
            this.preventBrowserDefault(event);
        }
        const button = Input.mouseButtonFromEvent(event);
        this.updateMouse(event);
        this.downMouse.delete(button);
        this.enqueueEvent(Input.EVENT_MOUSE_RELEASED, button, this.mouseX, this.mouseY, 0, 0, Input.eventTimestamp(event));
    };
    handlePointerMove = (event) => {
        const accepted = this.shouldAcceptPointerEvent(event);
        if (this.paused || (!accepted && this.downMouse.size === 0)) {
            return;
        }
        if (accepted || this.downMouse.size > 0) {
            this.preventBrowserDefault(event);
        }
        const oldX = this.mouseX;
        const oldY = this.mouseY;
        this.updateMouse(event);
        this.enqueueEvent(this.downMouse.size > 0 ? Input.EVENT_MOUSE_DRAGGED : Input.EVENT_MOUSE_MOVED, oldX, oldY, this.mouseX, this.mouseY, 0, Input.eventTimestamp(event));
    };
    handleWheel = (event) => {
        if (this.paused || !this.shouldAcceptPointerEvent(event)) {
            return;
        }
        this.preventBrowserDefault(event);
        this.enqueueEvent(Input.EVENT_MOUSE_WHEEL, Math.trunc(-event.deltaY), 0, 0, 0, 0, Input.eventTimestamp(event));
    };
    handleContextMenu = (event) => {
        if (!this.paused && this.shouldAcceptPointerEvent(event)) {
            this.preventBrowserDefault(event);
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
    snapshotListeners() {
        Input.copyArray(this.keyListeners, this.dispatchKeyListeners);
        Input.copyArray(this.mouseListeners, this.dispatchMouseListeners);
        Input.copyArray(this.controllerListeners, this.dispatchControllerListeners);
        this.lifecycleListeners.length = 0;
        this.appendUniqueLifecycleListeners(this.dispatchKeyListeners);
        this.appendUniqueLifecycleListeners(this.dispatchMouseListeners);
        this.appendUniqueLifecycleListeners(this.dispatchControllerListeners);
    }
    appendUniqueLifecycleListeners(listeners) {
        for (const listener of listeners) {
            if (!this.lifecycleListeners.includes(listener)) {
                this.lifecycleListeners.push(listener);
            }
        }
    }
    dispatchQueuedEvents() {
        const eventsToDispatch = this.eventCount;
        for (let eventIndex = 0; eventIndex < eventsToDispatch; eventIndex++) {
            const index = this.eventHead;
            const type = this.eventTypes[index];
            const a = this.eventA[index];
            const b = this.eventB[index];
            const c = this.eventC[index];
            const d = this.eventD[index];
            const character = this.eventCharacters[index];
            const timestamp = this.eventTimes[index];
            this.eventHead = (this.eventHead + 1) % this.eventTypes.length;
            this.eventCount--;
            switch (type) {
                case Input.EVENT_KEY_PRESSED:
                    this.pressedKeys.add(a);
                    this.dispatchKeyPressed(a, character === 0 ? "\0" : String.fromCharCode(character), timestamp);
                    break;
                case Input.EVENT_KEY_RELEASED:
                    this.dispatchKeyReleased(a, character === 0 ? "\0" : String.fromCharCode(character), timestamp);
                    break;
                case Input.EVENT_MOUSE_PRESSED:
                    this.pressedMouse.add(a);
                    this.mousePressX.set(a, b);
                    this.mousePressY.set(a, c);
                    this.dispatchMousePressed(a, b, c, timestamp);
                    break;
                case Input.EVENT_MOUSE_RELEASED: {
                    this.dispatchMouseReleased(a, b, c, timestamp);
                    const pressX = this.mousePressX.get(a);
                    const pressY = this.mousePressY.get(a);
                    this.mousePressX.delete(a);
                    this.mousePressY.delete(a);
                    if (pressX !== undefined &&
                        pressY !== undefined &&
                        Math.abs(b - pressX) <= this.mouseClickTolerance &&
                        Math.abs(c - pressY) <= this.mouseClickTolerance) {
                        this.considerDoubleClickAt(a, b, c, timestamp);
                    }
                    break;
                }
                case Input.EVENT_MOUSE_MOVED:
                    this.dispatchMouseMoved(a, b, c, d, false, timestamp);
                    break;
                case Input.EVENT_MOUSE_DRAGGED:
                    this.dispatchMouseMoved(a, b, c, d, true, timestamp);
                    break;
                case Input.EVENT_MOUSE_WHEEL:
                    this.dispatchMouseWheel(a, timestamp);
                    break;
            }
        }
        if (this.eventCount === 0) {
            this.eventHead = 0;
        }
    }
    considerDoubleClickAt(button, x, y, timestamp) {
        const elapsed = timestamp - this.lastClickTime;
        const withinTime = elapsed >= 0 && elapsed <= this.doubleClickDelay;
        const withinDistance = Math.abs(x - this.lastClickX) <= this.mouseClickTolerance && Math.abs(y - this.lastClickY) <= this.mouseClickTolerance;
        const doubleClick = button === this.lastClickButton && withinTime && withinDistance;
        this.dispatchMouseClicked(button, x, y, doubleClick ? 2 : 1, timestamp);
        if (doubleClick) {
            this.lastClickButton = -1;
            this.lastClickTime = Number.NEGATIVE_INFINITY;
        }
        else {
            this.lastClickButton = button;
            this.lastClickX = x;
            this.lastClickY = y;
            this.lastClickTime = timestamp;
        }
    }
    dispatchKeyPressed(key, character, timestamp) {
        this.beginEventDispatch(timestamp);
        for (const listener of this.dispatchKeyListeners) {
            if (isAccepting(listener)) {
                listener.keyPressed(key, character);
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }
    dispatchKeyReleased(key, character, timestamp) {
        this.beginEventDispatch(timestamp);
        for (const listener of this.dispatchKeyListeners) {
            if (isAccepting(listener)) {
                listener.keyReleased(key, character);
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }
    dispatchMousePressed(button, x, y, timestamp) {
        this.beginEventDispatch(timestamp);
        for (const listener of this.dispatchMouseListeners) {
            if (isAccepting(listener)) {
                listener.mousePressed(button, x, y);
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }
    dispatchMouseReleased(button, x, y, timestamp) {
        this.beginEventDispatch(timestamp);
        for (const listener of this.dispatchMouseListeners) {
            if (isAccepting(listener)) {
                listener.mouseReleased(button, x, y);
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }
    dispatchMouseClicked(button, x, y, count, timestamp) {
        this.beginEventDispatch(timestamp);
        for (const listener of this.dispatchMouseListeners) {
            if (isAccepting(listener)) {
                listener.mouseClicked(button, x, y, count);
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }
    dispatchMouseMoved(oldX, oldY, newX, newY, dragged, timestamp) {
        this.beginEventDispatch(timestamp);
        for (const listener of this.dispatchMouseListeners) {
            if (isAccepting(listener)) {
                if (dragged) {
                    listener.mouseDragged(oldX, oldY, newX, newY);
                }
                else {
                    listener.mouseMoved(oldX, oldY, newX, newY);
                }
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }
    dispatchMouseWheel(change, timestamp) {
        this.beginEventDispatch(timestamp);
        for (const listener of this.dispatchMouseListeners) {
            if (isAccepting(listener)) {
                listener.mouseWheelMoved(change);
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }
    beginEventDispatch(timestamp) {
        this.dispatchingEvent = true;
        this.eventConsumed = false;
        this.dispatchedEventTime = timestamp;
    }
    endEventDispatch() {
        this.dispatchingEvent = false;
        this.eventConsumed = false;
    }
    enqueueEvent(type, a, b, c, d, character, timestamp) {
        if (this.eventCount === this.eventTypes.length) {
            this.growEventQueue();
        }
        const index = (this.eventHead + this.eventCount) % this.eventTypes.length;
        this.eventTypes[index] = type;
        this.eventA[index] = a;
        this.eventB[index] = b;
        this.eventC[index] = c;
        this.eventD[index] = d;
        this.eventCharacters[index] = character;
        this.eventTimes[index] = timestamp;
        this.eventCount++;
    }
    growEventQueue() {
        const capacity = this.eventTypes.length * 2;
        const types = new Uint8Array(capacity);
        const a = new Int32Array(capacity);
        const b = new Int32Array(capacity);
        const c = new Int32Array(capacity);
        const d = new Int32Array(capacity);
        const characters = new Uint32Array(capacity);
        const times = new Float64Array(capacity);
        for (let i = 0; i < this.eventCount; i++) {
            const source = (this.eventHead + i) % this.eventTypes.length;
            types[i] = this.eventTypes[source];
            a[i] = this.eventA[source];
            b[i] = this.eventB[source];
            c[i] = this.eventC[source];
            d[i] = this.eventD[source];
            characters[i] = this.eventCharacters[source];
            times[i] = this.eventTimes[source];
        }
        this.eventTypes = types;
        this.eventA = a;
        this.eventB = b;
        this.eventC = c;
        this.eventD = d;
        this.eventCharacters = characters;
        this.eventTimes = times;
        this.eventHead = 0;
    }
    clearQueuedEvents() {
        this.eventHead = 0;
        this.eventCount = 0;
        this.mousePressX.clear();
        this.mousePressY.clear();
    }
    clearPressedRecords() {
        this.clearKeyPressedRecord();
        this.clearMousePressedRecord();
        this.clearControlPressedRecord();
    }
    clearAllInputState() {
        this.downKeys.clear();
        this.downMouse.clear();
        this.clearAllControllerState();
        this.clearPressedRecords();
        this.clearQueuedEvents();
        this.invalidateGamepads();
    }
    clearAllControllerState() {
        this.controlDown.clear();
        this.controlPressed.clear();
        this.seenControllers.clear();
        this.controllerPhysicalIndices.fill(-1);
        this.controllerPhysicalIds.fill(null);
        this.controllerStateSnapshotReady = false;
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
        const gamepads = this.getFrameGamepads();
        this.seenControllers.clear();
        for (let controller = 0; controller < gamepads.length; controller++) {
            const gamepad = gamepads[controller];
            this.prepareLogicalControllerOwner(controller, gamepad);
            this.seenControllers.add(controller);
            if (this.additionalControllerDirectionAxes.length > 0) {
                this.prepareAdditionalControllerAxisCalibration(gamepad);
            }
            let left = Input.isGamepadLeft(gamepad);
            let right = Input.isGamepadRight(gamepad);
            let up = Input.isGamepadUp(gamepad);
            let down = Input.isGamepadDown(gamepad);
            for (let index = 0; index < this.additionalControllerDirectionAxes.length; index += 2) {
                const horizontalAxis = this.additionalControllerDirectionAxes[index];
                const verticalAxis = this.additionalControllerDirectionAxes[index + 1];
                const horizontal = this.readCalibratedControllerAxis(gamepad, horizontalAxis);
                const vertical = this.readCalibratedControllerAxis(gamepad, verticalAxis);
                left ||= horizontal < -this.additionalControllerAxisThreshold;
                right ||= horizontal > this.additionalControllerAxisThreshold;
                up ||= vertical < -this.additionalControllerAxisThreshold;
                down ||= vertical > this.additionalControllerAxisThreshold;
            }
            this.updateControlState(controller, 0, left);
            this.updateControlState(controller, 1, right);
            this.updateControlState(controller, 2, up);
            this.updateControlState(controller, 3, down);
            for (let index = 0; index < gamepad.buttons.length; index++) {
                if (!Input.isStandardDpadButton(index)) {
                    this.updateControlState(controller, 4 + index, gamepad.buttons[index]?.pressed === true);
                }
            }
        }
        for (let controller = gamepads.length; controller < this.controllerPhysicalIndices.length; controller++) {
            if (this.controllerPhysicalIndices[controller] !== -1) {
                this.clearControllerState(controller);
                this.controllerPhysicalIndices[controller] = -1;
                this.controllerPhysicalIds[controller] = null;
            }
        }
        this.clearDisconnectedAxisCalibration();
        this.controllerStateSnapshotReady = true;
    }
    prepareLogicalControllerOwner(controller, gamepad) {
        if (controller >= this.controllerPhysicalIndices.length) {
            return;
        }
        const physicalIndex = gamepad.index;
        const id = gamepad.id || "";
        if (this.controllerPhysicalIndices[controller] !== physicalIndex || this.controllerPhysicalIds[controller] !== id) {
            this.clearControllerState(controller);
            this.controllerPhysicalIndices[controller] = physicalIndex;
            this.controllerPhysicalIds[controller] = id;
        }
    }
    clearControllerState(controller) {
        this.deleteControllerKeys(this.controlDown, controller);
        this.deleteControllerKeys(this.controlPressed, controller);
    }
    deleteControllerKeys(keys, controller) {
        this.staleControlKeys.length = 0;
        for (const key of keys) {
            if (Input.controllerFromControlKey(key) === controller) {
                this.staleControlKeys.push(key);
            }
        }
        for (const key of this.staleControlKeys) {
            keys.delete(key);
        }
    }
    clearDisconnectedAxisCalibration() {
        for (let physicalIndex = 0; physicalIndex < this.additionalControllerAxisOwners.length; physicalIndex++) {
            if (this.additionalControllerAxisOwners[physicalIndex] === null) {
                continue;
            }
            let found = false;
            for (const gamepad of this.cachedGamepads) {
                if (gamepad.index === physicalIndex) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                this.resetAdditionalControllerAxisCalibration(physicalIndex);
            }
        }
    }
    readCalibratedControllerAxis(gamepad, axis) {
        if (gamepad.index < 0 || gamepad.index >= Input.BROWSER_CONTROLLER_LIMIT || axis < 0 || gamepad.axes.length <= axis) {
            return 0;
        }
        const value = Input.readGamepadAxis(gamepad, axis);
        const baselineIndex = gamepad.index * Input.BROWSER_AXIS_LIMIT + axis;
        let baseline = this.additionalControllerAxisBaselines[baselineIndex];
        if (Number.isNaN(baseline)) {
            baseline = value;
            this.additionalControllerAxisBaselines[baselineIndex] = baseline;
        }
        if (Math.abs(value) <= this.additionalControllerAxisRecenterThreshold) {
            this.additionalControllerAxisBaselines[baselineIndex] = 0;
            return 0;
        }
        return value - baseline;
    }
    prepareAdditionalControllerAxisCalibration(gamepad) {
        const controller = gamepad.index;
        if (controller < 0 || controller >= Input.BROWSER_CONTROLLER_LIMIT) {
            return;
        }
        const owner = gamepad.id || "";
        if (this.additionalControllerAxisOwners[controller] !== owner) {
            this.resetAdditionalControllerAxisCalibration(controller);
            this.additionalControllerAxisOwners[controller] = owner;
        }
    }
    resetAdditionalControllerAxisCalibration(controller) {
        if (controller < 0 || controller >= Input.BROWSER_CONTROLLER_LIMIT) {
            return;
        }
        const start = controller * Input.BROWSER_AXIS_LIMIT;
        this.additionalControllerAxisBaselines.fill(Number.NaN, start, start + Input.BROWSER_AXIS_LIMIT);
        this.additionalControllerAxisOwners[controller] = null;
    }
    isControllerControlDown(control, controller) {
        if (Input.controllersDisabled) {
            return false;
        }
        if (controller === Input.ANY_CONTROLLER) {
            for (const seenController of this.seenControllers) {
                if (this.controlDown.has(Input.controlKey(seenController, control))) {
                    return true;
                }
            }
            return false;
        }
        return this.controlDown.has(Input.controlKey(controller, control));
    }
    updateControlState(controller, control, down) {
        const key = Input.controlKey(controller, control);
        const wasDown = this.controlDown.has(key);
        if (down === wasDown) {
            return;
        }
        if (down) {
            this.controlDown.add(key);
            this.controlPressed.add(key);
        }
        else {
            this.controlDown.delete(key);
        }
        this.beginEventDispatch(Input.now());
        for (const listener of this.dispatchControllerListeners) {
            if (isAccepting(listener)) {
                if (down) {
                    Input.dispatchControllerPressed(listener, controller, control);
                }
                else {
                    Input.dispatchControllerReleased(listener, controller, control);
                }
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }
    anyController(controller, predicate) {
        if (Input.controllersDisabled) {
            return false;
        }
        const gamepads = this.getFrameGamepads();
        if (controller === Input.ANY_CONTROLLER) {
            for (const gamepad of gamepads) {
                if (predicate(gamepad)) {
                    return true;
                }
            }
            return false;
        }
        const gamepad = gamepads[controller];
        return gamepad !== undefined && predicate(gamepad);
    }
    refreshGamepads() {
        this.cachedGamepads.length = 0;
        if (typeof navigator !== "undefined" && navigator.getGamepads) {
            const browserGamepads = navigator.getGamepads();
            for (const gamepad of browserGamepads) {
                if (Input.isUsableGamepad(gamepad)) {
                    this.cachedGamepads.push(gamepad);
                }
            }
        }
        this.gamepadsCached = true;
        this.gamepadCacheGeneration = Input.gamepadCacheGeneration;
        this.controllerStateSnapshotReady = false;
        return this.cachedGamepads;
    }
    getFrameGamepads() {
        if (!this.gamepadsCached || this.gamepadCacheGeneration !== Input.gamepadCacheGeneration) {
            return this.refreshGamepads();
        }
        return this.cachedGamepads;
    }
    invalidateGamepads() {
        this.cachedGamepads.length = 0;
        this.gamepadsCached = false;
        this.gamepadCacheGeneration = Input.gamepadCacheGeneration;
        this.controllerStateSnapshotReady = false;
    }
    removeFrom(array, item) {
        const index = array.indexOf(item);
        if (index >= 0) {
            array.splice(index, 1);
        }
    }
    static copyArray(source, target) {
        target.length = source.length;
        for (let i = 0; i < source.length; i++) {
            target[i] = source[i];
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
    static isUsableGamepad(gamepad) {
        return gamepad !== null && gamepad !== undefined && gamepad.connected !== false;
    }
    static readGamepadAxis(gamepad, axis) {
        const value = gamepad.axes[axis];
        return typeof value === "number" && Number.isFinite(value) ? value : 0;
    }
    static isGamepadLeft(gamepad) {
        return Input.readGamepadAxis(gamepad, 0) < -0.5 || gamepad.buttons[14]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_LEFT);
    }
    static isGamepadRight(gamepad) {
        return Input.readGamepadAxis(gamepad, 0) > 0.5 || gamepad.buttons[15]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_RIGHT);
    }
    static isGamepadUp(gamepad) {
        return Input.readGamepadAxis(gamepad, 1) < -0.5 || gamepad.buttons[12]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_UP);
    }
    static isGamepadDown(gamepad) {
        return Input.readGamepadAxis(gamepad, 1) > 0.5 || gamepad.buttons[13]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_DOWN);
    }
    static isGamepadPovHat(gamepad, values) {
        const value = gamepad.axes[Input.POV_HAT_AXIS];
        if (typeof value !== "number" || !Number.isFinite(value)) {
            return false;
        }
        for (const expected of values) {
            if (Math.abs(value - expected) <= Input.POV_HAT_TOLERANCE) {
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
    static eventTimestamp(event) {
        return Number.isFinite(event.timeStamp) ? event.timeStamp : Input.now();
    }
    static now() {
        return typeof performance !== "undefined" ? performance.now() : Date.now();
    }
    shouldPreventDefault(event, key) {
        if (!this.browserInputCapture || !Input.defaultPreventedKeys.has(key) || event.defaultPrevented) {
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
    preventBrowserDefault(event) {
        if (this.browserInputCapture && !event.defaultPrevented) {
            event.preventDefault();
        }
    }
    applyPreventDefaultElementStyle() {
        if (!this.preventDefaultElement || !this.browserInputCapture) {
            return;
        }
        this.preventDefaultTouchAction = this.preventDefaultElement.style.touchAction;
        this.preventDefaultElement.style.touchAction = "none";
    }
    restorePreventDefaultElementStyle() {
        if (this.preventDefaultElement && this.preventDefaultTouchAction !== null) {
            this.preventDefaultElement.style.touchAction = this.preventDefaultTouchAction;
        }
        this.preventDefaultTouchAction = null;
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