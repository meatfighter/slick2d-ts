import { Graphics } from "./Graphics.js";
import { Image } from "./Image.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
function isInputListener(value) {
    const candidate = value;
    return (candidate !== null &&
        candidate !== undefined &&
        typeof candidate.setInput === "function" &&
        typeof candidate.isAcceptingInput === "function" &&
        typeof candidate.keyPressed === "function" &&
        typeof candidate.mousePressed === "function" &&
        typeof candidate.controllerButtonPressed === "function");
}
function validateNativeDimension(name, value) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new RangeError(`BufferedScalableGame ${name} must be a positive integer`);
    }
}
/**
 * Browser extension: renders a fixed-size game into a native-resolution image,
 * then presents the completed frame to the display.
 */
export class BufferedScalableGame {
    held;
    normalWidth;
    normalHeight;
    maintainAspect;
    container = null;
    targetWidth = 0;
    targetHeight = 0;
    xoffset = 0;
    yoffset = 0;
    sourceX;
    sourceY;
    sourceWidth;
    sourceHeight;
    nativeFrame = null;
    nativeGraphics = null;
    lastContainerWidth = -1;
    lastContainerHeight = -1;
    constructor(held, normalWidth, normalHeight, maintainAspectOrOptions = false) {
        validateNativeDimension("width", normalWidth);
        validateNativeDimension("height", normalHeight);
        this.held = held;
        this.normalWidth = normalWidth;
        this.normalHeight = normalHeight;
        const options = typeof maintainAspectOrOptions === "boolean" ? { maintainAspect: maintainAspectOrOptions } : maintainAspectOrOptions;
        this.maintainAspect = options.maintainAspect ?? false;
        this.sourceX = options.sourceX ?? 0;
        this.sourceY = options.sourceY ?? 0;
        this.sourceWidth = options.sourceWidth ?? normalWidth;
        this.sourceHeight = options.sourceHeight ?? normalHeight;
        this.validateSourceRectangle(this.sourceX, this.sourceY, this.sourceWidth, this.sourceHeight);
    }
    init(container) {
        this.container = container;
        this.releaseNativeFrame();
        const nativeFrame = new Image(this.normalWidth, this.normalHeight, Image.FILTER_NEAREST);
        try {
            nativeFrame.setFilter(Image.FILTER_NEAREST);
            nativeFrame.ensureInverted();
            this.nativeGraphics = nativeFrame.getGraphics();
            this.nativeFrame = nativeFrame;
        }
        catch (error) {
            nativeFrame.destroy();
            throw error;
        }
        this.recalculateScale();
        if (isInputListener(this.held)) {
            container.getInput().addListener(this.held);
        }
        return this.held.init(container);
    }
    update(container, delta) {
        this.container = container;
        this.recalculateScaleIfNeeded(container);
        this.held.update(container, delta);
    }
    render(container, screenGraphics) {
        this.container = container;
        this.recalculateScaleIfNeeded(container);
        const nativeFrame = this.nativeFrame;
        const nativeGraphics = this.nativeGraphics;
        const nativeTarget = nativeFrame?.__getRenderTarget() ?? null;
        if (nativeFrame === null || nativeGraphics === null || nativeTarget === null) {
            return;
        }
        const renderer = Renderer.getBackend();
        const previousGraphics = Graphics.getCurrent();
        renderer.pushRenderTarget(nativeTarget);
        let nativeDrawModeStatePushed = false;
        let nativeTransformPushed = false;
        try {
            renderer.pushDrawModeState();
            nativeDrawModeStatePushed = true;
            Graphics.setCurrent(nativeGraphics);
            renderer.pushTransform();
            nativeTransformPushed = true;
            nativeGraphics.resetTransform();
            nativeGraphics.clearClip();
            nativeGraphics.clearWorldClip();
            nativeGraphics.setBackground(screenGraphics.getBackground());
            // The native Graphics draw mode is persistent; clear under normal draw state.
            renderer.pushNormalDrawModeState();
            try {
                nativeGraphics.clear();
            }
            finally {
                renderer.popDrawModeState();
            }
            this.held.render(container, nativeGraphics);
            nativeGraphics.flush();
        }
        finally {
            try {
                if (nativeTransformPushed) {
                    try {
                        nativeGraphics.clearClip();
                        nativeGraphics.clearWorldClip();
                    }
                    finally {
                        renderer.popTransform();
                    }
                }
            }
            finally {
                Graphics.setCurrent(previousGraphics);
                try {
                    if (nativeDrawModeStatePushed) {
                        renderer.popDrawModeState();
                    }
                }
                finally {
                    renderer.popRenderTarget();
                }
            }
        }
        const previousScreenClip = screenGraphics.getClip();
        const previousWorldClip = screenGraphics.getWorldClip();
        screenGraphics.pushTransform();
        try {
            screenGraphics.resetTransform();
            screenGraphics.clearWorldClip();
            screenGraphics.setClip(this.xoffset, this.yoffset, this.targetWidth, this.targetHeight);
            // Held-game draw state and effects are already baked into nativeFrame.
            renderer.pushNormalDrawModeState();
            try {
                renderer.pushGlobalColorEffectsDisabled();
                try {
                    nativeFrame.draw(this.xoffset, this.yoffset, this.xoffset + this.targetWidth, this.yoffset + this.targetHeight, this.sourceX, this.sourceY, this.sourceX + this.sourceWidth, this.sourceY + this.sourceHeight);
                }
                finally {
                    renderer.popGlobalColorEffects();
                }
            }
            finally {
                renderer.popDrawModeState();
            }
        }
        finally {
            if (previousScreenClip === null) {
                screenGraphics.clearClip();
            }
            else {
                screenGraphics.setClip(previousScreenClip.x, previousScreenClip.y, previousScreenClip.width, previousScreenClip.height);
            }
            if (previousWorldClip === null) {
                screenGraphics.clearWorldClip();
            }
            else {
                screenGraphics.setWorldClip(previousWorldClip);
            }
            screenGraphics.popTransform();
        }
        this.renderOverlay(container, screenGraphics);
    }
    renderOverlay(_container, _g) { }
    recalculateScale() {
        const container = this.container;
        if (container === null) {
            return;
        }
        this.lastContainerWidth = Math.max(1, Math.trunc(container.getWidth()));
        this.lastContainerHeight = Math.max(1, Math.trunc(container.getHeight()));
        this.targetWidth = this.lastContainerWidth;
        this.targetHeight = this.lastContainerHeight;
        if (this.maintainAspect) {
            const scale = Math.min(this.targetWidth / this.sourceWidth, this.targetHeight / this.sourceHeight);
            this.targetWidth = Math.max(1, Math.trunc(this.sourceWidth * scale));
            this.targetHeight = Math.max(1, Math.trunc(this.sourceHeight * scale));
        }
        this.xoffset = Math.trunc((this.lastContainerWidth - this.targetWidth) / 2);
        this.yoffset = Math.trunc((this.lastContainerHeight - this.targetHeight) / 2);
        const inputScaleX = this.sourceWidth / this.targetWidth;
        const inputScaleY = this.sourceHeight / this.targetHeight;
        container.getInput().setScale(inputScaleX, inputScaleY);
        container.getInput().setOffset(this.sourceX - this.xoffset * inputScaleX, this.sourceY - this.yoffset * inputScaleY);
    }
    containerSizeChanged(container) {
        this.container = container;
        this.recalculateScale();
    }
    setSourceRectangle(x, y, width, height) {
        this.validateSourceRectangle(x, y, width, height);
        this.sourceX = x;
        this.sourceY = y;
        this.sourceWidth = width;
        this.sourceHeight = height;
        this.recalculateScale();
    }
    closeRequested() {
        return this.held.closeRequested();
    }
    getTitle() {
        return this.held.getTitle();
    }
    getNormalWidth() {
        return this.normalWidth;
    }
    getNormalHeight() {
        return this.normalHeight;
    }
    recalculateScaleIfNeeded(container) {
        const width = Math.max(1, Math.trunc(container.getWidth()));
        const height = Math.max(1, Math.trunc(container.getHeight()));
        if (width !== this.lastContainerWidth || height !== this.lastContainerHeight) {
            this.recalculateScale();
        }
    }
    releaseNativeFrame() {
        this.nativeGraphics = null;
        this.nativeFrame?.destroy();
        this.nativeFrame = null;
    }
    validateSourceRectangle(x, y, width, height) {
        if (!Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            x < 0 ||
            y < 0 ||
            width <= 0 ||
            height <= 0 ||
            x + width > this.normalWidth ||
            y + height > this.normalHeight) {
            throw new RangeError("BufferedScalableGame source rectangle is outside the native frame");
        }
    }
}
//# sourceMappingURL=BufferedScalableGame.js.map