import assert from "node:assert/strict";
import { test } from "node:test";
import { JavaNumbers } from "../dist/index.js";

test("JavaNumbers preserves int wrapping and floating cast boundaries", () => {
    assert.equal(JavaNumbers.toInt(0x100000000), 0);
    assert.equal(JavaNumbers.toInt(0xFFFFFFFF), -1);
    assert.equal(JavaNumbers.toInt(0x80000000), -2147483648);
    assert.equal(JavaNumbers.toInt(0x7FFFFFFF), 2147483647);
    assert.equal(JavaNumbers.toInt(0x100000000n), 0);

    assert.equal(JavaNumbers.castDoubleToInt(Number.NaN), 0);
    assert.equal(JavaNumbers.castDoubleToInt(3.9), 3);
    assert.equal(JavaNumbers.castDoubleToInt(-3.9), -3);
    assert.equal(JavaNumbers.castDoubleToInt(1e30), 2147483647);
    assert.equal(JavaNumbers.castDoubleToInt(-1e30), -2147483648);
});

test("JavaNumbers int division and remainder truncate toward zero", () => {
    assert.equal(JavaNumbers.intDiv(7, 3), 2);
    assert.equal(JavaNumbers.intDiv(-7, 3), -2);
    assert.equal(JavaNumbers.intDiv(7, -3), -2);
    assert.equal(JavaNumbers.intDiv(-7, -3), 2);
    assert.equal(JavaNumbers.intDiv(-2147483648, -1), -2147483648);

    assert.equal(JavaNumbers.intRem(7, 3), 1);
    assert.equal(JavaNumbers.intRem(-7, 3), -1);
    assert.equal(JavaNumbers.intRem(7, -3), 1);
    assert.equal(JavaNumbers.intRem(-7, -3), -1);
    assert.equal(JavaNumbers.intRem(-2147483648, -1), 0);
    assert.throws(() => JavaNumbers.intDiv(1, 0), /\/ by zero/);
    assert.throws(() => JavaNumbers.intRem(1, 0), /\/ by zero/);
});

test("JavaNumbers byte short char float and round helpers match Java boundaries", () => {
    assert.equal(JavaNumbers.toByte(255), -1);
    assert.equal(JavaNumbers.toByte(128), -128);
    assert.equal(JavaNumbers.toByte(-129), 127);
    assert.equal(JavaNumbers.toUnsignedByte(-1), 255);
    assert.equal(JavaNumbers.toUnsignedByte(256), 0);

    assert.equal(JavaNumbers.toShort(65535), -1);
    assert.equal(JavaNumbers.toShort(32768), -32768);
    assert.equal(JavaNumbers.toChar(-1), 65535);
    assert.equal(JavaNumbers.toChar(65536), 0);

    assert.equal(JavaNumbers.toFloat(1 / 3), Math.fround(1 / 3));
    assert.equal(JavaNumbers.roundFloat(1.5), 2);
    assert.equal(JavaNumbers.roundFloat(-1.5), -1);
    assert.equal(JavaNumbers.roundFloat(Number.NaN), 0);
    assert.equal(JavaNumbers.roundDouble(1.5), 2n);
    assert.equal(JavaNumbers.roundDouble(-1.5), -1n);
    assert.equal(JavaNumbers.roundDouble(Number.NaN), 0n);
});
