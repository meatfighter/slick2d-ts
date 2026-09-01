import type { ControllerListener } from "./ControllerListener.js";
import type { InputListener } from "./InputListener.js";
import type { KeyListener } from "./KeyListener.js";
import type { MouseListener } from "./MouseListener.js";
type TargetElement = HTMLElement | Window | Document;
export interface ControllerDirectionAxisPair {
    readonly horizontalAxis: number;
    readonly verticalAxis: number;
}
/**
 * Java Slick2D counterpart: org.newdawn.slick.Input.
 *
 * Browser keyboard, mouse, and Gamepad API adapter using Slick/LWJGL constants.
 */
export declare class Input {
    private height;
    static readonly ANY_CONTROLLER = -1;
    static readonly MOUSE_LEFT_BUTTON = 0;
    static readonly MOUSE_RIGHT_BUTTON = 1;
    static readonly MOUSE_MIDDLE_BUTTON = 2;
    static readonly KEY_ESCAPE = 1;
    static readonly KEY_1 = 2;
    static readonly KEY_2 = 3;
    static readonly KEY_3 = 4;
    static readonly KEY_4 = 5;
    static readonly KEY_5 = 6;
    static readonly KEY_6 = 7;
    static readonly KEY_7 = 8;
    static readonly KEY_8 = 9;
    static readonly KEY_9 = 10;
    static readonly KEY_0 = 11;
    static readonly KEY_MINUS = 12;
    static readonly KEY_EQUALS = 13;
    static readonly KEY_BACK = 14;
    static readonly KEY_TAB = 15;
    static readonly KEY_Q = 16;
    static readonly KEY_W = 17;
    static readonly KEY_E = 18;
    static readonly KEY_R = 19;
    static readonly KEY_T = 20;
    static readonly KEY_Y = 21;
    static readonly KEY_U = 22;
    static readonly KEY_I = 23;
    static readonly KEY_O = 24;
    static readonly KEY_P = 25;
    static readonly KEY_LBRACKET = 26;
    static readonly KEY_RBRACKET = 27;
    static readonly KEY_RETURN = 28;
    static readonly KEY_ENTER = 28;
    static readonly KEY_LCONTROL = 29;
    static readonly KEY_A = 30;
    static readonly KEY_S = 31;
    static readonly KEY_D = 32;
    static readonly KEY_F = 33;
    static readonly KEY_G = 34;
    static readonly KEY_H = 35;
    static readonly KEY_J = 36;
    static readonly KEY_K = 37;
    static readonly KEY_L = 38;
    static readonly KEY_SEMICOLON = 39;
    static readonly KEY_APOSTROPHE = 40;
    static readonly KEY_GRAVE = 41;
    static readonly KEY_LSHIFT = 42;
    static readonly KEY_BACKSLASH = 43;
    static readonly KEY_Z = 44;
    static readonly KEY_X = 45;
    static readonly KEY_C = 46;
    static readonly KEY_V = 47;
    static readonly KEY_B = 48;
    static readonly KEY_N = 49;
    static readonly KEY_M = 50;
    static readonly KEY_COMMA = 51;
    static readonly KEY_PERIOD = 52;
    static readonly KEY_SLASH = 53;
    static readonly KEY_RSHIFT = 54;
    static readonly KEY_MULTIPLY = 55;
    static readonly KEY_LMENU = 56;
    static readonly KEY_SPACE = 57;
    static readonly KEY_CAPITAL = 58;
    static readonly KEY_F1 = 59;
    static readonly KEY_F2 = 60;
    static readonly KEY_F3 = 61;
    static readonly KEY_F4 = 62;
    static readonly KEY_F5 = 63;
    static readonly KEY_F6 = 64;
    static readonly KEY_F7 = 65;
    static readonly KEY_F8 = 66;
    static readonly KEY_F9 = 67;
    static readonly KEY_F10 = 68;
    static readonly KEY_NUMLOCK = 69;
    static readonly KEY_SCROLL = 70;
    static readonly KEY_NUMPAD7 = 71;
    static readonly KEY_NUMPAD8 = 72;
    static readonly KEY_NUMPAD9 = 73;
    static readonly KEY_SUBTRACT = 74;
    static readonly KEY_NUMPAD4 = 75;
    static readonly KEY_NUMPAD5 = 76;
    static readonly KEY_NUMPAD6 = 77;
    static readonly KEY_ADD = 78;
    static readonly KEY_NUMPAD1 = 79;
    static readonly KEY_NUMPAD2 = 80;
    static readonly KEY_NUMPAD3 = 81;
    static readonly KEY_NUMPAD0 = 82;
    static readonly KEY_DECIMAL = 83;
    static readonly KEY_F11 = 87;
    static readonly KEY_F12 = 88;
    static readonly KEY_F13 = 100;
    static readonly KEY_F14 = 101;
    static readonly KEY_F15 = 102;
    static readonly KEY_KANA = 112;
    static readonly KEY_CONVERT = 121;
    static readonly KEY_NOCONVERT = 123;
    static readonly KEY_YEN = 125;
    static readonly KEY_NUMPADEQUALS = 141;
    static readonly KEY_CIRCUMFLEX = 144;
    static readonly KEY_AT = 145;
    static readonly KEY_COLON = 146;
    static readonly KEY_UNDERLINE = 147;
    static readonly KEY_KANJI = 148;
    static readonly KEY_STOP = 149;
    static readonly KEY_AX = 150;
    static readonly KEY_UNLABELED = 151;
    static readonly KEY_NUMPADENTER = 156;
    static readonly KEY_RCONTROL = 157;
    static readonly KEY_NUMPADCOMMA = 179;
    static readonly KEY_DIVIDE = 181;
    static readonly KEY_SYSRQ = 183;
    static readonly KEY_RMENU = 184;
    static readonly KEY_PAUSE = 197;
    static readonly KEY_HOME = 199;
    static readonly KEY_UP = 200;
    static readonly KEY_PRIOR = 201;
    static readonly KEY_LEFT = 203;
    static readonly KEY_RIGHT = 205;
    static readonly KEY_END = 207;
    static readonly KEY_DOWN = 208;
    static readonly KEY_NEXT = 209;
    static readonly KEY_INSERT = 210;
    static readonly KEY_DELETE = 211;
    static readonly KEY_LWIN = 219;
    static readonly KEY_RWIN = 220;
    static readonly KEY_APPS = 221;
    static readonly KEY_POWER = 222;
    static readonly KEY_SLEEP = 223;
    static readonly KEY_LALT = 56;
    static readonly KEY_RALT = 184;
    private static readonly POV_HAT_AXIS;
    private static readonly POV_HAT_TOLERANCE;
    private static readonly POV_HAT_UP;
    private static readonly POV_HAT_RIGHT;
    private static readonly POV_HAT_DOWN;
    private static readonly POV_HAT_LEFT;
    private static readonly BROWSER_CONTROLLER_LIMIT;
    private static readonly BROWSER_AXIS_LIMIT;
    private static controllersDisabled;
    private static gamepadCacheGeneration;
    private readonly downKeys;
    private readonly pressedKeys;
    private readonly downMouse;
    private readonly pressedMouse;
    private readonly controlPressed;
    private readonly controlDown;
    private readonly seenControllers;
    private readonly staleControlKeys;
    private readonly keyListeners;
    private readonly mouseListeners;
    private readonly controllerListeners;
    private target;
    private paused;
    private scaleX;
    private scaleY;
    private offsetX;
    private offsetY;
    private mouseX;
    private mouseY;
    private absoluteMouseX;
    private absoluteMouseY;
    private keyRepeat;
    private keyRepeatInitial;
    private keyRepeatInterval;
    private doubleClickDelay;
    private mouseClickTolerance;
    private preventDefaultElement;
    private preventDefaultTouchAction;
    private browserInputCapture;
    private browserInputCaptureConfigured;
    private cachedGamepads;
    private gamepadsCached;
    private gamepadCacheGeneration;
    private controllerStateSnapshotReady;
    private additionalControllerDirectionAxes;
    private readonly additionalControllerAxisBaselines;
    private readonly additionalControllerAxisOwners;
    private additionalControllerAxisThreshold;
    private additionalControllerAxisRecenterThreshold;
    /**
     * Java Slick2D counterpart: Input.disableControllers().
     *
     * Disables controller polling for this page session.
     */
    static disableControllers(): void;
    /**
     * Java Slick2D counterpart: Input.getKeyName(int).
     *
     * Returns a stable diagnostic key name for LWJGL key codes.
     */
    static getKeyName(code: number): string;
    /**
     * Java Slick2D counterpart: Input(int height).
     *
     * Creates an input adapter for a container of the supplied height.
     */
    constructor(height: number);
    /**
     * Browser controller helper: adds calibrated axis pairs that contribute to
     * the four Slick directional controls during the normal input poll.
     */
    setAdditionalControllerDirectionAxes(axes: readonly ControllerDirectionAxisPair[], threshold?: number, recenterThreshold?: number): void;
    /** Browser controller helper: clears learned neutral positions for configured additional axes. */
    resetAdditionalControllerDirectionAxisCalibration(): void;
    /** Browser parity helper: attaches DOM listeners to an element/window. */
    bindToElement(target: TargetElement): void;
    /** Browser parity helper: element whose focused game keys should suppress browser defaults. */
    setPreventDefaultElement(element: HTMLElement | null): void;
    /** Browser parity helper: controls whether accepted canvas input suppresses browser gestures. */
    setBrowserInputCaptureEnabled(enabled: boolean): void;
    /** Browser parity helper: applies a container default unless the caller chose explicitly. */
    setBrowserInputCaptureDefault(enabled: boolean): void;
    private setBrowserInputCapture;
    /** Browser parity helper: removes attached DOM listeners. */
    unbind(): void;
    /** Java Slick2D counterpart: Input.setDoubleClickInterval(int). */
    setDoubleClickInterval(delay: number): void;
    /** Java Slick2D counterpart: Input.setMouseClickTolerance(int). */
    setMouseClickTolerance(mouseClickTolerance: number): void;
    /** Java Slick2D counterpart: Input.initControllers(). */
    initControllers(): void;
    /** Java Slick2D counterpart: Input.addListener(InputListener). */
    addListener(listener: InputListener): void;
    /** Java Slick2D counterpart: Input.removeListener(InputListener). */
    removeListener(listener: InputListener): void;
    /** Java Slick2D counterpart: Input.removeAllListeners(). */
    removeAllListeners(): void;
    /** Java Slick2D counterpart: Input.removeAllKeyListeners(). */
    removeAllKeyListeners(): void;
    /** Java Slick2D counterpart: Input.removeAllMouseListeners(). */
    removeAllMouseListeners(): void;
    /** Java Slick2D counterpart: Input.removeAllControllerListeners(). */
    removeAllControllerListeners(): void;
    /** Java Slick2D counterpart: Input.addPrimaryListener(InputListener). */
    addPrimaryListener(listener: InputListener): void;
    /** Java Slick2D counterpart: Input.addKeyListener(KeyListener). */
    addKeyListener(listener: KeyListener): void;
    /** Java Slick2D counterpart: Input.removeKeyListener(KeyListener). */
    removeKeyListener(listener: KeyListener): void;
    /** Java Slick2D counterpart: Input.addMouseListener(MouseListener). */
    addMouseListener(listener: MouseListener): void;
    /** Java Slick2D counterpart: Input.removeMouseListener(MouseListener). */
    removeMouseListener(listener: MouseListener): void;
    /** Java Slick2D counterpart: Input.addControllerListener(ControllerListener). */
    addControllerListener(listener: ControllerListener): void;
    /** Java Slick2D counterpart: Input.removeControllerListener(ControllerListener). */
    removeControllerListener(listener: ControllerListener): void;
    /** Java Slick2D counterpart: Input.setScale(float, float). */
    setScale(xscale: number, yscale: number): void;
    /** Java Slick2D counterpart: Input.setOffset(float, float). */
    setOffset(xoffset: number, yoffset: number): void;
    /** Java Slick2D counterpart: Input.resetInputTransform(). */
    resetInputTransform(): void;
    /** Java Slick2D counterpart: Input.isKeyPressed(int). */
    isKeyPressed(key: number): boolean;
    /** Java Slick2D counterpart: Input.isKeyDown(int). */
    isKeyDown(key: number): boolean;
    /** Java Slick2D counterpart: Input.clearKeyPressedRecord(). */
    clearKeyPressedRecord(): void;
    /** Java Slick2D counterpart: Input.clearControlPressedRecord(). */
    clearControlPressedRecord(): void;
    /** Java Slick2D counterpart: Input.clearMousePressedRecord(). */
    clearMousePressedRecord(): void;
    /** Java Slick2D counterpart: Input.isControlPressed(int). */
    isControlPressed(button: number): boolean;
    /** Java Slick2D counterpart: Input.isControlPressed(int, int). */
    isControlPressed(button: number, controller: number): boolean;
    /** Java Slick2D counterpart: Input.isButtonPressed(int, int). */
    isButtonPressed(index: number, controller: number): boolean;
    /** Java Slick2D counterpart: Input.isButton1Pressed(int). */
    isButton1Pressed(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isButton2Pressed(int). */
    isButton2Pressed(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isButton3Pressed(int). */
    isButton3Pressed(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isButtonDown(int, int). */
    isButtonDown(index: number, controller: number): boolean;
    /** Java Slick2D counterpart: Input.getControllerCount(). */
    getControllerCount(): number;
    /** Java Slick2D counterpart: Input.getAxisCount(int). */
    getAxisCount(controller: number): number;
    /** Java Slick2D counterpart: Input.getAxisValue(int, int). */
    getAxisValue(controller: number, axis: number): number;
    /** Java Slick2D counterpart: Input.getAxisName(int, int). */
    getAxisName(_controller: number, axis: number): string;
    /** Java Slick2D counterpart: Input.isControllerLeft(int). */
    isControllerLeft(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isControllerRight(int). */
    isControllerRight(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isControllerUp(int). */
    isControllerUp(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isControllerDown(int). */
    isControllerDown(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isControllerLeftPressed(int). */
    isControllerLeftPressed(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isControllerRightPressed(int). */
    isControllerRightPressed(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isControllerUpPressed(int). */
    isControllerUpPressed(controller: number): boolean;
    /** Java Slick2D counterpart: Input.isControllerDownPressed(int). */
    isControllerDownPressed(controller: number): boolean;
    /** Java Slick2D counterpart: Input.getAbsoluteMouseX(). */
    getAbsoluteMouseX(): number;
    /** Java Slick2D counterpart: Input.getAbsoluteMouseY(). */
    getAbsoluteMouseY(): number;
    /** Java Slick2D counterpart: Input.getMouseX(). */
    getMouseX(): number;
    /** Java Slick2D counterpart: Input.getMouseY(). */
    getMouseY(): number;
    /** Java Slick2D counterpart: Input.isMouseButtonDown(int). */
    isMouseButtonDown(button: number): boolean;
    /** Java Slick2D counterpart: Input.isMousePressed(int). */
    isMousePressed(button: number): boolean;
    /** Java Slick2D counterpart: Input.consumeEvent(). */
    consumeEvent(): void;
    /** Java Slick2D counterpart: Input.considerDoubleClick(int, int, int). */
    considerDoubleClick(_button: number, _x: number, _y: number): void;
    /** Java Slick2D counterpart: Input.poll(int, int). */
    poll(_width: number, height: number): void;
    /** Java Slick2D counterpart: Input.enableKeyRepeat(int, int). */
    enableKeyRepeat(initial: number, interval: number): void;
    /** Java Slick2D counterpart: Input.enableKeyRepeat(). */
    enableKeyRepeat(): void;
    /** Java Slick2D counterpart: Input.disableKeyRepeat(). */
    disableKeyRepeat(): void;
    /** Java Slick2D counterpart: Input.isKeyRepeatEnabled(). */
    isKeyRepeatEnabled(): boolean;
    /** Java Slick2D counterpart: Input.pause(). */
    pause(): void;
    /** Java Slick2D counterpart: Input.resume(). */
    resume(): void;
    private readonly handleKeyDown;
    private readonly handleKeyUp;
    private readonly handlePointerDown;
    private readonly handlePointerUp;
    private readonly handlePointerMove;
    private readonly handleWheel;
    private readonly handleContextMenu;
    private readonly handleFocusLost;
    private readonly handleVisibilityChange;
    private clearPressedRecords;
    private clearAllInputState;
    private updateMouse;
    private pollControllers;
    private readCalibratedControllerAxis;
    private prepareAdditionalControllerAxisCalibration;
    private resetAdditionalControllerAxisCalibration;
    private isControllerControlDown;
    private updateControlState;
    private anyController;
    private refreshGamepads;
    private getFrameGamepads;
    private invalidateGamepads;
    private removeFrom;
    private static keyCodeFromEvent;
    private static mouseButtonFromEvent;
    private static isUsableGamepad;
    private static readGamepadAxis;
    private static isGamepadLeft;
    private static isGamepadRight;
    private static isGamepadUp;
    private static isGamepadDown;
    private static isGamepadPovHat;
    private static dispatchControllerPressed;
    private static dispatchControllerReleased;
    private static isStandardDpadButton;
    private static controlKey;
    private static controllerFromControlKey;
    private static browserHasInputFocus;
    private shouldPreventDefault;
    private shouldAcceptGameKey;
    private shouldAcceptPointerEvent;
    private preventBrowserDefault;
    private applyPreventDefaultElementStyle;
    private restorePreventDefaultElementStyle;
    private static isInteractiveElement;
    private static readonly eventCodeToKey;
    private static readonly keyNames;
    private static readonly defaultPreventedKeys;
}
export {};
//# sourceMappingURL=Input.d.ts.map