import type { Color } from "../Color.js";
import type { Image } from "../Image.js";
import type { WebGLTextureResource } from "./WebGLTextureResource.js";
import type { WebGLRenderTarget } from "./WebGLRenderTarget.js";
export type Matrix3 = [number, number, number, number, number, number, number, number, number];
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
    initialize(canvas: HTMLCanvasElement, options: RenderBackendOptions, logicalWidth?: number, logicalHeight?: number, backingWidth?: number, backingHeight?: number): void;
    beginFrame(width: number, height: number, background: Color, backingWidth?: number, backingHeight?: number): void;
    endFrame(): void;
    setRenderTarget(target: WebGLRenderTarget | null): void;
    drawImage(image: Image, x: number, y: number, width: number, height: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, alpha: number, tint: Color | null, transform: Matrix3, useCornerColors?: boolean, useCurrentColorForNullTint?: boolean): void;
    drawImageFlash(image: Image, x: number, y: number, width: number, height: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, tint: Color, transform: Matrix3): void;
    drawImageWarped(image: Image, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, alpha: number, tint: Color | null, transform: Matrix3, useCornerColors?: boolean, useCurrentColorForNullTint?: boolean): void;
    fillRect(x: number, y: number, width: number, height: number, color: Color, transform: Matrix3): void;
    drawLine(x1: number, y1: number, x2: number, y2: number, color: Color, width: number, transform: Matrix3): void;
    drawGradientLine(x1: number, y1: number, color1: Color, x2: number, y2: number, color2: Color, width: number, transform: Matrix3): void;
    drawLineStrip(points: Array<[number, number]>, color: Color, width: number, transform: Matrix3): void;
    fillTriangles(points: Array<[number, number]>, color: Color, transform: Matrix3): void;
    copyAreaToRenderTarget(target: WebGLRenderTarget, x: number, y: number): void;
    setClip(x: number, y: number, width: number, height: number): void;
    clearClip(): void;
    setWorldClip(x: number, y: number, width: number, height: number, transform: Matrix3): void;
    clearWorldClip(): void;
    setColorInverted(inverted: boolean): void;
    isColorInverted(): boolean;
    setMonochromePalette(blackReplacement: Color, whiteReplacement: Color): void;
    clearMonochromePalette(): void;
    isMonochromePaletteEnabled(): boolean;
    pushTransform(): void;
    popTransform(): void;
    translate(x: number, y: number): void;
    scale(x: number, y: number): void;
    rotate(x: number, y: number, angle: number): void;
    readPixels(x: number, y: number, width: number, height: number, target: Uint8Array): void;
    bindTextureResource(resource: WebGLTextureResource): void;
    handleContextLost(): void;
    handleContextRestored(): void;
    dispose(): void;
}
/** Returns an identity 3x3 affine matrix. */
export declare function identityMatrix3(): Matrix3;
/** Multiplies two 3x3 matrices in row-major order. */
export declare function multiplyMatrix3(a: Matrix3, b: Matrix3): Matrix3;
/** Applies a 3x3 affine matrix to a 2D point. */
export declare function transformPoint(matrix: Matrix3, x: number, y: number): [number, number];
/** Creates a translation matrix. */
export declare function translationMatrix3(x: number, y: number): Matrix3;
/** Creates a scale matrix. */
export declare function scaleMatrix3(x: number, y: number): Matrix3;
/** Creates a clockwise degree rotation around the supplied point. */
export declare function rotationMatrix3(x: number, y: number, angle: number): Matrix3;
//# sourceMappingURL=RenderBackend.d.ts.map