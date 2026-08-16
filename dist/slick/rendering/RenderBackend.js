/** Returns an identity 3x3 affine matrix. */
export function identityMatrix3() {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}
/** Multiplies two 3x3 matrices in row-major order. */
export function multiplyMatrix3(a, b) {
    return [
        a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
        a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
        a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
        a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
        a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
        a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
        a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
        a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
        a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
    ];
}
/** Applies a 3x3 affine matrix to a 2D point. */
export function transformPoint(matrix, x, y) {
    return [matrix[0] * x + matrix[1] * y + matrix[2], matrix[3] * x + matrix[4] * y + matrix[5]];
}
/** Creates a translation matrix. */
export function translationMatrix3(x, y) {
    return [1, 0, x, 0, 1, y, 0, 0, 1];
}
/** Creates a scale matrix. */
export function scaleMatrix3(x, y) {
    return [x, 0, 0, 0, y, 0, 0, 0, 1];
}
/** Creates a clockwise degree rotation around the supplied point. */
export function rotationMatrix3(x, y, angle) {
    const radians = (angle * Math.PI) / 180;
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return multiplyMatrix3(multiplyMatrix3(translationMatrix3(x, y), [c, -s, 0, s, c, 0, 0, 0, 1]), translationMatrix3(-x, -y));
}
//# sourceMappingURL=RenderBackend.js.map