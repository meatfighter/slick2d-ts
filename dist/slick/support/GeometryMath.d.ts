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
export declare class GeometryMath {
    static readonly ISQRT2: number;
    static createUnitVector2(angle: number): [number, number];
    static createUnitVector2(angle: number, target: [number, number]): [number, number];
    static createUnitVector(angle: number): [number, number];
    static createUnitVector(angle: number, target: [number, number]): [number, number];
    /** Java counterpart: Main.rotate(float, float, float). */
    static rotate(x: number, y: number, angle: number): Point2D;
}
//# sourceMappingURL=GeometryMath.d.ts.map