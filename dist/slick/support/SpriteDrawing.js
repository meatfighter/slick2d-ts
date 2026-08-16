import { Graphics } from "../Graphics.js";
function currentGraphics() {
    return Graphics.getCurrent() ?? new Graphics();
}
function drawImageAlpha(image, x, y, alpha) {
    image.setAlpha(alpha);
    try {
        image.draw(x, y);
    }
    finally {
        image.setAlpha(1);
    }
}
function drawLocal(image, x, y, angle, scaleX, scaleY, drawX, drawY) {
    const g = currentGraphics();
    g.pushTransform();
    try {
        g.translate(x, y);
        g.rotate(0, 0, angle);
        g.scale(scaleX, scaleY);
        image.draw(drawX, drawY);
    }
    finally {
        g.popTransform();
    }
}
function drawLocalAlpha(image, x, y, angle, scaleX, scaleY, drawX, drawY, alpha) {
    image.setAlpha(alpha);
    try {
        drawLocal(image, x, y, angle, scaleX, scaleY, drawX, drawY);
    }
    finally {
        image.setAlpha(1);
    }
}
/**
 * Java counterpart: repeated source sprite drawing helpers.
 *
 * Neutral transform/alpha recipes for future game-local helper ports.
 */
export class SpriteDrawing {
    /** Java counterpart: draw(Image, x, y). */
    static draw(image, x, y) {
        image.draw(x, y);
    }
    /** Java counterpart: drawAlpha(Image, x, y, alpha). */
    static drawAlpha(image, x, y, alpha) {
        drawImageAlpha(image, x, y, alpha);
    }
    /** Java counterpart: drawOffset overloads. */
    static drawOffset(image, x, y, alpha) {
        if (alpha === undefined) {
            image.draw(x, y);
        }
        else {
            drawImageAlpha(image, x, y, alpha);
        }
    }
    /** Browser convenience helper: draws after subtracting an explicit camera/scroll offset. */
    static drawCameraOffset(image, x, y, offsetX, offsetY, alpha) {
        const drawX = x - offsetX;
        const drawY = y - offsetY;
        if (alpha === undefined) {
            image.draw(drawX, drawY);
        }
        else {
            drawImageAlpha(image, drawX, drawY, alpha);
        }
    }
    /** Java counterpart: drawFaded(Image, x, y, alpha). */
    static drawFaded(image, x, y, alpha) {
        SpriteDrawing.drawAlpha(image, x, y, alpha);
    }
    /** Java counterpart: drawRotated overloads. */
    static drawRotated(image, x, y, a, b, c, d, e) {
        let centerX = -image.getWidth() * 0.5;
        let centerY = -image.getHeight() * 0.5;
        let angle;
        let scale = 1;
        let alpha;
        if (Array.isArray(a)) {
            centerX = a[0] ?? centerX;
            centerY = a[1] ?? centerY;
            angle = b ?? 0;
        }
        else if (b === undefined) {
            angle = a;
        }
        else {
            centerX = a;
            centerY = b;
            angle = c ?? 0;
            scale = d ?? 1;
            alpha = e;
        }
        if (alpha === undefined) {
            drawLocal(image, x, y, angle, scale, scale, centerX, centerY);
        }
        else {
            drawLocalAlpha(image, x, y, angle, scale, scale, centerX, centerY, alpha);
        }
    }
    /** Java counterpart: drawRotatedAlpha(Image, x, y, angle, alpha). */
    static drawRotatedAlpha(image, x, y, angle, alpha) {
        drawLocalAlpha(image, x, y, angle, 1, 1, -image.getWidth() * 0.5, -image.getHeight() * 0.5, alpha);
    }
    /** Java counterpart: drawRotatedScaled overloads. */
    static drawRotatedScaled(image, x, y, a, b, c, d, e, f) {
        let centerX = -image.getWidth() * 0.5;
        let centerY = -image.getHeight() * 0.5;
        let angle = a;
        let scaleX = b;
        let scaleY = c ?? b;
        let alpha;
        if (d !== undefined && e !== undefined) {
            centerX = a;
            centerY = b;
            angle = c ?? 0;
            scaleX = d;
            scaleY = e;
            alpha = f;
        }
        if (alpha === undefined) {
            drawLocal(image, x, y, angle, scaleX, scaleY, centerX, centerY);
        }
        else {
            drawLocalAlpha(image, x, y, angle, scaleX, scaleY, centerX, centerY, alpha);
        }
    }
    /** Java counterpart: drawCentered overloads. */
    static drawCentered(image, x = 0, y = 0, scale = 1, alpha) {
        const drawX = -image.getWidth() * 0.5;
        const drawY = -image.getHeight() * 0.5;
        if (alpha === undefined) {
            drawLocal(image, x, y, 0, scale, scale, drawX, drawY);
        }
        else {
            drawLocalAlpha(image, x, y, 0, scale, scale, drawX, drawY, alpha);
        }
    }
    /** Java counterpart: drawCenteredAlpha(Image, x, y, alpha). */
    static drawCenteredAlpha(image, x, y, alpha) {
        SpriteDrawing.drawCentered(image, x, y, 1, alpha);
    }
    /** Java counterpart: drawScaled overloads. */
    static drawScaled(image, x, y, scale, alpha) {
        const drawX = -image.getWidth() * 0.5;
        const drawY = -image.getHeight() * 0.5;
        if (alpha === undefined) {
            drawLocal(image, x, y, 0, scale, scale, drawX, drawY);
        }
        else {
            drawLocalAlpha(image, x, y, 0, scale, scale, drawX, drawY, alpha);
        }
    }
    /** Browser convenience helper: draws with explicit top-left width and height. */
    static drawSized(image, x, y, width, height) {
        image.draw(x, y, width, height);
    }
    /** Java counterpart: transform helper around Graphics.translate. */
    static withTranslation(x, y, callback) {
        const g = currentGraphics();
        g.pushTransform();
        try {
            g.translate(x, y);
            callback();
        }
        finally {
            g.popTransform();
        }
    }
    /** Java counterpart: transform helper around Graphics.rotate. */
    static withRotation(x, y, angle, callback) {
        const g = currentGraphics();
        g.pushTransform();
        try {
            g.translate(x, y);
            g.rotate(0, 0, angle);
            callback();
        }
        finally {
            g.popTransform();
        }
    }
    /** Java counterpart: transform helper around Graphics.scale. */
    static withScale(x, y, scaleX, scaleY, callback) {
        const g = currentGraphics();
        g.pushTransform();
        try {
            g.translate(x, y);
            g.scale(scaleX, scaleY);
            callback();
        }
        finally {
            g.popTransform();
        }
    }
}
//# sourceMappingURL=SpriteDrawing.js.map