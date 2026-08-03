/**
 * Java counterpart: source point value used by rotate helpers.
 */
export interface Point2D {
    x: number;
    y: number;
}

function jf(value: number): number {
    return Math.fround(value);
}

/**
 * Java counterpart: source geometry helper methods.
 *
 * Contains continuous and discrete unit-vector recipes.
 */
export class GeometryMath {
    public static readonly ISQRT2 = jf(1 / Math.sqrt(2));

    public static createUnitVector2(angle: number): [number, number];
    public static createUnitVector2(angle: number, target: [number, number]): [number, number];
    /** Java counterpart: Main.createUnitVector2(float). */
    public static createUnitVector2(angle: number, target: [number, number] = [0, 0]): [number, number] {
        const a = jf(angle);
        target[0] = jf(Math.cos(a));
        target[1] = jf(Math.sin(a));
        return target;
    }

    public static createUnitVector(angle: number): [number, number];
    public static createUnitVector(angle: number, target: [number, number]): [number, number];
    /** Java counterpart: Main.createUnitVector(int). */
    public static createUnitVector(angle: number, target: [number, number] = [0, 0]): [number, number] {
        switch (angle) {
            case 0:
            case 360:
                target[0] = 1;
                target[1] = 0;
                break;
            case 45:
            case 405:
                target[0] = GeometryMath.ISQRT2;
                target[1] = GeometryMath.ISQRT2;
                break;
            case 90:
                target[0] = 0;
                target[1] = 1;
                break;
            case 135:
                target[0] = -GeometryMath.ISQRT2;
                target[1] = GeometryMath.ISQRT2;
                break;
            case 180:
                target[0] = -1;
                target[1] = 0;
                break;
            case 225:
                target[0] = -GeometryMath.ISQRT2;
                target[1] = -GeometryMath.ISQRT2;
                break;
            case 270:
                target[0] = 0;
                target[1] = -1;
                break;
            case 315:
            case -45:
                target[0] = GeometryMath.ISQRT2;
                target[1] = -GeometryMath.ISQRT2;
                break;
        }
        return target;
    }

    /** Java counterpart: Main.rotate(float, float, float). */
    public static rotate(x: number, y: number, angle: number): Point2D {
        const fx = jf(x);
        const fy = jf(y);
        const a = jf(angle);
        const cos = jf(Math.cos(a));
        const sin = jf(Math.sin(a));
        const xCos = jf(fx * cos);
        const ySin = jf(fy * sin);
        const xSin = jf(fx * sin);
        const yCos = jf(fy * cos);
        return {
            x: jf(xCos - ySin),
            y: jf(xSin + yCos)
        };
    }
}
