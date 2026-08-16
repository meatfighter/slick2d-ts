import type { GameContainer } from "../GameContainer.js";
import type { IInput } from "./IInput.js";
/**
 * Java counterpart: recorded/demo input helper.
 *
 * Reads directional state from a byte stream and allows Enter to interrupt.
 */
export declare class RecordedInput implements IInput {
    private readonly data;
    private readonly gc;
    private index;
    /** Java counterpart: RecordedInput(byte[], GameContainer). */
    constructor(data: Uint8Array, gc: GameContainer);
    /** Java counterpart: RecordedInput.snap(). */
    snap(): void;
    /** Java counterpart: RecordedInput.reset(). */
    reset(): void;
    /** Java counterpart: RecordedInput.isFire(). */
    isFire(): boolean;
    /** Java counterpart: RecordedInput.isShoot(). */
    isShoot(): boolean;
    /** Java counterpart: RecordedInput.isSpace(). */
    isSpace(): boolean;
    /** Java counterpart: RecordedInput.isUp(). */
    isUp(): boolean;
    /** Java counterpart: RecordedInput.isDown(). */
    isDown(): boolean;
    /** Java counterpart: RecordedInput.isLeft(). */
    isLeft(): boolean;
    /** Java counterpart: RecordedInput.isRight(). */
    isRight(): boolean;
    /** Java counterpart: RecordedInput.isEnter(). */
    isEnter(): boolean;
    /** Java counterpart: RecordedInput.isF12(). */
    isF12(): boolean;
    /** Java counterpart: RecordedInput.isEscape(). */
    isEscape(): boolean;
    /** Java counterpart: RecordedInput.isPause(). */
    isPause(): boolean;
    /** Java counterpart: RecordedInput.clearKeyPressedRecord(). */
    clearKeyPressedRecord(): void;
    /** Java counterpart: RecordedInput.update(). */
    update(): boolean;
    private hasBit;
}
//# sourceMappingURL=RecordedInput.d.ts.map