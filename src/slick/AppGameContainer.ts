import { Mouse } from "../lwjgl/input/Mouse.js";
import { Cursor } from "../lwjgl/input/Cursor.js";
import { Display } from "../lwjgl/opengl/Display.js";
import { Color } from "./Color.js";
import type { Game } from "./Game.js";
import { GameContainer } from "./GameContainer.js";
import { Graphics } from "./Graphics.js";
import { Image } from "./Image.js";
import { Music } from "./Music.js";
import { SoundStore } from "./openal/SoundStore.js";
import type { ImageData as SlickImageData } from "./opengl/ImageData.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import { SlickException } from "./SlickException.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

type DomImageData = ImageData;
export type AppGameContainerErrorHandler = (error: Error) => void;

function isCanvas(value: unknown): value is HTMLCanvasElement {
    return typeof HTMLCanvasElement !== "undefined" && value instanceof HTMLCanvasElement;
}

function isElement(value: unknown): value is HTMLElement {
    return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
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

    public constructor(game: Game);
    public constructor(game: Game, width: number, height: number, fullscreen: boolean);
    /** Java Slick2D counterpart: AppGameContainer constructors. */
    public constructor(game: Game, width: number = 640, height: number = 480, fullscreen: boolean = false) {
        super(game);
        this.title = game.getTitle();
        this.fullscreen = fullscreen;
        this.setDimensions(width, height);
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
        this.setDimensions(width, height);
        if (this.canvas) {
            this.applyCanvasSize(width, height);
        }
        const fullscreenResult = this.setFullscreen(fullscreen);
        if (fullscreenResult instanceof Promise) {
            return fullscreenResult.then(() => {
                if (this.isFullscreen()) {
                    this.applyBrowserDisplaySize();
                } else {
                    this.applyCanvasSize(width, height);
                }
            });
        }
    }

    /** Java Slick2D counterpart: AppGameContainer.isFullscreen(). */
    public override isFullscreen(): boolean {
        return typeof document !== "undefined" && this.canvas
            ? document.fullscreenElement === this.canvas
            : this.fullscreen;
    }

    /** Java Slick2D counterpart: AppGameContainer.setFullscreen(boolean). */
    public override setFullscreen(fullscreen: boolean): void | Promise<void> {
        this.fullscreen = fullscreen;
        if (!this.canvas || typeof document === "undefined") {
            return;
        }
        if (fullscreen && document.fullscreenElement !== this.canvas && this.canvas.requestFullscreen) {
            return this.canvas.requestFullscreen()
                .then(() => this.applyBrowserDisplaySize())
                .catch(() => undefined);
        }
        if (!fullscreen && document.fullscreenElement && document.exitFullscreen) {
            return document.exitFullscreen().catch(() => undefined);
        }
    }

    /** Java Slick2D counterpart: AppGameContainer.reinit(). */
    public override async reinit(): Promise<void> {
        await this.game.init(this);
        await ResourceLoader.waitForAll();
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
            window.addEventListener("resize", this.handleBrowserResize);
            document.addEventListener("fullscreenchange", this.handleBrowserResize);
            Renderer.getBackend().initialize(this.canvas, {
                alpha: true,
                antialias: this.multiSample > 0,
                stencil: GameContainer.stencil
            });
            SoundStore.get().init();
            await this.game.init(this);
            await ResourceLoader.waitForAll();
            this.lastFrameTime = this.now();
            this.fpsWindowStart = this.lastFrameTime;
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
        this.input.unbind();
        this.input.setPreventDefaultElement(null);
        Mouse.setElement(null);
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.handleBrowserResize);
        }
        if (typeof document !== "undefined") {
            document.removeEventListener("fullscreenchange", this.handleBrowserResize);
        }
        Renderer.getBackend().dispose();
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
        const rawDelta = Math.max(0, Math.trunc(time - this.lastFrameTime));
        const delta = this.smoothDeltas ? Math.round((rawDelta + Math.max(0, this.getTime() - this.lastFrameTime)) / 2) : rawDelta;
        this.lastFrameTime = time;
        const visible = typeof document === "undefined" || document.visibilityState !== "hidden";
        if (!this.updateOnlyWhenVisible || visible) {
            this.input.poll(this.width, this.height);
            if (!this.paused) {
                const cappedDelta = this.maximumLogicUpdateInterval > 0 ? Math.min(delta, this.maximumLogicUpdateInterval) : delta;
                this.game.update(this, Math.max(this.minimumLogicUpdateInterval, cappedDelta));
                Music.poll(delta);
                SoundStore.get().poll(delta);
            }
        }
        let waitForResources = ResourceLoader.hasPending();
        if (this.alwaysRender || !this.paused) {
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

    private readonly handleBrowserResize = (): void => {
        if (this.isFullscreen()) {
            this.applyBrowserDisplaySize();
        } else if (this.canvas) {
            Renderer.getBackend().initDisplay(this.canvas.width, this.canvas.height);
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
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        Renderer.getBackend().initDisplay(width, height);
    }

    private applyBrowserDisplaySize(): void {
        if (!this.canvas || typeof window === "undefined") {
            return;
        }
        const width = Math.max(1, Math.trunc(window.innerWidth || this.width));
        const height = Math.max(1, Math.trunc(window.innerHeight || this.height));
        this.setDimensions(width, height);
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = "100vw";
        this.canvas.style.height = "100vh";
        Renderer.getBackend().initDisplay(width, height);
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
}
