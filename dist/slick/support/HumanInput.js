import { Input } from "../Input.js";
import { ButtonMapping } from "./ButtonMapping.js";
const DEFAULT_SHOOT_KEYS = [Input.KEY_Z, Input.KEY_Y, Input.KEY_W, Input.KEY_K];
function defaults() {
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
export class HumanInput {
    gc;
    input;
    bindings;
    mapping;
    snapshot = {
        up: false,
        down: false,
        left: false,
        right: false,
        fire: false,
        shoot: false
    };
    /** Java counterpart: HumanInput constructors. */
    constructor(a, b) {
        if (a instanceof ButtonMapping) {
            this.gc = b;
            this.mapping = a;
            this.bindings = defaults();
        }
        else {
            this.gc = a;
            this.mapping = null;
            this.bindings = { ...defaults(), ...b };
        }
        this.input = this.gc.getInput();
    }
    /** Java counterpart: HumanInput.snap(). */
    snap() {
        if (!this.mapping) {
            return;
        }
        const mapping = this.mapping;
        this.snapshot.up = this.input.isKeyDown(mapping.keyUp) || (mapping.controller && this.input.isControllerUp(mapping.controllerIndex));
        this.snapshot.down = this.input.isKeyDown(mapping.keyDown) || (mapping.controller && this.input.isControllerDown(mapping.controllerIndex));
        this.snapshot.left = this.input.isKeyDown(mapping.keyLeft) || (mapping.controller && this.input.isControllerLeft(mapping.controllerIndex));
        this.snapshot.right = this.input.isKeyDown(mapping.keyRight) || (mapping.controller && this.input.isControllerRight(mapping.controllerIndex));
        this.snapshot.fire =
            this.input.isKeyDown(mapping.keyGrenade) || (mapping.controller && this.input.isButtonPressed(mapping.controllerGrenade, mapping.controllerIndex));
        this.snapshot.shoot = this.isMappedShootPressed(mapping);
    }
    /** Java counterpart: HumanInput.reset(). */
    reset() { }
    /** Java counterpart: HumanInput.isFire(). */
    isFire() {
        if (this.mapping) {
            return this.snapshot.fire;
        }
        return this.anyPressed(this.bindings.fireKeys) || this.anyControllerPressed(this.bindings.controllerFireButtons);
    }
    /** Java counterpart: HumanInput.isShoot(). */
    isShoot() {
        if (this.mapping) {
            return this.snapshot.shoot;
        }
        return this.anyPressed(this.bindings.shootKeys) || this.anyControllerPressed(this.bindings.controllerShootButtons);
    }
    /** Java counterpart: HumanInput.isSpace(). */
    isSpace() {
        return this.anyPressed(this.bindings.spaceKeys);
    }
    /** Java counterpart: HumanInput.isUp(). */
    isUp() {
        if (this.mapping) {
            return this.snapshot.up;
        }
        return this.anyDown(this.bindings.upKeys) || this.input.isControllerUp(this.bindings.controllerIndex);
    }
    /** Java counterpart: HumanInput.isDown(). */
    isDown() {
        if (this.mapping) {
            return this.snapshot.down;
        }
        return this.anyDown(this.bindings.downKeys) || this.input.isControllerDown(this.bindings.controllerIndex);
    }
    /** Java counterpart: HumanInput.isLeft(). */
    isLeft() {
        if (this.mapping) {
            return this.snapshot.left;
        }
        return this.anyDown(this.bindings.leftKeys) || this.input.isControllerLeft(this.bindings.controllerIndex);
    }
    /** Java counterpart: HumanInput.isRight(). */
    isRight() {
        if (this.mapping) {
            return this.snapshot.right;
        }
        return this.anyDown(this.bindings.rightKeys) || this.input.isControllerRight(this.bindings.controllerIndex);
    }
    /** Java counterpart: HumanInput.isEnter(). */
    isEnter() {
        return this.anyPressed(this.bindings.enterKeys);
    }
    /** Java counterpart: HumanInput.isF12(). */
    isF12() {
        return this.anyPressed(this.bindings.f12Keys);
    }
    /** Java counterpart: HumanInput.isEscape(). */
    isEscape() {
        return this.anyPressed(this.bindings.escapeKeys);
    }
    /** Java counterpart: HumanInput.isPause(). */
    isPause() {
        if (this.mapping) {
            return this.input.isKeyPressed(Input.KEY_P) || this.input.isKeyPressed(Input.KEY_ENTER);
        }
        return this.anyPressed(this.bindings.pauseKeys);
    }
    /** Java counterpart: HumanInput.clearKeyPressedRecord(). */
    clearKeyPressedRecord() {
        this.input.clearKeyPressedRecord();
    }
    /** Java counterpart: HumanInput.update(). */
    update() {
        return true;
    }
    isMappedShootPressed(mapping) {
        const keyDown = mapping.gunKeyMapped ? this.input.isKeyDown(mapping.keyGun) : this.anyDefaultShootKeyDown();
        return keyDown || (mapping.controller && this.input.isButtonPressed(mapping.controllerGun, mapping.controllerIndex));
    }
    anyDown(keys) {
        for (let i = 0; i < keys.length; i++) {
            if (this.input.isKeyDown(keys[i])) {
                return true;
            }
        }
        return false;
    }
    anyPressed(keys) {
        for (let i = 0; i < keys.length; i++) {
            if (this.input.isKeyPressed(keys[i])) {
                return true;
            }
        }
        return false;
    }
    anyControllerPressed(buttons) {
        for (let i = 0; i < buttons.length; i++) {
            if (this.input.isButtonPressed(buttons[i], this.bindings.controllerIndex)) {
                return true;
            }
        }
        return false;
    }
    anyDefaultShootKeyDown() {
        for (let i = 0; i < DEFAULT_SHOOT_KEYS.length; i++) {
            if (this.input.isKeyDown(DEFAULT_SHOOT_KEYS[i])) {
                return true;
            }
        }
        return false;
    }
}
//# sourceMappingURL=HumanInput.js.map