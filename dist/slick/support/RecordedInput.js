import { Input } from "../Input.js";
/**
 * Java counterpart: recorded/demo input helper.
 *
 * Reads directional state from a byte stream and allows Enter to interrupt.
 */
export class RecordedInput {
    data;
    gc;
    index = 0;
    /** Java counterpart: RecordedInput(byte[], GameContainer). */
    constructor(data, gc) {
        this.data = data;
        this.gc = gc;
    }
    /** Java counterpart: RecordedInput.snap(). */
    snap() { }
    /** Java counterpart: RecordedInput.reset(). */
    reset() {
        this.index = 0;
    }
    /** Java counterpart: RecordedInput.isFire(). */
    isFire() {
        return false;
    }
    /** Java counterpart: RecordedInput.isShoot(). */
    isShoot() {
        return false;
    }
    /** Java counterpart: RecordedInput.isSpace(). */
    isSpace() {
        return false;
    }
    /** Java counterpart: RecordedInput.isUp(). */
    isUp() {
        return this.hasBit(1);
    }
    /** Java counterpart: RecordedInput.isDown(). */
    isDown() {
        return this.hasBit(2);
    }
    /** Java counterpart: RecordedInput.isLeft(). */
    isLeft() {
        return this.hasBit(4);
    }
    /** Java counterpart: RecordedInput.isRight(). */
    isRight() {
        return this.hasBit(8);
    }
    /** Java counterpart: RecordedInput.isEnter(). */
    isEnter() {
        return this.gc.getInput().isKeyPressed(Input.KEY_ENTER);
    }
    /** Java counterpart: RecordedInput.isF12(). */
    isF12() {
        return false;
    }
    /** Java counterpart: RecordedInput.isEscape(). */
    isEscape() {
        return false;
    }
    /** Java counterpart: RecordedInput.isPause(). */
    isPause() {
        return false;
    }
    /** Java counterpart: RecordedInput.clearKeyPressedRecord(). */
    clearKeyPressedRecord() {
        this.gc.getInput().clearKeyPressedRecord();
    }
    /** Java counterpart: RecordedInput.update(). */
    update() {
        this.index++;
        return this.index < this.data.length;
    }
    hasBit(bit) {
        return this.index < this.data.length && (this.data[this.index] & bit) !== 0;
    }
}
//# sourceMappingURL=RecordedInput.js.map