import type { GameContainer } from "../GameContainer.js";
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
/**
 * Java counterpart: project HumanInput helper classes.
 *
 * Slick Input adapter with neutral action names.
 */
export declare class HumanInput implements IInput {
    private readonly gc;
    private readonly input;
    private readonly bindings;
    private readonly mapping;
    private snapshot;
    constructor(gc: GameContainer);
    constructor(mapping: ButtonMapping, gc: GameContainer);
    constructor(gc: GameContainer, bindings: HumanInputBindings);
    /** Java counterpart: HumanInput.snap(). */
    snap(): void;
    /** Java counterpart: HumanInput.reset(). */
    reset(): void;
    /** Java counterpart: HumanInput.isFire(). */
    isFire(): boolean;
    /** Java counterpart: HumanInput.isShoot(). */
    isShoot(): boolean;
    /** Java counterpart: HumanInput.isSpace(). */
    isSpace(): boolean;
    /** Java counterpart: HumanInput.isUp(). */
    isUp(): boolean;
    /** Java counterpart: HumanInput.isDown(). */
    isDown(): boolean;
    /** Java counterpart: HumanInput.isLeft(). */
    isLeft(): boolean;
    /** Java counterpart: HumanInput.isRight(). */
    isRight(): boolean;
    /** Java counterpart: HumanInput.isEnter(). */
    isEnter(): boolean;
    /** Java counterpart: HumanInput.isF12(). */
    isF12(): boolean;
    /** Java counterpart: HumanInput.isEscape(). */
    isEscape(): boolean;
    /** Java counterpart: HumanInput.isPause(). */
    isPause(): boolean;
    /** Java counterpart: HumanInput.clearKeyPressedRecord(). */
    clearKeyPressedRecord(): void;
    /** Java counterpart: HumanInput.update(). */
    update(): boolean;
    private isMappedShootPressed;
    private anyDown;
    private anyPressed;
    private anyControllerPressed;
    private anyDefaultShootKeyDown;
}
//# sourceMappingURL=HumanInput.d.ts.map