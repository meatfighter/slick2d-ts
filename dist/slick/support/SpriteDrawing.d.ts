import { Image } from "../Image.js";
/**
 * Java counterpart: repeated source sprite drawing helpers.
 *
 * Neutral transform/alpha recipes for future game-local helper ports.
 */
export declare class SpriteDrawing {
    /** Java counterpart: draw(Image, x, y). */
    static draw(image: Image, x: number, y: number): void;
    /** Java counterpart: drawAlpha(Image, x, y, alpha). */
    static drawAlpha(image: Image, x: number, y: number, alpha: number): void;
    static drawOffset(image: Image, x: number, y: number): void;
    static drawOffset(image: Image, x: number, y: number, alpha: number): void;
    static drawCameraOffset(image: Image, x: number, y: number, offsetX: number, offsetY: number): void;
    static drawCameraOffset(image: Image, x: number, y: number, offsetX: number, offsetY: number, alpha: number): void;
    /** Java counterpart: drawFaded(Image, x, y, alpha). */
    static drawFaded(image: Image, x: number, y: number, alpha: number): void;
    static drawRotated(image: Image, x: number, y: number, angle: number): void;
    static drawRotated(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number): void;
    static drawRotated(image: Image, x: number, y: number, centers: number[], angle: number): void;
    static drawRotated(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scale: number): void;
    static drawRotated(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scale: number, alpha: number): void;
    /** Java counterpart: drawRotatedAlpha(Image, x, y, angle, alpha). */
    static drawRotatedAlpha(image: Image, x: number, y: number, angle: number, alpha: number): void;
    static drawRotatedScaled(image: Image, x: number, y: number, angle: number, scale: number): void;
    static drawRotatedScaled(image: Image, x: number, y: number, angle: number, scaleX: number, scaleY: number): void;
    static drawRotatedScaled(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scaleX: number, scaleY: number): void;
    static drawRotatedScaled(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scaleX: number, scaleY: number, alpha: number): void;
    static drawCentered(image: Image): void;
    static drawCentered(image: Image, x: number, y: number): void;
    static drawCentered(image: Image, x: number, y: number, scale: number): void;
    static drawCentered(image: Image, x: number, y: number, scale: number, alpha: number): void;
    /** Java counterpart: drawCenteredAlpha(Image, x, y, alpha). */
    static drawCenteredAlpha(image: Image, x: number, y: number, alpha: number): void;
    static drawScaled(image: Image, x: number, y: number, scale: number): void;
    static drawScaled(image: Image, x: number, y: number, scale: number, alpha: number): void;
    /** Browser convenience helper: draws with explicit top-left width and height. */
    static drawSized(image: Image, x: number, y: number, width: number, height: number): void;
    /** Java counterpart: transform helper around Graphics.translate. */
    static withTranslation(x: number, y: number, callback: () => void): void;
    /** Java counterpart: transform helper around Graphics.rotate. */
    static withRotation(x: number, y: number, angle: number, callback: () => void): void;
    /** Java counterpart: transform helper around Graphics.scale. */
    static withScale(x: number, y: number, scaleX: number, scaleY: number, callback: () => void): void;
}
//# sourceMappingURL=SpriteDrawing.d.ts.map