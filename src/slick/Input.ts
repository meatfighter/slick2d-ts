import type { ControllerListener } from "./ControllerListener.js";
import type { InputListener } from "./InputListener.js";
import type { KeyListener } from "./KeyListener.js";
import type { MouseListener } from "./MouseListener.js";

type TargetElement = HTMLElement | Window | Document;

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
    public static readonly KEY_9 = 0x0A;
    public static readonly KEY_0 = 0x0B;
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
    public static readonly KEY_RETURN = 0x1C;
    public static readonly KEY_ENTER = 0x1C;
    public static readonly KEY_A = 0x1E;
    public static readonly KEY_S = 0x1F;
    public static readonly KEY_D = 0x20;
    public static readonly KEY_F = 0x21;
    public static readonly KEY_G = 0x22;
    public static readonly KEY_H = 0x23;
    public static readonly KEY_J = 0x24;
    public static readonly KEY_K = 0x25;
    public static readonly KEY_L = 0x26;
    public static readonly KEY_Z = 0x2C;
    public static readonly KEY_X = 0x2D;
    public static readonly KEY_C = 0x2E;
    public static readonly KEY_V = 0x2F;
    public static readonly KEY_B = 0x30;
    public static readonly KEY_N = 0x31;
    public static readonly KEY_M = 0x32;
    public static readonly KEY_SPACE = 0x39;
    public static readonly KEY_F1 = 0x3B;
    public static readonly KEY_F2 = 0x3C;
    public static readonly KEY_F3 = 0x3D;
    public static readonly KEY_F4 = 0x3E;
    public static readonly KEY_F5 = 0x3F;
    public static readonly KEY_F6 = 0x40;
    public static readonly KEY_F7 = 0x41;
    public static readonly KEY_F8 = 0x42;
    public static readonly KEY_F9 = 0x43;
    public static readonly KEY_F10 = 0x44;
    public static readonly KEY_F11 = 0x57;
    public static readonly KEY_F12 = 0x58;
    public static readonly KEY_UP = 0xC8;
    public static readonly KEY_LEFT = 0xCB;
    public static readonly KEY_RIGHT = 0xCD;
    public static readonly KEY_DOWN = 0xD0;

    private static controllersDisabled = false;
    private readonly downKeys = new Set<number>();
    private readonly pressedKeys = new Set<number>();
    private readonly downMouse = new Set<number>();
    private readonly pressedMouse = new Set<number>();
    private readonly controlPressed = new Map<string, boolean>();
    private readonly keyListeners: KeyListener[] = [];
    private readonly mouseListeners: MouseListener[] = [];
    private readonly controllerListeners: ControllerListener[] = [];
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
    private keyRepeatInitial = 400;
    private keyRepeatInterval = 50;
    private doubleClickDelay = 250;
    private mouseClickTolerance = 5;

    /**
     * Java Slick2D counterpart: Input.disableControllers().
     *
     * Disables controller polling for this page session.
     */
    public static disableControllers(): void {
        Input.controllersDisabled = true;
    }

    /**
     * Java Slick2D counterpart: Input.getKeyName(int).
     *
     * Returns a stable diagnostic key name for LWJGL key codes.
     */
    public static getKeyName(code: number): string {
        return Input.keyNames.get(code) ?? `KEY_${code}`;
    }

    /**
     * Java Slick2D counterpart: Input(int height).
     *
     * Creates an input adapter for a container of the supplied height.
     */
    public constructor(private height: number) {
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
        target.addEventListener("wheel", this.handleWheel as EventListener);
    }

    /** Browser parity helper: removes attached DOM listeners. */
    public unbind(): void {
        if (!this.target) {
            return;
        }
        this.target.removeEventListener("keydown", this.handleKeyDown as EventListener);
        this.target.removeEventListener("keyup", this.handleKeyUp as EventListener);
        this.target.removeEventListener("pointerdown", this.handlePointerDown as EventListener);
        this.target.removeEventListener("pointerup", this.handlePointerUp as EventListener);
        this.target.removeEventListener("pointermove", this.handlePointerMove as EventListener);
        this.target.removeEventListener("wheel", this.handleWheel as EventListener);
        this.target = null;
    }

    /** Java Slick2D counterpart: Input.setDoubleClickInterval(int). */
    public setDoubleClickInterval(delay: number): void {
        this.doubleClickDelay = delay;
    }

    /** Java Slick2D counterpart: Input.setMouseClickTolerance(int). */
    public setMouseClickTolerance(mouseClickTolerance: number): void {
        this.mouseClickTolerance = mouseClickTolerance;
    }

    /** Java Slick2D counterpart: Input.initControllers(). */
    public initControllers(): void {
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
        const key = `${controller}:${button}`;
        const pressed = this.controlPressed.get(key) === true;
        this.controlPressed.delete(key);
        return pressed;
    }

    /** Java Slick2D counterpart: Input.isButtonPressed(int, int). */
    public isButtonPressed(index: number, controller: number): boolean {
        if (controller === Input.ANY_CONTROLLER) {
            return this.getGamepads().some((gamepad) => gamepad?.buttons[index]?.pressed === true);
        }
        return this.getGamepads()[controller]?.buttons[index]?.pressed === true;
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
        return Input.controllersDisabled ? 0 : this.getGamepads().filter(Boolean).length;
    }

    /** Java Slick2D counterpart: Input.getAxisCount(int). */
    public getAxisCount(controller: number): number {
        return this.getGamepads()[controller]?.axes.length ?? 0;
    }

    /** Java Slick2D counterpart: Input.getAxisValue(int, int). */
    public getAxisValue(controller: number, axis: number): number {
        return this.getGamepads()[controller]?.axes[axis] ?? 0;
    }

    /** Java Slick2D counterpart: Input.getAxisName(int, int). */
    public getAxisName(_controller: number, axis: number): string {
        return `Axis ${axis}`;
    }

    /** Java Slick2D counterpart: Input.isControllerLeft(int). */
    public isControllerLeft(controller: number): boolean {
        return this.anyController(controller, (gamepad) => (gamepad.axes[0] ?? 0) < -0.5);
    }

    /** Java Slick2D counterpart: Input.isControllerRight(int). */
    public isControllerRight(controller: number): boolean {
        return this.anyController(controller, (gamepad) => (gamepad.axes[0] ?? 0) > 0.5);
    }

    /** Java Slick2D counterpart: Input.isControllerUp(int). */
    public isControllerUp(controller: number): boolean {
        return this.anyController(controller, (gamepad) => (gamepad.axes[1] ?? 0) < -0.5);
    }

    /** Java Slick2D counterpart: Input.isControllerDown(int). */
    public isControllerDown(controller: number): boolean {
        return this.anyController(controller, (gamepad) => (gamepad.axes[1] ?? 0) > 0.5);
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
    }

    /** Java Slick2D counterpart: Input.considerDoubleClick(int, int, int). */
    public considerDoubleClick(_button: number, _x: number, _y: number): void {
    }

    /** Java Slick2D counterpart: Input.poll(int, int). */
    public poll(_width: number, height: number): void {
        this.height = height;
        this.pollControllers();
    }

    /** Java Slick2D counterpart: Input.enableKeyRepeat(int, int). */
    public enableKeyRepeat(initial: number, interval: number): void;
    /** Java Slick2D counterpart: Input.enableKeyRepeat(). */
    public enableKeyRepeat(): void;
    public enableKeyRepeat(initial: number = 400, interval: number = 50): void {
        this.keyRepeat = true;
        this.keyRepeatInitial = initial;
        this.keyRepeatInterval = interval;
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
        this.downKeys.clear();
        this.downMouse.clear();
    }

    /** Java Slick2D counterpart: Input.resume(). */
    public resume(): void {
        this.paused = false;
    }

    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        if (this.paused) {
            return;
        }
        const key = Input.keyCodeFromEvent(event);
        if (key === 0) {
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

    private readonly handleKeyUp = (event: KeyboardEvent): void => {
        const key = Input.keyCodeFromEvent(event);
        this.downKeys.delete(key);
        for (const listener of this.keyListeners) {
            if (isAccepting(listener)) {
                listener.keyReleased(key, event.key?.length === 1 ? event.key : "\0");
            }
        }
    };

    private readonly handlePointerDown = (event: PointerEvent): void => {
        this.updateMouse(event);
        this.downMouse.add(event.button);
        this.pressedMouse.add(event.button);
        for (const listener of this.mouseListeners) {
            if (isAccepting(listener)) {
                listener.mousePressed(event.button, this.mouseX, this.mouseY);
            }
        }
    };

    private readonly handlePointerUp = (event: PointerEvent): void => {
        this.updateMouse(event);
        this.downMouse.delete(event.button);
        for (const listener of this.mouseListeners) {
            if (isAccepting(listener)) {
                listener.mouseReleased(event.button, this.mouseX, this.mouseY);
                listener.mouseClicked(event.button, this.mouseX, this.mouseY, 1);
            }
        }
    };

    private readonly handlePointerMove = (event: PointerEvent): void => {
        const oldX = this.mouseX;
        const oldY = this.mouseY;
        this.updateMouse(event);
        for (const listener of this.mouseListeners) {
            if (isAccepting(listener)) {
                if (this.downMouse.size > 0) {
                    listener.mouseDragged(oldX, oldY, this.mouseX, this.mouseY);
                } else {
                    listener.mouseMoved(oldX, oldY, this.mouseX, this.mouseY);
                }
            }
        }
    };

    private readonly handleWheel = (event: WheelEvent): void => {
        for (const listener of this.mouseListeners) {
            if (isAccepting(listener)) {
                listener.mouseWheelMoved(Math.trunc(-event.deltaY));
            }
        }
    };

    private updateMouse(event: PointerEvent): void {
        const target = event.currentTarget as Element | null;
        const rect = target && "getBoundingClientRect" in target
            ? target.getBoundingClientRect()
            : { left: 0, top: 0 };
        this.absoluteMouseX = Math.floor(event.clientX - rect.left);
        this.absoluteMouseY = Math.floor(event.clientY - rect.top);
        this.mouseX = Math.floor(this.absoluteMouseX * this.scaleX + this.offsetX);
        this.mouseY = Math.floor(this.absoluteMouseY * this.scaleY + this.offsetY);
    }

    private pollControllers(): void {
        if (Input.controllersDisabled) {
            return;
        }
        for (const gamepad of this.getGamepads()) {
            if (!gamepad) {
                continue;
            }
            const controller = gamepad.index;
            gamepad.buttons.forEach((button, index) => {
                if (button.pressed) {
                    const control = 4 + index;
                    const key = `${controller}:${control}`;
                    if (this.controlPressed.get(key) !== true) {
                        this.controlPressed.set(key, true);
                        for (const listener of this.controllerListeners) {
                            if (isAccepting(listener)) {
                                listener.controllerButtonPressed(controller, index + 1);
                            }
                        }
                    }
                }
            });
        }
    }

    private anyController(controller: number, predicate: (gamepad: Gamepad) => boolean): boolean {
        if (Input.controllersDisabled) {
            return false;
        }
        if (controller === Input.ANY_CONTROLLER) {
            return this.getGamepads().some((gamepad) => !!gamepad && predicate(gamepad));
        }
        const gamepad = this.getGamepads()[controller];
        return !!gamepad && predicate(gamepad);
    }

    private getGamepads(): Array<Gamepad | null> {
        if (typeof navigator === "undefined" || !navigator.getGamepads) {
            return [];
        }
        return Array.from(navigator.getGamepads());
    }

    private removeFrom<T>(array: T[], item: T): void {
        const index = array.indexOf(item);
        if (index >= 0) {
            array.splice(index, 1);
        }
    }

    private static keyCodeFromEvent(event: KeyboardEvent): number {
        return Input.eventCodeToKey.get(event.code) ?? 0;
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
        ["Enter", Input.KEY_ENTER],
        ["KeyA", Input.KEY_A],
        ["KeyS", Input.KEY_S],
        ["KeyD", Input.KEY_D],
        ["KeyF", Input.KEY_F],
        ["KeyG", Input.KEY_G],
        ["KeyH", Input.KEY_H],
        ["KeyJ", Input.KEY_J],
        ["KeyK", Input.KEY_K],
        ["KeyL", Input.KEY_L],
        ["KeyZ", Input.KEY_Z],
        ["KeyX", Input.KEY_X],
        ["KeyC", Input.KEY_C],
        ["KeyV", Input.KEY_V],
        ["KeyB", Input.KEY_B],
        ["KeyN", Input.KEY_N],
        ["KeyM", Input.KEY_M],
        ["Space", Input.KEY_SPACE],
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
        ["F11", Input.KEY_F11],
        ["F12", Input.KEY_F12],
        ["ArrowUp", Input.KEY_UP],
        ["ArrowLeft", Input.KEY_LEFT],
        ["ArrowRight", Input.KEY_RIGHT],
        ["ArrowDown", Input.KEY_DOWN]
    ]);

    private static readonly keyNames = new Map<number, string>(
        Array.from(Input.eventCodeToKey.entries()).map(([name, code]) => [code, name])
    );
}
