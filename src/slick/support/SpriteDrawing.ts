import { Graphics } from "../Graphics.js";
import { Image } from "../Image.js";

function drawWithAlpha(image: Image, alpha: number, callback: () => void): void {
    image.setAlpha(alpha);
    try {
        callback();
    } finally {
        image.setAlpha(1);
    }
}

function withGraphics(callback: (g: Graphics) => void): void {
    const g = Graphics.getCurrent();
    if (!g) {
        callback(new Graphics());
        return;
    }
    callback(g);
}

function withLocalTransform(x: number, y: number, angle: number, scaleX: number, scaleY: number, callback: () => void): void {
    withGraphics((g) => {
        g.pushTransform();
        try {
            g.translate(x, y);
            g.rotate(0, 0, angle);
            g.scale(scaleX, scaleY);
            callback();
        } finally {
            g.popTransform();
        }
    });
}

/**
 * Java counterpart: repeated source sprite drawing helpers.
 *
 * Neutral transform/alpha recipes for future game-local helper ports.
 */
export class SpriteDrawing {
    /** Java counterpart: draw(Image, x, y). */
    public static draw(image: Image, x: number, y: number): void {
        image.draw(x, y);
    }

    /** Java counterpart: drawAlpha(Image, x, y, alpha). */
    public static drawAlpha(image: Image, x: number, y: number, alpha: number): void {
        drawWithAlpha(image, alpha, () => image.draw(x, y));
    }

    public static drawOffset(image: Image, x: number, y: number): void;
    public static drawOffset(image: Image, x: number, y: number, alpha: number): void;
    /** Java counterpart: drawOffset overloads. */
    public static drawOffset(image: Image, x: number, y: number, alpha?: number): void {
        const draw = (): void => image.draw(x, y);
        if (alpha === undefined) {
            draw();
        } else {
            drawWithAlpha(image, alpha, draw);
        }
    }

    public static drawCameraOffset(image: Image, x: number, y: number, offsetX: number, offsetY: number): void;
    public static drawCameraOffset(image: Image, x: number, y: number, offsetX: number, offsetY: number, alpha: number): void;
    /** Browser convenience helper: draws after subtracting an explicit camera/scroll offset. */
    public static drawCameraOffset(image: Image, x: number, y: number, offsetX: number, offsetY: number, alpha?: number): void {
        const draw = (): void => image.draw(x - offsetX, y - offsetY);
        if (alpha === undefined) {
            draw();
        } else {
            drawWithAlpha(image, alpha, draw);
        }
    }

    /** Java counterpart: drawFaded(Image, x, y, alpha). */
    public static drawFaded(image: Image, x: number, y: number, alpha: number): void {
        SpriteDrawing.drawAlpha(image, x, y, alpha);
    }

    public static drawRotated(image: Image, x: number, y: number, angle: number): void;
    public static drawRotated(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number): void;
    public static drawRotated(image: Image, x: number, y: number, centers: number[], angle: number): void;
    public static drawRotated(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scale: number): void;
    public static drawRotated(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scale: number, alpha: number): void;
    /** Java counterpart: drawRotated overloads. */
    public static drawRotated(image: Image, x: number, y: number, a: number | number[], b?: number, c?: number, d?: number, e?: number): void {
        let centerX = -image.getWidth() * 0.5;
        let centerY = -image.getHeight() * 0.5;
        let angle = 0;
        let scale = 1;
        let alpha: number | undefined;
        if (Array.isArray(a)) {
            centerX = a[0] ?? centerX;
            centerY = a[1] ?? centerY;
            angle = b ?? 0;
        } else if (b === undefined) {
            angle = a;
        } else {
            centerX = a;
            centerY = b;
            angle = c ?? 0;
            scale = d ?? 1;
            alpha = e;
        }
        const draw = (): void => {
            withLocalTransform(x, y, angle, scale, scale, () => {
                image.draw(centerX, centerY);
            });
        };
        if (alpha === undefined) {
            draw();
        } else {
            drawWithAlpha(image, alpha, draw);
        }
    }

    /** Java counterpart: drawRotatedAlpha(Image, x, y, angle, alpha). */
    public static drawRotatedAlpha(image: Image, x: number, y: number, angle: number, alpha: number): void {
        drawWithAlpha(image, alpha, () => {
            withLocalTransform(x, y, angle, 1, 1, () => {
                image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
            });
        });
    }

    public static drawRotatedScaled(image: Image, x: number, y: number, angle: number, scale: number): void;
    public static drawRotatedScaled(image: Image, x: number, y: number, angle: number, scaleX: number, scaleY: number): void;
    public static drawRotatedScaled(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scaleX: number, scaleY: number): void;
    public static drawRotatedScaled(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scaleX: number, scaleY: number, alpha: number): void;
    /** Java counterpart: drawRotatedScaled overloads. */
    public static drawRotatedScaled(image: Image, x: number, y: number, a: number, b: number, c?: number, d?: number, e?: number, f?: number): void {
        let centerX = -image.getWidth() * 0.5;
        let centerY = -image.getHeight() * 0.5;
        let angle = a;
        let scaleX = b;
        let scaleY = c ?? b;
        let alpha: number | undefined;
        if (d !== undefined && e !== undefined) {
            centerX = a;
            centerY = b;
            angle = c ?? 0;
            scaleX = d;
            scaleY = e;
            alpha = f;
        }
        const draw = (): void => {
            withLocalTransform(x, y, angle, scaleX, scaleY, () => {
                image.draw(centerX, centerY);
            });
        };
        if (alpha === undefined) {
            draw();
        } else {
            drawWithAlpha(image, alpha, draw);
        }
    }

    public static drawCentered(image: Image): void;
    public static drawCentered(image: Image, x: number, y: number): void;
    public static drawCentered(image: Image, x: number, y: number, scale: number): void;
    public static drawCentered(image: Image, x: number, y: number, scale: number, alpha: number): void;
    /** Java counterpart: drawCentered overloads. */
    public static drawCentered(image: Image, x: number = 0, y: number = 0, scale: number = 1, alpha?: number): void {
        const draw = (): void => {
            withLocalTransform(x, y, 0, scale, scale, () => {
                image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
            });
        };
        if (alpha === undefined) {
            draw();
        } else {
            drawWithAlpha(image, alpha, draw);
        }
    }

    /** Java counterpart: drawCenteredAlpha(Image, x, y, alpha). */
    public static drawCenteredAlpha(image: Image, x: number, y: number, alpha: number): void {
        SpriteDrawing.drawCentered(image, x, y, 1, alpha);
    }

    public static drawScaled(image: Image, x: number, y: number, scale: number): void;
    public static drawScaled(image: Image, x: number, y: number, scale: number, alpha: number): void;
    /** Java counterpart: drawScaled overloads. */
    public static drawScaled(image: Image, x: number, y: number, scale: number, alpha?: number): void {
        const draw = (): void => {
            withLocalTransform(x, y, 0, scale, scale, () => {
                image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
            });
        };
        if (alpha === undefined) {
            draw();
        } else {
            drawWithAlpha(image, alpha, draw);
        }
    }

    /** Browser convenience helper: draws with explicit top-left width and height. */
    public static drawSized(image: Image, x: number, y: number, width: number, height: number): void {
        image.draw(x, y, width, height);
    }

    /** Java counterpart: transform helper around Graphics.translate. */
    public static withTranslation(x: number, y: number, callback: () => void): void {
        withGraphics((g) => {
            g.pushTransform();
            try {
                g.translate(x, y);
                callback();
            } finally {
                g.popTransform();
            }
        });
    }

    /** Java counterpart: transform helper around Graphics.rotate. */
    public static withRotation(x: number, y: number, angle: number, callback: () => void): void {
        withGraphics((g) => {
            g.pushTransform();
            try {
                g.translate(x, y);
                g.rotate(0, 0, angle);
                callback();
            } finally {
                g.popTransform();
            }
        });
    }

    /** Java counterpart: transform helper around Graphics.scale. */
    public static withScale(x: number, y: number, scaleX: number, scaleY: number, callback: () => void): void {
        withGraphics((g) => {
            g.pushTransform();
            try {
                g.translate(x, y);
                g.scale(scaleX, scaleY);
                callback();
            } finally {
                g.popTransform();
            }
        });
    }
}
