import type { GameContainer } from "../GameContainer.js";
import { Input } from "../Input.js";
import type { IInput } from "./IInput.js";

/**
 * Java counterpart: recorded/demo input helper.
 *
 * Reads directional state from a byte stream and allows Enter to interrupt.
 */
export class RecordedInput implements IInput {
    private index = 0;

    /** Java counterpart: RecordedInput(byte[], GameContainer). */
    public constructor(private readonly data: Uint8Array, private readonly gc: GameContainer) {
    }

    /** Java counterpart: RecordedInput.snap(). */
    public snap(): void {
    }

    /** Java counterpart: RecordedInput.reset(). */
    public reset(): void {
        this.index = 0;
    }

    /** Java counterpart: RecordedInput.isFire(). */
    public isFire(): boolean {
        return false;
    }

    /** Java counterpart: RecordedInput.isShoot(). */
    public isShoot(): boolean {
        return false;
    }

    /** Java counterpart: RecordedInput.isSpace(). */
    public isSpace(): boolean {
        return false;
    }

    /** Java counterpart: RecordedInput.isUp(). */
    public isUp(): boolean {
        return this.hasBit(1);
    }

    /** Java counterpart: RecordedInput.isDown(). */
    public isDown(): boolean {
        return this.hasBit(2);
    }

    /** Java counterpart: RecordedInput.isLeft(). */
    public isLeft(): boolean {
        return this.hasBit(4);
    }

    /** Java counterpart: RecordedInput.isRight(). */
    public isRight(): boolean {
        return this.hasBit(8);
    }

    /** Java counterpart: RecordedInput.isEnter(). */
    public isEnter(): boolean {
        return this.gc.getInput().isKeyPressed(Input.KEY_ENTER);
    }

    /** Java counterpart: RecordedInput.isF12(). */
    public isF12(): boolean {
        return false;
    }

    /** Java counterpart: RecordedInput.isEscape(). */
    public isEscape(): boolean {
        return false;
    }

    /** Java counterpart: RecordedInput.isPause(). */
    public isPause(): boolean {
        return false;
    }

    /** Java counterpart: RecordedInput.clearKeyPressedRecord(). */
    public clearKeyPressedRecord(): void {
        this.gc.getInput().clearKeyPressedRecord();
    }

    /** Java counterpart: RecordedInput.update(). */
    public update(): boolean {
        this.index++;
        return this.index < this.data.length;
    }

    private hasBit(bit: number): boolean {
        return this.index < this.data.length && (this.data[this.index] & bit) !== 0;
    }
}
