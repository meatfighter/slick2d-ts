import { Mouse } from "../lwjgl/input/Mouse.js";
import { Cursor } from "../lwjgl/input/Cursor.js";
import { AL } from "../lwjgl/openal/AL.js";
import { Display } from "../lwjgl/opengl/Display.js";
import { Color } from "./Color.js";
import type { Game } from "./Game.js";
import { GameContainer } from "./GameContainer.js";
import { Graphics } from "./Graphics.js";
import { Image } from "./Image.js";
import { Music } from "./Music.js";
import { SoundStore } from "./openal/SoundStore.js";
import type { ImageData as SlickImageData } from "./opengl/ImageData.js";
import { InternalTextureLoader } from "./opengl/InternalTextureLoader.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import { SlickException } from "./SlickException.js";
import { Log } from "./util/Log.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

type DomImageData = ImageData;
export type AppGameContainerErrorHandler = (error: Error) => void;
type DisplaySnapshot = {
    width: number;
    height: number;
    screenWidth: number;
    screenHeight: number;
    fullscreen: boolean;
    lastWindowedWidth: number;
    lastWindowedHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    canvasStyleWidth: string;
    canvasStyleHeight: string;
};
type WindowedDisplayMode = {
    width: number;
    height: number;
};
type ResizeAwareGame = Game & {
    containerSizeChanged(container: GameContainer): void;
};

function isCanvas(value: unknown): value is HTMLCanvasElement {
    return typeof HTMLCanvasElement !== "undefined" && value instanceof HTMLCanvasElement;
}

function isElement(value: unknown): value is HTMLElement {
    return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}

function isResizeAwareGame(game: Game): game is ResizeAwareGame {
    return typeof (game as Partial<ResizeAwareGame>).containerSizeChanged === "function";
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.AppGameContainer.
 *
 * Browser RAF-backed application container for Slick-style games.
 */
export class AppGameContainer extends GameContainer {
    protected canvas: HTMLCanvasElement | null = null;
    private title = "";
    private started = false;
    private destroyed = false;
    private animationFrame = 0;
    private lastFrameTime = 0;
    private framesThisSecond = 0;
    private fpsWindowStart = 0;
    private alphaInBackBuffer = true;
    private waitingForResources = false;
    private resourceError: unknown = null;
    private errorHandler: AppGameContainerErrorHandler | null = null;
    private lastWindowedDisplayMode!: WindowedDisplayMode;

    public constructor(game: Game);
    public constructor(game: Game, width: number, height: number, fullscreen: boolean);
    /** Java Slick2D counterpart: AppGameContainer constructors. */
    public constructor(game: Game, width: number = 640, height: number = 480, fullscreen: boolean = false) {
        super(game);
        this.title = game.getTitle();
        this.fullscreen = fullscreen;
        this.updateOnlyWhenVisible = true;
        this.setDimensions(width, height);
        this.lastWindowedDisplayMode = { width, height };
    }

    /** Java Slick2D counterpart: AppGameContainer.supportsAlphaInBackBuffer(). */
    public supportsAlphaInBackBuffer(): boolean {
        return this.alphaInBackBuffer;
    }

    /** Browser parity helper: reports async frame/resource errors to the host page. */
    public setErrorHandler(handler: AppGameContainerErrorHandler | null): void {
        this.errorHandler = handler;
    }

    /** Java Slick2D counterpart: AppGameContainer.setTitle(String). */
    public setTitle(title: string): void {
        this.title = title;
        Display.setTitle(title);
    }

    /** Java Slick2D counterpart: AppGameContainer.setDisplayMode(int, int, boolean). */
    public setDisplayMode(width: number, height: number, fullscreen: boolean): void | Promise<void> {
        const snapshot = this.captureDisplaySnapshot();
        this.setDimensions(width, height);
        if (!fullscreen) {
            this.setLastWindowedDisplayMode(width, height);
        }
        if (this.canvas) {
            this.applyCanvasSize(width, height);
        }
        const fullscreenResult = this.setFullscreenInternal(fullscreen);
        const completeDisplayMode = (): void => {
            if (fullscreen) {
                if (this.isFullscreen()) {
                    this.applyBrowserDisplaySize();
                }
            } else {
                this.fullscreen = false;
                this.applyWindowedDisplayMode(width, height);
            }
        };
        if (fullscreenResult instanceof Promise) {
            const operation = fullscreenResult.then(completeDisplayMode).catch((error) => {
                this.restoreDisplaySnapshot(snapshot);
                throw error instanceof SlickException
                    ? error
                    : new SlickException(`Failed to set display mode: ${width}x${height} fullscreen=${fullscreen}`, error);
            });
            return this.observeAsyncFailure(operation);
        }
        completeDisplayMode();
    }

    /** Java Slick2D counterpart: AppGameContainer.isFullscreen(). */
    public override isFullscreen(): boolean {
        return typeof document !== "undefined" && this.canvas
            ? document.fullscreenElement === this.canvas
            : this.fullscreen;
    }

    /** Java Slick2D counterpart: AppGameContainer.setFullscreen(boolean). */
    public override setFullscreen(fullscreen: boolean): void | Promise<void> {
        const operation = this.setFullscreenInternal(fullscreen);
        return operation instanceof Promise ? this.observeAsyncFailure(operation) : operation;
    }

    private setFullscreenInternal(fullscreen: boolean): void | Promise<void> {
        const previousFullscreen = this.fullscreen;
        this.fullscreen = fullscreen;
        if (!this.canvas || typeof document === "undefined") {
            return;
        }
        if (fullscreen && document.fullscreenElement !== this.canvas && this.canvas.requestFullscreen) {
            return this.canvas.requestFullscreen()
                .then(() => {
                    this.fullscreen = true;
                    this.applyBrowserDisplaySize();
                })
                .catch((error) => {
                    this.fullscreen = previousFullscreen;
                    if (document.fullscreenElement !== this.canvas) {
                        Mouse.restoreNativeCursorAfterForcedFullscreenExit();
                    }
                    throw new SlickException("Failed to enter fullscreen", error);
                });
        }
        if (!fullscreen && document.fullscreenElement === this.canvas && document.exitFullscreen) {
            return document.exitFullscreen()
                .then(() => {
                    this.fullscreen = false;
                    this.applyWindowedDisplayMode();
                    Mouse.restoreNativeCursorAfterForcedFullscreenExit();
                })
                .catch((error) => {
                    this.fullscreen = previousFullscreen;
                    throw new SlickException("Failed to exit fullscreen", error);
                });
        }
        if (fullscreen && document.fullscreenElement === this.canvas) {
            this.applyBrowserDisplaySize();
        } else if (!fullscreen) {
            this.applyWindowedDisplayMode();
            Mouse.restoreNativeCursorAfterForcedFullscreenExit();
        }
    }

    /** Java Slick2D counterpart: AppGameContainer.reinit(). */
    public override async reinit(): Promise<void> {
        const shouldResumeLoop = this.started && !this.destroyed;
        if (this.animationFrame !== 0) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = 0;
        }
        try {
            this.rebuildSystemForReinit();
            await this.game.init(this);
            await ResourceLoader.waitForAll();
            this.resetFrameBookkeeping();
            if (shouldResumeLoop && !this.destroyed) {
                this.animationFrame = requestAnimationFrame(this.loop);
            }
        } catch (error) {
            const reported = this.toError(error, "Failed to reinitialize AppGameContainer");
            this.destroy();
            if (this.errorHandler) {
                this.errorHandler(reported);
                return;
            }
            throw reported;
        }
    }

    /** Java Slick2D counterpart: AppGameContainer.start(). */
    public async start(): Promise<void> {
        if (this.started) {
            return;
        }
        if (typeof document === "undefined") {
            throw new SlickException("AppGameContainer.start requires a browser document");
        }
        this.destroyed = false;
        this.started = true;
        try {
            this.canvas = this.resolveCanvas();
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.canvas.style.width = `${this.width}px`;
            this.canvas.style.height = `${this.height}px`;
            this.canvas.tabIndex = this.canvas.tabIndex < 0 ? 0 : this.canvas.tabIndex;
            this.canvas.focus();
            Mouse.setElement(this.canvas);
            this.input.bindToElement(window);
            this.input.setPreventDefaultElement(this.canvas);
            Display.setActiveContainer(this);
            Display.create();
            Display.setTitle(this.title);
            window.addEventListener("resize", this.handleWindowResize);
            document.addEventListener("fullscreenchange", this.handleFullscreenChange);
            document.addEventListener("visibilitychange", this.handleVisibilityChange);
            Renderer.getBackend().initialize(this.canvas, {
                alpha: true,
                antialias: this.multiSample > 0,
                stencil: GameContainer.stencil
            });
            AL.create();
            await this.game.init(this);
            await ResourceLoader.waitForAll();
            this.resetFrameBookkeeping();
            this.animationFrame = requestAnimationFrame(this.loop);
        } catch (error) {
            const reported = this.toError(error, "Failed to start AppGameContainer");
            this.destroy();
            if (this.errorHandler) {
                this.errorHandler(reported);
                return;
            }
            throw reported;
        }
    }

    /** Java Slick2D counterpart: AppGameContainer.setUpdateOnlyWhenVisible(boolean). */
    public override setUpdateOnlyWhenVisible(updateOnlyWhenVisible: boolean): void {
        super.setUpdateOnlyWhenVisible(updateOnlyWhenVisible);
    }

    /** Java Slick2D counterpart: AppGameContainer.isUpdatingOnlyWhenVisible(). */
    public override isUpdatingOnlyWhenVisible(): boolean {
        return super.isUpdatingOnlyWhenVisible();
    }

    /** Java Slick2D counterpart: AppGameContainer.setIcon(String). */
    public override setIcon(ref: string): void {
        super.setIcon(ref);
        this.applyFavicon(ref);
    }

    /** Java Slick2D counterpart: AppGameContainer.setIcons(String[]). */
    public override setIcons(refs: string[]): void {
        super.setIcons(refs);
        if (refs.length > 0) {
            this.applyFavicon(refs[0]);
        }
    }

    public override setMouseCursor(ref: string, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public override setMouseCursor(data: DomImageData | SlickImageData, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public override setMouseCursor(image: Image, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public override setMouseCursor(cursor: Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    /** Java Slick2D counterpart: AppGameContainer.setMouseCursor(...). */
    public override setMouseCursor(cursorLike: string | DomImageData | SlickImageData | Image | Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void> {
        const setMouseCursor = GameContainer.prototype.setMouseCursor as unknown as (
            this: GameContainer,
            value: string | DomImageData | SlickImageData | Image | Cursor,
            x: number,
            y: number
        ) => void | Promise<void>;
        return setMouseCursor.call(this, cursorLike, hotSpotX, hotSpotY);
    }

    /** Java Slick2D counterpart: AppGameContainer.setAnimatedMouseCursor(...). */
    public override setAnimatedMouseCursor(ref: string, x: number, y: number, width: number, height: number, cursorDelays: number[]): void | Promise<void> {
        return super.setAnimatedMouseCursor(ref, x, y, width, height, cursorDelays);
    }

    /** Java Slick2D counterpart: AppGameContainer.setMouseGrabbed(boolean). */
    public override setMouseGrabbed(grabbed: boolean): void | Promise<void> {
        return super.setMouseGrabbed(grabbed);
    }

    /** Java Slick2D counterpart: AppGameContainer.isMouseGrabbed(). */
    public override isMouseGrabbed(): boolean {
        return super.isMouseGrabbed();
    }

    /** Java Slick2D counterpart: AppGameContainer.hasFocus(). */
    public override hasFocus(): boolean {
        return typeof document === "undefined" || document.hasFocus();
    }

    /** Java Slick2D counterpart: AppGameContainer.getScreenHeight(). */
    public override getScreenHeight(): number {
        return this.canvas?.height ?? this.screenHeight;
    }

    /** Java Slick2D counterpart: AppGameContainer.getScreenWidth(). */
    public override getScreenWidth(): number {
        return this.canvas?.width ?? this.screenWidth;
    }

    /** Java Slick2D counterpart: AppGameContainer.destroy(). */
    public destroy(): void {
        this.destroyed = true;
        this.started = false;
        this.waitingForResources = false;
        this.resourceError = null;
        if (this.animationFrame !== 0) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = 0;
        }
        if (typeof document !== "undefined") {
            this.exitBrowserFullscreenForDestroy();
        }
        this.input.unbind();
        this.input.setPreventDefaultElement(null);
        Mouse.setElement(null);
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.handleWindowResize);
        }
        if (typeof document !== "undefined") {
            document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
            document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        }
        Renderer.getBackend().dispose();
        AL.destroy();
        Display.destroy();
        Display.setActiveContainer(null);
    }

    /** Java Slick2D counterpart: AppGameContainer.setDefaultMouseCursor(). */
    public override setDefaultMouseCursor(): void {
        super.setDefaultMouseCursor();
    }

    /** Browser parity helper used by Display.setDisplayMode. */
    public override setDisplayModeFromDisplay(mode: import("../lwjgl/opengl/DisplayMode.js").DisplayMode): void {
        super.setDisplayModeFromDisplay(mode);
        if (!this.isFullscreen()) {
            this.setLastWindowedDisplayMode(mode.getWidth(), mode.getHeight());
        }
        if (this.canvas) {
            this.applyCanvasSize(mode.getWidth(), mode.getHeight());
        }
    }

    protected override setCssCursor(cursor: string): void {
        if (this.canvas) {
            this.canvas.style.cursor = cursor;
        }
    }

    private readonly loop = (time: number): void => {
        if (this.destroyed) {
            return;
        }
        try {
            this.loopFrame(time);
        } catch (error) {
            this.reportError(error);
        }
    };

    private loopFrame(time: number): void {
        if (this.resourceError) {
            const error = this.resourceError;
            this.resourceError = null;
            this.reportError(error);
            return;
        }
        if (this.waitingForResources) {
            return;
        }
        const visible = typeof document === "undefined" || document.visibilityState !== "hidden";
        if (this.updateOnlyWhenVisible && !visible) {
            this.lastFrameTime = time;
            this.animationFrame = requestAnimationFrame(this.loop);
            return;
        }
        if (!this.shouldProcessTargetFrame(time)) {
            this.animationFrame = requestAnimationFrame(this.loop);
            return;
        }
        const rawDelta = Math.max(0, Math.trunc(time - this.lastFrameTime));
        const delta = this.smoothDeltas && this.getFPS() !== 0 ? Math.trunc(1000 / this.getFPS()) : rawDelta;
        this.lastFrameTime = time;
        this.input.poll(this.width, this.height);
        Music.poll(delta);
        SoundStore.get().poll(delta);
        this.updateGame(delta);
        let waitForResources = ResourceLoader.hasPending();
        if (this.hasFocus() || this.getAlwaysRender()) {
            if (this.clearEachFrame) {
                Renderer.getBackend().beginFrame(this.width, this.height, this.graphics.getBackground());
            } else {
                Renderer.getBackend().beginFrame(this.width, this.height, Color.transparent);
            }
            Graphics.setCurrent(this.graphics);
            this.game.render(this, this.graphics);
            if (this.showFPS) {
                this.graphics.drawString(`FPS: ${this.fps}`, 10, 10);
            }
            Renderer.getBackend().endFrame();
            waitForResources = waitForResources || ResourceLoader.hasPending();
        }
        if (this.targetFrameRate !== -1) {
            Display.sync(this.targetFrameRate);
        }
        this.updateFps(time);
        if (Display.isCloseRequested() && this.game.closeRequested()) {
            this.destroy();
            return;
        }
        if (waitForResources) {
            this.waitForQueuedResources();
            return;
        }
        this.animationFrame = requestAnimationFrame(this.loop);
    }

    private shouldProcessTargetFrame(time: number): boolean {
        if (this.targetFrameRate <= 0) {
            return true;
        }
        return time - this.lastFrameTime >= 1000 / this.targetFrameRate;
    }

    private updateGame(delta: number): void {
        if (this.paused) {
            this.game.update(this, 0);
            return;
        }
        this.storedDelta += delta;
        if (this.storedDelta < this.minimumLogicUpdateInterval) {
            return;
        }
        if (this.maximumLogicUpdateInterval !== 0) {
            const cycles = Math.trunc(this.storedDelta / this.maximumLogicUpdateInterval);
            for (let i = 0; i < cycles; i++) {
                this.game.update(this, this.maximumLogicUpdateInterval);
            }
            const remainder = this.storedDelta % this.maximumLogicUpdateInterval;
            if (remainder > this.minimumLogicUpdateInterval) {
                this.game.update(this, remainder % this.maximumLogicUpdateInterval);
                this.storedDelta = 0;
            } else {
                this.storedDelta = remainder;
            }
        } else {
            this.game.update(this, this.storedDelta);
            this.storedDelta = 0;
        }
    }

    private rebuildSystemForReinit(): void {
        this.waitingForResources = false;
        this.resourceError = null;
        ResourceLoader.clearFailures();
        InternalTextureLoader.get().clear();
        SoundStore.get().clear();
        Renderer.getBackend().dispose();
        if (this.canvas) {
            Renderer.getBackend().initialize(this.canvas, {
                alpha: true,
                antialias: this.multiSample > 0,
                stencil: GameContainer.stencil
            });
        } else {
            Renderer.getBackend().initDisplay(this.width, this.height);
        }
        AL.create();
        Display.setActiveContainer(this);
        Display.create();
        Display.setTitle(this.title);
        this.setMusicVolume(1);
        this.setSoundVolume(1);
        this.graphics = new Graphics(this.width, this.height);
        this.defaultFont = this.graphics.getFont();
        Renderer.get().enterOrtho(this.width, this.height);
        this.resetFrameBookkeeping();
    }

    private resetFrameBookkeeping(): void {
        this.lastFrameTime = this.now();
        this.storedDelta = 0;
        this.framesThisSecond = 0;
        this.fpsWindowStart = this.lastFrameTime;
        this.fps = 0;
        this.waitingForResources = false;
        this.resourceError = null;
    }

    private readonly handleWindowResize = (): void => {
        try {
            if (this.isFullscreen()) {
                this.applyBrowserDisplaySize();
            }
        } catch (error) {
            this.reportError(error);
        }
    };

    private readonly handleFullscreenChange = (): void => {
        try {
            if (!this.canvas || typeof document === "undefined") {
                return;
            }
            if (document.fullscreenElement === this.canvas) {
                this.fullscreen = true;
                this.applyBrowserDisplaySize();
                return;
            }
            this.fullscreen = false;
            this.applyWindowedDisplayMode();
            Mouse.restoreNativeCursorAfterForcedFullscreenExit();
        } catch (error) {
            this.reportError(error);
        }
    };

    private readonly handleVisibilityChange = (): void => {
        if (typeof document !== "undefined" && document.visibilityState !== "hidden") {
            this.lastFrameTime = this.now();
        }
    };

    private resolveCanvas(): HTMLCanvasElement {
        const parent = Display.getParent();
        if (isCanvas(parent)) {
            return parent;
        }
        if (isElement(parent)) {
            const existing = Array.from(parent.children).find(isCanvas);
            if (existing) {
                return existing;
            }
            const canvas = document.createElement("canvas");
            parent.appendChild(canvas);
            return canvas;
        }
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        return canvas;
    }

    private applyFavicon(ref: string): void {
        if (typeof document === "undefined") {
            return;
        }
        const href = ResourceLoader.getResource(ref)?.toString() ?? ref;
        let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }
        link.href = href;
    }

    private updateFps(time: number): void {
        this.framesThisSecond++;
        if (time - this.fpsWindowStart >= 1000) {
            this.fps = this.framesThisSecond;
            this.framesThisSecond = 0;
            this.fpsWindowStart = time;
        }
    }

    private now(): number {
        return typeof performance !== "undefined" ? performance.now() : Date.now();
    }

    private applyCanvasSize(width: number, height: number): void {
        if (!this.canvas) {
            return;
        }
        this.applySizedCanvas(width, height, `${width}px`, `${height}px`, true);
    }

    private applyBrowserDisplaySize(): void {
        if (!this.canvas || typeof window === "undefined") {
            return;
        }
        const width = Math.max(1, Math.trunc(window.innerWidth || this.width));
        const height = Math.max(1, Math.trunc(window.innerHeight || this.height));
        this.applySizedCanvas(width, height, "100vw", "100vh", true);
    }

    private applyWindowedDisplayMode(width: number = this.lastWindowedDisplayMode.width, height: number = this.lastWindowedDisplayMode.height, notify: boolean = true): void {
        if (!this.canvas) {
            this.setDimensions(width, height);
            return;
        }
        this.applySizedCanvas(width, height, `${width}px`, `${height}px`, notify);
    }

    private applySizedCanvas(width: number, height: number, styleWidth: string, styleHeight: string, notify: boolean): void {
        if (!this.canvas) {
            return;
        }
        const normalizedWidth = Math.max(1, Math.trunc(width));
        const normalizedHeight = Math.max(1, Math.trunc(height));
        const changed = this.width !== normalizedWidth
            || this.height !== normalizedHeight
            || this.canvas.width !== normalizedWidth
            || this.canvas.height !== normalizedHeight
            || this.canvas.style.width !== styleWidth
            || this.canvas.style.height !== styleHeight;
        this.setDimensions(normalizedWidth, normalizedHeight);
        this.canvas.width = normalizedWidth;
        this.canvas.height = normalizedHeight;
        this.canvas.style.width = styleWidth;
        this.canvas.style.height = styleHeight;
        Renderer.getBackend().initDisplay(normalizedWidth, normalizedHeight);
        if (notify && changed) {
            Display.markResized(normalizedWidth, normalizedHeight);
            this.notifyContainerSizeChanged();
        }
    }

    private setLastWindowedDisplayMode(width: number, height: number): void {
        this.lastWindowedDisplayMode = {
            width: Math.max(1, Math.trunc(width)),
            height: Math.max(1, Math.trunc(height))
        };
    }

    private exitBrowserFullscreenForDestroy(): void {
        if (!this.canvas || typeof document === "undefined") {
            return;
        }
        this.fullscreen = false;
        this.applyWindowedDisplayMode(undefined, undefined, false);
        Mouse.restoreNativeCursorAfterForcedFullscreenExit();
        if (document.fullscreenElement === this.canvas && document.exitFullscreen) {
            void document.exitFullscreen().catch(() => {
            });
        }
    }

    private waitForQueuedResources(): void {
        this.waitingForResources = true;
        void ResourceLoader.waitForAll()
            .then(() => {
                this.waitingForResources = false;
                if (!this.destroyed) {
                    this.lastFrameTime = this.now();
                    this.animationFrame = requestAnimationFrame(this.loop);
                }
            })
            .catch((error) => {
                this.waitingForResources = false;
                this.reportError(error);
            });
    }

    private observeAsyncFailure(operation: Promise<void>): Promise<void> {
        void operation.catch((error) => {
            this.reportRecoverableError(error);
        });
        return operation;
    }

    private reportRecoverableError(error: unknown): void {
        const reported = this.toError(error, "Failed to complete AppGameContainer asynchronous operation");
        if (this.errorHandler) {
            try {
                this.errorHandler(reported);
            } catch (handlerError) {
                Log.error("AppGameContainer error handler failed", handlerError);
            }
            return;
        }
        Log.error(reported);
    }

    private reportError(error: unknown): void {
        this.resourceError = null;
        const reported = this.toError(error, "Failed to run AppGameContainer frame");
        this.destroy();
        if (this.errorHandler) {
            this.errorHandler(reported);
            return;
        }
        setTimeout(() => {
            throw reported;
        }, 0);
    }

    private toError(error: unknown, message: string): Error {
        return error instanceof Error ? error : new SlickException(message, error);
    }

    private captureDisplaySnapshot(): DisplaySnapshot {
        return {
            width: this.width,
            height: this.height,
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
            fullscreen: this.fullscreen,
            lastWindowedWidth: this.lastWindowedDisplayMode.width,
            lastWindowedHeight: this.lastWindowedDisplayMode.height,
            canvasWidth: this.canvas?.width ?? this.width,
            canvasHeight: this.canvas?.height ?? this.height,
            canvasStyleWidth: this.canvas?.style.width ?? "",
            canvasStyleHeight: this.canvas?.style.height ?? ""
        };
    }

    private restoreDisplaySnapshot(snapshot: DisplaySnapshot): void {
        this.width = snapshot.width;
        this.height = snapshot.height;
        this.screenWidth = snapshot.screenWidth;
        this.screenHeight = snapshot.screenHeight;
        this.fullscreen = snapshot.fullscreen;
        this.setLastWindowedDisplayMode(snapshot.lastWindowedWidth, snapshot.lastWindowedHeight);
        this.graphics.setDimensions(this.width, this.height);
        if (this.canvas) {
            this.canvas.width = snapshot.canvasWidth;
            this.canvas.height = snapshot.canvasHeight;
            this.canvas.style.width = snapshot.canvasStyleWidth;
            this.canvas.style.height = snapshot.canvasStyleHeight;
            Renderer.getBackend().initDisplay(snapshot.canvasWidth, snapshot.canvasHeight);
            Display.markResized(snapshot.canvasWidth, snapshot.canvasHeight);
        }
        this.notifyContainerSizeChanged();
    }

    private notifyContainerSizeChanged(): void {
        if (isResizeAwareGame(this.game)) {
            this.game.containerSizeChanged(this);
        }
    }
}
