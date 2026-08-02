/**
 * Java counterpart: shared project IInput helper interfaces.
 *
 * Neutral superset of the reusable input helper methods observed in the games.
 */
export interface IInput {
    /** Java counterpart: IInput.snap(). */
    snap(): void;
    /** Java counterpart: IInput.reset(). */
    reset(): void;
    /** Java counterpart: IInput.isFire(). */
    isFire(): boolean;
    /** Java counterpart: IInput.isShoot(). */
    isShoot(): boolean;
    /** Java counterpart: IInput.isSpace(). */
    isSpace(): boolean;
    /** Java counterpart: IInput.isUp(). */
    isUp(): boolean;
    /** Java counterpart: IInput.isDown(). */
    isDown(): boolean;
    /** Java counterpart: IInput.isLeft(). */
    isLeft(): boolean;
    /** Java counterpart: IInput.isRight(). */
    isRight(): boolean;
    /** Java counterpart: IInput.isEnter(). */
    isEnter(): boolean;
    /** Java counterpart: IInput.isF12(). */
    isF12(): boolean;
    /** Java counterpart: IInput.isEscape(). */
    isEscape(): boolean;
    /** Java counterpart: IInput.isPause(). */
    isPause(): boolean;
    /** Java counterpart: IInput.clearKeyPressedRecord(). */
    clearKeyPressedRecord(): void;
    /** Java counterpart: IInput.update(). */
    update(): boolean;
}
