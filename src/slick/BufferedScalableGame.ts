import type { Game } from "./Game.js";
import type { GameContainer } from "./GameContainer.js";
import { Graphics } from "./Graphics.js";
import { Image } from "./Image.js";
import type { InputListener } from "./InputListener.js";
import { Renderer } from "./opengl/renderer/Renderer.js";

function isInputListener(value: unknown): value is InputListener {
    const candidate = value as Partial<InputListener> | null;
    return (
        !!candidate &&
        typeof candidate.setInput === "function" &&
        typeof candidate.isAcceptingInput === "function" &&
        typeof candidate.keyPressed === "function" &&
        typeof candidate.mousePressed === "function" &&
        typeof candidate.controllerButtonPressed === "function"
    );
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
        this.held = held;
        this.normalWidth = normalWidth;
        this.normalHeight = normalHeight;
        const options = typeof maintainAspectOrOptions === "boolean" ? { maintainAspect: maintainAspectOrOptions } : maintainAspectOrOptions;
        this.maintainAspect = options.maintainAspect ?? false;
        this.sourceX = options.sourceX ?? 0;
        this.sourceY = options.sourceY ?? 0;
        this.sourceWidth = options.sourceWidth ?? normalWidth;
        this.sourceHeight = options.sourceHeight ?? normalHeight;
        this.validateSourceRectangle();
    }

    public init(container: GameContainer): void | Promise<void> {
        this.container = container;
        this.nativeFrame = new Image(this.normalWidth, this.normalHeight, Image.FILTER_NEAREST);
        this.nativeFrame.setFilter(Image.FILTER_NEAREST);
        this.nativeFrame.ensureInverted();
        this.nativeGraphics = this.nativeFrame.getGraphics();
        this.recalculateScale();
        if (isInputListener(this.held)) {
            container.getInput().addListener(this.held);
        }
        return this.held.init(container);
    }

    public update(container: GameContainer, delta: number): void {
        this.container = container;
        if (container.getWidth() !== this.lastContainerWidth || container.getHeight() !== this.lastContainerHeight) {
            this.recalculateScale();
        }
        this.held.update(container, delta);
    }

    public render(container: GameContainer, screenGraphics: Graphics): void {
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
            nativeGraphics.clearClip();
            nativeGraphics.clearWorldClip();
        } finally {
            renderer.popTransform();
            Graphics.setCurrent(previousGraphics);
            renderer.popRenderTarget();
        }

        screenGraphics.pushTransform();
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
        this.lastContainerWidth = container.getWidth();
        this.lastContainerHeight = container.getHeight();
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
        this.sourceX = x;
        this.sourceY = y;
        this.sourceWidth = width;
        this.sourceHeight = height;
        this.validateSourceRectangle();
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

    private validateSourceRectangle(): void {
        if (
            this.sourceX < 0 ||
            this.sourceY < 0 ||
            this.sourceWidth <= 0 ||
            this.sourceHeight <= 0 ||
            this.sourceX + this.sourceWidth > this.normalWidth ||
            this.sourceY + this.sourceHeight > this.normalHeight
        ) {
            throw new RangeError("BufferedScalableGame source rectangle is outside the native frame");
        }
    }
}
