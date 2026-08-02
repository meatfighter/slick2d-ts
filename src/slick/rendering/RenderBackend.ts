import type { Color } from "../Color.js";
import type { Image } from "../Image.js";
import type { WebGLRenderTarget } from "./WebGLRenderTarget.js";

export type Matrix3 = [
    number, number, number,
    number, number, number,
    number, number, number
];

export interface RenderBackendOptions {
    stencil?: boolean;
    alpha?: boolean;
    antialias?: boolean;
}

/**
 * Internal rendering contract shared by Slick parity classes.
 *
 * This is not a public replacement for Slick2D APIs.
 */
export interface RenderBackend {
    initialize(canvas: HTMLCanvasElement, options: RenderBackendOptions): void;
    beginFrame(width: number, height: number, background: Color): void;
    endFrame(): void;
    setRenderTarget(target: WebGLRenderTarget | null): void;
    drawImage(image: Image, x: number, y: number, width: number, height: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, alpha: number, tint: Color | null, transform: Matrix3): void;
    fillRect(x: number, y: number, width: number, height: number, color: Color, transform: Matrix3): void;
    drawLine(x1: number, y1: number, x2: number, y2: number, color: Color, width: number, transform: Matrix3): void;
    setClip(x: number, y: number, width: number, height: number): void;
    clearClip(): void;
    setWorldClip(x: number, y: number, width: number, height: number, transform: Matrix3): void;
    clearWorldClip(): void;
    pushTransform(): void;
    popTransform(): void;
    translate(x: number, y: number): void;
    scale(x: number, y: number): void;
    rotate(x: number, y: number, angle: number): void;
    readPixels(x: number, y: number, width: number, height: number, target: Uint8Array): void;
    handleContextLost(): void;
    handleContextRestored(): void;
    dispose(): void;
}

/** Returns an identity 3x3 affine matrix. */
export function identityMatrix3(): Matrix3 {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

/** Multiplies two 3x3 matrices in row-major order. */
export function multiplyMatrix3(a: Matrix3, b: Matrix3): Matrix3 {
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
export function transformPoint(matrix: Matrix3, x: number, y: number): [number, number] {
    return [
        matrix[0] * x + matrix[1] * y + matrix[2],
        matrix[3] * x + matrix[4] * y + matrix[5]
    ];
}

/** Creates a translation matrix. */
export function translationMatrix3(x: number, y: number): Matrix3 {
    return [1, 0, x, 0, 1, y, 0, 0, 1];
}

/** Creates a scale matrix. */
export function scaleMatrix3(x: number, y: number): Matrix3 {
    return [x, 0, 0, 0, y, 0, 0, 0, 1];
}

/** Creates a clockwise degree rotation around the supplied point. */
export function rotationMatrix3(x: number, y: number, angle: number): Matrix3 {
    const radians = angle * Math.PI / 180;
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return multiplyMatrix3(
        multiplyMatrix3(translationMatrix3(x, y), [c, -s, 0, s, c, 0, 0, 0, 1]),
        translationMatrix3(-x, -y)
    );
}
