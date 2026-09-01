import { Mouse } from "../lwjgl/input/Mouse.js";
import { AL } from "../lwjgl/openal/AL.js";
import { Display } from "../lwjgl/opengl/Display.js";
import { Color } from "./Color.js";
import { GameContainer } from "./GameContainer.js";
import { Graphics } from "./Graphics.js";
import { Music } from "./Music.js";
import { SoundStore } from "./openal/SoundStore.js";
import { InternalTextureLoader } from "./opengl/InternalTextureLoader.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import { SlickException } from "./SlickException.js";
import { Log } from "./util/Log.js";
import { ResourceLoader } from "./util/ResourceLoader.js";
function isCanvas(value) {
    return typeof HTMLCanvasElement !== "undefined" && value instanceof HTMLCanvasElement;
}
function isElement(value) {
    return typeof HTMLElement !== "undefined" && value instanceof HTMLElement;
}
function isResizeAwareGame(game) {
    return typeof game.containerSizeChanged === "function";
}
/**
 * Java Slick2D counterpart: org.newdawn.slick.AppGameContainer.
 *
 * Browser RAF-backed application container for Slick-style games.
 */
export class AppGameContainer extends GameContainer {
    canvas = null;
    title = "";
    started = false;
    destroyed = false;
    animationFrame = 0;
    loopReady = false;
    loopSuspended = false;
    highDpiEnabled = true;
    maxDevicePixelRatio = 2;
    displayPixelRatio = 1;
    backingWidth = 640;
    backingHeight = 480;
    lastFrameTime = 0;
    framesThisSecond = 0;
    fpsWindowStart = 0;
    fpsDisplayText = "FPS: 0";
    alphaInBackBuffer = true;
    waitingForResources = false;
    resourceError = null;
    errorHandler = null;
    lastWindowedDisplayMode;
    preserveAudioCacheOnDestroy = false;
    contextLost = false;
    ownsCanvas = false;
    canvasWithContextHandlers = null;
    /** Java Slick2D counterpart: AppGameContainer constructors. */
    constructor(game, width = 640, height = 480, fullscreen = false) {
        super(game);
        this.title = game.getTitle();
        this.fullscreen = fullscreen;
        this.updateOnlyWhenVisible = true;
        this.setDimensions(width, height);
        this.backingWidth = this.width;
        this.backingHeight = this.height;
        this.lastWindowedDisplayMode = { width, height };
    }
    /** Java Slick2D counterpart: AppGameContainer.supportsAlphaInBackBuffer(). */
    supportsAlphaInBackBuffer() {
        return this.alphaInBackBuffer;
    }
    /** Browser parity helper: reports async frame/resource errors to the host page. */
    setErrorHandler(handler) {
        this.errorHandler = handler;
    }
    /** Browser rendering helper: controls whether the canvas backing store uses device pixels. */
    setHighDpiEnabled(enabled) {
        if (this.highDpiEnabled === enabled) {
            return;
        }
        this.highDpiEnabled = enabled;
        this.refreshCurrentCanvasBacking();
    }
    /** Browser rendering helper: reports whether high-DPI backing-store rendering is enabled. */
    isHighDpiEnabled() {
        return this.highDpiEnabled;
    }
    /** Browser rendering helper: caps the effective device pixel ratio used for the canvas backing store. */
    setMaxDevicePixelRatio(maxDevicePixelRatio) {
        const normalized = Number.isFinite(maxDevicePixelRatio) ? Math.max(1, maxDevicePixelRatio) : 1;
        if (this.maxDevicePixelRatio === normalized) {
            return;
        }
        this.maxDevicePixelRatio = normalized;
        this.refreshCurrentCanvasBacking();
    }
    /** Browser rendering helper: returns the effective device pixel ratio used by the current canvas. */
    getDevicePixelRatio() {
        return this.displayPixelRatio;
    }
    /** Browser rendering helper: returns the current canvas backing-store width in device pixels. */
    getBackingWidth() {
        return this.backingWidth;
    }
    /** Browser rendering helper: returns the current canvas backing-store height in device pixels. */
    getBackingHeight() {
        return this.backingHeight;
    }
    /** Browser lifecycle helper: stops the RAF-backed loop without changing Java pause state. */
    setLoopSuspended(suspended) {
        if (suspended) {
            this.loopSuspended = true;
            this.cancelScheduledFrame();
            this.storedDelta = 0;
            return;
        }
        if (!this.loopSuspended) {
            return;
        }
        this.loopSuspended = false;
        this.resetLoopResumeTiming();
        this.scheduleNextFrame();
    }
    /** Browser lifecycle helper: reports whether the RAF-backed loop is suspended. */
    isLoopSuspended() {
        return this.loopSuspended;
    }
    /** Browser lifecycle helper: shorthand for setLoopSuspended(true). */
    suspendLoop() {
        this.setLoopSuspended(true);
    }
    /** Browser lifecycle helper: shorthand for setLoopSuspended(false). */
    resumeLoop() {
        this.setLoopSuspended(false);
    }
    /** Browser/PWA helper: controls whether destroy() preserves decoded audio and the AudioContext. */
    setPreserveAudioCacheOnDestroy(preserve) {
        this.preserveAudioCacheOnDestroy = preserve;
    }
    /** Browser/PWA helper: reports whether destroy() preserves decoded audio and the AudioContext. */
    isPreservingAudioCacheOnDestroy() {
        return this.preserveAudioCacheOnDestroy;
    }
    /** Java Slick2D counterpart: AppGameContainer.setTitle(String). */
    setTitle(title) {
        this.title = title;
        Display.setTitle(title);
    }
    /** Java Slick2D counterpart: AppGameContainer.setDisplayMode(int, int, boolean). */
    setDisplayMode(width, height, fullscreen) {
        const snapshot = this.captureDisplaySnapshot();
        this.setDimensions(width, height);
        if (!this.canvas) {
            this.displayPixelRatio = 1;
            this.backingWidth = Math.max(1, Math.trunc(width));
            this.backingHeight = Math.max(1, Math.trunc(height));
        }
        if (!fullscreen) {
            this.setLastWindowedDisplayMode(width, height);
        }
        if (this.canvas) {
            this.applyCanvasSize(width, height);
        }
        const fullscreenResult = this.setFullscreenInternal(fullscreen);
        const completeDisplayMode = () => {
            if (fullscreen) {
                if (this.isFullscreen()) {
                    this.applyBrowserDisplaySize();
                }
            }
            else {
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
    isFullscreen() {
        return typeof document !== "undefined" && this.canvas ? document.fullscreenElement === this.canvas : this.fullscreen;
    }
    /** Java Slick2D counterpart: AppGameContainer.setFullscreen(boolean). */
    setFullscreen(fullscreen) {
        const operation = this.setFullscreenInternal(fullscreen);
        return operation instanceof Promise ? this.observeAsyncFailure(operation) : operation;
    }
    setFullscreenInternal(fullscreen) {
        const previousFullscreen = this.fullscreen;
        this.fullscreen = fullscreen;
        if (!this.canvas || typeof document === "undefined") {
            return;
        }
        if (fullscreen && document.fullscreenElement !== this.canvas && this.canvas.requestFullscreen) {
            return this.canvas
                .requestFullscreen()
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
            return document
                .exitFullscreen()
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
        }
        else if (!fullscreen) {
            this.applyWindowedDisplayMode();
            Mouse.restoreNativeCursorAfterForcedFullscreenExit();
        }
    }
    /** Java Slick2D counterpart: AppGameContainer.reinit(). */
    async reinit() {
        const shouldResumeLoop = this.started && !this.destroyed;
        this.loopReady = false;
        this.cancelScheduledFrame();
        try {
            this.rebuildSystemForReinit();
            await this.game.init(this);
            await ResourceLoader.waitForAll();
            this.resetFrameBookkeeping();
            this.loopReady = shouldResumeLoop;
            if (shouldResumeLoop && !this.destroyed) {
                this.scheduleNextFrame();
            }
        }
        catch (error) {
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
    async start() {
        if (this.started) {
            return;
        }
        if (typeof document === "undefined") {
            throw new SlickException("AppGameContainer.start requires a browser document");
        }
        this.destroyed = false;
        this.started = true;
        this.loopReady = false;
        this.contextLost = false;
        try {
            this.canvas = this.resolveCanvas();
            this.addCanvasContextListeners(this.canvas);
            this.applySizedCanvas(this.width, this.height, `${this.width}px`, `${this.height}px`, false);
            this.canvas.tabIndex = this.canvas.tabIndex < 0 ? 0 : this.canvas.tabIndex;
            this.canvas.focus();
            Mouse.setElement(this.canvas);
            this.input.bindToElement(window);
            this.input.setBrowserInputCaptureDefault(this.ownsCanvas);
            this.input.setPreventDefaultElement(this.canvas);
            Display.setActiveContainer(this);
            Display.create();
            Display.setTitle(this.title);
            window.addEventListener("resize", this.handleWindowResize);
            window.visualViewport?.addEventListener("resize", this.handleWindowResize);
            document.addEventListener("fullscreenchange", this.handleFullscreenChange);
            document.addEventListener("visibilitychange", this.handleVisibilityChange);
            Renderer.getBackend().initialize(this.canvas, {
                alpha: true,
                antialias: this.multiSample > 0,
                stencil: GameContainer.stencil
            }, this.width, this.height, this.backingWidth, this.backingHeight);
            AL.create();
            await this.game.init(this);
            await ResourceLoader.waitForAll();
            this.resetFrameBookkeeping();
            this.loopReady = true;
            this.scheduleNextFrame();
        }
        catch (error) {
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
    setUpdateOnlyWhenVisible(updateOnlyWhenVisible) {
        super.setUpdateOnlyWhenVisible(updateOnlyWhenVisible);
    }
    /** Java Slick2D counterpart: AppGameContainer.isUpdatingOnlyWhenVisible(). */
    isUpdatingOnlyWhenVisible() {
        return super.isUpdatingOnlyWhenVisible();
    }
    /** Java Slick2D counterpart: AppGameContainer.setIcon(String). */
    setIcon(ref) {
        super.setIcon(ref);
        this.applyFavicon(ref);
    }
    /** Java Slick2D counterpart: AppGameContainer.setIcons(String[]). */
    setIcons(refs) {
        super.setIcons(refs);
        if (refs.length > 0) {
            this.applyFavicon(refs[0]);
        }
    }
    /** Java Slick2D counterpart: AppGameContainer.setMouseCursor(...). */
    setMouseCursor(cursorLike, hotSpotX, hotSpotY) {
        const setMouseCursor = GameContainer.prototype.setMouseCursor;
        return setMouseCursor.call(this, cursorLike, hotSpotX, hotSpotY);
    }
    /** Java Slick2D counterpart: AppGameContainer.setAnimatedMouseCursor(...). */
    setAnimatedMouseCursor(ref, x, y, width, height, cursorDelays) {
        return super.setAnimatedMouseCursor(ref, x, y, width, height, cursorDelays);
    }
    /** Java Slick2D counterpart: AppGameContainer.setMouseGrabbed(boolean). */
    setMouseGrabbed(grabbed) {
        return super.setMouseGrabbed(grabbed);
    }
    /** Java Slick2D counterpart: AppGameContainer.isMouseGrabbed(). */
    isMouseGrabbed() {
        return super.isMouseGrabbed();
    }
    /** Java Slick2D counterpart: AppGameContainer.hasFocus(). */
    hasFocus() {
        return typeof document === "undefined" || document.hasFocus();
    }
    /** Java Slick2D counterpart: AppGameContainer.getScreenHeight(). */
    getScreenHeight() {
        return this.screenHeight;
    }
    /** Java Slick2D counterpart: AppGameContainer.getScreenWidth(). */
    getScreenWidth() {
        return this.screenWidth;
    }
    /** Java Slick2D counterpart: AppGameContainer.destroy(). */
    destroy() {
        const canvas = this.canvas;
        this.destroyed = true;
        this.started = false;
        this.loopReady = false;
        this.loopSuspended = false;
        this.contextLost = false;
        this.waitingForResources = false;
        this.resourceError = null;
        this.cancelScheduledFrame();
        if (typeof document !== "undefined") {
            this.exitBrowserFullscreenForDestroy();
        }
        this.removeCanvasContextListeners();
        this.input.unbind();
        this.input.setPreventDefaultElement(null);
        void Mouse.setGrabbed(false).catch(() => { });
        Mouse.setElement(null);
        if (typeof window !== "undefined") {
            window.removeEventListener("resize", this.handleWindowResize);
            window.visualViewport?.removeEventListener("resize", this.handleWindowResize);
        }
        if (typeof document !== "undefined") {
            document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
            document.removeEventListener("visibilitychange", this.handleVisibilityChange);
        }
        Renderer.getBackend().dispose();
        if (this.preserveAudioCacheOnDestroy) {
            AL.destroyPreservingAudioCache();
        }
        else {
            AL.destroy();
        }
        Display.destroy();
        Display.setActiveContainer(null);
        this.removeOwnedCanvas(canvas);
        this.canvas = null;
    }
    /** Java Slick2D counterpart: AppGameContainer.setDefaultMouseCursor(). */
    setDefaultMouseCursor() {
        super.setDefaultMouseCursor();
    }
    /** Browser parity helper used by Display.setDisplayMode. */
    setDisplayModeFromDisplay(mode) {
        super.setDisplayModeFromDisplay(mode);
        if (!this.isFullscreen()) {
            this.setLastWindowedDisplayMode(mode.getWidth(), mode.getHeight());
        }
        if (this.canvas) {
            this.applyCanvasSize(mode.getWidth(), mode.getHeight());
        }
        else {
            this.displayPixelRatio = 1;
            this.backingWidth = Math.max(1, Math.trunc(mode.getWidth()));
            this.backingHeight = Math.max(1, Math.trunc(mode.getHeight()));
        }
    }
    setCssCursor(cursor) {
        if (this.canvas) {
            this.canvas.style.cursor = cursor;
        }
    }
    loop = (time) => {
        this.animationFrame = 0;
        if (this.destroyed || this.loopSuspended || this.contextLost || !this.loopReady) {
            return;
        }
        try {
            this.loopFrame(time);
        }
        catch (error) {
            this.reportError(error);
        }
    };
    loopFrame(time) {
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
            this.scheduleNextFrame();
            return;
        }
        if (!this.shouldProcessTargetFrame(time)) {
            this.scheduleNextFrame();
            return;
        }
        const rawDelta = Math.max(0, Math.trunc(time) - Math.trunc(this.lastFrameTime));
        const delta = this.smoothDeltas && this.getFPS() !== 0 ? Math.trunc(1000 / this.getFPS()) : rawDelta;
        this.lastFrameTime = time;
        this.input.poll(this.width, this.height);
        Music.poll(delta);
        SoundStore.get().poll(delta);
        this.updateGame(delta);
        if (this.destroyed || this.loopSuspended || this.contextLost) {
            return;
        }
        let waitForResources = ResourceLoader.hasPending();
        if (this.hasFocus() || this.getAlwaysRender()) {
            if (this.clearEachFrame) {
                Renderer.getBackend().beginFrame(this.width, this.height, this.graphics.__getBackgroundReference(), this.backingWidth, this.backingHeight);
            }
            else {
                Renderer.getBackend().beginFrame(this.width, this.height, Color.transparent, this.backingWidth, this.backingHeight);
            }
            Graphics.setCurrent(this.graphics);
            this.game.render(this, this.graphics);
            if (this.showFPS) {
                this.graphics.drawString(this.fpsDisplayText, 10, 10);
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
        this.scheduleNextFrame();
    }
    shouldProcessTargetFrame(time) {
        if (this.targetFrameRate <= 0) {
            return true;
        }
        return time - this.lastFrameTime >= 1000 / this.targetFrameRate;
    }
    updateGame(delta) {
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
            }
            else {
                this.storedDelta = remainder;
            }
        }
        else {
            this.game.update(this, this.storedDelta);
            this.storedDelta = 0;
        }
    }
    rebuildSystemForReinit() {
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
            }, this.width, this.height, this.backingWidth, this.backingHeight);
        }
        else {
            Renderer.getBackend().initDisplay(this.width, this.height, this.backingWidth, this.backingHeight);
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
    resetFrameBookkeeping() {
        this.lastFrameTime = this.now();
        this.storedDelta = 0;
        this.framesThisSecond = 0;
        this.fpsWindowStart = this.lastFrameTime;
        this.fps = 0;
        this.fpsDisplayText = "FPS: 0";
        this.waitingForResources = false;
        this.resourceError = null;
    }
    resetLoopResumeTiming() {
        this.lastFrameTime = this.now();
        this.storedDelta = 0;
        this.framesThisSecond = 0;
        this.fpsWindowStart = this.lastFrameTime;
        this.fps = 0;
        this.fpsDisplayText = "FPS: 0";
    }
    scheduleNextFrame() {
        if (this.destroyed ||
            this.loopSuspended ||
            this.contextLost ||
            !this.started ||
            !this.loopReady ||
            this.waitingForResources ||
            this.animationFrame !== 0) {
            return;
        }
        this.animationFrame = requestAnimationFrame(this.loop);
    }
    cancelScheduledFrame() {
        if (this.animationFrame !== 0) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = 0;
        }
    }
    handleWindowResize = () => {
        try {
            if (this.isFullscreen()) {
                this.applyBrowserDisplaySize();
            }
            else {
                this.refreshCurrentCanvasBacking();
            }
        }
        catch (error) {
            this.reportError(error);
        }
    };
    handleFullscreenChange = () => {
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
        }
        catch (error) {
            this.reportError(error);
        }
    };
    handleVisibilityChange = () => {
        if (typeof document !== "undefined" && document.visibilityState !== "hidden") {
            this.lastFrameTime = this.now();
            this.refreshCurrentCanvasBacking();
        }
    };
    handleWebGLContextLost = (event) => {
        event.preventDefault();
        if (this.contextLost) {
            return;
        }
        this.contextLost = true;
        this.cancelScheduledFrame();
        this.storedDelta = 0;
        Renderer.getBackend().handleContextLost();
        InternalTextureLoader.get().invalidate();
    };
    handleWebGLContextRestored = () => {
        if (!this.canvas || this.destroyed || !this.contextLost) {
            return;
        }
        try {
            Renderer.getBackend().handleContextRestored();
            this.contextLost = false;
            this.refreshCurrentCanvasBacking();
            this.resetLoopResumeTiming();
            this.scheduleNextFrame();
        }
        catch (error) {
            this.reportError(error);
        }
    };
    resolveCanvas() {
        this.ownsCanvas = false;
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
            this.ownsCanvas = true;
            return canvas;
        }
        const canvas = document.createElement("canvas");
        document.body.appendChild(canvas);
        this.ownsCanvas = true;
        return canvas;
    }
    addCanvasContextListeners(canvas) {
        this.removeCanvasContextListeners();
        canvas.addEventListener("webglcontextlost", this.handleWebGLContextLost);
        canvas.addEventListener("webglcontextrestored", this.handleWebGLContextRestored);
        this.canvasWithContextHandlers = canvas;
    }
    removeCanvasContextListeners() {
        if (!this.canvasWithContextHandlers) {
            return;
        }
        this.canvasWithContextHandlers.removeEventListener("webglcontextlost", this.handleWebGLContextLost);
        this.canvasWithContextHandlers.removeEventListener("webglcontextrestored", this.handleWebGLContextRestored);
        this.canvasWithContextHandlers = null;
    }
    removeOwnedCanvas(canvas) {
        if (!this.ownsCanvas || !canvas) {
            return;
        }
        canvas.parentNode?.removeChild(canvas);
        this.ownsCanvas = false;
    }
    applyFavicon(ref) {
        if (typeof document === "undefined") {
            return;
        }
        const href = ResourceLoader.getResource(ref)?.toString() ?? ref;
        let link = document.querySelector("link[rel='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }
        link.href = href;
    }
    updateFps(time) {
        this.framesThisSecond++;
        if (time - this.fpsWindowStart >= 1000) {
            this.fps = this.framesThisSecond;
            this.fpsDisplayText = `FPS: ${this.fps}`;
            this.framesThisSecond = 0;
            this.fpsWindowStart = time;
        }
    }
    now() {
        return typeof performance !== "undefined" ? performance.now() : Date.now();
    }
    applyCanvasSize(width, height) {
        if (!this.canvas) {
            return;
        }
        this.applySizedCanvas(width, height, `${width}px`, `${height}px`, true);
    }
    applyBrowserDisplaySize() {
        if (!this.canvas || typeof window === "undefined") {
            return;
        }
        const viewport = window.visualViewport;
        const width = Math.max(1, Math.trunc(viewport?.width || window.innerWidth || this.width));
        const height = Math.max(1, Math.trunc(viewport?.height || window.innerHeight || this.height));
        this.applySizedCanvas(width, height, "100vw", "100vh", true);
    }
    applyWindowedDisplayMode(width = this.lastWindowedDisplayMode.width, height = this.lastWindowedDisplayMode.height, notify = true) {
        if (!this.canvas) {
            this.setDimensions(width, height);
            this.displayPixelRatio = 1;
            this.backingWidth = Math.max(1, Math.trunc(width));
            this.backingHeight = Math.max(1, Math.trunc(height));
            return;
        }
        this.applySizedCanvas(width, height, `${width}px`, `${height}px`, notify);
    }
    applySizedCanvas(width, height, styleWidth, styleHeight, notify) {
        if (!this.canvas) {
            return;
        }
        const logicalWidth = Math.max(1, Math.trunc(width));
        const logicalHeight = Math.max(1, Math.trunc(height));
        const dpr = this.resolveDisplayPixelRatio();
        const backingWidth = Math.max(1, Math.round(logicalWidth * dpr));
        const backingHeight = Math.max(1, Math.round(logicalHeight * dpr));
        const logicalOrStyleChanged = this.width !== logicalWidth || this.height !== logicalHeight || this.canvas.style.width !== styleWidth || this.canvas.style.height !== styleHeight;
        this.setDimensions(logicalWidth, logicalHeight);
        this.displayPixelRatio = dpr;
        this.backingWidth = backingWidth;
        this.backingHeight = backingHeight;
        if (this.canvas.width !== backingWidth) {
            this.canvas.width = backingWidth;
        }
        if (this.canvas.height !== backingHeight) {
            this.canvas.height = backingHeight;
        }
        this.canvas.style.width = styleWidth;
        this.canvas.style.height = styleHeight;
        Renderer.getBackend().initDisplay(logicalWidth, logicalHeight, backingWidth, backingHeight);
        if (notify && logicalOrStyleChanged) {
            Display.markResized(logicalWidth, logicalHeight);
            this.notifyContainerSizeChanged();
        }
    }
    refreshCurrentCanvasBacking() {
        if (!this.canvas) {
            this.displayPixelRatio = 1;
            this.backingWidth = this.width;
            this.backingHeight = this.height;
            Renderer.getBackend().initDisplay(this.width, this.height, this.backingWidth, this.backingHeight);
            return;
        }
        const styleWidth = this.canvas.style.width || `${this.width}px`;
        const styleHeight = this.canvas.style.height || `${this.height}px`;
        this.applySizedCanvas(this.width, this.height, styleWidth, styleHeight, false);
    }
    resolveDisplayPixelRatio() {
        if (!this.highDpiEnabled || typeof window === "undefined") {
            return 1;
        }
        const raw = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
        return Math.max(1, Math.min(raw || 1, this.maxDevicePixelRatio));
    }
    setLastWindowedDisplayMode(width, height) {
        this.lastWindowedDisplayMode = {
            width: Math.max(1, Math.trunc(width)),
            height: Math.max(1, Math.trunc(height))
        };
    }
    exitBrowserFullscreenForDestroy() {
        if (!this.canvas || typeof document === "undefined") {
            return;
        }
        this.fullscreen = false;
        this.applyWindowedDisplayMode(undefined, undefined, false);
        Mouse.restoreNativeCursorAfterForcedFullscreenExit();
        if (document.fullscreenElement === this.canvas && document.exitFullscreen) {
            void document.exitFullscreen().catch(() => { });
        }
    }
    waitForQueuedResources() {
        this.waitingForResources = true;
        void ResourceLoader.waitForAll()
            .then(() => {
            this.waitingForResources = false;
            if (!this.destroyed) {
                this.lastFrameTime = this.now();
                this.scheduleNextFrame();
            }
        })
            .catch((error) => {
            this.waitingForResources = false;
            this.reportError(error);
        });
    }
    observeAsyncFailure(operation) {
        void operation.catch((error) => {
            this.reportRecoverableError(error);
        });
        return operation;
    }
    reportRecoverableError(error) {
        const reported = this.toError(error, "Failed to complete AppGameContainer asynchronous operation");
        if (this.errorHandler) {
            try {
                this.errorHandler(reported);
            }
            catch (handlerError) {
                Log.error("AppGameContainer error handler failed", handlerError);
            }
            return;
        }
        Log.error(reported);
    }
    reportError(error) {
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
    toError(error, message) {
        return error instanceof Error ? error : new SlickException(message, error);
    }
    captureDisplaySnapshot() {
        return {
            width: this.width,
            height: this.height,
            screenWidth: this.screenWidth,
            screenHeight: this.screenHeight,
            displayPixelRatio: this.displayPixelRatio,
            backingWidth: this.backingWidth,
            backingHeight: this.backingHeight,
            fullscreen: this.fullscreen,
            lastWindowedWidth: this.lastWindowedDisplayMode.width,
            lastWindowedHeight: this.lastWindowedDisplayMode.height,
            canvasWidth: this.canvas?.width ?? this.width,
            canvasHeight: this.canvas?.height ?? this.height,
            canvasStyleWidth: this.canvas?.style.width ?? "",
            canvasStyleHeight: this.canvas?.style.height ?? ""
        };
    }
    restoreDisplaySnapshot(snapshot) {
        this.width = snapshot.width;
        this.height = snapshot.height;
        this.screenWidth = snapshot.screenWidth;
        this.screenHeight = snapshot.screenHeight;
        this.displayPixelRatio = snapshot.displayPixelRatio;
        this.backingWidth = snapshot.backingWidth;
        this.backingHeight = snapshot.backingHeight;
        this.fullscreen = snapshot.fullscreen;
        this.setLastWindowedDisplayMode(snapshot.lastWindowedWidth, snapshot.lastWindowedHeight);
        this.graphics.setDimensions(this.width, this.height);
        if (this.canvas) {
            this.canvas.width = snapshot.canvasWidth;
            this.canvas.height = snapshot.canvasHeight;
            this.canvas.style.width = snapshot.canvasStyleWidth;
            this.canvas.style.height = snapshot.canvasStyleHeight;
            Renderer.getBackend().initDisplay(this.width, this.height, snapshot.canvasWidth, snapshot.canvasHeight);
            Display.markResized(this.width, this.height);
        }
        this.notifyContainerSizeChanged();
    }
    notifyContainerSizeChanged() {
        if (isResizeAwareGame(this.game)) {
            this.game.containerSizeChanged(this);
        }
    }
}
//# sourceMappingURL=AppGameContainer.js.map