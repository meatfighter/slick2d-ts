import { Color } from "./Color.js";
import { Image } from "./Image.js";
import { SlickException } from "./SlickException.js";
import { identityMatrix3 } from "./rendering/RenderBackend.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import { FastTrig } from "./util/FastTrig.js";
import { CanvasFont } from "./support/CanvasFont.js";
const IDENTITY_TRANSFORM = identityMatrix3();
/**
 * Java Slick2D counterpart: org.newdawn.slick.Graphics.
 *
 * Drawing context facade that delegates to the active WebGL renderer.
 */
export class Graphics {
    static DEFAULT_SEGMENTS = 50;
    static MODE_NORMAL = 1;
    static MODE_ALPHA_MAP = 2;
    static MODE_ALPHA_BLEND = 3;
    static MODE_COLOR_MULTIPLY = 4;
    static MODE_ADD = 5;
    static MODE_SCREEN = 6;
    static current = null;
    static currentStack = [];
    static sharedDefaultFont = null;
    color = Color.white.copy();
    background = Color.black.copy();
    font = Graphics.getSharedDefaultFont();
    defaultFont = this.font;
    lineWidth = 1;
    antiAlias = false;
    drawMode = Graphics.MODE_NORMAL;
    renderContextFastPathStack = [];
    width = 0;
    height = 0;
    screenClipRecord = null;
    worldClipRecord = null;
    pixelScratch = new Uint8Array(4);
    gradientColor1 = Color.white.copy();
    gradientColor2 = Color.white.copy();
    arcPointScratch = [];
    trianglePointScratch = [];
    renderTarget;
    /**
     * Java Slick2D counterpart: Graphics constructors.
     *
     * Creates a graphics context for the active display or a render target.
     */
    constructor(widthOrTarget, height = 0) {
        if (typeof widthOrTarget === "number") {
            this.width = widthOrTarget;
            this.height = height;
            this.renderTarget = null;
        }
        else if (widthOrTarget) {
            this.width = widthOrTarget.width;
            this.height = widthOrTarget.height;
            this.renderTarget = widthOrTarget;
        }
        else {
            this.renderTarget = null;
        }
    }
    /** Java Slick2D counterpart: Graphics.setCurrent(Graphics). */
    static setCurrent(current) {
        if (current !== null) {
            current.applyDrawModeForContext(Renderer.getBackend());
        }
        Graphics.current = current;
    }
    /** Browser parity helper: returns the current graphics context. */
    static getCurrent() {
        return Graphics.current;
    }
    /** @internal Clears static renderer-bound state at an application-container lifecycle boundary. */
    static __resetSharedState() {
        const sharedDefaultFont = Graphics.sharedDefaultFont;
        Graphics.current = null;
        Graphics.currentStack.length = 0;
        Graphics.sharedDefaultFont = null;
        if (sharedDefaultFont instanceof CanvasFont) {
            sharedDefaultFont.dispose();
        }
    }
    /** @internal Enters this Graphics object's complete renderer context. */
    __beginRenderContext() {
        this.beginRenderTarget();
    }
    /** @internal Leaves a context entered by __beginRenderContext(). */
    __endRenderContext() {
        this.endRenderTarget(Renderer.getBackend());
    }
    /** @internal Restores the Java Slick defaults applied before each Game.render() call. */
    __prepareForGameRender() {
        this.resetTransform();
        this.resetFont();
        this.resetLineWidth();
        this.setAntiAlias(false);
    }
    /** Java Slick2D counterpart: Graphics.setDrawMode(int). */
    setDrawMode(mode) {
        const renderer = this.beginRenderTarget(false);
        try {
            this.drawMode = mode;
            this.applyDrawModeForExplicitSet(renderer);
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    /** Java Slick2D counterpart: Graphics.clearAlphaMap(). */
    clearAlphaMap() {
        this.pushTransform();
        Renderer.get().glLoadIdentity();
        const originalMode = this.drawMode;
        try {
            this.setDrawMode(Graphics.MODE_ALPHA_MAP);
            this.setColor(Color.transparent);
            this.fillRect(0, 0, this.width || 1, this.height || 1);
            this.setColor(this.color);
            this.setDrawMode(originalMode);
        }
        finally {
            this.popTransform();
        }
    }
    /** Java Slick2D counterpart: Graphics.flush(). */
    flush() {
        Renderer.get().flush();
    }
    /** Browser extension: toggles RGB inversion for subsequent renderer draw calls. */
    setColorInverted(inverted) {
        Renderer.getBackend().setColorInverted(inverted);
    }
    /** Browser extension: reports the active renderer RGB inversion state. */
    isColorInverted() {
        return Renderer.getBackend().isColorInverted();
    }
    /**
     * Browser extension: maps rendered luminance between two replacement colors.
     *
     * Source black maps to blackReplacement and source white maps to
     * whiteReplacement. Alpha is preserved.
     */
    setMonochromePalette(blackReplacement, whiteReplacement) {
        Renderer.getBackend().setMonochromePalette(blackReplacement, whiteReplacement);
    }
    /** Browser extension: restores the renderer programs active before the monochrome palette. */
    clearMonochromePalette() {
        Renderer.getBackend().clearMonochromePalette();
    }
    /** Browser extension: reports whether the optional monochrome palette renderer is active. */
    isMonochromePaletteEnabled() {
        return Renderer.getBackend().isMonochromePaletteEnabled();
    }
    /** Java Slick2D counterpart: Graphics.getFont(). */
    getFont() {
        return this.font;
    }
    /** Java Slick2D counterpart: Graphics.setFont(Font). */
    setFont(font) {
        this.font = font;
    }
    /** Java Slick2D counterpart: Graphics.resetFont(). */
    resetFont() {
        this.font = this.defaultFont;
    }
    /** Java Slick2D counterpart: Graphics.setBackground(Color). */
    setBackground(color) {
        this.background.r = color.r;
        this.background.g = color.g;
        this.background.b = color.b;
        this.background.a = color.a;
    }
    /** Java Slick2D counterpart: Graphics.getBackground(). */
    getBackground() {
        return this.background.copy();
    }
    /** Internal renderer helper: avoids copying the background during the frame loop. */
    __getBackgroundReference() {
        return this.background;
    }
    /** Internal renderer helper: copies background channels without allocating. */
    __copyBackgroundFrom(source) {
        this.background.r = source.background.r;
        this.background.g = source.background.g;
        this.background.b = source.background.b;
        this.background.a = source.background.a;
    }
    /** Java Slick2D counterpart: Graphics.clear(). */
    clear() {
        const renderer = this.beginRenderTarget(false);
        try {
            renderer.flush();
            renderer.clearClip();
            renderer.clearWorldClip();
            renderer.pushFullColorMask();
            try {
                renderer.glClearColor(this.background.r, this.background.g, this.background.b, this.background.a);
                renderer.glClear(renderer.GL_COLOR_BUFFER_BIT);
            }
            finally {
                renderer.popColorMask();
            }
            this.applyClipState(renderer);
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    /** Java Slick2D counterpart: Graphics.resetTransform(). */
    resetTransform() {
        Renderer.get().glLoadIdentity();
    }
    /** Java Slick2D counterpart: Graphics.scale(float, float). */
    scale(x, y) {
        Renderer.getBackend().scale(x, y);
    }
    /** Java Slick2D counterpart: Graphics.rotate(float, float, float). */
    rotate(x, y, angle) {
        Renderer.getBackend().rotate(x, y, angle);
    }
    /** Java Slick2D counterpart: Graphics.translate(float, float). */
    translate(x, y) {
        Renderer.getBackend().translate(x, y);
    }
    /** Java Slick2D counterpart: Graphics.setColor(Color). */
    setColor(color) {
        if (color === null) {
            return;
        }
        this.color.r = color.r;
        this.color.g = color.g;
        this.color.b = color.b;
        this.color.a = color.a;
        this.color.bind();
    }
    /** Java Slick2D counterpart: Graphics.getColor(). */
    getColor() {
        return this.color.copy();
    }
    /** Java Slick2D counterpart: Graphics.drawLine(float, float, float, float). */
    drawLine(x1, y1, x2, y2) {
        const renderer = this.beginRenderTarget();
        try {
            renderer.drawLine(x1, y1, x2, y2, this.color, this.lineWidth, IDENTITY_TRANSFORM);
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    /** Java Slick2D counterpart: Graphics.drawRect(float, float, float, float). */
    drawRect(x, y, width, height) {
        this.drawLine(x, y, x + width, y);
        this.drawLine(x + width, y, x + width, y + height);
        this.drawLine(x + width, y + height, x, y + height);
        this.drawLine(x, y + height, x, y);
    }
    fillRect(x, y, width, height, pattern, offX, offY) {
        if (pattern !== undefined) {
            if (offX === undefined || offY === undefined) {
                throw new SlickException("Graphics.fillRect pattern overload requires offX and offY");
            }
            this.fillPatternRect(x, y, width, height, pattern, offX, offY);
            return;
        }
        const renderer = this.beginRenderTarget();
        try {
            renderer.fillRect(x, y, width, height, this.color, IDENTITY_TRANSFORM);
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    /** Java Slick2D counterpart: Graphics.clearClip(). */
    clearClip() {
        const renderer = this.beginRenderTarget();
        try {
            this.screenClipRecord = null;
            renderer.clearClip();
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    /** Java Slick2D counterpart: Graphics.setClip(int, int, int, int). */
    setClip(x, y, width, height) {
        const renderer = this.beginRenderTarget();
        try {
            this.screenClipRecord = { x, y, width, height };
            renderer.setClip(x, y, width, height);
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    /** Java Slick2D counterpart: Graphics.getClip(). */
    getClip() {
        return this.screenClipRecord === null ? null : { ...this.screenClipRecord };
    }
    /** Java Slick2D counterpart: Graphics.clearWorldClip(). */
    clearWorldClip() {
        const renderer = this.beginRenderTarget();
        try {
            this.applyWorldClip(renderer, null);
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    setWorldClip(xOrClip, y, width, height) {
        const renderer = this.beginRenderTarget();
        try {
            if (xOrClip === null) {
                this.applyWorldClip(renderer, null);
            }
            else if (typeof xOrClip === "object") {
                this.applyWorldClip(renderer, xOrClip);
            }
            else if (y !== undefined && width !== undefined && height !== undefined) {
                this.applyWorldClip(renderer, { x: xOrClip, y, width, height });
            }
            else {
                throw new SlickException("Invalid Graphics.setWorldClip overload");
            }
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    /** Java Slick2D counterpart: Graphics.getWorldClip(). */
    getWorldClip() {
        return this.worldClipRecord === null ? null : { ...this.worldClipRecord };
    }
    drawOval(x, y, width, height, segments = Graphics.DEFAULT_SEGMENTS) {
        this.drawArc(x, y, width, height, segments, 0, 360);
    }
    drawArc(x, y, width, height, a, b, c) {
        const segments = c === undefined ? Graphics.DEFAULT_SEGMENTS : a;
        const start = c === undefined ? a : b;
        const end = c === undefined ? b : c;
        const points = this.buildArcPoints(x, y, width, height, segments, start, end);
        const renderer = this.beginRenderTarget();
        try {
            renderer.drawLineStrip(points, this.color, this.lineWidth, IDENTITY_TRANSFORM);
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    fillOval(x, y, width, height, segments = Graphics.DEFAULT_SEGMENTS) {
        this.fillArc(x, y, width, height, segments, 0, 360);
    }
    fillArc(x, y, width, height, a, b, c) {
        const segments = c === undefined ? Graphics.DEFAULT_SEGMENTS : a;
        const start = c === undefined ? a : b;
        const end = c === undefined ? b : c;
        const boundary = this.buildArcPoints(x, y, width, height, segments, start, end);
        const cx = x + width / 2;
        const cy = y + height / 2;
        const triangles = this.buildArcTriangles(boundary, cx, cy);
        const renderer = this.beginRenderTarget();
        try {
            renderer.fillTriangles(triangles, this.color, IDENTITY_TRANSFORM);
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    drawRoundRect(x, y, width, height, radius, segments = Graphics.DEFAULT_SEGMENTS) {
        const cornerRadius = Graphics.normalizeCornerRadius(width, height, radius);
        if (cornerRadius === 0) {
            this.drawRect(x, y, width, height);
            return;
        }
        const d = cornerRadius * 2;
        this.drawLine(x + cornerRadius, y, x + width - cornerRadius, y);
        this.drawLine(x, y + cornerRadius, x, y + height - cornerRadius);
        this.drawLine(x + width, y + cornerRadius, x + width, y + height - cornerRadius);
        this.drawLine(x + cornerRadius, y + height, x + width - cornerRadius, y + height);
        this.drawArc(x + width - d, y + height - d, d, d, segments, 0, 90);
        this.drawArc(x, y + height - d, d, d, segments, 90, 180);
        this.drawArc(x + width - d, y, d, d, segments, 270, 360);
        this.drawArc(x, y, d, d, segments, 180, 270);
    }
    fillRoundRect(x, y, width, height, radius, segments = Graphics.DEFAULT_SEGMENTS) {
        const cornerRadius = Graphics.normalizeCornerRadius(width, height, radius);
        if (cornerRadius === 0) {
            this.fillRect(x, y, width, height);
            return;
        }
        const d = cornerRadius * 2;
        this.fillRect(x + cornerRadius, y, width - d, cornerRadius);
        this.fillRect(x, y + cornerRadius, cornerRadius, height - d);
        this.fillRect(x + width - cornerRadius, y + cornerRadius, cornerRadius, height - d);
        this.fillRect(x + cornerRadius, y + height - cornerRadius, width - d, cornerRadius);
        this.fillRect(x + cornerRadius, y + cornerRadius, width - d, height - d);
        this.fillArc(x + width - d, y + height - d, d, d, segments, 0, 90);
        this.fillArc(x, y + height - d, d, d, segments, 90, 180);
        this.fillArc(x + width - d, y, d, d, segments, 270, 360);
        this.fillArc(x, y, d, d, segments, 180, 270);
    }
    /** Java Slick2D counterpart: Graphics.setLineWidth(float). */
    setLineWidth(width) {
        this.lineWidth = width;
        Renderer.get().glLineWidth(width);
    }
    /** Java Slick2D counterpart: Graphics.getLineWidth(). */
    getLineWidth() {
        return this.lineWidth;
    }
    /** Java Slick2D counterpart: Graphics.resetLineWidth(). */
    resetLineWidth() {
        this.setLineWidth(1);
    }
    /** Java Slick2D counterpart: Graphics.setAntiAlias(boolean). */
    setAntiAlias(antiAlias) {
        this.antiAlias = antiAlias;
    }
    /** Java Slick2D counterpart: Graphics.isAntiAlias(). */
    isAntiAlias() {
        return this.antiAlias;
    }
    /** Java Slick2D counterpart: Graphics.drawString(String, float, float). */
    drawString(text, x, y) {
        this.font.drawString(x, y, text, this.color);
    }
    drawImage(image, x, y, a, b, c, d, e, f, g) {
        const renderer = this.beginRenderTarget();
        try {
            if (arguments.length === 3) {
                image.draw(x, y, Color.white);
            }
            else if (arguments.length === 4 && a instanceof Color) {
                image.draw(x, y, a);
            }
            else if (arguments.length === 7 && typeof a === "number" && typeof b === "number" && typeof c === "number" && typeof d === "number") {
                image.draw(x, y, a, b, c, d);
            }
            else if (arguments.length === 8 &&
                typeof a === "number" &&
                typeof b === "number" &&
                typeof c === "number" &&
                typeof d === "number" &&
                e instanceof Color) {
                image.draw(x, y, x + image.getWidth(), y + image.getHeight(), a, b, c, d, e);
            }
            else if (arguments.length === 9 &&
                typeof a === "number" &&
                typeof b === "number" &&
                typeof c === "number" &&
                typeof d === "number" &&
                typeof e === "number" &&
                typeof f === "number") {
                image.draw(x, y, a, b, c, d, e, f);
            }
            else if (arguments.length === 10 &&
                typeof a === "number" &&
                typeof b === "number" &&
                typeof c === "number" &&
                typeof d === "number" &&
                typeof e === "number" &&
                typeof f === "number" &&
                g instanceof Color) {
                image.draw(x, y, a, b, c, d, e, f, g);
            }
            else {
                throw new SlickException("Invalid Graphics.drawImage overload");
            }
            this.color.bind();
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    /** Java Slick2D counterpart: Graphics.copyArea(Image, int, int). */
    copyArea(target, x, y) {
        const renderTarget = target.__getRenderTarget();
        if (!renderTarget) {
            throw new SlickException("Graphics.copyArea requires a writable Image target");
        }
        const renderer = this.beginRenderTarget();
        try {
            renderer.copyAreaToRenderTarget(renderTarget, x, y);
        }
        finally {
            this.endRenderTarget(renderer);
        }
        target.ensureInverted();
    }
    /** Java Slick2D counterpart: Graphics.getPixel(int, int). */
    getPixel(x, y) {
        const bytes = this.pixelScratch;
        this.getArea(x, y, 1, 1, bytes);
        return Color.fromInts(bytes[0], bytes[1], bytes[2], bytes[3]);
    }
    getArea(x, y, width, height, target) {
        if (target) {
            if (target.byteLength < width * height * 4) {
                throw new RangeError("Byte buffer provided to get area is not big enough");
            }
            const renderer = this.beginRenderTarget();
            try {
                renderer.readPixels(x, y, width, height, target);
            }
            finally {
                this.endRenderTarget(renderer);
            }
            return;
        }
        const image = new Image(width, height);
        this.copyArea(image, x, y);
        return image;
    }
    drawGradientLine(x1, y1, a, b, c, d, e, f, g, h, i, j) {
        let color1;
        let x2;
        let y2;
        let color2;
        if (a instanceof Color && typeof c === "number" && d instanceof Color) {
            color1 = a;
            x2 = b;
            y2 = c;
            color2 = d;
        }
        else if (typeof a === "number" &&
            typeof c === "number" &&
            e !== undefined &&
            f !== undefined &&
            g !== undefined &&
            h !== undefined &&
            i !== undefined &&
            j !== undefined) {
            color1 = this.gradientColor1;
            color1.r = Math.min(a, 1);
            color1.g = Math.min(b, 1);
            color1.b = Math.min(c, 1);
            color1.a = Math.min(Number(d), 1);
            x2 = e;
            y2 = f;
            color2 = this.gradientColor2;
            color2.r = Math.min(g, 1);
            color2.g = Math.min(h, 1);
            color2.b = Math.min(i, 1);
            color2.a = Math.min(j, 1);
        }
        else {
            throw new SlickException("Invalid Graphics.drawGradientLine overload");
        }
        const renderer = this.beginRenderTarget();
        try {
            renderer.drawGradientLine(x1, y1, color1, x2, y2, color2, this.lineWidth, IDENTITY_TRANSFORM);
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    /** Java Slick2D counterpart: Graphics.pushTransform(). */
    pushTransform() {
        Renderer.getBackend().pushTransform();
    }
    /** Java Slick2D counterpart: Graphics.popTransform(). */
    popTransform() {
        Renderer.getBackend().popTransform();
    }
    /** Java Slick2D counterpart: Graphics.destroy(). */
    destroy() { }
    /** Browser parity helper: updates logical dimensions. */
    setDimensions(width, height) {
        this.width = width;
        this.height = height;
    }
    /** Browser parity helper: returns current draw mode. */
    getDrawMode() {
        return this.drawMode;
    }
    static getSharedDefaultFont() {
        Graphics.sharedDefaultFont ??= new CanvasFont();
        return Graphics.sharedDefaultFont;
    }
    buildArcPoints(x, y, width, height, segments, start, end) {
        const normalizedSegments = Math.trunc(segments);
        if (normalizedSegments <= 0) {
            throw new RangeError("segments must be > 0");
        }
        let normalizedEnd = end;
        while (normalizedEnd < start) {
            normalizedEnd += 360;
        }
        const step = Math.max(1, Math.trunc(360 / normalizedSegments));
        const cx = x + width / 2;
        const cy = y + height / 2;
        let count = 0;
        for (let angleStep = Math.trunc(start); angleStep < Math.trunc(normalizedEnd + step); angleStep += step) {
            const angle = angleStep > normalizedEnd ? normalizedEnd : angleStep;
            const radians = (angle * Math.PI) / 180;
            const point = this.getScratchPoint(this.arcPointScratch, count++);
            point[0] = cx + (FastTrig.cos(radians) * width) / 2;
            point[1] = cy + (FastTrig.sin(radians) * height) / 2;
        }
        this.arcPointScratch.length = count;
        return this.arcPointScratch;
    }
    buildArcTriangles(boundary, cx, cy) {
        let count = 0;
        for (let i = 0; i + 1 < boundary.length; i++) {
            const start = boundary[i];
            const end = boundary[i + 1];
            let point = this.getScratchPoint(this.trianglePointScratch, count++);
            point[0] = cx;
            point[1] = cy;
            point = this.getScratchPoint(this.trianglePointScratch, count++);
            point[0] = start[0];
            point[1] = start[1];
            point = this.getScratchPoint(this.trianglePointScratch, count++);
            point[0] = end[0];
            point[1] = end[1];
        }
        this.trianglePointScratch.length = count;
        return this.trianglePointScratch;
    }
    getScratchPoint(points, index) {
        let point = points[index];
        if (!point) {
            point = [0, 0];
            points[index] = point;
        }
        return point;
    }
    static normalizeCornerRadius(width, height, radius) {
        if (radius < 0) {
            throw new RangeError("corner radius must be > 0");
        }
        const maxRadius = Math.trunc(Math.trunc(Math.min(width, height)) / 2);
        return Math.min(Math.trunc(radius), maxRadius);
    }
    fillPatternRect(x, y, width, height, pattern, offX, offY) {
        const patternWidth = pattern.getWidth();
        const patternHeight = pattern.getHeight();
        if (patternWidth <= 0 || patternHeight <= 0) {
            return;
        }
        const renderer = this.beginRenderTarget();
        const hadWorldClip = this.worldClipRecord !== null;
        const previousX = this.worldClipRecord?.x ?? 0;
        const previousY = this.worldClipRecord?.y ?? 0;
        const previousWidth = this.worldClipRecord?.width ?? 0;
        const previousHeight = this.worldClipRecord?.height ?? 0;
        try {
            this.applyWorldClipValues(renderer, x, y, width, height);
            const cols = Math.trunc(Math.ceil(width / patternWidth)) + 2;
            const rows = Math.trunc(Math.ceil(height / patternHeight)) + 2;
            for (let c = 0; c < cols; c++) {
                const drawX = c * patternWidth + x - offX;
                for (let r = 0; r < rows; r++) {
                    pattern.draw(drawX, r * patternHeight + y - offY);
                }
            }
        }
        finally {
            if (hadWorldClip) {
                this.applyWorldClipValues(renderer, previousX, previousY, previousWidth, previousHeight);
            }
            else {
                this.applyWorldClip(renderer, null);
            }
            this.endRenderTarget(renderer);
        }
    }
    applyWorldClipValues(renderer, x, y, width, height) {
        if (this.worldClipRecord) {
            this.worldClipRecord.x = x;
            this.worldClipRecord.y = y;
            this.worldClipRecord.width = width;
            this.worldClipRecord.height = height;
        }
        else {
            this.worldClipRecord = { x, y, width, height };
        }
        renderer.setWorldClip(x, y, width, height, IDENTITY_TRANSFORM);
    }
    applyWorldClip(renderer, clip) {
        if (clip === null) {
            this.worldClipRecord = null;
            renderer.clearWorldClip();
            return;
        }
        this.applyWorldClipValues(renderer, clip.x, clip.y, clip.width, clip.height);
    }
    withRenderTarget(callback) {
        const renderer = this.beginRenderTarget();
        try {
            return callback();
        }
        finally {
            this.endRenderTarget(renderer);
        }
    }
    beginRenderTarget(activateDrawMode = true) {
        const renderer = Renderer.getBackend();
        this.renderTarget?.markModified?.();
        const reuseActiveContext = Graphics.current === this && renderer.getRenderTarget() === this.renderTarget;
        this.renderContextFastPathStack.push(reuseActiveContext);
        if (reuseActiveContext) {
            return renderer;
        }
        const previous = Graphics.current;
        let renderTargetPushed = false;
        let currentPushed = false;
        let drawModeStatePushed = false;
        try {
            renderer.pushRenderTarget(this.renderTarget);
            renderTargetPushed = true;
            Graphics.currentStack.push(previous);
            currentPushed = true;
            if (previous === this) {
                return renderer;
            }
            renderer.pushDrawModeState();
            drawModeStatePushed = true;
            Graphics.current = this;
            if (activateDrawMode) {
                this.applyDrawModeForContext(renderer);
            }
            this.applyClipState(renderer);
            return renderer;
        }
        catch (error) {
            this.renderContextFastPathStack.pop();
            Graphics.current = previous;
            if (currentPushed) {
                Graphics.currentStack.pop();
            }
            try {
                if (drawModeStatePushed) {
                    renderer.popDrawModeState();
                }
            }
            finally {
                if (renderTargetPushed) {
                    renderer.popRenderTarget();
                }
            }
            throw error;
        }
    }
    endRenderTarget(renderer) {
        const reusedActiveContext = this.renderContextFastPathStack.pop();
        if (reusedActiveContext === undefined) {
            throw new SlickException("Graphics render-context stack underflow");
        }
        if (reusedActiveContext) {
            return;
        }
        const previous = Graphics.currentStack.pop();
        if (previous === undefined) {
            throw new SlickException("Graphics current stack underflow");
        }
        const contextChanged = previous !== this;
        try {
            renderer.popRenderTarget();
        }
        finally {
            Graphics.current = previous;
            if (contextChanged) {
                try {
                    if (previous === null) {
                        renderer.clearClip();
                        renderer.clearWorldClip();
                    }
                    else {
                        previous.applyClipState(renderer);
                    }
                }
                finally {
                    renderer.popDrawModeState();
                }
            }
        }
    }
    applyDrawModeForContext(renderer) {
        if (this.drawMode === Graphics.MODE_NORMAL) {
            renderer.__applyDrawModeState(true, renderer.GL_SRC_ALPHA, renderer.GL_ONE_MINUS_SRC_ALPHA, 0b1111, renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_ALPHA);
        }
        else if (this.drawMode === Graphics.MODE_ALPHA_MAP) {
            renderer.__applyDrawModeState(false, null, null, 0b1000, null, null);
        }
        else if (this.drawMode === Graphics.MODE_ALPHA_BLEND) {
            renderer.__applyDrawModeState(true, renderer.GL_DST_ALPHA, renderer.GL_ONE_MINUS_DST_ALPHA, 0b0111, renderer.GL_DST_ALPHA, renderer.GL_ONE_MINUS_DST_ALPHA);
        }
        else if (this.drawMode === Graphics.MODE_COLOR_MULTIPLY) {
            renderer.__applyDrawModeState(true, renderer.GL_ONE_MINUS_SRC_COLOR, renderer.GL_SRC_COLOR, 0b1111, renderer.GL_ONE_MINUS_SRC_COLOR, renderer.GL_SRC_COLOR);
        }
        else if (this.drawMode === Graphics.MODE_ADD) {
            renderer.__applyDrawModeState(true, renderer.GL_ONE, renderer.GL_ONE, 0b1111, renderer.GL_ONE, renderer.GL_ONE);
        }
        else if (this.drawMode === Graphics.MODE_SCREEN) {
            renderer.__applyDrawModeState(true, renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR, 0b1111, renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR);
        }
    }
    applyDrawModeForExplicitSet(renderer) {
        if (this.drawMode === Graphics.MODE_NORMAL) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, true);
            renderer.glBlendFunc(renderer.GL_SRC_ALPHA, renderer.GL_ONE_MINUS_SRC_ALPHA, renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_ALPHA);
        }
        else if (this.drawMode === Graphics.MODE_ALPHA_MAP) {
            renderer.glDisable(renderer.GL_BLEND);
            renderer.glColorMask(false, false, false, true);
        }
        else if (this.drawMode === Graphics.MODE_ALPHA_BLEND) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, false);
            renderer.glBlendFunc(renderer.GL_DST_ALPHA, renderer.GL_ONE_MINUS_DST_ALPHA);
        }
        else if (this.drawMode === Graphics.MODE_COLOR_MULTIPLY) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, true);
            renderer.glBlendFunc(renderer.GL_ONE_MINUS_SRC_COLOR, renderer.GL_SRC_COLOR);
        }
        else if (this.drawMode === Graphics.MODE_ADD) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, true);
            renderer.glBlendFunc(renderer.GL_ONE, renderer.GL_ONE);
        }
        else if (this.drawMode === Graphics.MODE_SCREEN) {
            renderer.glEnable(renderer.GL_BLEND);
            renderer.glColorMask(true, true, true, true);
            renderer.glBlendFunc(renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR);
        }
    }
    applyClipState(renderer) {
        const screenClip = this.screenClipRecord;
        if (screenClip === null) {
            renderer.clearClip();
        }
        else {
            renderer.setClip(screenClip.x, screenClip.y, screenClip.width, screenClip.height);
        }
        const worldClip = this.worldClipRecord;
        if (worldClip === null) {
            renderer.clearWorldClip();
        }
        else {
            renderer.setWorldClip(worldClip.x, worldClip.y, worldClip.width, worldClip.height, IDENTITY_TRANSFORM);
        }
    }
}
//# sourceMappingURL=Graphics.js.map