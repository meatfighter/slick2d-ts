/**
 * Java counterpart: primitive numeric conversion helpers.
 *
 * Centralizes the Java integer, byte, float, and round semantics that TypeScript
 * game ports must apply explicitly at converted arithmetic boundaries.
 */
export declare class JavaNumbers {
    /** Java counterpart: narrowing an integral value to int. */
    static toInt(value: number | bigint): number;
    /** Java counterpart: narrowing a float/double value to int. */
    static castDoubleToInt(value: number): number;
    /** Java counterpart: narrowing a float/double or integral value to long. */
    static toLong(value: number | bigint): bigint;
    /** Java counterpart: int division with truncation toward zero. */
    static intDiv(dividend: number, divisor: number): number;
    /** Java counterpart: int remainder with the dividend's sign. */
    static intRem(dividend: number, divisor: number): number;
    /** Java counterpart: narrowing an integral value to byte. */
    static toByte(value: number | bigint): number;
    /** Java counterpart: byte value masked with 0xFF. */
    static toUnsignedByte(value: number | bigint): number;
    /** Java counterpart: narrowing an integral value to short. */
    static toShort(value: number | bigint): number;
    /** Java counterpart: narrowing an integral value to char. */
    static toChar(value: number | bigint): number;
    /** Java counterpart: narrowing a number to float. */
    static toFloat(value: number): number;
    /** Java counterpart: Math.round(float). */
    static roundFloat(value: number): number;
    /** Java counterpart: Math.round(double). */
    static roundDouble(value: number): bigint;
}
//# sourceMappingURL=JavaNumbers.d.ts.map