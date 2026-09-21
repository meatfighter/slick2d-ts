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
    /** Browser extension: maximum physical buttons sampled from one Gamepad. */
    static BROWSER_CONTROLLER_BUTTON_LIMIT = 64;
    /** Browser extension: exclusive upper bound for Slick key codes reachable from browser KeyboardEvent.code. */
    static BROWSER_KEY_CODE_LIMIT = 256;
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
    suppressedKeysUntilRelease = new Set();
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
    baselineControllersOnNextPoll = false;
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
    cancelledMouseReleases = new Set();
    activePointerId = null;
    capturedPointerTarget = null;
    preventDefaultElement = null;
    preventDefaultTouchAction = null;
    browserInputCapture = true;
    browserInputCaptureConfigured = false;
    cachedGamepads = [];
    pendingGamepads = [];
    gamepadsCached = false;
    gamepadCacheGeneration = -1;
    controllerStateSnapshotReady = false;
    controllerPollCompleted = false;
    controllerPhysicalIndices = new Int32Array(Input.BROWSER_CONTROLLER_LIMIT).fill(-1);
    controllerPhysicalIds = new Array(Input.BROWSER_CONTROLLER_LIMIT).fill(null);
    controllerPhysicalSlotGenerations = new Uint32Array(Input.BROWSER_CONTROLLER_LIMIT);
    controllerMappings = new Array(Input.BROWSER_CONTROLLER_LIMIT).fill("");
    controllerConnectionGenerations = new Uint32Array(Input.BROWSER_CONTROLLER_LIMIT);
    browserSlotGenerations = new Uint32Array(Input.BROWSER_CONTROLLER_LIMIT);
    nextControllerConnectionGeneration = 0;
    controllerSampleStatus = {
        sequence: 0,
        available: false,
        valid: true,
        topologyGeneration: 0,
        baselineOnly: true
    };
    additionalControllerDirectionAxes = [];
    additionalControllerAxisBaselines = new Float64Array(Input.BROWSER_CONTROLLER_LIMIT * Input.BROWSER_AXIS_LIMIT);
    additionalControllerAxisOwnerIds = new Array(Input.BROWSER_CONTROLLER_LIMIT).fill(null);
    additionalControllerAxisOwnerMappings = new Array(Input.BROWSER_CONTROLLER_LIMIT).fill("");
    additionalControllerAxisOwnerSlotGenerations = new Uint32Array(Input.BROWSER_CONTROLLER_LIMIT);
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
    dispatchGeneration = 0;
    pollInProgress = false;
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
    /** Browser extension: true only for Slick key codes this adapter can emit from KeyboardEvent.code. */
    static isBrowserKeyCodeSupported(code) {
        return Number.isInteger(code) && Input.browserKeyCodes.has(code);
    }
    /** Java Slick2D counterpart: Input(int height). */
    constructor(height) {
        void height;
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
        this.additionalControllerAxisOwnerIds.fill(null);
        this.additionalControllerAxisOwnerMappings.fill("");
        this.additionalControllerAxisOwnerSlotGenerations.fill(0);
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
        target.addEventListener("pointercancel", this.handlePointerCancel);
        target.addEventListener("lostpointercapture", this.handleLostPointerCapture);
        target.addEventListener("wheel", this.handleWheel, ACTIVE_EVENT_OPTIONS);
        target.addEventListener("contextmenu", this.handleContextMenu, ACTIVE_EVENT_OPTIONS);
        if (typeof window !== "undefined") {
            window.addEventListener("keydown", this.handleGlobalKeyDown);
            window.addEventListener("keyup", this.handleGlobalKeyUp);
            window.addEventListener("pointerup", this.handleGlobalPointerUp);
            window.addEventListener("pointercancel", this.handleGlobalPointerCancel);
            window.addEventListener("gamepadconnected", this.handleGamepadTopologyEvent);
            window.addEventListener("gamepaddisconnected", this.handleGamepadTopologyEvent);
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
        this.target.removeEventListener("pointercancel", this.handlePointerCancel);
        this.target.removeEventListener("lostpointercapture", this.handleLostPointerCapture);
        this.target.removeEventListener("wheel", this.handleWheel);
        this.target.removeEventListener("contextmenu", this.handleContextMenu);
        if (typeof window !== "undefined") {
            window.removeEventListener("keydown", this.handleGlobalKeyDown);
            window.removeEventListener("keyup", this.handleGlobalKeyUp);
            window.removeEventListener("pointerup", this.handleGlobalPointerUp);
            window.removeEventListener("pointercancel", this.handleGlobalPointerCancel);
            window.removeEventListener("gamepadconnected", this.handleGamepadTopologyEvent);
            window.removeEventListener("gamepaddisconnected", this.handleGamepadTopologyEvent);
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
        if (Input.controllersDisabled || !Number.isInteger(index) || index < 0 || index >= Input.BROWSER_CONTROLLER_BUTTON_LIMIT) {
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
    /** Browser controller helper: status for the most recent Gamepad API sample. */
    getControllerSampleStatus() {
        return this.controllerSampleStatus;
    }
    /** Browser controller helper: runtime generation of the device owning a dense controller slot. */
    getControllerConnectionGeneration(controller) {
        if (!Number.isInteger(controller) || controller < 0 || controller >= Input.BROWSER_CONTROLLER_LIMIT) {
            return 0;
        }
        return this.controllerConnectionGenerations[controller];
    }
    /** Browser controller helper: current Gamepad.mapping value for a dense controller slot. */
    getControllerMapping(controller) {
        if (!Number.isInteger(controller) || controller < 0) {
            return "";
        }
        return this.getFrameGamepads()[controller]?.mapping ?? "";
    }
    /** Browser controller helper: true when a physical button is a standardized D-pad control. */
    isControllerButtonDirectional(index, controller) {
        if (!Number.isInteger(index) || index < 0 || index >= Input.BROWSER_CONTROLLER_BUTTON_LIMIT) {
            return false;
        }
        const gamepad = this.getFrameGamepads()[controller];
        return gamepad !== undefined && Input.isStandardDpadButton(gamepad, index);
    }
    /**
     * Browser lifecycle helper: samples controllers and establishes their held-state baseline
     * without dispatching application callbacks. Use before resumed simulation can consume raw levels.
     */
    sampleControllersForBaseline() {
        if (this.pollInProgress) {
            throw new Error("Input controller baseline sampling is not reentrant with poll()");
        }
        if (Input.controllersDisabled) {
            this.invalidateGamepads();
            this.clearAllControllerState();
            this.publishControllerSample(false, true, true);
            return this.controllerSampleStatus;
        }
        this.refreshGamepads();
        if (this.controllerSampleStatus.valid) {
            this.pollControllers(true);
        }
        return this.controllerSampleStatus;
    }
    /** Java Slick2D counterpart: Input.getControllerCount(). */
    getControllerCount() {
        return Input.controllersDisabled ? 0 : this.getFrameGamepads().length;
    }
    /** Browser controller helper: returns the physical button count for a dense logical controller. */
    getButtonCount(controller) {
        if (Input.controllersDisabled) {
            return 0;
        }
        const count = this.getFrameGamepads()[controller]?.buttons.length ?? 0;
        return Math.min(count, Input.BROWSER_CONTROLLER_BUTTON_LIMIT);
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
    poll(_width, _height) {
        if (this.pollInProgress) {
            throw new Error("Input.poll() is not reentrant");
        }
        if (!Input.browserHasInputFocus()) {
            this.clearInputStateForBrowserSuspension();
            return;
        }
        if (this.paused) {
            this.clearPressedRecords();
            this.clearQueuedEvents();
            this.invalidateGamepads();
            return;
        }
        this.pollInProgress = true;
        const generation = this.dispatchGeneration;
        let primaryError = null;
        let hasPrimaryError = false;
        this.startedListeners.length = 0;
        try {
            this.snapshotListeners();
            for (const listener of this.lifecycleListeners) {
                if (!this.isDispatchCurrent(generation)) {
                    break;
                }
                if (!this.isLifecycleListenerRegistered(listener)) {
                    continue;
                }
                if (isAccepting(listener)) {
                    listener.inputStarted();
                    this.startedListeners.push(listener);
                    if (!this.isDispatchCurrent(generation)) {
                        break;
                    }
                }
            }
            if (this.isDispatchCurrent(generation)) {
                this.dispatchQueuedEvents(generation);
            }
            if (this.isDispatchCurrent(generation)) {
                if (Input.controllersDisabled) {
                    this.invalidateGamepads();
                    this.clearAllControllerState();
                    this.publishControllerSample(false, true, true);
                }
                else {
                    this.refreshGamepads();
                    if (this.controllerSampleStatus.valid && this.isDispatchCurrent(generation)) {
                        this.pollControllers(false, generation);
                    }
                }
            }
        }
        catch (error) {
            primaryError = error;
            hasPrimaryError = true;
        }
        finally {
            this.dispatchingEvent = false;
            this.eventConsumed = false;
            for (const listener of this.startedListeners) {
                try {
                    listener.inputEnded();
                }
                catch (error) {
                    if (!hasPrimaryError) {
                        primaryError = error;
                        hasPrimaryError = true;
                    }
                }
            }
            this.startedListeners.length = 0;
            this.pollInProgress = false;
        }
        if (hasPrimaryError) {
            throw primaryError;
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
        this.clearInputStateForBrowserSuspension();
    }
    /** Java Slick2D counterpart: Input.resume(). */
    resume() {
        const wasPaused = this.paused;
        this.paused = false;
        if (wasPaused) {
            this.baselineControllersOnNextPoll = true;
        }
    }
    handleGlobalKeyDown = (event) => {
        if (!this.paused) {
            return;
        }
        const key = Input.keyCodeFromEvent(event);
        if (key !== 0) {
            this.suppressedKeysUntilRelease.add(key);
        }
    };
    handleGlobalKeyUp = (event) => {
        const key = Input.keyCodeFromEvent(event);
        if (key !== 0) {
            this.suppressedKeysUntilRelease.delete(key);
        }
    };
    handleKeyDown = (event) => {
        const key = Input.keyCodeFromEvent(event);
        if (key === 0) {
            return;
        }
        if (this.shouldPreventDefault(event, key)) {
            event.preventDefault();
        }
        if (this.paused) {
            this.suppressedKeysUntilRelease.add(key);
            return;
        }
        if (!this.shouldAcceptGameKey(event) || this.suppressedKeysUntilRelease.has(key)) {
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
        this.suppressedKeysUntilRelease.delete(key);
        if (!this.paused && this.shouldAcceptGameKey(event)) {
            this.enqueueEvent(Input.EVENT_KEY_RELEASED, key, 0, 0, 0, event.key?.length === 1 ? event.key.charCodeAt(0) : 0, Input.eventTimestamp(event));
        }
    };
    handlePointerDown = (event) => {
        if (this.paused || !this.shouldAcceptPointerEvent(event)) {
            return;
        }
        const pointerId = Input.pointerIdFromEvent(event);
        if (this.activePointerId !== null && this.activePointerId !== pointerId) {
            return;
        }
        this.preventBrowserDefault(event);
        if (this.activePointerId === null) {
            this.activePointerId = pointerId;
            this.capturePointer(event);
        }
        const button = Input.mouseButtonFromEvent(event);
        this.updateMouse(event);
        if (!this.downMouse.has(button)) {
            this.downMouse.add(button);
            this.enqueueEvent(Input.EVENT_MOUSE_PRESSED, button, this.mouseX, this.mouseY, 0, 0, Input.eventTimestamp(event));
        }
    };
    handlePointerUp = (event) => {
        this.releasePointerButton(event, true);
    };
    handleGlobalPointerUp = (event) => {
        this.releasePointerButton(event, false);
    };
    handlePointerCancel = (event) => {
        this.cancelPointer(event);
    };
    handleGlobalPointerCancel = (event) => {
        this.cancelPointer(event);
    };
    handleLostPointerCapture = (event) => {
        this.cancelPointer(event);
    };
    handlePointerMove = (event) => {
        const accepted = this.shouldAcceptPointerEvent(event);
        const pointerId = Input.pointerIdFromEvent(event);
        if (this.paused || (this.activePointerId !== null && this.activePointerId !== pointerId) || (!accepted && this.downMouse.size === 0)) {
            return;
        }
        if (accepted) {
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
        this.clearInputStateForBrowserSuspension();
    };
    handleVisibilityChange = () => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            this.clearInputStateForBrowserSuspension();
        }
    };
    handleGamepadTopologyEvent = (event) => {
        const index = event.gamepad?.index;
        if (Number.isInteger(index) && index >= 0 && index < Input.BROWSER_CONTROLLER_LIMIT) {
            this.browserSlotGenerations[index] = (this.browserSlotGenerations[index] + 1) >>> 0;
        }
        this.invalidateGamepads();
    };
    isLifecycleListenerRegistered(listener) {
        return (this.keyListeners.includes(listener) ||
            this.mouseListeners.includes(listener) ||
            this.controllerListeners.includes(listener));
    }
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
    dispatchQueuedEvents(generation) {
        let remaining = this.eventCount;
        while (remaining-- > 0 && this.eventCount > 0 && this.isDispatchCurrent(generation)) {
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
                    this.dispatchKeyPressed(a, character === 0 ? "\0" : String.fromCharCode(character), timestamp, generation);
                    break;
                case Input.EVENT_KEY_RELEASED:
                    this.dispatchKeyReleased(a, character === 0 ? "\0" : String.fromCharCode(character), timestamp, generation);
                    break;
                case Input.EVENT_MOUSE_PRESSED:
                    this.pressedMouse.add(a);
                    this.mousePressX.set(a, b);
                    this.mousePressY.set(a, c);
                    this.dispatchMousePressed(a, b, c, timestamp, generation);
                    break;
                case Input.EVENT_MOUSE_RELEASED: {
                    this.dispatchMouseReleased(a, b, c, timestamp, generation);
                    if (!this.isDispatchCurrent(generation)) {
                        break;
                    }
                    const pressX = this.mousePressX.get(a);
                    const pressY = this.mousePressY.get(a);
                    const cancelled = this.cancelledMouseReleases.delete(a);
                    this.mousePressX.delete(a);
                    this.mousePressY.delete(a);
                    if (!cancelled &&
                        pressX !== undefined &&
                        pressY !== undefined &&
                        Math.abs(b - pressX) <= this.mouseClickTolerance &&
                        Math.abs(c - pressY) <= this.mouseClickTolerance) {
                        this.considerDoubleClickAt(a, b, c, timestamp, generation);
                    }
                    break;
                }
                case Input.EVENT_MOUSE_MOVED:
                    this.dispatchMouseMoved(a, b, c, d, false, timestamp, generation);
                    break;
                case Input.EVENT_MOUSE_DRAGGED:
                    this.dispatchMouseMoved(a, b, c, d, true, timestamp, generation);
                    break;
                case Input.EVENT_MOUSE_WHEEL:
                    this.dispatchMouseWheel(a, timestamp, generation);
                    break;
            }
        }
        if (this.eventCount === 0) {
            this.eventHead = 0;
        }
    }
    considerDoubleClickAt(button, x, y, timestamp, generation = this.dispatchGeneration) {
        if (!this.isDispatchCurrent(generation)) {
            return;
        }
        const elapsed = timestamp - this.lastClickTime;
        const withinTime = elapsed >= 0 && elapsed <= this.doubleClickDelay;
        const withinDistance = Math.abs(x - this.lastClickX) <= this.mouseClickTolerance && Math.abs(y - this.lastClickY) <= this.mouseClickTolerance;
        const doubleClick = button === this.lastClickButton && withinTime && withinDistance;
        this.dispatchMouseClicked(button, x, y, doubleClick ? 2 : 1, timestamp, generation);
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
    dispatchKeyPressed(key, character, timestamp, generation) {
        this.beginEventDispatch(timestamp);
        try {
            for (const listener of this.dispatchKeyListeners) {
                if (!this.isDispatchCurrent(generation))
                    break;
                if (this.keyListeners.includes(listener) && isAccepting(listener)) {
                    listener.keyPressed(key, character);
                    if (this.eventConsumed || !this.isDispatchCurrent(generation))
                        break;
                }
            }
        }
        finally {
            this.endEventDispatch();
        }
    }
    dispatchKeyReleased(key, character, timestamp, generation) {
        this.beginEventDispatch(timestamp);
        try {
            for (const listener of this.dispatchKeyListeners) {
                if (!this.isDispatchCurrent(generation))
                    break;
                if (this.keyListeners.includes(listener) && isAccepting(listener)) {
                    listener.keyReleased(key, character);
                    if (this.eventConsumed || !this.isDispatchCurrent(generation))
                        break;
                }
            }
        }
        finally {
            this.endEventDispatch();
        }
    }
    dispatchMousePressed(button, x, y, timestamp, generation) {
        this.beginEventDispatch(timestamp);
        try {
            for (const listener of this.dispatchMouseListeners) {
                if (!this.isDispatchCurrent(generation))
                    break;
                if (this.mouseListeners.includes(listener) && isAccepting(listener)) {
                    listener.mousePressed(button, x, y);
                    if (this.eventConsumed || !this.isDispatchCurrent(generation))
                        break;
                }
            }
        }
        finally {
            this.endEventDispatch();
        }
    }
    dispatchMouseReleased(button, x, y, timestamp, generation) {
        this.beginEventDispatch(timestamp);
        try {
            for (const listener of this.dispatchMouseListeners) {
                if (!this.isDispatchCurrent(generation))
                    break;
                if (this.mouseListeners.includes(listener) && isAccepting(listener)) {
                    listener.mouseReleased(button, x, y);
                    if (this.eventConsumed || !this.isDispatchCurrent(generation))
                        break;
                }
            }
        }
        finally {
            this.endEventDispatch();
        }
    }
    dispatchMouseClicked(button, x, y, count, timestamp, generation) {
        this.beginEventDispatch(timestamp);
        try {
            for (const listener of this.dispatchMouseListeners) {
                if (!this.isDispatchCurrent(generation))
                    break;
                if (this.mouseListeners.includes(listener) && isAccepting(listener)) {
                    listener.mouseClicked(button, x, y, count);
                    if (this.eventConsumed || !this.isDispatchCurrent(generation))
                        break;
                }
            }
        }
        finally {
            this.endEventDispatch();
        }
    }
    dispatchMouseMoved(oldX, oldY, newX, newY, dragged, timestamp, generation) {
        this.beginEventDispatch(timestamp);
        try {
            for (const listener of this.dispatchMouseListeners) {
                if (!this.isDispatchCurrent(generation))
                    break;
                if (this.mouseListeners.includes(listener) && isAccepting(listener)) {
                    if (dragged) {
                        listener.mouseDragged(oldX, oldY, newX, newY);
                    }
                    else {
                        listener.mouseMoved(oldX, oldY, newX, newY);
                    }
                    if (this.eventConsumed || !this.isDispatchCurrent(generation))
                        break;
                }
            }
        }
        finally {
            this.endEventDispatch();
        }
    }
    dispatchMouseWheel(change, timestamp, generation) {
        this.beginEventDispatch(timestamp);
        try {
            for (const listener of this.dispatchMouseListeners) {
                if (!this.isDispatchCurrent(generation))
                    break;
                if (this.mouseListeners.includes(listener) && isAccepting(listener)) {
                    listener.mouseWheelMoved(change);
                    if (this.eventConsumed || !this.isDispatchCurrent(generation))
                        break;
                }
            }
        }
        finally {
            this.endEventDispatch();
        }
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
        this.cancelledMouseReleases.clear();
        this.dispatchGeneration++;
    }
    clearPressedRecords() {
        this.clearKeyPressedRecord();
        this.clearMousePressedRecord();
        this.clearControlPressedRecord();
    }
    clearAllInputState() {
        this.downKeys.clear();
        this.suppressedKeysUntilRelease.clear();
        this.resetPointerState();
        this.clearClickHistory();
        this.clearAllControllerState();
        this.clearPressedRecords();
        this.clearQueuedEvents();
        this.invalidateGamepads();
    }
    clearInputStateForBrowserSuspension() {
        for (const key of this.downKeys) {
            this.suppressedKeysUntilRelease.add(key);
        }
        this.downKeys.clear();
        this.resetPointerState();
        this.clearClickHistory();
        this.clearAllControllerState();
        this.clearPressedRecords();
        this.clearQueuedEvents();
        this.invalidateGamepads();
        this.baselineControllersOnNextPoll = true;
    }
    clearAllControllerState() {
        this.controlDown.clear();
        this.controlPressed.clear();
        this.seenControllers.clear();
        this.controllerPhysicalIndices.fill(-1);
        this.controllerPhysicalIds.fill(null);
        this.controllerPhysicalSlotGenerations.fill(0);
        this.controllerMappings.fill("");
        this.controllerConnectionGenerations.fill(0);
        this.controllerStateSnapshotReady = false;
        this.controllerPollCompleted = false;
    }
    releasePointerButton(event, preventDefault) {
        const pointerId = Input.pointerIdFromEvent(event);
        if (this.paused || this.activePointerId === null || this.activePointerId !== pointerId) {
            return;
        }
        const button = Input.mouseButtonFromEvent(event);
        if (!this.downMouse.has(button)) {
            return;
        }
        if (preventDefault && this.shouldAcceptPointerEvent(event)) {
            this.preventBrowserDefault(event);
        }
        this.updateMouse(event);
        this.downMouse.delete(button);
        this.enqueueEvent(Input.EVENT_MOUSE_RELEASED, button, this.mouseX, this.mouseY, 0, 0, Input.eventTimestamp(event));
        if (this.downMouse.size === 0) {
            const activePointerId = this.activePointerId;
            this.activePointerId = null;
            this.releaseCapturedPointer(activePointerId);
        }
    }
    cancelPointer(event) {
        const pointerId = Input.pointerIdFromEvent(event);
        if (this.activePointerId === null || this.activePointerId !== pointerId) {
            return;
        }
        this.updateMouse(event);
        const timestamp = Input.eventTimestamp(event);
        for (const button of this.downMouse) {
            this.mousePressX.delete(button);
            this.mousePressY.delete(button);
            this.cancelledMouseReleases.add(button);
            this.enqueueEvent(Input.EVENT_MOUSE_RELEASED, button, this.mouseX, this.mouseY, 0, 0, timestamp);
        }
        this.downMouse.clear();
        const activePointerId = this.activePointerId;
        this.activePointerId = null;
        this.releaseCapturedPointer(activePointerId);
    }
    capturePointer(event) {
        if (typeof Element === "undefined") {
            return;
        }
        const eventTarget = event.target;
        const currentTarget = event.currentTarget;
        const target = eventTarget instanceof Element && typeof eventTarget.setPointerCapture === "function"
            ? eventTarget
            : currentTarget instanceof Element && typeof currentTarget.setPointerCapture === "function"
                ? currentTarget
                : this.preventDefaultElement instanceof Element && typeof this.preventDefaultElement.setPointerCapture === "function"
                    ? this.preventDefaultElement
                    : null;
        if (target === null) {
            return;
        }
        try {
            target.setPointerCapture(Input.pointerIdFromEvent(event));
            this.capturedPointerTarget = target;
        }
        catch {
            this.capturedPointerTarget = null;
        }
    }
    releaseCapturedPointer(pointerId) {
        const target = this.capturedPointerTarget;
        this.capturedPointerTarget = null;
        if (target && pointerId !== null && typeof target.releasePointerCapture === "function") {
            try {
                if (typeof target.hasPointerCapture !== "function" || target.hasPointerCapture(pointerId)) {
                    target.releasePointerCapture(pointerId);
                }
            }
            catch {
                // Cancellation/blur/unbind cleanup is idempotent even if capture already ended.
            }
        }
    }
    resetPointerState() {
        const activePointerId = this.activePointerId;
        this.activePointerId = null;
        this.releaseCapturedPointer(activePointerId);
        this.downMouse.clear();
        this.mousePressX.clear();
        this.mousePressY.clear();
        this.cancelledMouseReleases.clear();
    }
    clearClickHistory() {
        this.lastClickButton = -1;
        this.lastClickX = 0;
        this.lastClickY = 0;
        this.lastClickTime = Number.NEGATIVE_INFINITY;
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
    pollControllers(forceBaseline = false, generation = null) {
        const gamepads = this.getFrameGamepads();
        const sampleBaselineOnly = forceBaseline || this.baselineControllersOnNextPoll;
        const baselineChangedOwners = this.controllerPollCompleted;
        let topologyChanged = false;
        this.seenControllers.clear();
        for (let controller = 0; controller < gamepads.length; controller++) {
            if (generation !== null && !this.isControllerDispatchCurrent(generation))
                return false;
            const gamepad = gamepads[controller];
            const ownerChanged = this.prepareLogicalControllerOwner(controller, gamepad);
            topologyChanged ||= ownerChanged;
            const baselineOnly = sampleBaselineOnly || (ownerChanged && baselineChangedOwners);
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
            if (!this.updateControlState(controller, 0, left, baselineOnly, generation))
                return false;
            if (!this.updateControlState(controller, 1, right, baselineOnly, generation))
                return false;
            if (!this.updateControlState(controller, 2, up, baselineOnly, generation))
                return false;
            if (!this.updateControlState(controller, 3, down, baselineOnly, generation))
                return false;
            const buttonCount = Math.min(gamepad.buttons.length, Input.BROWSER_CONTROLLER_BUTTON_LIMIT);
            for (let index = 0; index < buttonCount; index++) {
                if (!Input.isStandardDpadButton(gamepad, index)) {
                    if (!this.updateControlState(controller, 4 + index, gamepad.buttons[index]?.pressed === true, baselineOnly, generation))
                        return false;
                }
            }
        }
        for (let controller = gamepads.length; controller < this.controllerPhysicalIndices.length; controller++) {
            if (this.controllerPhysicalIndices[controller] !== -1) {
                topologyChanged = true;
                this.clearControllerState(controller);
                this.controllerPhysicalIndices[controller] = -1;
                this.controllerPhysicalIds[controller] = null;
                this.controllerPhysicalSlotGenerations[controller] = 0;
                this.controllerMappings[controller] = "";
                this.controllerConnectionGenerations[controller] = 0;
            }
        }
        if (topologyChanged) {
            this.controllerSampleStatus.topologyGeneration = (this.controllerSampleStatus.topologyGeneration + 1) >>> 0;
        }
        this.clearDisconnectedAxisCalibration();
        this.controllerStateSnapshotReady = true;
        this.controllerPollCompleted = true;
        this.controllerSampleStatus.baselineOnly = sampleBaselineOnly;
        this.baselineControllersOnNextPoll = false;
        return true;
    }
    prepareLogicalControllerOwner(controller, gamepad) {
        if (controller >= this.controllerPhysicalIndices.length) {
            return false;
        }
        const physicalIndex = gamepad.index;
        const id = gamepad.id || "";
        const mapping = gamepad.mapping || "";
        const slotGeneration = physicalIndex >= 0 && physicalIndex < this.browserSlotGenerations.length ? this.browserSlotGenerations[physicalIndex] : 0;
        if (this.controllerPhysicalIndices[controller] !== physicalIndex ||
            this.controllerPhysicalIds[controller] !== id ||
            this.controllerMappings[controller] !== mapping ||
            this.controllerPhysicalSlotGenerations[controller] !== slotGeneration) {
            this.clearControllerState(controller);
            this.controllerPhysicalIndices[controller] = physicalIndex;
            this.controllerPhysicalIds[controller] = id;
            this.controllerMappings[controller] = mapping;
            this.controllerPhysicalSlotGenerations[controller] = slotGeneration;
            this.nextControllerConnectionGeneration = (this.nextControllerConnectionGeneration + 1) >>> 0;
            if (this.nextControllerConnectionGeneration === 0) {
                this.nextControllerConnectionGeneration = 1;
            }
            this.controllerConnectionGenerations[controller] = this.nextControllerConnectionGeneration;
            return true;
        }
        return false;
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
        for (let physicalIndex = 0; physicalIndex < this.additionalControllerAxisOwnerIds.length; physicalIndex++) {
            if (this.additionalControllerAxisOwnerIds[physicalIndex] === null) {
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
        const id = gamepad.id || "";
        const mapping = gamepad.mapping || "";
        const slotGeneration = this.browserSlotGenerations[controller];
        if (this.additionalControllerAxisOwnerIds[controller] !== id ||
            this.additionalControllerAxisOwnerMappings[controller] !== mapping ||
            this.additionalControllerAxisOwnerSlotGenerations[controller] !== slotGeneration) {
            this.resetAdditionalControllerAxisCalibration(controller);
            this.additionalControllerAxisOwnerIds[controller] = id;
            this.additionalControllerAxisOwnerMappings[controller] = mapping;
            this.additionalControllerAxisOwnerSlotGenerations[controller] = slotGeneration;
        }
    }
    resetAdditionalControllerAxisCalibration(controller) {
        if (controller < 0 || controller >= Input.BROWSER_CONTROLLER_LIMIT) {
            return;
        }
        const start = controller * Input.BROWSER_AXIS_LIMIT;
        this.additionalControllerAxisBaselines.fill(Number.NaN, start, start + Input.BROWSER_AXIS_LIMIT);
        this.additionalControllerAxisOwnerIds[controller] = null;
        this.additionalControllerAxisOwnerMappings[controller] = "";
        this.additionalControllerAxisOwnerSlotGenerations[controller] = 0;
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
    updateControlState(controller, control, down, baselineOnly = false, generation = null) {
        const key = Input.controlKey(controller, control);
        const wasDown = this.controlDown.has(key);
        if (down === wasDown) {
            return generation === null || this.isControllerDispatchCurrent(generation);
        }
        if (down) {
            this.controlDown.add(key);
            if (!baselineOnly) {
                this.controlPressed.add(key);
            }
        }
        else {
            this.controlDown.delete(key);
        }
        if (baselineOnly) {
            return generation === null || this.isControllerDispatchCurrent(generation);
        }
        this.beginEventDispatch(Input.now());
        try {
            for (const listener of this.dispatchControllerListeners) {
                if (generation !== null && !this.isControllerDispatchCurrent(generation))
                    break;
                if (this.controllerListeners.includes(listener) && isAccepting(listener)) {
                    if (down) {
                        Input.dispatchControllerPressed(listener, controller, control);
                    }
                    else {
                        Input.dispatchControllerReleased(listener, controller, control);
                    }
                    if (this.eventConsumed || (generation !== null && !this.isControllerDispatchCurrent(generation)))
                        break;
                }
            }
        }
        finally {
            this.endEventDispatch();
        }
        return generation === null || this.isControllerDispatchCurrent(generation);
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
        const available = typeof navigator !== "undefined" && typeof navigator.getGamepads === "function";
        if (!available) {
            this.cachedGamepads.length = 0;
            this.gamepadsCached = true;
            this.gamepadCacheGeneration = Input.gamepadCacheGeneration;
            this.controllerStateSnapshotReady = false;
            this.publishControllerSample(false, true, this.baselineControllersOnNextPoll);
            return this.cachedGamepads;
        }
        this.pendingGamepads.length = 0;
        try {
            const browserGamepads = navigator.getGamepads();
            for (const gamepad of browserGamepads) {
                if (Input.isUsableGamepad(gamepad) && gamepad.index >= 0 && gamepad.index < Input.BROWSER_CONTROLLER_LIMIT) {
                    this.pendingGamepads.push(gamepad);
                    if (this.pendingGamepads.length === Input.BROWSER_CONTROLLER_LIMIT) {
                        break;
                    }
                }
            }
        }
        catch {
            this.pendingGamepads.length = 0;
            this.baselineControllersOnNextPoll = true;
            this.gamepadsCached = true;
            this.gamepadCacheGeneration = Input.gamepadCacheGeneration;
            this.publishControllerSample(true, false, true);
            // Keep the last valid physical/controller baseline. A failed enumeration is
            // uncertainty, not evidence that every controller was released.
            return this.cachedGamepads;
        }
        Input.copyArray(this.pendingGamepads, this.cachedGamepads);
        this.pendingGamepads.length = 0;
        this.gamepadsCached = true;
        this.gamepadCacheGeneration = Input.gamepadCacheGeneration;
        this.controllerStateSnapshotReady = false;
        this.publishControllerSample(true, true, this.baselineControllersOnNextPoll);
        return this.cachedGamepads;
    }
    publishControllerSample(available, valid, baselineOnly) {
        this.controllerSampleStatus.sequence = (this.controllerSampleStatus.sequence + 1) >>> 0;
        this.controllerSampleStatus.available = available;
        this.controllerSampleStatus.valid = valid;
        this.controllerSampleStatus.baselineOnly = baselineOnly;
    }
    isDispatchCurrent(generation) {
        return generation === this.dispatchGeneration && !this.paused && Input.browserHasInputFocus();
    }
    isControllerDispatchCurrent(generation) {
        return this.isDispatchCurrent(generation) && !Input.controllersDisabled;
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
    static pointerIdFromEvent(event) {
        return Number.isInteger(event.pointerId) ? event.pointerId : 0;
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
        return (Input.readGamepadAxis(gamepad, 0) < -0.5 ||
            (gamepad.mapping === "standard" ? gamepad.buttons[14]?.pressed === true : Input.isGamepadPovHat(gamepad, Input.POV_HAT_LEFT)));
    }
    static isGamepadRight(gamepad) {
        return (Input.readGamepadAxis(gamepad, 0) > 0.5 ||
            (gamepad.mapping === "standard" ? gamepad.buttons[15]?.pressed === true : Input.isGamepadPovHat(gamepad, Input.POV_HAT_RIGHT)));
    }
    static isGamepadUp(gamepad) {
        return (Input.readGamepadAxis(gamepad, 1) < -0.5 ||
            (gamepad.mapping === "standard" ? gamepad.buttons[12]?.pressed === true : Input.isGamepadPovHat(gamepad, Input.POV_HAT_UP)));
    }
    static isGamepadDown(gamepad) {
        return (Input.readGamepadAxis(gamepad, 1) > 0.5 ||
            (gamepad.mapping === "standard" ? gamepad.buttons[13]?.pressed === true : Input.isGamepadPovHat(gamepad, Input.POV_HAT_DOWN)));
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
    static isStandardDpadButton(gamepad, index) {
        return gamepad.mapping === "standard" && index >= 12 && index <= 15;
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
    static browserKeyCodes = new Set(Input.eventCodeToKey.values());
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