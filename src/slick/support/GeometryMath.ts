import { FastTrig } from "../util/FastTrig.js";

/**
 * Java counterpart: source point value used by rotate helpers.
 */
export interface Point2D {
    x: number;
    y: number;
}

/**
 * Java counterpart: source geometry helper methods.
 *
 * Contains continuous and discrete unit-vector recipes.
 */
export class GeometryMath {
    public static readonly ISQRT2 = 1 / Math.sqrt(2);

    public static createUnitVector2(angle: number): [number, number];
    public static createUnitVector2(angle: number, target: [number, number]): [number, number];
    /** Java counterpart: Main.createUnitVector2(double). */
    public static createUnitVector2(angle: number, target: [number, number] = [0, 0]): [number, number] {
        target[0] = FastTrig.cos(angle);
        target[1] = FastTrig.sin(angle);
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

    /** Java counterpart: Main.rotate(double, double, double). */
    public static rotate(x: number, y: number, angle: number): Point2D {
        const cos = FastTrig.cos(angle);
        const sin = FastTrig.sin(angle);
        return {
            x: x * cos - y * sin,
            y: x * sin + y * cos
        };
    }
}
