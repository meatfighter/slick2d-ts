/**
 * Java Slick2D counterpart: org.newdawn.slick.util.FastTrig.
 *
 * Trigonometry facade used by the source helper math.
 */
export class FastTrig {
    /**
     * Java Slick2D counterpart: FastTrig.sin(double radians).
     *
     * Returns the sine of an angle in radians.
     */
    public static sin(radians: number): number {
        return Math.sin(radians);
    }

    /**
     * Java Slick2D counterpart: FastTrig.cos(double radians).
     *
     * Returns the cosine of an angle in radians.
     */
    public static cos(radians: number): number {
        return Math.cos(radians);
    }
}
