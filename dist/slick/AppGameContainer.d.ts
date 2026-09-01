import { Cursor } from "../lwjgl/input/Cursor.js";
import type { Game } from "./Game.js";
import { GameContainer } from "./GameContainer.js";
import { Image } from "./Image.js";
import type { ImageData as SlickImageData } from "./opengl/ImageData.js";
type DomImageData = ImageData;
export type AppGameContainerErrorHandler = (error: Error) => void;
/**
 * Java Slick2D counterpart: org.newdawn.slick.AppGameContainer.
 *
 * Browser RAF-backed application container for Slick-style games.
 */
export declare class AppGameContainer extends GameContainer {
    protected canvas: HTMLCanvasElement | null;
    private title;
    private started;
    private destroyed;
    private animationFrame;
    private loopReady;
    private loopSuspended;
    private highDpiEnabled;
    private maxDevicePixelRatio;
    private displayPixelRatio;
    private backingWidth;
    private backingHeight;
    private lastFrameTime;
    private framesThisSecond;
    private fpsWindowStart;
    private fpsDisplayText;
    private alphaInBackBuffer;
    private waitingForResources;
    private resourceError;
    private errorHandler;
    private lastWindowedDisplayMode;
    private preserveAudioCacheOnDestroy;
    private contextLost;
    private ownsCanvas;
    private canvasWithContextHandlers;
    constructor(game: Game);
    constructor(game: Game, width: number, height: number, fullscreen: boolean);
    /** Java Slick2D counterpart: AppGameContainer.supportsAlphaInBackBuffer(). */
    supportsAlphaInBackBuffer(): boolean;
    /** Browser parity helper: reports async frame/resource errors to the host page. */
    setErrorHandler(handler: AppGameContainerErrorHandler | null): void;
    /** Browser rendering helper: controls whether the canvas backing store uses device pixels. */
    setHighDpiEnabled(enabled: boolean): void;
    /** Browser rendering helper: reports whether high-DPI backing-store rendering is enabled. */
    isHighDpiEnabled(): boolean;
    /** Browser rendering helper: caps the effective device pixel ratio used for the canvas backing store. */
    setMaxDevicePixelRatio(maxDevicePixelRatio: number): void;
    /** Browser rendering helper: returns the effective device pixel ratio used by the current canvas. */
    getDevicePixelRatio(): number;
    /** Browser rendering helper: returns the current canvas backing-store width in device pixels. */
    getBackingWidth(): number;
    /** Browser rendering helper: returns the current canvas backing-store height in device pixels. */
    getBackingHeight(): number;
    /** Browser lifecycle helper: stops the RAF-backed loop without changing Java pause state. */
    setLoopSuspended(suspended: boolean): void;
    /** Browser lifecycle helper: reports whether the RAF-backed loop is suspended. */
    isLoopSuspended(): boolean;
    /** Browser lifecycle helper: shorthand for setLoopSuspended(true). */
    suspendLoop(): void;
    /** Browser lifecycle helper: shorthand for setLoopSuspended(false). */
    resumeLoop(): void;
    /** Browser/PWA helper: controls whether destroy() preserves decoded audio and the AudioContext. */
    setPreserveAudioCacheOnDestroy(preserve: boolean): void;
    /** Browser/PWA helper: reports whether destroy() preserves decoded audio and the AudioContext. */
    isPreservingAudioCacheOnDestroy(): boolean;
    /** Java Slick2D counterpart: AppGameContainer.setTitle(String). */
    setTitle(title: string): void;
    /** Java Slick2D counterpart: AppGameContainer.setDisplayMode(int, int, boolean). */
    setDisplayMode(width: number, height: number, fullscreen: boolean): void | Promise<void>;
    /** Java Slick2D counterpart: AppGameContainer.isFullscreen(). */
    isFullscreen(): boolean;
    /** Java Slick2D counterpart: AppGameContainer.setFullscreen(boolean). */
    setFullscreen(fullscreen: boolean): void | Promise<void>;
    private setFullscreenInternal;
    /** Java Slick2D counterpart: AppGameContainer.reinit(). */
    reinit(): Promise<void>;
    /** Java Slick2D counterpart: AppGameContainer.start(). */
    start(): Promise<void>;
    /** Java Slick2D counterpart: AppGameContainer.setUpdateOnlyWhenVisible(boolean). */
    setUpdateOnlyWhenVisible(updateOnlyWhenVisible: boolean): void;
    /** Java Slick2D counterpart: AppGameContainer.isUpdatingOnlyWhenVisible(). */
    isUpdatingOnlyWhenVisible(): boolean;
    /** Java Slick2D counterpart: AppGameContainer.setIcon(String). */
    setIcon(ref: string): void;
    /** Java Slick2D counterpart: AppGameContainer.setIcons(String[]). */
    setIcons(refs: string[]): void;
    setMouseCursor(ref: string, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    setMouseCursor(data: DomImageData | SlickImageData, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    setMouseCursor(image: Image, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    setMouseCursor(cursor: Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    /** Java Slick2D counterpart: AppGameContainer.setAnimatedMouseCursor(...). */
    setAnimatedMouseCursor(ref: string, x: number, y: number, width: number, height: number, cursorDelays: number[]): void | Promise<void>;
    /** Java Slick2D counterpart: AppGameContainer.setMouseGrabbed(boolean). */
    setMouseGrabbed(grabbed: boolean): void | Promise<void>;
    /** Java Slick2D counterpart: AppGameContainer.isMouseGrabbed(). */
    isMouseGrabbed(): boolean;
    /** Java Slick2D counterpart: AppGameContainer.hasFocus(). */
    hasFocus(): boolean;
    /** Java Slick2D counterpart: AppGameContainer.getScreenHeight(). */
    getScreenHeight(): number;
    /** Java Slick2D counterpart: AppGameContainer.getScreenWidth(). */
    getScreenWidth(): number;
    /** Java Slick2D counterpart: AppGameContainer.destroy(). */
    destroy(): void;
    /** Java Slick2D counterpart: AppGameContainer.setDefaultMouseCursor(). */
    setDefaultMouseCursor(): void;
    /** Browser parity helper used by Display.setDisplayMode. */
    setDisplayModeFromDisplay(mode: import("../lwjgl/opengl/DisplayMode.js").DisplayMode): void;
    protected setCssCursor(cursor: string): void;
    private readonly loop;
    private loopFrame;
    private shouldProcessTargetFrame;
    private updateGame;
    private rebuildSystemForReinit;
    private resetFrameBookkeeping;
    private resetLoopResumeTiming;
    private scheduleNextFrame;
    private cancelScheduledFrame;
    private readonly handleWindowResize;
    /**
     * Browser resize policy hook shared by window and VisualViewport events.
     * ApplicationGameContainer overrides this for resizable-window semantics.
     */
    protected handleBrowserResize(): void;
    private readonly handleFullscreenChange;
    private readonly handleVisibilityChange;
    private readonly handleWebGLContextLost;
    private readonly handleWebGLContextRestored;
    private resolveCanvas;
    private addCanvasContextListeners;
    private removeCanvasContextListeners;
    private removeOwnedCanvas;
    private applyFavicon;
    private updateFps;
    private now;
    private applyCanvasSize;
    private applyBrowserDisplaySize;
    private applyWindowedDisplayMode;
    private applySizedCanvas;
    private refreshCurrentCanvasBacking;
    private resolveDisplayPixelRatio;
    private setLastWindowedDisplayMode;
    private exitBrowserFullscreenForDestroy;
    private waitForQueuedResources;
    private observeAsyncFailure;
    private reportRecoverableError;
    private reportError;
    private toError;
    private captureDisplaySnapshot;
    private restoreDisplaySnapshot;
    private notifyContainerSizeChanged;
}
export {};
//# sourceMappingURL=AppGameContainer.d.ts.map