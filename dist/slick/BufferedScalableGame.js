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
export var BufferedScalingMode;
(function (BufferedScalingMode) {
    BufferedScalingMode["Nearest"] = "nearest";
    BufferedScalingMode["Linear"] = "linear";
    BufferedScalingMode["Integer"] = "integer";
})(BufferedScalingMode || (BufferedScalingMode = {}));
function validateScalingMode(mode) {
    switch (mode) {
        case BufferedScalingMode.Nearest:
        case BufferedScalingMode.Linear:
        case BufferedScalingMode.Integer:
            return mode;
        default:
            throw new RangeError(`Unsupported BufferedScalableGame scaling mode: ${String(mode)}`);
    }
}
function hasBackingSize(container) {
    const candidate = container;
    return typeof candidate.getBackingWidth === "function" && typeof candidate.getBackingHeight === "function";
}
function getBackingDimension(value, fallback) {
    return Number.isFinite(value) && value > 0 ? Math.max(1, Math.trunc(value)) : fallback;
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
    scalingMode;
    nativeFrame = null;
    nativeGraphics = null;
    lastContainerWidth = -1;
    lastContainerHeight = -1;
    lastBackingWidth = -1;
    lastBackingHeight = -1;
    presentationInfo = Object.freeze({
        filter: Image.FILTER_NEAREST,
        integerScale: null,
        logicalHeight: 0,
        logicalWidth: 0,
        logicalX: 0,
        logicalY: 0,
        physicalHeight: 0,
        physicalWidth: 0,
        physicalX: 0,
        physicalY: 0,
        scaleX: 1,
        scaleY: 1,
        scalingMode: BufferedScalingMode.Nearest
    });
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
        this.scalingMode = validateScalingMode(options.scalingMode ?? BufferedScalingMode.Nearest);
        this.validateSourceRectangle(this.sourceX, this.sourceY, this.sourceWidth, this.sourceHeight);
    }
    init(container) {
        this.container = container;
        this.releaseNativeFrame();
        const nativeFrame = new Image(this.normalWidth, this.normalHeight, this.getConfiguredPresentationFilter());
        try {
            nativeFrame.setFilter(this.getConfiguredPresentationFilter());
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
        nativeGraphics.__beginRenderContext();
        let nativeTransformPushed = false;
        try {
            renderer.pushTransform();
            nativeTransformPushed = true;
            nativeGraphics.resetTransform();
            nativeGraphics.clearClip();
            nativeGraphics.clearWorldClip();
            nativeGraphics.__copyBackgroundFrom(screenGraphics);
            // WebGL clear obeys colorMask but ignores blend state, so widen only
            // the color mask while preserving the native Graphics draw mode.
            const background = nativeGraphics.__getBackgroundReference();
            renderer.pushFullColorMask();
            try {
                renderer.glClearColor(background.r, background.g, background.b, background.a);
                renderer.glClear(renderer.GL_COLOR_BUFFER_BIT);
            }
            finally {
                renderer.popColorMask();
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
                nativeGraphics.__endRenderContext();
            }
        }
        const previousScreenClip = screenGraphics.getClip();
        const previousWorldClip = screenGraphics.getWorldClip();
        screenGraphics.pushTransform();
        try {
            screenGraphics.resetTransform();
            if (previousScreenClip !== null) {
                screenGraphics.clearClip();
            }
            if (previousWorldClip !== null) {
                screenGraphics.clearWorldClip();
            }
            // Held-game draw state and effects are already baked into nativeFrame.
            renderer.pushNormalDrawModeState();
            try {
                const colorEffectsActive = renderer.isColorInverted() || renderer.isMonochromePaletteEnabled();
                if (colorEffectsActive) {
                    renderer.pushGlobalColorEffectsDisabled();
                }
                try {
                    nativeFrame.draw(this.xoffset, this.yoffset, this.xoffset + this.targetWidth, this.yoffset + this.targetHeight, this.sourceX, this.sourceY, this.sourceX + this.sourceWidth, this.sourceY + this.sourceHeight);
                }
                finally {
                    if (colorEffectsActive) {
                        renderer.popGlobalColorEffects();
                    }
                }
            }
            finally {
                renderer.popDrawModeState();
            }
        }
        finally {
            if (previousScreenClip !== null) {
                screenGraphics.setClip(previousScreenClip.x, previousScreenClip.y, previousScreenClip.width, previousScreenClip.height);
            }
            if (previousWorldClip !== null) {
                screenGraphics.setWorldClip(previousWorldClip);
            }
            screenGraphics.popTransform();
        }
        this.renderOverlay(container, screenGraphics);
    }
    renderOverlay(_container, _g) { }
    recalculateScale() {
        this.recalculatePresentation();
    }
    setScalingMode(mode) {
        const nextMode = validateScalingMode(mode);
        if (this.scalingMode === nextMode) {
            return;
        }
        this.scalingMode = nextMode;
        this.recalculateScale();
    }
    getScalingMode() {
        return this.scalingMode;
    }
    getPresentationInfo() {
        return this.presentationInfo;
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
    recalculatePresentation() {
        const container = this.container;
        if (container === null) {
            return;
        }
        this.lastContainerWidth = Math.max(1, Math.trunc(container.getWidth()));
        this.lastContainerHeight = Math.max(1, Math.trunc(container.getHeight()));
        this.lastBackingWidth = this.getBackingWidth(container, this.lastContainerWidth);
        this.lastBackingHeight = this.getBackingHeight(container, this.lastContainerHeight);
        const backingScaleX = this.lastBackingWidth / this.lastContainerWidth;
        const backingScaleY = this.lastBackingHeight / this.lastContainerHeight;
        const physical = this.calculatePhysicalPresentation(this.lastBackingWidth, this.lastBackingHeight);
        this.xoffset = physical.x / backingScaleX;
        this.yoffset = physical.y / backingScaleY;
        this.targetWidth = physical.width / backingScaleX;
        this.targetHeight = physical.height / backingScaleY;
        const inputScaleX = this.sourceWidth / this.targetWidth;
        const inputScaleY = this.sourceHeight / this.targetHeight;
        container.getInput().setScale(inputScaleX, inputScaleY);
        container.getInput().setOffset(this.sourceX - this.xoffset * inputScaleX, this.sourceY - this.yoffset * inputScaleY);
        this.presentationInfo = Object.freeze({
            filter: physical.filter,
            integerScale: physical.integerScale,
            logicalHeight: this.targetHeight,
            logicalWidth: this.targetWidth,
            logicalX: this.xoffset,
            logicalY: this.yoffset,
            physicalHeight: physical.height,
            physicalWidth: physical.width,
            physicalX: physical.x,
            physicalY: physical.y,
            scaleX: physical.width / this.sourceWidth,
            scaleY: physical.height / this.sourceHeight,
            scalingMode: this.scalingMode
        });
        this.applyPresentationFilter(physical.filter);
    }
    recalculateScaleIfNeeded(container) {
        const width = Math.max(1, Math.trunc(container.getWidth()));
        const height = Math.max(1, Math.trunc(container.getHeight()));
        const backingWidth = this.getBackingWidth(container, width);
        const backingHeight = this.getBackingHeight(container, height);
        if (width !== this.lastContainerWidth ||
            height !== this.lastContainerHeight ||
            backingWidth !== this.lastBackingWidth ||
            backingHeight !== this.lastBackingHeight) {
            this.recalculateScale();
        }
    }
    calculatePhysicalPresentation(availableWidth, availableHeight) {
        if (this.scalingMode === BufferedScalingMode.Integer) {
            const integerScale = Math.floor(Math.min(availableWidth / this.sourceWidth, availableHeight / this.sourceHeight));
            if (integerScale >= 1) {
                const width = this.sourceWidth * integerScale;
                const height = this.sourceHeight * integerScale;
                return {
                    filter: Image.FILTER_NEAREST,
                    height,
                    integerScale,
                    width,
                    x: Math.floor((availableWidth - width) / 2),
                    y: Math.floor((availableHeight - height) / 2)
                };
            }
            return {
                ...this.calculateAspectFitPhysicalRect(availableWidth, availableHeight),
                filter: Image.FILTER_LINEAR,
                integerScale: null
            };
        }
        const filter = this.getConfiguredPresentationFilter();
        if (!this.maintainAspect) {
            return {
                filter,
                height: availableHeight,
                integerScale: null,
                width: availableWidth,
                x: 0,
                y: 0
            };
        }
        return {
            ...this.calculateAspectFitPhysicalRect(availableWidth, availableHeight),
            filter,
            integerScale: null
        };
    }
    calculateAspectFitPhysicalRect(availableWidth, availableHeight) {
        const scale = Math.min(availableWidth / this.sourceWidth, availableHeight / this.sourceHeight);
        const width = this.sourceWidth * scale;
        const height = this.sourceHeight * scale;
        return this.snapPhysicalRect((availableWidth - width) / 2, (availableHeight - height) / 2, width, height, availableWidth, availableHeight);
    }
    snapPhysicalRect(x, y, width, height, availableWidth, availableHeight) {
        const x1 = Math.max(0, Math.min(availableWidth - 1, Math.round(x)));
        const y1 = Math.max(0, Math.min(availableHeight - 1, Math.round(y)));
        const x2 = Math.max(x1 + 1, Math.min(availableWidth, Math.round(x + width)));
        const y2 = Math.max(y1 + 1, Math.min(availableHeight, Math.round(y + height)));
        return {
            height: y2 - y1,
            width: x2 - x1,
            x: x1,
            y: y1
        };
    }
    applyPresentationFilter(filter) {
        const nativeFrame = this.nativeFrame;
        if (nativeFrame === null || nativeFrame.getFilter() === filter) {
            return;
        }
        const renderer = Renderer.getBackend();
        const gl = renderer.getContext();
        const textureResource = nativeFrame.__getTextureResource();
        if (gl && textureResource) {
            renderer.flush();
        }
        nativeFrame.setFilter(filter);
        if (gl && textureResource) {
            textureResource.__applyFilterToExistingTexture(gl);
        }
    }
    getConfiguredPresentationFilter() {
        return this.scalingMode === BufferedScalingMode.Linear ? Image.FILTER_LINEAR : Image.FILTER_NEAREST;
    }
    getBackingWidth(container, fallback) {
        return hasBackingSize(container) ? getBackingDimension(container.getBackingWidth(), fallback) : fallback;
    }
    getBackingHeight(container, fallback) {
        return hasBackingSize(container) ? getBackingDimension(container.getBackingHeight(), fallback) : fallback;
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