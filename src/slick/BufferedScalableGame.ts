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

export interface BufferedScalableGameOptions {
    readonly maintainAspect?: boolean;
    readonly sourceX?: number;
    readonly sourceY?: number;
    readonly sourceWidth?: number;
    readonly sourceHeight?: number;
}

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
    private nativeFrame: Image | null = null;
    private nativeGraphics: Graphics | null = null;
    private lastContainerWidth = -1;
    private lastContainerHeight = -1;

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
        this.validateSourceRectangle(this.sourceX, this.sourceY, this.sourceWidth, this.sourceHeight);
    }

    public init(container: GameContainer): void | Promise<void> {
        this.container = container;
        this.releaseNativeFrame();

        const nativeFrame = new Image(this.normalWidth, this.normalHeight, Image.FILTER_NEAREST);
        try {
            nativeFrame.setFilter(Image.FILTER_NEAREST);
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
        const previousGraphics = Graphics.getCurrent();
        renderer.pushRenderTarget(nativeTarget);
        Graphics.setCurrent(nativeGraphics);
        renderer.pushTransform();
        try {
            nativeGraphics.resetTransform();
            nativeGraphics.clearClip();
            nativeGraphics.clearWorldClip();
            nativeGraphics.setBackground(screenGraphics.getBackground());
            nativeGraphics.clear();
            this.held.render(container, nativeGraphics);
            nativeGraphics.flush();
        } finally {
            try {
                nativeGraphics.clearClip();
                nativeGraphics.clearWorldClip();
            } finally {
                renderer.popTransform();
                Graphics.setCurrent(previousGraphics);
                renderer.popRenderTarget();
            }
        }

        screenGraphics.pushTransform();
        try {
            screenGraphics.resetTransform();
            screenGraphics.setClip(this.xoffset, this.yoffset, this.targetWidth, this.targetHeight);
            renderer.pushGlobalColorEffectsDisabled();
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
                renderer.popGlobalColorEffects();
            }
        } finally {
            screenGraphics.clearClip();
            screenGraphics.popTransform();
        }

        this.renderOverlay(container, screenGraphics);
    }

    protected renderOverlay(_container: GameContainer, _g: Graphics): void {}

    public recalculateScale(): void {
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

    private recalculateScaleIfNeeded(container: GameContainer): void {
        const width = Math.max(1, Math.trunc(container.getWidth()));
        const height = Math.max(1, Math.trunc(container.getHeight()));
        if (width !== this.lastContainerWidth || height !== this.lastContainerHeight) {
            this.recalculateScale();
        }
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
