import type { GameContainer } from "../GameContainer.js";
import { Input } from "../Input.js";
import { ButtonMapping } from "./ButtonMapping.js";
import type { IInput } from "./IInput.js";

/**
 * Java counterpart: project HumanInput helper bindings.
 *
 * Allows neutral keyboard/controller configuration for future game ports.
 */
export interface HumanInputBindings {
    upKeys?: number[];
    downKeys?: number[];
    leftKeys?: number[];
    rightKeys?: number[];
    fireKeys?: number[];
    shootKeys?: number[];
    spaceKeys?: number[];
    enterKeys?: number[];
    f12Keys?: number[];
    escapeKeys?: number[];
    pauseKeys?: number[];
    controllerIndex?: number;
    controllerFireButtons?: number[];
    controllerShootButtons?: number[];
}

type Snapshot = {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    fire: boolean;
    shoot: boolean;
};

function defaults(): Required<HumanInputBindings> {
    return {
        upKeys: [Input.KEY_UP, Input.KEY_W, Input.KEY_I, Input.KEY_8],
        downKeys: [Input.KEY_DOWN, Input.KEY_S, Input.KEY_K, Input.KEY_2],
        leftKeys: [Input.KEY_LEFT, Input.KEY_A, Input.KEY_J, Input.KEY_4],
        rightKeys: [Input.KEY_RIGHT, Input.KEY_D, Input.KEY_L, Input.KEY_6],
        fireKeys: [],
        shootKeys: [],
        spaceKeys: [Input.KEY_SPACE],
        enterKeys: [Input.KEY_ENTER],
        f12Keys: [Input.KEY_F12],
        escapeKeys: [Input.KEY_ESCAPE],
        pauseKeys: [Input.KEY_P],
        controllerIndex: 0,
        controllerFireButtons: [],
        controllerShootButtons: []
    };
}

/**
 * Java counterpart: project HumanInput helper classes.
 *
 * Slick Input adapter with neutral action names.
 */
export class HumanInput implements IInput {
    private readonly gc: GameContainer;
    private readonly input: Input;
    private readonly bindings: Required<HumanInputBindings>;
    private readonly mapping: ButtonMapping | null;
    private snapshot: Snapshot = {
        up: false,
        down: false,
        left: false,
        right: false,
        fire: false,
        shoot: false
    };

    public constructor(gc: GameContainer);
    public constructor(mapping: ButtonMapping, gc: GameContainer);
    public constructor(gc: GameContainer, bindings: HumanInputBindings);
    /** Java counterpart: HumanInput constructors. */
    public constructor(a: GameContainer | ButtonMapping, b?: GameContainer | HumanInputBindings) {
        if (a instanceof ButtonMapping) {
            this.gc = b as GameContainer;
            this.mapping = a;
            this.bindings = defaults();
        } else {
            this.gc = a;
            this.mapping = null;
            this.bindings = { ...defaults(), ...(b as HumanInputBindings | undefined) };
        }
        this.input = this.gc.getInput();
    }

    /** Java counterpart: HumanInput.snap(). */
    public snap(): void {
        if (!this.mapping) {
            return;
        }
        const mapping = this.mapping;
        this.snapshot = {
            up: this.input.isKeyDown(mapping.keyUp) || (mapping.controller && this.input.isControllerUp(mapping.controllerIndex)),
            down: this.input.isKeyDown(mapping.keyDown) || (mapping.controller && this.input.isControllerDown(mapping.controllerIndex)),
            left: this.input.isKeyDown(mapping.keyLeft) || (mapping.controller && this.input.isControllerLeft(mapping.controllerIndex)),
            right: this.input.isKeyDown(mapping.keyRight) || (mapping.controller && this.input.isControllerRight(mapping.controllerIndex)),
            fire: this.input.isKeyDown(mapping.keyGrenade) || (mapping.controller && this.input.isButtonPressed(mapping.controllerGrenade, mapping.controllerIndex)),
            shoot: this.isMappedShootPressed(mapping)
        };
    }

    /** Java counterpart: HumanInput.reset(). */
    public reset(): void {
    }

    /** Java counterpart: HumanInput.isFire(). */
    public isFire(): boolean {
        if (this.mapping) {
            return this.snapshot.fire;
        }
        return this.anyPressed(this.bindings.fireKeys) || this.anyControllerPressed(this.bindings.controllerFireButtons);
    }

    /** Java counterpart: HumanInput.isShoot(). */
    public isShoot(): boolean {
        if (this.mapping) {
            return this.snapshot.shoot;
        }
        return this.anyPressed(this.bindings.shootKeys) || this.anyControllerPressed(this.bindings.controllerShootButtons);
    }

    /** Java counterpart: HumanInput.isSpace(). */
    public isSpace(): boolean {
        return this.anyPressed(this.bindings.spaceKeys);
    }

    /** Java counterpart: HumanInput.isUp(). */
    public isUp(): boolean {
        if (this.mapping) {
            return this.snapshot.up;
        }
        return this.anyDown(this.bindings.upKeys) || this.input.isControllerUp(this.bindings.controllerIndex);
    }

    /** Java counterpart: HumanInput.isDown(). */
    public isDown(): boolean {
        if (this.mapping) {
            return this.snapshot.down;
        }
        return this.anyDown(this.bindings.downKeys) || this.input.isControllerDown(this.bindings.controllerIndex);
    }

    /** Java counterpart: HumanInput.isLeft(). */
    public isLeft(): boolean {
        if (this.mapping) {
            return this.snapshot.left;
        }
        return this.anyDown(this.bindings.leftKeys) || this.input.isControllerLeft(this.bindings.controllerIndex);
    }

    /** Java counterpart: HumanInput.isRight(). */
    public isRight(): boolean {
        if (this.mapping) {
            return this.snapshot.right;
        }
        return this.anyDown(this.bindings.rightKeys) || this.input.isControllerRight(this.bindings.controllerIndex);
    }

    /** Java counterpart: HumanInput.isEnter(). */
    public isEnter(): boolean {
        return this.anyPressed(this.bindings.enterKeys);
    }

    /** Java counterpart: HumanInput.isF12(). */
    public isF12(): boolean {
        return this.anyPressed(this.bindings.f12Keys);
    }

    /** Java counterpart: HumanInput.isEscape(). */
    public isEscape(): boolean {
        return this.anyPressed(this.bindings.escapeKeys);
    }

    /** Java counterpart: HumanInput.isPause(). */
    public isPause(): boolean {
        if (this.mapping) {
            return this.input.isKeyPressed(Input.KEY_P) || this.input.isKeyPressed(Input.KEY_ENTER);
        }
        return this.anyPressed(this.bindings.pauseKeys);
    }

    /** Java counterpart: HumanInput.clearKeyPressedRecord(). */
    public clearKeyPressedRecord(): void {
        this.input.clearKeyPressedRecord();
    }

    /** Java counterpart: HumanInput.update(). */
    public update(): boolean {
        return true;
    }

    private isMappedShootPressed(mapping: ButtonMapping): boolean {
        const keyDown = mapping.gunKeyMapped
            ? this.input.isKeyDown(mapping.keyGun)
            : [Input.KEY_Z, Input.KEY_Y, Input.KEY_W, Input.KEY_K].some((key) => this.input.isKeyDown(key));
        return keyDown || (mapping.controller && this.input.isButtonPressed(mapping.controllerGun, mapping.controllerIndex));
    }

    private anyDown(keys: number[]): boolean {
        return keys.some((key) => this.input.isKeyDown(key));
    }

    private anyPressed(keys: number[]): boolean {
        return keys.some((key) => this.input.isKeyPressed(key));
    }

    private anyControllerPressed(buttons: number[]): boolean {
        return buttons.some((button) => this.input.isButtonPressed(button, this.bindings.controllerIndex));
    }
}
