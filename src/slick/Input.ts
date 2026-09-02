import type { ControlledInputReciever } from "./ControlledInputReciever.js";
import type { ControllerListener } from "./ControllerListener.js";
import type { InputListener } from "./InputListener.js";
import type { KeyListener } from "./KeyListener.js";
import type { MouseListener } from "./MouseListener.js";

type TargetElement = HTMLElement | Window | Document;
type GamepadSnapshot = readonly Gamepad[];

export interface ControllerDirectionAxisPair {
    readonly horizontalAxis: number;
    readonly verticalAxis: number;
}
const ACTIVE_EVENT_OPTIONS: AddEventListenerOptions = { passive: false };

function isAccepting(listener: { isAcceptingInput(): boolean }): boolean {
    return listener.isAcceptingInput();
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.Input.
 *
 * Browser keyboard, mouse, and Gamepad API adapter using Slick/LWJGL constants.
 */
export class Input {
    public static readonly ANY_CONTROLLER = -1;
    public static readonly MOUSE_LEFT_BUTTON = 0;
    public static readonly MOUSE_RIGHT_BUTTON = 1;
    public static readonly MOUSE_MIDDLE_BUTTON = 2;

    public static readonly KEY_ESCAPE = 0x01;
    public static readonly KEY_1 = 0x02;
    public static readonly KEY_2 = 0x03;
    public static readonly KEY_3 = 0x04;
    public static readonly KEY_4 = 0x05;
    public static readonly KEY_5 = 0x06;
    public static readonly KEY_6 = 0x07;
    public static readonly KEY_7 = 0x08;
    public static readonly KEY_8 = 0x09;
    public static readonly KEY_9 = 0x0a;
    public static readonly KEY_0 = 0x0b;
    public static readonly KEY_MINUS = 0x0c;
    public static readonly KEY_EQUALS = 0x0d;
    public static readonly KEY_BACK = 0x0e;
    public static readonly KEY_TAB = 0x0f;
    public static readonly KEY_Q = 0x10;
    public static readonly KEY_W = 0x11;
    public static readonly KEY_E = 0x12;
    public static readonly KEY_R = 0x13;
    public static readonly KEY_T = 0x14;
    public static readonly KEY_Y = 0x15;
    public static readonly KEY_U = 0x16;
    public static readonly KEY_I = 0x17;
    public static readonly KEY_O = 0x18;
    public static readonly KEY_P = 0x19;
    public static readonly KEY_LBRACKET = 0x1a;
    public static readonly KEY_RBRACKET = 0x1b;
    public static readonly KEY_RETURN = 0x1c;
    public static readonly KEY_ENTER = 0x1c;
    public static readonly KEY_LCONTROL = 0x1d;
    public static readonly KEY_A = 0x1e;
    public static readonly KEY_S = 0x1f;
    public static readonly KEY_D = 0x20;
    public static readonly KEY_F = 0x21;
    public static readonly KEY_G = 0x22;
    public static readonly KEY_H = 0x23;
    public static readonly KEY_J = 0x24;
    public static readonly KEY_K = 0x25;
    public static readonly KEY_L = 0x26;
    public static readonly KEY_SEMICOLON = 0x27;
    public static readonly KEY_APOSTROPHE = 0x28;
    public static readonly KEY_GRAVE = 0x29;
    public static readonly KEY_LSHIFT = 0x2a;
    public static readonly KEY_BACKSLASH = 0x2b;
    public static readonly KEY_Z = 0x2c;
    public static readonly KEY_X = 0x2d;
    public static readonly KEY_C = 0x2e;
    public static readonly KEY_V = 0x2f;
    public static readonly KEY_B = 0x30;
    public static readonly KEY_N = 0x31;
    public static readonly KEY_M = 0x32;
    public static readonly KEY_COMMA = 0x33;
    public static readonly KEY_PERIOD = 0x34;
    public static readonly KEY_SLASH = 0x35;
    public static readonly KEY_RSHIFT = 0x36;
    public static readonly KEY_MULTIPLY = 0x37;
    public static readonly KEY_LMENU = 0x38;
    public static readonly KEY_SPACE = 0x39;
    public static readonly KEY_CAPITAL = 0x3a;
    public static readonly KEY_F1 = 0x3b;
    public static readonly KEY_F2 = 0x3c;
    public static readonly KEY_F3 = 0x3d;
    public static readonly KEY_F4 = 0x3e;
    public static readonly KEY_F5 = 0x3f;
    public static readonly KEY_F6 = 0x40;
    public static readonly KEY_F7 = 0x41;
    public static readonly KEY_F8 = 0x42;
    public static readonly KEY_F9 = 0x43;
    public static readonly KEY_F10 = 0x44;
    public static readonly KEY_NUMLOCK = 0x45;
    public static readonly KEY_SCROLL = 0x46;
    public static readonly KEY_NUMPAD7 = 0x47;
    public static readonly KEY_NUMPAD8 = 0x48;
    public static readonly KEY_NUMPAD9 = 0x49;
    public static readonly KEY_SUBTRACT = 0x4a;
    public static readonly KEY_NUMPAD4 = 0x4b;
    public static readonly KEY_NUMPAD5 = 0x4c;
    public static readonly KEY_NUMPAD6 = 0x4d;
    public static readonly KEY_ADD = 0x4e;
    public static readonly KEY_NUMPAD1 = 0x4f;
    public static readonly KEY_NUMPAD2 = 0x50;
    public static readonly KEY_NUMPAD3 = 0x51;
    public static readonly KEY_NUMPAD0 = 0x52;
    public static readonly KEY_DECIMAL = 0x53;
    public static readonly KEY_F11 = 0x57;
    public static readonly KEY_F12 = 0x58;
    public static readonly KEY_F13 = 0x64;
    public static readonly KEY_F14 = 0x65;
    public static readonly KEY_F15 = 0x66;
    public static readonly KEY_KANA = 0x70;
    public static readonly KEY_CONVERT = 0x79;
    public static readonly KEY_NOCONVERT = 0x7b;
    public static readonly KEY_YEN = 0x7d;
    public static readonly KEY_NUMPADEQUALS = 0x8d;
    public static readonly KEY_CIRCUMFLEX = 0x90;
    public static readonly KEY_AT = 0x91;
    public static readonly KEY_COLON = 0x92;
    public static readonly KEY_UNDERLINE = 0x93;
    public static readonly KEY_KANJI = 0x94;
    public static readonly KEY_STOP = 0x95;
    public static readonly KEY_AX = 0x96;
    public static readonly KEY_UNLABELED = 0x97;
    public static readonly KEY_NUMPADENTER = 0x9c;
    public static readonly KEY_RCONTROL = 0x9d;
    public static readonly KEY_NUMPADCOMMA = 0xb3;
    public static readonly KEY_DIVIDE = 0xb5;
    public static readonly KEY_SYSRQ = 0xb7;
    public static readonly KEY_RMENU = 0xb8;
    public static readonly KEY_PAUSE = 0xc5;
    public static readonly KEY_HOME = 0xc7;
    public static readonly KEY_UP = 0xc8;
    public static readonly KEY_PRIOR = 0xc9;
    public static readonly KEY_LEFT = 0xcb;
    public static readonly KEY_RIGHT = 0xcd;
    public static readonly KEY_END = 0xcf;
    public static readonly KEY_DOWN = 0xd0;
    public static readonly KEY_NEXT = 0xd1;
    public static readonly KEY_INSERT = 0xd2;
    public static readonly KEY_DELETE = 0xd3;
    public static readonly KEY_LWIN = 0xdb;
    public static readonly KEY_RWIN = 0xdc;
    public static readonly KEY_APPS = 0xdd;
    public static readonly KEY_POWER = 0xde;
    public static readonly KEY_SLEEP = 0xdf;
    public static readonly KEY_LALT = Input.KEY_LMENU;
    public static readonly KEY_RALT = Input.KEY_RMENU;

    private static readonly POV_HAT_AXIS = 9;
    private static readonly POV_HAT_TOLERANCE = 0.04;
    private static readonly POV_HAT_UP = [-1, -5 / 7, 1];
    private static readonly POV_HAT_RIGHT = [-5 / 7, -3 / 7, -1 / 7];
    private static readonly POV_HAT_DOWN = [-1 / 7, 1 / 7, 3 / 7];
    private static readonly POV_HAT_LEFT = [3 / 7, 5 / 7, 1];
    private static readonly BROWSER_CONTROLLER_LIMIT = 16;
    private static readonly BROWSER_AXIS_LIMIT = 16;

    private static controllersDisabled = false;
    private static gamepadCacheGeneration = 0;
    private static readonly INITIAL_EVENT_CAPACITY = 32;
    private static readonly EVENT_KEY_PRESSED = 1;
    private static readonly EVENT_KEY_RELEASED = 2;
    private static readonly EVENT_MOUSE_PRESSED = 3;
    private static readonly EVENT_MOUSE_RELEASED = 4;
    private static readonly EVENT_MOUSE_MOVED = 5;
    private static readonly EVENT_MOUSE_DRAGGED = 6;
    private static readonly EVENT_MOUSE_WHEEL = 7;

    private readonly downKeys = new Set<number>();
    private readonly pressedKeys = new Set<number>();
    private readonly downMouse = new Set<number>();
    private readonly pressedMouse = new Set<number>();
    private readonly controlPressed = new Set<number>();
    private readonly controlDown = new Set<number>();
    private readonly seenControllers = new Set<number>();
    private readonly staleControlKeys: number[] = [];
    private readonly keyListeners: KeyListener[] = [];
    private readonly mouseListeners: MouseListener[] = [];
    private readonly controllerListeners: ControllerListener[] = [];
    private readonly dispatchKeyListeners: KeyListener[] = [];
    private readonly dispatchMouseListeners: MouseListener[] = [];
    private readonly dispatchControllerListeners: ControllerListener[] = [];
    private readonly lifecycleListeners: ControlledInputReciever[] = [];
    private readonly startedListeners: ControlledInputReciever[] = [];
    private target: TargetElement | null = null;
    private paused = false;
    private scaleX = 1;
    private scaleY = 1;
    private offsetX = 0;
    private offsetY = 0;
    private mouseX = 0;
    private mouseY = 0;
    private absoluteMouseX = 0;
    private absoluteMouseY = 0;
    private keyRepeat = false;
    private doubleClickDelay = 250;
    private mouseClickTolerance = 5;
    private lastClickButton = -1;
    private lastClickX = 0;
    private lastClickY = 0;
    private lastClickTime = Number.NEGATIVE_INFINITY;
    private readonly mousePressX = new Map<number, number>();
    private readonly mousePressY = new Map<number, number>();
    private preventDefaultElement: HTMLElement | null = null;
    private preventDefaultTouchAction: string | null = null;
    private browserInputCapture = true;
    private browserInputCaptureConfigured = false;
    private readonly cachedGamepads: Gamepad[] = [];
    private gamepadsCached = false;
    private gamepadCacheGeneration = -1;
    private controllerStateSnapshotReady = false;
    private readonly controllerPhysicalIndices = new Int32Array(Input.BROWSER_CONTROLLER_LIMIT).fill(-1);
    private readonly controllerPhysicalIds = new Array<string | null>(Input.BROWSER_CONTROLLER_LIMIT).fill(null);
    private additionalControllerDirectionAxes: number[] = [];
    private readonly additionalControllerAxisBaselines = new Float64Array(Input.BROWSER_CONTROLLER_LIMIT * Input.BROWSER_AXIS_LIMIT);
    private readonly additionalControllerAxisOwners = new Array<string | null>(Input.BROWSER_CONTROLLER_LIMIT).fill(null);
    private additionalControllerAxisThreshold = 0.5;
    private additionalControllerAxisRecenterThreshold = 0.05;

    private eventTypes = new Uint8Array(Input.INITIAL_EVENT_CAPACITY);
    private eventA = new Int32Array(Input.INITIAL_EVENT_CAPACITY);
    private eventB = new Int32Array(Input.INITIAL_EVENT_CAPACITY);
    private eventC = new Int32Array(Input.INITIAL_EVENT_CAPACITY);
    private eventD = new Int32Array(Input.INITIAL_EVENT_CAPACITY);
    private eventCharacters = new Uint32Array(Input.INITIAL_EVENT_CAPACITY);
    private eventTimes = new Float64Array(Input.INITIAL_EVENT_CAPACITY);
    private eventHead = 0;
    private eventCount = 0;
    private dispatchingEvent = false;
    private eventConsumed = false;
    private dispatchedEventTime = 0;

    /**
     * Java Slick2D counterpart: Input.disableControllers().
     *
     * Disables controller polling for this page session.
     */
    public static disableControllers(): void {
        Input.controllersDisabled = true;
        Input.gamepadCacheGeneration++;
    }

    /** Java Slick2D counterpart: Input.getKeyName(int). */
    public static getKeyName(code: number): string {
        return Input.keyNames.get(code) ?? `KEY_${code}`;
    }

    /** Java Slick2D counterpart: Input(int height). */
    public constructor(private height: number) {
        this.additionalControllerAxisBaselines.fill(Number.NaN);
    }

    /**
     * Browser controller helper: adds calibrated axis pairs that contribute to
     * the four Slick directional controls during the normal input poll.
     */
    public setAdditionalControllerDirectionAxes(axes: readonly ControllerDirectionAxisPair[], threshold: number = 0.5, recenterThreshold: number = 0.05): void {
        const values: number[] = [];
        for (const pair of axes) {
            const horizontal = pair.horizontalAxis;
            const vertical = pair.verticalAxis;
            if (
                !Number.isFinite(horizontal) ||
                !Number.isInteger(horizontal) ||
                horizontal < 0 ||
                horizontal >= Input.BROWSER_AXIS_LIMIT ||
                !Number.isFinite(vertical) ||
                !Number.isInteger(vertical) ||
                vertical < 0 ||
                vertical >= Input.BROWSER_AXIS_LIMIT
            ) {
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
    public resetAdditionalControllerDirectionAxisCalibration(): void {
        this.additionalControllerAxisBaselines.fill(Number.NaN);
        this.additionalControllerAxisOwners.fill(null);
    }

    /** Browser parity helper: attaches DOM listeners to an element/window. */
    public bindToElement(target: TargetElement): void {
        this.unbind();
        this.target = target;
        target.addEventListener("keydown", this.handleKeyDown as EventListener);
        target.addEventListener("keyup", this.handleKeyUp as EventListener);
        target.addEventListener("pointerdown", this.handlePointerDown as EventListener);
        target.addEventListener("pointerup", this.handlePointerUp as EventListener);
        target.addEventListener("pointermove", this.handlePointerMove as EventListener);
        target.addEventListener("wheel", this.handleWheel as EventListener, ACTIVE_EVENT_OPTIONS);
        target.addEventListener("contextmenu", this.handleContextMenu as EventListener, ACTIVE_EVENT_OPTIONS);
        if (typeof window !== "undefined") {
            window.addEventListener("blur", this.handleFocusLost);
        }
        if (typeof document !== "undefined") {
            document.addEventListener("visibilitychange", this.handleVisibilityChange);
        }
    }

    /** Browser parity helper: element whose focused game keys should suppress browser defaults. */
    public setPreventDefaultElement(element: HTMLElement | null): void {
        if (this.preventDefaultElement === element) {
            return;
        }
        this.restorePreventDefaultElementStyle();
        this.preventDefaultElement = element;
        this.applyPreventDefaultElementStyle();
    }

    /** Browser parity helper: controls whether accepted canvas input suppresses browser gestures. */
    public setBrowserInputCaptureEnabled(enabled: boolean): void {
        this.browserInputCaptureConfigured = true;
        this.setBrowserInputCapture(enabled);
    }

    /** Browser parity helper: applies a container default unless the caller chose explicitly. */
    public setBrowserInputCaptureDefault(enabled: boolean): void {
        if (!this.browserInputCaptureConfigured) {
            this.setBrowserInputCapture(enabled);
        }
    }

    private setBrowserInputCapture(enabled: boolean): void {
        if (this.browserInputCapture === enabled) {
            return;
        }
        this.browserInputCapture = enabled;
        this.restorePreventDefaultElementStyle();
        this.applyPreventDefaultElementStyle();
    }

    /** Browser parity helper: removes attached DOM listeners. */
    public unbind(): void {
        if (!this.target) {
            this.clearAllInputState();
            this.setPreventDefaultElement(null);
            return;
        }
        this.target.removeEventListener("keydown", this.handleKeyDown as EventListener);
        this.target.removeEventListener("keyup", this.handleKeyUp as EventListener);
        this.target.removeEventListener("pointerdown", this.handlePointerDown as EventListener);
        this.target.removeEventListener("pointerup", this.handlePointerUp as EventListener);
        this.target.removeEventListener("pointermove", this.handlePointerMove as EventListener);
        this.target.removeEventListener("wheel", this.handleWheel as EventListener);
        this.target.removeEventListener("contextmenu", this.handleContextMenu as EventListener);
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
    public setDoubleClickInterval(delay: number): void {
        if (!Number.isSafeInteger(delay) || delay < 0) {
            throw new RangeError("Double-click interval must be a non-negative safe integer");
        }
        this.doubleClickDelay = delay;
    }

    /** Java Slick2D counterpart: Input.setMouseClickTolerance(int). */
    public setMouseClickTolerance(mouseClickTolerance: number): void {
        if (!Number.isSafeInteger(mouseClickTolerance) || mouseClickTolerance < 0) {
            throw new RangeError("Mouse click tolerance must be a non-negative safe integer");
        }
        this.mouseClickTolerance = mouseClickTolerance;
    }

    /** Java Slick2D counterpart: Input.initControllers(). */
    public initControllers(): void {
        this.invalidateGamepads();
    }

    /** Java Slick2D counterpart: Input.addListener(InputListener). */
    public addListener(listener: InputListener): void {
        this.addKeyListener(listener);
        this.addMouseListener(listener);
        this.addControllerListener(listener);
    }

    /** Java Slick2D counterpart: Input.removeListener(InputListener). */
    public removeListener(listener: InputListener): void {
        this.removeKeyListener(listener);
        this.removeMouseListener(listener);
        this.removeControllerListener(listener);
    }

    /** Java Slick2D counterpart: Input.removeAllListeners(). */
    public removeAllListeners(): void {
        this.removeAllKeyListeners();
        this.removeAllMouseListeners();
        this.removeAllControllerListeners();
    }

    /** Java Slick2D counterpart: Input.removeAllKeyListeners(). */
    public removeAllKeyListeners(): void {
        this.keyListeners.length = 0;
    }

    /** Java Slick2D counterpart: Input.removeAllMouseListeners(). */
    public removeAllMouseListeners(): void {
        this.mouseListeners.length = 0;
    }

    /** Java Slick2D counterpart: Input.removeAllControllerListeners(). */
    public removeAllControllerListeners(): void {
        this.controllerListeners.length = 0;
    }

    /** Java Slick2D counterpart: Input.addPrimaryListener(InputListener). */
    public addPrimaryListener(listener: InputListener): void {
        this.removeListener(listener);
        this.keyListeners.unshift(listener);
        this.mouseListeners.unshift(listener);
        this.controllerListeners.unshift(listener);
        listener.setInput(this);
    }

    /** Java Slick2D counterpart: Input.addKeyListener(KeyListener). */
    public addKeyListener(listener: KeyListener): void {
        if (!this.keyListeners.includes(listener)) {
            this.keyListeners.push(listener);
            listener.setInput(this);
        }
    }

    /** Java Slick2D counterpart: Input.removeKeyListener(KeyListener). */
    public removeKeyListener(listener: KeyListener): void {
        this.removeFrom(this.keyListeners, listener);
    }

    /** Java Slick2D counterpart: Input.addMouseListener(MouseListener). */
    public addMouseListener(listener: MouseListener): void {
        if (!this.mouseListeners.includes(listener)) {
            this.mouseListeners.push(listener);
            listener.setInput(this);
        }
    }

    /** Java Slick2D counterpart: Input.removeMouseListener(MouseListener). */
    public removeMouseListener(listener: MouseListener): void {
        this.removeFrom(this.mouseListeners, listener);
    }

    /** Java Slick2D counterpart: Input.addControllerListener(ControllerListener). */
    public addControllerListener(listener: ControllerListener): void {
        if (!this.controllerListeners.includes(listener)) {
            this.controllerListeners.push(listener);
            listener.setInput(this);
        }
    }

    /** Java Slick2D counterpart: Input.removeControllerListener(ControllerListener). */
    public removeControllerListener(listener: ControllerListener): void {
        this.removeFrom(this.controllerListeners, listener);
    }

    /** Java Slick2D counterpart: Input.setScale(float, float). */
    public setScale(xscale: number, yscale: number): void {
        this.scaleX = xscale;
        this.scaleY = yscale;
    }

    /** Java Slick2D counterpart: Input.setOffset(float, float). */
    public setOffset(xoffset: number, yoffset: number): void {
        this.offsetX = xoffset;
        this.offsetY = yoffset;
    }

    /** Java Slick2D counterpart: Input.resetInputTransform(). */
    public resetInputTransform(): void {
        this.scaleX = 1;
        this.scaleY = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    /** Java Slick2D counterpart: Input.isKeyPressed(int). */
    public isKeyPressed(key: number): boolean {
        const pressed = this.pressedKeys.has(key);
        this.pressedKeys.delete(key);
        return pressed;
    }

    /** Java Slick2D counterpart: Input.isKeyDown(int). */
    public isKeyDown(key: number): boolean {
        return this.downKeys.has(key);
    }

    /** Java Slick2D counterpart: Input.clearKeyPressedRecord(). */
    public clearKeyPressedRecord(): void {
        this.pressedKeys.clear();
    }

    /** Java Slick2D counterpart: Input.clearControlPressedRecord(). */
    public clearControlPressedRecord(): void {
        this.controlPressed.clear();
    }

    /** Java Slick2D counterpart: Input.clearMousePressedRecord(). */
    public clearMousePressedRecord(): void {
        this.pressedMouse.clear();
    }

    /** Java Slick2D counterpart: Input.isControlPressed(int). */
    public isControlPressed(button: number): boolean;
    /** Java Slick2D counterpart: Input.isControlPressed(int, int). */
    public isControlPressed(button: number, controller: number): boolean;
    public isControlPressed(button: number, controller: number = 0): boolean {
        if (Input.controllersDisabled) {
            return false;
        }
        const key = Input.controlKey(controller, button);
        const pressed = this.controlPressed.has(key);
        this.controlPressed.delete(key);
        return pressed;
    }

    /** Java Slick2D counterpart: Input.isButtonPressed(int, int). */
    public isButtonPressed(index: number, controller: number): boolean {
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
    public isButton1Pressed(controller: number): boolean {
        return this.isButtonPressed(0, controller);
    }

    /** Java Slick2D counterpart: Input.isButton2Pressed(int). */
    public isButton2Pressed(controller: number): boolean {
        return this.isButtonPressed(1, controller);
    }

    /** Java Slick2D counterpart: Input.isButton3Pressed(int). */
    public isButton3Pressed(controller: number): boolean {
        return this.isButtonPressed(2, controller);
    }

    /** Java Slick2D counterpart: Input.isButtonDown(int, int). */
    public isButtonDown(index: number, controller: number): boolean {
        return this.isButtonPressed(index, controller);
    }

    /** Java Slick2D counterpart: Input.getControllerCount(). */
    public getControllerCount(): number {
        return Input.controllersDisabled ? 0 : this.getFrameGamepads().length;
    }

    /** Browser controller helper: returns the physical button count for a dense logical controller. */
    public getButtonCount(controller: number): number {
        if (Input.controllersDisabled) {
            return 0;
        }
        return this.getFrameGamepads()[controller]?.buttons.length ?? 0;
    }

    /** Java Slick2D counterpart: Input.getAxisCount(int). */
    public getAxisCount(controller: number): number {
        if (Input.controllersDisabled) {
            return 0;
        }
        return this.getFrameGamepads()[controller]?.axes.length ?? 0;
    }

    /** Java Slick2D counterpart: Input.getAxisValue(int, int). */
    public getAxisValue(controller: number, axis: number): number {
        if (Input.controllersDisabled) {
            return 0;
        }
        const gamepad = this.getFrameGamepads()[controller];
        return gamepad ? Input.readGamepadAxis(gamepad, axis) : 0;
    }

    /** Java Slick2D counterpart: Input.getAxisName(int, int). */
    public getAxisName(_controller: number, axis: number): string {
        return `Axis ${axis}`;
    }

    /** Java Slick2D counterpart: Input.isControllerLeft(int). */
    public isControllerLeft(controller: number): boolean {
        return this.controllerStateSnapshotReady ? this.isControllerControlDown(0, controller) : this.anyController(controller, Input.isGamepadLeft);
    }

    /** Java Slick2D counterpart: Input.isControllerRight(int). */
    public isControllerRight(controller: number): boolean {
        return this.controllerStateSnapshotReady ? this.isControllerControlDown(1, controller) : this.anyController(controller, Input.isGamepadRight);
    }

    /** Java Slick2D counterpart: Input.isControllerUp(int). */
    public isControllerUp(controller: number): boolean {
        return this.controllerStateSnapshotReady ? this.isControllerControlDown(2, controller) : this.anyController(controller, Input.isGamepadUp);
    }

    /** Java Slick2D counterpart: Input.isControllerDown(int). */
    public isControllerDown(controller: number): boolean {
        return this.controllerStateSnapshotReady ? this.isControllerControlDown(3, controller) : this.anyController(controller, Input.isGamepadDown);
    }

    /** Java Slick2D counterpart: Input.isControllerLeftPressed(int). */
    public isControllerLeftPressed(controller: number): boolean {
        return this.isControlPressed(0, controller);
    }

    /** Java Slick2D counterpart: Input.isControllerRightPressed(int). */
    public isControllerRightPressed(controller: number): boolean {
        return this.isControlPressed(1, controller);
    }

    /** Java Slick2D counterpart: Input.isControllerUpPressed(int). */
    public isControllerUpPressed(controller: number): boolean {
        return this.isControlPressed(2, controller);
    }

    /** Java Slick2D counterpart: Input.isControllerDownPressed(int). */
    public isControllerDownPressed(controller: number): boolean {
        return this.isControlPressed(3, controller);
    }

    /** Java Slick2D counterpart: Input.getAbsoluteMouseX(). */
    public getAbsoluteMouseX(): number {
        return this.absoluteMouseX;
    }

    /** Java Slick2D counterpart: Input.getAbsoluteMouseY(). */
    public getAbsoluteMouseY(): number {
        return this.absoluteMouseY;
    }

    /** Java Slick2D counterpart: Input.getMouseX(). */
    public getMouseX(): number {
        return this.mouseX;
    }

    /** Java Slick2D counterpart: Input.getMouseY(). */
    public getMouseY(): number {
        return this.mouseY;
    }

    /** Java Slick2D counterpart: Input.isMouseButtonDown(int). */
    public isMouseButtonDown(button: number): boolean {
        return this.downMouse.has(button);
    }

    /** Java Slick2D counterpart: Input.isMousePressed(int). */
    public isMousePressed(button: number): boolean {
        const pressed = this.pressedMouse.has(button);
        this.pressedMouse.delete(button);
        return pressed;
    }

    /** Java Slick2D counterpart: Input.consumeEvent(). */
    public consumeEvent(): void {
        if (this.dispatchingEvent) {
            this.eventConsumed = true;
        }
    }

    /** Java Slick2D counterpart: Input.considerDoubleClick(int, int, int). */
    public considerDoubleClick(button: number, x: number, y: number): void {
        this.considerDoubleClickAt(button, x, y, this.dispatchingEvent ? this.dispatchedEventTime : Input.now());
    }

    /** Java Slick2D counterpart: Input.poll(int, int). */
    public poll(_width: number, height: number): void {
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
            } else {
                this.refreshGamepads();
                this.pollControllers();
            }
        } finally {
            this.dispatchingEvent = false;
            this.eventConsumed = false;
            for (const listener of this.startedListeners) {
                listener.inputEnded();
            }
        }
    }

    /** Java Slick2D counterpart: Input.enableKeyRepeat(int, int). */
    public enableKeyRepeat(_initial: number, _interval: number): void;
    /** Java Slick2D counterpart: Input.enableKeyRepeat(). */
    public enableKeyRepeat(): void;
    public enableKeyRepeat(_initial: number = 400, _interval: number = 50): void {
        this.keyRepeat = true;
    }

    /** Java Slick2D counterpart: Input.disableKeyRepeat(). */
    public disableKeyRepeat(): void {
        this.keyRepeat = false;
    }

    /** Java Slick2D counterpart: Input.isKeyRepeatEnabled(). */
    public isKeyRepeatEnabled(): boolean {
        return this.keyRepeat;
    }

    /** Java Slick2D counterpart: Input.pause(). */
    public pause(): void {
        this.paused = true;
        this.clearAllInputState();
    }

    /** Java Slick2D counterpart: Input.resume(). */
    public resume(): void {
        this.paused = false;
    }

    private readonly handleKeyDown = (event: KeyboardEvent): void => {
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

    private readonly handleKeyUp = (event: KeyboardEvent): void => {
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

    private readonly handlePointerDown = (event: PointerEvent): void => {
        if (this.paused || !this.shouldAcceptPointerEvent(event)) {
            return;
        }
        this.preventBrowserDefault(event);
        const button = Input.mouseButtonFromEvent(event);
        this.updateMouse(event);
        this.downMouse.add(button);
        this.enqueueEvent(Input.EVENT_MOUSE_PRESSED, button, this.mouseX, this.mouseY, 0, 0, Input.eventTimestamp(event));
    };

    private readonly handlePointerUp = (event: PointerEvent): void => {
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

    private readonly handlePointerMove = (event: PointerEvent): void => {
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
        this.enqueueEvent(
            this.downMouse.size > 0 ? Input.EVENT_MOUSE_DRAGGED : Input.EVENT_MOUSE_MOVED,
            oldX,
            oldY,
            this.mouseX,
            this.mouseY,
            0,
            Input.eventTimestamp(event)
        );
    };

    private readonly handleWheel = (event: WheelEvent): void => {
        if (this.paused || !this.shouldAcceptPointerEvent(event)) {
            return;
        }
        this.preventBrowserDefault(event);
        this.enqueueEvent(Input.EVENT_MOUSE_WHEEL, Math.trunc(-event.deltaY), 0, 0, 0, 0, Input.eventTimestamp(event));
    };

    private readonly handleContextMenu = (event: Event): void => {
        if (!this.paused && this.shouldAcceptPointerEvent(event)) {
            this.preventBrowserDefault(event);
        }
    };

    private readonly handleFocusLost = (): void => {
        this.clearAllInputState();
    };

    private readonly handleVisibilityChange = (): void => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
            this.clearAllInputState();
        }
    };

    private snapshotListeners(): void {
        Input.copyArray(this.keyListeners, this.dispatchKeyListeners);
        Input.copyArray(this.mouseListeners, this.dispatchMouseListeners);
        Input.copyArray(this.controllerListeners, this.dispatchControllerListeners);
        this.lifecycleListeners.length = 0;
        this.appendUniqueLifecycleListeners(this.dispatchKeyListeners);
        this.appendUniqueLifecycleListeners(this.dispatchMouseListeners);
        this.appendUniqueLifecycleListeners(this.dispatchControllerListeners);
    }

    private appendUniqueLifecycleListeners(listeners: readonly ControlledInputReciever[]): void {
        for (const listener of listeners) {
            if (!this.lifecycleListeners.includes(listener)) {
                this.lifecycleListeners.push(listener);
            }
        }
    }

    private dispatchQueuedEvents(): void {
        const eventsToDispatch = this.eventCount;
        for (let eventIndex = 0; eventIndex < eventsToDispatch; eventIndex++) {
            const index = this.eventHead;
            const type = this.eventTypes[index]!;
            const a = this.eventA[index]!;
            const b = this.eventB[index]!;
            const c = this.eventC[index]!;
            const d = this.eventD[index]!;
            const character = this.eventCharacters[index]!;
            const timestamp = this.eventTimes[index]!;
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
                    if (
                        pressX !== undefined &&
                        pressY !== undefined &&
                        Math.abs(b - pressX) <= this.mouseClickTolerance &&
                        Math.abs(c - pressY) <= this.mouseClickTolerance
                    ) {
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

    private considerDoubleClickAt(button: number, x: number, y: number, timestamp: number): void {
        const elapsed = timestamp - this.lastClickTime;
        const withinTime = elapsed >= 0 && elapsed <= this.doubleClickDelay;
        const withinDistance = Math.abs(x - this.lastClickX) <= this.mouseClickTolerance && Math.abs(y - this.lastClickY) <= this.mouseClickTolerance;
        const doubleClick = button === this.lastClickButton && withinTime && withinDistance;
        this.dispatchMouseClicked(button, x, y, doubleClick ? 2 : 1, timestamp);
        if (doubleClick) {
            this.lastClickButton = -1;
            this.lastClickTime = Number.NEGATIVE_INFINITY;
        } else {
            this.lastClickButton = button;
            this.lastClickX = x;
            this.lastClickY = y;
            this.lastClickTime = timestamp;
        }
    }

    private dispatchKeyPressed(key: number, character: string, timestamp: number): void {
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

    private dispatchKeyReleased(key: number, character: string, timestamp: number): void {
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

    private dispatchMousePressed(button: number, x: number, y: number, timestamp: number): void {
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

    private dispatchMouseReleased(button: number, x: number, y: number, timestamp: number): void {
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

    private dispatchMouseClicked(button: number, x: number, y: number, count: number, timestamp: number): void {
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

    private dispatchMouseMoved(oldX: number, oldY: number, newX: number, newY: number, dragged: boolean, timestamp: number): void {
        this.beginEventDispatch(timestamp);
        for (const listener of this.dispatchMouseListeners) {
            if (isAccepting(listener)) {
                if (dragged) {
                    listener.mouseDragged(oldX, oldY, newX, newY);
                } else {
                    listener.mouseMoved(oldX, oldY, newX, newY);
                }
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }

    private dispatchMouseWheel(change: number, timestamp: number): void {
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

    private beginEventDispatch(timestamp: number): void {
        this.dispatchingEvent = true;
        this.eventConsumed = false;
        this.dispatchedEventTime = timestamp;
    }

    private endEventDispatch(): void {
        this.dispatchingEvent = false;
        this.eventConsumed = false;
    }

    private enqueueEvent(type: number, a: number, b: number, c: number, d: number, character: number, timestamp: number): void {
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

    private growEventQueue(): void {
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
            types[i] = this.eventTypes[source]!;
            a[i] = this.eventA[source]!;
            b[i] = this.eventB[source]!;
            c[i] = this.eventC[source]!;
            d[i] = this.eventD[source]!;
            characters[i] = this.eventCharacters[source]!;
            times[i] = this.eventTimes[source]!;
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

    private clearQueuedEvents(): void {
        this.eventHead = 0;
        this.eventCount = 0;
        this.mousePressX.clear();
        this.mousePressY.clear();
    }

    private clearPressedRecords(): void {
        this.clearKeyPressedRecord();
        this.clearMousePressedRecord();
        this.clearControlPressedRecord();
    }

    private clearAllInputState(): void {
        this.downKeys.clear();
        this.downMouse.clear();
        this.clearAllControllerState();
        this.clearPressedRecords();
        this.clearQueuedEvents();
        this.invalidateGamepads();
    }

    private clearAllControllerState(): void {
        this.controlDown.clear();
        this.controlPressed.clear();
        this.seenControllers.clear();
        this.controllerPhysicalIndices.fill(-1);
        this.controllerPhysicalIds.fill(null);
        this.controllerStateSnapshotReady = false;
    }

    private updateMouse(event: PointerEvent): void {
        const currentTarget = event.currentTarget;
        const target = typeof Element !== "undefined" && currentTarget instanceof Element ? currentTarget : this.preventDefaultElement;
        const rect = target && "getBoundingClientRect" in target ? target.getBoundingClientRect() : { left: 0, top: 0 };
        this.absoluteMouseX = Math.floor(event.clientX - rect.left);
        this.absoluteMouseY = Math.floor(event.clientY - rect.top);
        this.mouseX = Math.floor(this.absoluteMouseX * this.scaleX + this.offsetX);
        this.mouseY = Math.floor(this.absoluteMouseY * this.scaleY + this.offsetY);
    }

    private pollControllers(): void {
        const gamepads = this.getFrameGamepads();
        this.seenControllers.clear();
        for (let controller = 0; controller < gamepads.length; controller++) {
            const gamepad = gamepads[controller]!;
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
                const horizontalAxis = this.additionalControllerDirectionAxes[index]!;
                const verticalAxis = this.additionalControllerDirectionAxes[index + 1]!;
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

    private prepareLogicalControllerOwner(controller: number, gamepad: Gamepad): void {
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

    private clearControllerState(controller: number): void {
        this.deleteControllerKeys(this.controlDown, controller);
        this.deleteControllerKeys(this.controlPressed, controller);
    }

    private deleteControllerKeys(keys: Set<number>, controller: number): void {
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

    private clearDisconnectedAxisCalibration(): void {
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

    private readCalibratedControllerAxis(gamepad: Gamepad, axis: number): number {
        if (gamepad.index < 0 || gamepad.index >= Input.BROWSER_CONTROLLER_LIMIT || axis < 0 || gamepad.axes.length <= axis) {
            return 0;
        }
        const value = Input.readGamepadAxis(gamepad, axis);
        const baselineIndex = gamepad.index * Input.BROWSER_AXIS_LIMIT + axis;
        let baseline = this.additionalControllerAxisBaselines[baselineIndex]!;
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

    private prepareAdditionalControllerAxisCalibration(gamepad: Gamepad): void {
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

    private resetAdditionalControllerAxisCalibration(controller: number): void {
        if (controller < 0 || controller >= Input.BROWSER_CONTROLLER_LIMIT) {
            return;
        }
        const start = controller * Input.BROWSER_AXIS_LIMIT;
        this.additionalControllerAxisBaselines.fill(Number.NaN, start, start + Input.BROWSER_AXIS_LIMIT);
        this.additionalControllerAxisOwners[controller] = null;
    }

    private isControllerControlDown(control: number, controller: number): boolean {
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

    private updateControlState(controller: number, control: number, down: boolean): void {
        const key = Input.controlKey(controller, control);
        const wasDown = this.controlDown.has(key);
        if (down === wasDown) {
            return;
        }
        if (down) {
            this.controlDown.add(key);
            this.controlPressed.add(key);
        } else {
            this.controlDown.delete(key);
        }

        this.beginEventDispatch(Input.now());
        for (const listener of this.dispatchControllerListeners) {
            if (isAccepting(listener)) {
                if (down) {
                    Input.dispatchControllerPressed(listener, controller, control);
                } else {
                    Input.dispatchControllerReleased(listener, controller, control);
                }
                if (this.eventConsumed) {
                    break;
                }
            }
        }
        this.endEventDispatch();
    }

    private anyController(controller: number, predicate: (gamepad: Gamepad) => boolean): boolean {
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

    private refreshGamepads(): GamepadSnapshot {
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

    private getFrameGamepads(): GamepadSnapshot {
        if (!this.gamepadsCached || this.gamepadCacheGeneration !== Input.gamepadCacheGeneration) {
            return this.refreshGamepads();
        }
        return this.cachedGamepads;
    }

    private invalidateGamepads(): void {
        this.cachedGamepads.length = 0;
        this.gamepadsCached = false;
        this.gamepadCacheGeneration = Input.gamepadCacheGeneration;
        this.controllerStateSnapshotReady = false;
    }

    private removeFrom<T>(array: T[], item: T): void {
        const index = array.indexOf(item);
        if (index >= 0) {
            array.splice(index, 1);
        }
    }

    private static copyArray<T>(source: readonly T[], target: T[]): void {
        target.length = source.length;
        for (let i = 0; i < source.length; i++) {
            target[i] = source[i]!;
        }
    }

    private static keyCodeFromEvent(event: KeyboardEvent): number {
        return Input.eventCodeToKey.get(event.code) ?? 0;
    }

    private static mouseButtonFromEvent(event: PointerEvent): number {
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

    private static isUsableGamepad(gamepad: Gamepad | null | undefined): gamepad is Gamepad {
        return gamepad !== null && gamepad !== undefined && gamepad.connected !== false;
    }

    private static readGamepadAxis(gamepad: Gamepad, axis: number): number {
        const value = gamepad.axes[axis];
        return typeof value === "number" && Number.isFinite(value) ? value : 0;
    }

    private static isGamepadLeft(gamepad: Gamepad): boolean {
        return Input.readGamepadAxis(gamepad, 0) < -0.5 || gamepad.buttons[14]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_LEFT);
    }

    private static isGamepadRight(gamepad: Gamepad): boolean {
        return Input.readGamepadAxis(gamepad, 0) > 0.5 || gamepad.buttons[15]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_RIGHT);
    }

    private static isGamepadUp(gamepad: Gamepad): boolean {
        return Input.readGamepadAxis(gamepad, 1) < -0.5 || gamepad.buttons[12]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_UP);
    }

    private static isGamepadDown(gamepad: Gamepad): boolean {
        return Input.readGamepadAxis(gamepad, 1) > 0.5 || gamepad.buttons[13]?.pressed === true || Input.isGamepadPovHat(gamepad, Input.POV_HAT_DOWN);
    }

    private static isGamepadPovHat(gamepad: Gamepad, values: readonly number[]): boolean {
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

    private static dispatchControllerPressed(listener: ControllerListener, controller: number, control: number): void {
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

    private static dispatchControllerReleased(listener: ControllerListener, controller: number, control: number): void {
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

    private static isStandardDpadButton(index: number): boolean {
        return index >= 12 && index <= 15;
    }

    private static controlKey(controller: number, control: number): number {
        return controller * 1024 + control;
    }

    private static controllerFromControlKey(key: number): number {
        return Math.trunc(key / 1024);
    }

    private static browserHasInputFocus(): boolean {
        if (typeof document === "undefined") {
            return true;
        }
        return document.visibilityState !== "hidden" && document.hasFocus();
    }

    private static eventTimestamp(event: Event): number {
        return Number.isFinite(event.timeStamp) ? event.timeStamp : Input.now();
    }

    private static now(): number {
        return typeof performance !== "undefined" ? performance.now() : Date.now();
    }

    private shouldPreventDefault(event: KeyboardEvent, key: number): boolean {
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
        return (
            active === this.preventDefaultElement ||
            active === document.body ||
            active === document.documentElement ||
            event.target === this.preventDefaultElement
        );
    }

    private shouldAcceptGameKey(event: KeyboardEvent): boolean {
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

    private shouldAcceptPointerEvent(event: Event): boolean {
        if (!this.preventDefaultElement) {
            return true;
        }
        const target = event.target;
        if (typeof Element !== "undefined" && target instanceof Element && Input.isInteractiveElement(target)) {
            return false;
        }
        return typeof Node !== "undefined" && target instanceof Node && (target === this.preventDefaultElement || this.preventDefaultElement.contains(target));
    }

    private preventBrowserDefault(event: Event): void {
        if (this.browserInputCapture && !event.defaultPrevented) {
            event.preventDefault();
        }
    }

    private applyPreventDefaultElementStyle(): void {
        if (!this.preventDefaultElement || !this.browserInputCapture) {
            return;
        }
        this.preventDefaultTouchAction = this.preventDefaultElement.style.touchAction;
        this.preventDefaultElement.style.touchAction = "none";
    }

    private restorePreventDefaultElementStyle(): void {
        if (this.preventDefaultElement && this.preventDefaultTouchAction !== null) {
            this.preventDefaultElement.style.touchAction = this.preventDefaultTouchAction;
        }
        this.preventDefaultTouchAction = null;
    }

    private static isInteractiveElement(element: Element): boolean {
        const tag = element.tagName.toUpperCase();
        return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || (element as HTMLElement).isContentEditable;
    }

    private static readonly eventCodeToKey = new Map<string, number>([
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

    private static readonly keyNames = new Map<number, string>([
        [Input.KEY_CIRCUMFLEX, "KEY_CIRCUMFLEX"],
        [Input.KEY_AT, "KEY_AT"],
        [Input.KEY_COLON, "KEY_COLON"],
        [Input.KEY_UNDERLINE, "KEY_UNDERLINE"],
        [Input.KEY_KANJI, "KEY_KANJI"],
        [Input.KEY_STOP, "KEY_STOP"],
        [Input.KEY_AX, "KEY_AX"],
        [Input.KEY_UNLABELED, "KEY_UNLABELED"],
        ...Array.from(Input.eventCodeToKey.entries()).map(([name, code]) => [code, name] as [number, string])
    ]);

    private static readonly defaultPreventedKeys = new Set<number>([
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
