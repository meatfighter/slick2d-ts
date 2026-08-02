/**
 * Java Slick2D counterpart: org.newdawn.slick.util.FastTrig.
 *
 * Trigonometry facade used by the source helper math.
 */
export class FastTrig {
    private static reduceSinAngle(radians: number): number {
        let reduced = radians % (Math.PI * 2);
        if (Math.abs(reduced) > Math.PI) {
            reduced -= Math.PI * 2;
        }
        if (Math.abs(reduced) > Math.PI / 2) {
            reduced = Math.PI - reduced;
        }
        return reduced;
    }

    /**
     * Java Slick2D counterpart: FastTrig.sin(double radians).
     *
     * Returns the sine of an angle in radians using Slick2D's reduced-angle helper.
     */
    public static sin(radians: number): number {
        const reduced = FastTrig.reduceSinAngle(radians);
        if (Math.abs(reduced) <= Math.PI / 4) {
            return Math.sin(reduced);
        }
        return Math.cos(Math.PI / 2 - reduced);
    }

    /**
     * Java Slick2D counterpart: FastTrig.cos(double radians).
     *
     * Returns the cosine of an angle in radians through Slick2D's sin helper.
     */
    public static cos(radians: number): number {
        return FastTrig.sin(radians + Math.PI / 2);
    }
}
