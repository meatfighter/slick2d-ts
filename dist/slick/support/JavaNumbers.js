const INT_MIN = -0x80000000;
const INT_MAX = 0x7fffffff;
const LONG_MIN = -(1n << 63n);
const LONG_MAX = (1n << 63n) - 1n;
/**
 * Java counterpart: primitive numeric conversion helpers.
 *
 * Centralizes the Java integer, byte, float, and round semantics that TypeScript
 * game ports must apply explicitly at converted arithmetic boundaries.
 */
export class JavaNumbers {
    /** Java counterpart: narrowing an integral value to int. */
    static toInt(value) {
        if (typeof value === "bigint") {
            return Number(BigInt.asIntN(32, value));
        }
        return Math.trunc(value) | 0;
    }
    /** Java counterpart: narrowing a float/double value to int. */
    static castDoubleToInt(value) {
        if (Number.isNaN(value)) {
            return 0;
        }
        if (value <= INT_MIN) {
            return INT_MIN;
        }
        if (value >= INT_MAX) {
            return INT_MAX;
        }
        return Math.trunc(value) | 0;
    }
    /** Java counterpart: narrowing a float/double or integral value to long. */
    static toLong(value) {
        if (typeof value === "bigint") {
            return BigInt.asIntN(64, value);
        }
        if (Number.isNaN(value)) {
            return 0n;
        }
        if (value <= Number(LONG_MIN)) {
            return LONG_MIN;
        }
        if (value >= Number(LONG_MAX)) {
            return LONG_MAX;
        }
        return BigInt(Math.trunc(value));
    }
    /** Java counterpart: int division with truncation toward zero. */
    static intDiv(dividend, divisor) {
        const a = JavaNumbers.toInt(dividend);
        const b = JavaNumbers.toInt(divisor);
        if (b === 0) {
            throw new Error("/ by zero");
        }
        if (a === INT_MIN && b === -1) {
            return INT_MIN;
        }
        return JavaNumbers.toInt(Math.trunc(a / b));
    }
    /** Java counterpart: int remainder with the dividend's sign. */
    static intRem(dividend, divisor) {
        const a = JavaNumbers.toInt(dividend);
        const b = JavaNumbers.toInt(divisor);
        if (b === 0) {
            throw new Error("/ by zero");
        }
        return JavaNumbers.toInt(a - JavaNumbers.intDiv(a, b) * b);
    }
    /** Java counterpart: narrowing an integral value to byte. */
    static toByte(value) {
        if (typeof value === "bigint") {
            return Number(BigInt.asIntN(8, value));
        }
        return (Math.trunc(value) << 24) >> 24;
    }
    /** Java counterpart: byte value masked with 0xFF. */
    static toUnsignedByte(value) {
        return JavaNumbers.toByte(value) & 0xff;
    }
    /** Java counterpart: narrowing an integral value to short. */
    static toShort(value) {
        if (typeof value === "bigint") {
            return Number(BigInt.asIntN(16, value));
        }
        return (Math.trunc(value) << 16) >> 16;
    }
    /** Java counterpart: narrowing an integral value to char. */
    static toChar(value) {
        if (typeof value === "bigint") {
            return Number(BigInt.asUintN(16, value));
        }
        return Math.trunc(value) & 0xffff;
    }
    /** Java counterpart: narrowing a number to float. */
    static toFloat(value) {
        return Math.fround(value);
    }
    /** Java counterpart: Math.round(float). */
    static roundFloat(value) {
        return JavaNumbers.castDoubleToInt(Math.floor(Math.fround(value) + Math.fround(0.5)));
    }
    /** Java counterpart: Math.round(double). */
    static roundDouble(value) {
        return JavaNumbers.toLong(Math.floor(value + 0.5));
    }
}
//# sourceMappingURL=JavaNumbers.js.map