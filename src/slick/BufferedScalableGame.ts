import type { Game } from "./Game.js";
import type { GameContainer } from "./GameContainer.js";
import { Graphics } from "./Graphics.js";
import { Image } from "./Image.js";
import type { InputListener } from "./InputListener.js";
import { Renderer } from "./opengl/renderer/Renderer.js";

function isInputListener(value: unknown): value is InputListener {
    const candidate = value as Partial<InputListener> | null | undefined;
    return (
        candidate !== null &&
        candidate !== undefined &&
        typeof candidate.setInput === "function" &&
        typeof candidate.isAcceptingInput === "function" &&
        typeof candidate.keyPressed === "function" &&
        typeof candidate.mousePressed === "function" &&
        typeof candidate.controllerButtonPressed === "function"
    );
}

function validateNativeDimension(name: string, value: number): void {
    if (!Number.isInteger(value) || value <= 0) {
        throw new RangeError(`BufferedScalableGame ${name} must be a positive integer`);
    }
}

export enum BufferedScalingMode {
    Nearest = "nearest",
    Linear = "linear",
    Integer = "integer"
}

function validateScalingMode(mode: BufferedScalingMode): BufferedScalingMode {
    switch (mode) {
        case BufferedScalingMode.Nearest:
        case BufferedScalingMode.Linear:
        case BufferedScalingMode.Integer:
            return mode;
        default:
            throw new RangeError(`Unsupported BufferedScalableGame scaling mode: ${String(mode)}`);
    }
}

type BackingSizeContainer = GameContainer & {
    getBackingWidth(): number;
    getBackingHeight(): number;
};

function hasBackingSize(container: GameContainer): container is BackingSizeContainer {
    const candidate = container as Partial<BackingSizeContainer>;
    return typeof candidate.getBackingWidth === "function" && typeof candidate.getBackingHeight === "function";
}

function getBackingDimension(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? Math.max(1, Math.trunc(value)) : fallback;
}

export interface BufferedScalableGameOptions {
    readonly maintainAspect?: boolean;
    readonly sourceX?: number;
    readonly sourceY?: number;
    readonly sourceWidth?: number;
    readonly sourceHeight?: number;
    readonly scalingMode?: BufferedScalingMode;
}

export interface BufferedPresentationInfo {
    readonly scalingMode: BufferedScalingMode;
    readonly logicalX: number;
    readonly logicalY: number;
    readonly logicalWidth: number;
    readonly logicalHeight: number;
    readonly physicalX: number;
    readonly physicalY: number;
    readonly physicalWidth: number;
    readonly physicalHeight: number;
    readonly scaleX: number;
    readonly scaleY: number;
    readonly integerScale: number | null;
    readonly filter: number;
}

type PhysicalPresentation = {
    x: number;
    y: number;
    width: number;
    height: number;
    integerScale: number | null;
    filter: number;
};

type PhysicalRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/**
 * Browser extension: renders a fixed-size game into a native-resolution image,
 * then presents the completed frame to the display.
 */
export class BufferedScalableGame implements Game {
    protected readonly held: Game;
    protected readonly normalWidth: number;
    protected readonly normalHeight: number;
    protected readonly maintainAspect: boolean;
    protected container: GameContainer | null = null;
    protected targetWidth = 0;
    protected targetHeight = 0;
    protected xoffset = 0;
    protected yoffset = 0;

    private sourceX: number;
    private sourceY: number;
    private sourceWidth: number;
    private sourceHeight: number;
    private scalingMode: BufferedScalingMode;
    private nativeFrame: Image | null = null;
    private nativeGraphics: Graphics | null = null;
    private lastContainerWidth = -1;
    private lastContainerHeight = -1;
    private lastBackingWidth = -1;
    private lastBackingHeight = -1;
    private presentationInfo: BufferedPresentationInfo = Object.freeze({
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

    public constructor(held: Game, normalWidth: number, normalHeight: number);
    public constructor(held: Game, normalWidth: number, normalHeight: number, maintainAspect: boolean);
    public constructor(held: Game, normalWidth: number, normalHeight: number, options: BufferedScalableGameOptions);
    public constructor(held: Game, normalWidth: number, normalHeight: number, maintainAspectOrOptions: boolean | BufferedScalableGameOptions = false) {
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

    public init(container: GameContainer): void | Promise<void> {
        this.container = container;
        this.releaseNativeFrame();

        const nativeFrame = new Image(this.normalWidth, this.normalHeight, this.getConfiguredPresentationFilter());
        try {
            nativeFrame.setFilter(this.getConfiguredPresentationFilter());
            nativeFrame.ensureInverted();
            this.nativeGraphics = nativeFrame.getGraphics();
            this.nativeFrame = nativeFrame;
        } catch (error) {
            nativeFrame.destroy();
            throw error;
        }

        this.recalculateScale();
        if (isInputListener(this.held)) {
            container.getInput().addListener(this.held);
        }
        return this.held.init(container);
    }

    public update(container: GameContainer, delta: number): void {
        this.container = container;
        this.recalculateScaleIfNeeded(container);
        this.held.update(container, delta);
    }

    public render(container: GameContainer, screenGraphics: Graphics): void {
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
            } finally {
                renderer.popColorMask();
            }

            this.held.render(container, nativeGraphics);
            nativeGraphics.flush();
        } finally {
            try {
                if (nativeTransformPushed) {
                    try {
                        nativeGraphics.clearClip();
                        nativeGraphics.clearWorldClip();
                    } finally {
                        renderer.popTransform();
                    }
                }
            } finally {
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
                    nativeFrame.draw(
                        this.xoffset,
                        this.yoffset,
                        this.xoffset + this.targetWidth,
                        this.yoffset + this.targetHeight,
                        this.sourceX,
                        this.sourceY,
                        this.sourceX + this.sourceWidth,
                        this.sourceY + this.sourceHeight
                    );
                } finally {
                    if (colorEffectsActive) {
                        renderer.popGlobalColorEffects();
                    }
                }
            } finally {
                renderer.popDrawModeState();
            }
        } finally {
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

    protected renderOverlay(_container: GameContainer, _g: Graphics): void {}

    public recalculateScale(): void {
        this.recalculatePresentation();
    }

    public setScalingMode(mode: BufferedScalingMode): void {
        const nextMode = validateScalingMode(mode);
        if (this.scalingMode === nextMode) {
            return;
        }

        this.scalingMode = nextMode;
        this.recalculateScale();
    }

    public getScalingMode(): BufferedScalingMode {
        return this.scalingMode;
    }

    public getPresentationInfo(): Readonly<BufferedPresentationInfo> {
        return this.presentationInfo;
    }

    public containerSizeChanged(container: GameContainer): void {
        this.container = container;
        this.recalculateScale();
    }

    public setSourceRectangle(x: number, y: number, width: number, height: number): void {
        this.validateSourceRectangle(x, y, width, height);
        this.sourceX = x;
        this.sourceY = y;
        this.sourceWidth = width;
        this.sourceHeight = height;
        this.recalculateScale();
    }

    public closeRequested(): boolean {
        return this.held.closeRequested();
    }

    public getTitle(): string {
        return this.held.getTitle();
    }

    public getNormalWidth(): number {
        return this.normalWidth;
    }

    public getNormalHeight(): number {
        return this.normalHeight;
    }

    private recalculatePresentation(): void {
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

    private recalculateScaleIfNeeded(container: GameContainer): void {
        const width = Math.max(1, Math.trunc(container.getWidth()));
        const height = Math.max(1, Math.trunc(container.getHeight()));
        const backingWidth = this.getBackingWidth(container, width);
        const backingHeight = this.getBackingHeight(container, height);
        if (
            width !== this.lastContainerWidth ||
            height !== this.lastContainerHeight ||
            backingWidth !== this.lastBackingWidth ||
            backingHeight !== this.lastBackingHeight
        ) {
            this.recalculateScale();
        }
    }

    private calculatePhysicalPresentation(availableWidth: number, availableHeight: number): PhysicalPresentation {
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

    private calculateAspectFitPhysicalRect(availableWidth: number, availableHeight: number): PhysicalRect {
        const scale = Math.min(availableWidth / this.sourceWidth, availableHeight / this.sourceHeight);
        const width = this.sourceWidth * scale;
        const height = this.sourceHeight * scale;
        return this.snapPhysicalRect((availableWidth - width) / 2, (availableHeight - height) / 2, width, height, availableWidth, availableHeight);
    }

    private snapPhysicalRect(x: number, y: number, width: number, height: number, availableWidth: number, availableHeight: number): PhysicalRect {
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

    private applyPresentationFilter(filter: number): void {
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

    private getConfiguredPresentationFilter(): number {
        return this.scalingMode === BufferedScalingMode.Linear ? Image.FILTER_LINEAR : Image.FILTER_NEAREST;
    }

    private getBackingWidth(container: GameContainer, fallback: number): number {
        return hasBackingSize(container) ? getBackingDimension(container.getBackingWidth(), fallback) : fallback;
    }

    private getBackingHeight(container: GameContainer, fallback: number): number {
        return hasBackingSize(container) ? getBackingDimension(container.getBackingHeight(), fallback) : fallback;
    }

    private releaseNativeFrame(): void {
        this.nativeGraphics = null;
        this.nativeFrame?.destroy();
        this.nativeFrame = null;
    }

    private validateSourceRectangle(x: number, y: number, width: number, height: number): void {
        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            x < 0 ||
            y < 0 ||
            width <= 0 ||
            height <= 0 ||
            x + width > this.normalWidth ||
            y + height > this.normalHeight
        ) {
            throw new RangeError("BufferedScalableGame source rectangle is outside the native frame");
        }
    }
}
