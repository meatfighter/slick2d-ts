import { Mouse } from "../lwjgl/input/Mouse.js";
import { AL } from "../lwjgl/openal/AL.js";
import { Display } from "../lwjgl/opengl/Display.js";
import { Color } from "./Color.js";
import { GameContainer } from "./GameContainer.js";
import { Graphics } from "./Graphics.js";
import { Image } from "./Image.js";
import { Music } from "./Music.js";
import { SpriteSheet } from "./SpriteSheet.js";
import { SoundStore } from "./openal/SoundStore.js";
import { InternalTextureLoader } from "./opengl/InternalTextureLoader.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import { SlickException } from "./SlickException.js";
import { DevicePixelRatioMonitor } from "./util/DevicePixelRatioMonitor.js";
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
/** Browser RAF-backed Slick container. A destroyed instance is terminal. */
export class AppGameContainer extends GameContainer {
    static resourceOwner = null;
    canvas = null;
    title = "";
    started = false;
    destroyed = false;
    destructionFailure = null;
    lifetime = 0;
    displayOperation = 0;
    resourceWait = 0;
    lifetimeController = new AbortController();
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
    graphicsLifecycleHandler = null;
    lastWindowedDisplayMode;
    preserveAudioCacheOnDestroy = false;
    contextLost = false;
    ownsCanvas = false;
    canvasWithContextHandlers = null;
    devicePixelRatioMonitor = new DevicePixelRatioMonitor(() => {
        if (!this.ownsSharedResources()) {
            return;
        }
        try {
            this.refreshCurrentCanvasBacking();
        }
        catch (error) {
            this.reportError(error);
        }
    });
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
    supportsAlphaInBackBuffer() {
        return this.alphaInBackBuffer;
    }
    setErrorHandler(handler) {
        this.errorHandler = handler;
    }
    /** Graphics recovery prepares rendering; a PWA handler decides when gameplay may resume. */
    setGraphicsLifecycleHandler(handler) {
        this.graphicsLifecycleHandler = handler;
    }
    isGraphicsContextLost() {
        return this.contextLost;
    }
    /** Async game initialization may use this signal before publishing resources or state. */
    getBrowserLifetimeSignal() {
        return this.lifetimeController.signal;
    }
    isBrowserLifetimeCurrent(signal) {
        return !this.destroyed && signal === this.lifetimeController.signal && !signal.aborted;
    }
    isDestroyed() {
        return this.destroyed;
    }
    setHighDpiEnabled(enabled) {
        if (this.destroyed || this.highDpiEnabled === enabled) {
            return;
        }
        this.highDpiEnabled = enabled;
        this.refreshCurrentCanvasBacking();
    }
    isHighDpiEnabled() {
        return this.highDpiEnabled;
    }
    setMaxDevicePixelRatio(maxDevicePixelRatio) {
        const normalized = Number.isFinite(maxDevicePixelRatio) ? Math.max(1, maxDevicePixelRatio) : 1;
        if (this.destroyed || this.maxDevicePixelRatio === normalized) {
            return;
        }
        this.maxDevicePixelRatio = normalized;
        this.refreshCurrentCanvasBacking();
    }
    getDevicePixelRatio() {
        return this.displayPixelRatio;
    }
    getBackingWidth() {
        return this.backingWidth;
    }
    getBackingHeight() {
        return this.backingHeight;
    }
    /** Stops RAF without changing the game's own pause state. */
    setLoopSuspended(suspended) {
        if (this.destroyed) {
            return;
        }
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
    isLoopSuspended() {
        return this.loopSuspended;
    }
    suspendLoop() {
        this.setLoopSuspended(true);
    }
    resumeLoop() {
        this.setLoopSuspended(false);
    }
    setPreserveAudioCacheOnDestroy(preserve) {
        this.preserveAudioCacheOnDestroy = preserve;
    }
    isPreservingAudioCacheOnDestroy() {
        return this.preserveAudioCacheOnDestroy;
    }
    setTitle(title) {
        this.title = title;
        if (!this.destroyed && (!this.started || this.ownsSharedResources())) {
            Display.setTitle(title);
        }
    }
    setDisplayMode(width, height, fullscreen) {
        if (this.destroyed) {
            return;
        }
        const operation = this.beginDisplayOperation();
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
        const result = this.setFullscreenInternal(fullscreen, operation);
        const complete = () => {
            if (!this.isDisplayOperationCurrent(operation)) {
                return;
            }
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
        if (result instanceof Promise) {
            const pending = result.then(complete).catch((error) => {
                if (!this.isDisplayOperationCurrent(operation)) {
                    return;
                }
                this.restoreDisplaySnapshot(snapshot);
                throw error instanceof SlickException
                    ? error
                    : new SlickException(`Failed to set display mode: ${width}x${height} fullscreen=${fullscreen}`, error);
            });
            return this.observeAsyncFailure(pending, operation);
        }
        complete();
    }
    isFullscreen() {
        return typeof document !== "undefined" && this.canvas ? document.fullscreenElement === this.canvas : this.fullscreen;
    }
    setFullscreen(fullscreen) {
        if (this.destroyed) {
            return;
        }
        const token = this.beginDisplayOperation();
        const operation = this.setFullscreenInternal(fullscreen, token);
        return operation instanceof Promise ? this.observeAsyncFailure(operation, token) : operation;
    }
    beginDisplayOperation() {
        return { lifetime: this.lifetime, operation: ++this.displayOperation };
    }
    isDisplayOperationCurrent(token) {
        return !this.destroyed && token.lifetime === this.lifetime && token.operation === this.displayOperation;
    }
    setFullscreenInternal(fullscreen, token) {
        const previousFullscreen = this.fullscreen;
        this.fullscreen = fullscreen;
        const canvas = this.canvas;
        if (canvas === null || typeof document === "undefined") {
            return;
        }
        if (fullscreen && document.fullscreenElement !== canvas && canvas.requestFullscreen) {
            return canvas.requestFullscreen().then(() => {
                if (!this.isDisplayOperationCurrent(token)) {
                    if (this.destroyed && document.fullscreenElement === canvas) {
                        void document.exitFullscreen?.().catch(() => undefined);
                    }
                    return;
                }
                this.fullscreen = true;
                this.applyBrowserDisplaySize();
            }, (error) => {
                if (!this.isDisplayOperationCurrent(token)) {
                    return;
                }
                this.fullscreen = previousFullscreen;
                if (document.fullscreenElement !== canvas) {
                    Mouse.restoreNativeCursorAfterForcedFullscreenExit();
                }
                throw new SlickException("Failed to enter fullscreen", error);
            });
        }
        if (!fullscreen && document.fullscreenElement === canvas && document.exitFullscreen) {
            return document.exitFullscreen().then(() => {
                if (!this.isDisplayOperationCurrent(token)) {
                    return;
                }
                this.fullscreen = false;
                this.applyWindowedDisplayMode();
                Mouse.restoreNativeCursorAfterForcedFullscreenExit();
            }, (error) => {
                if (!this.isDisplayOperationCurrent(token)) {
                    return;
                }
                this.fullscreen = previousFullscreen;
                throw new SlickException("Failed to exit fullscreen", error);
            });
        }
        if (fullscreen && document.fullscreenElement === canvas) {
            this.applyBrowserDisplaySize();
        }
        else if (!fullscreen) {
            this.applyWindowedDisplayMode();
            if (this.ownsSharedResources()) {
                Mouse.restoreNativeCursorAfterForcedFullscreenExit();
            }
        }
    }
    async reinit() {
        if (this.destroyed || !this.ownsSharedResources()) {
            return;
        }
        const shouldResumeLoop = this.started;
        const lifetime = ++this.lifetime;
        this.lifetimeController.abort();
        this.lifetimeController = new AbortController();
        this.resourceWait++;
        this.loopReady = false;
        this.cancelScheduledFrame();
        try {
            this.rebuildSystemForReinit();
            await this.game.init(this);
            if (!this.isLifetimeCurrent(lifetime)) {
                return;
            }
            await ResourceLoader.waitForAll();
            if (!this.isLifetimeCurrent(lifetime)) {
                return;
            }
            this.resetFrameBookkeeping();
            this.loopReady = shouldResumeLoop;
            this.scheduleNextFrame();
        }
        catch (error) {
            if (!this.isLifetimeCurrent(lifetime)) {
                return;
            }
            const handler = this.errorHandler;
            const reported = this.destroyAfterError(this.toError(error, "Failed to reinitialize AppGameContainer"));
            if (handler) {
                handler(reported);
                return;
            }
            throw reported;
        }
    }
    async start() {
        if (this.destroyed) {
            throw new SlickException("A destroyed AppGameContainer cannot be restarted; create a new instance.");
        }
        if (this.started) {
            return;
        }
        if (typeof document === "undefined") {
            throw new SlickException("AppGameContainer.start requires a browser document");
        }
        if (AppGameContainer.resourceOwner !== null && AppGameContainer.resourceOwner !== this) {
            throw new SlickException("Destroy the previous AppGameContainer before starting another one.");
        }
        const lifetime = ++this.lifetime;
        this.started = true;
        this.loopReady = false;
        this.contextLost = false;
        AppGameContainer.resourceOwner = this;
        try {
            this.canvas = this.resolveCanvas();
            this.addCanvasContextListeners(this.canvas);
            this.applySizedCanvas(this.width, this.height, `${this.width}px`, `${this.height}px`, false);
            this.canvas.tabIndex = this.canvas.tabIndex < 0 ? 0 : this.canvas.tabIndex;
            this.canvas.focus();
            if (!this.isLifetimeCurrent(lifetime)) {
                return;
            }
            Mouse.setElement(this.canvas);
            this.input.bindToElement(window);
            this.input.setBrowserInputCaptureDefault(this.ownsCanvas);
            this.input.setPreventDefaultElement(this.canvas);
            Display.setActiveContainer(this);
            Display.create();
            Display.setTitle(this.title);
            window.addEventListener("resize", this.handleWindowResize);
            window.visualViewport?.addEventListener("resize", this.handleWindowResize);
            this.devicePixelRatioMonitor.start();
            document.addEventListener("fullscreenchange", this.handleFullscreenChange);
            document.addEventListener("visibilitychange", this.handleVisibilityChange);
            Renderer.getBackend().initialize(this.canvas, { alpha: true, antialias: this.multiSample > 0, stencil: GameContainer.stencil }, this.width, this.height, this.backingWidth, this.backingHeight);
            AL.create();
            await this.game.init(this);
            if (!this.isLifetimeCurrent(lifetime)) {
                return;
            }
            await ResourceLoader.waitForAll();
            if (!this.isLifetimeCurrent(lifetime)) {
                return;
            }
            this.resetFrameBookkeeping();
            this.loopReady = true;
            this.scheduleNextFrame();
        }
        catch (error) {
            if (!this.isLifetimeCurrent(lifetime)) {
                return;
            }
            const handler = this.errorHandler;
            const reported = this.destroyAfterError(this.toError(error, "Failed to start AppGameContainer"));
            if (handler) {
                handler(reported);
                return;
            }
            throw reported;
        }
    }
    setUpdateOnlyWhenVisible(updateOnlyWhenVisible) {
        super.setUpdateOnlyWhenVisible(updateOnlyWhenVisible);
    }
    isUpdatingOnlyWhenVisible() {
        return super.isUpdatingOnlyWhenVisible();
    }
    setIcon(ref) {
        super.setIcon(ref);
        this.applyFavicon(ref);
    }
    setIcons(refs) {
        super.setIcons(refs);
        if (refs.length > 0) {
            this.applyFavicon(refs[0]);
        }
    }
    setMouseCursor(cursor, x, y) {
        if (!this.destroyed) {
            return this.setMouseCursorImpl(cursor, x, y);
        }
    }
    setAnimatedMouseCursor(ref, x, y, width, height, delays) {
        if (!this.destroyed) {
            return super.setAnimatedMouseCursor(ref, x, y, width, height, delays);
        }
    }
    setMouseGrabbed(grabbed) {
        if (!this.destroyed) {
            return super.setMouseGrabbed(grabbed);
        }
    }
    isMouseGrabbed() {
        return super.isMouseGrabbed();
    }
    hasFocus() {
        return typeof document === "undefined" || document.hasFocus();
    }
    getScreenHeight() {
        return this.screenHeight;
    }
    getScreenWidth() {
        return this.screenWidth;
    }
    /** Terminal teardown: attempt every step and never hide an unsafe failure. */
    destroy() {
        if (this.destroyed) {
            if (this.destructionFailure !== null) {
                throw this.destructionFailure;
            }
            return;
        }
        const canvas = this.canvas;
        const ownsShared = AppGameContainer.resourceOwner === this;
        this.destroyed = true;
        this.lifetime++;
        this.displayOperation++;
        this.resourceWait++;
        this.started = false;
        this.loopReady = false;
        this.loopSuspended = true;
        this.contextLost = false;
        this.waitingForResources = false;
        this.resourceError = null;
        this.cleanup("lifetime cancellation", () => this.lifetimeController.abort());
        this.cleanup("scheduled frame", () => this.cancelScheduledFrame());
        this.cleanup("canvas listeners", () => this.removeCanvasContextListeners());
        this.cleanup("input binding", () => this.input.unbind());
        this.cleanup("input capture", () => this.input.setPreventDefaultElement(null));
        this.cleanup("DPR monitor", () => this.devicePixelRatioMonitor.stop());
        if (typeof window !== "undefined") {
            this.cleanup("window resize listener", () => window.removeEventListener("resize", this.handleWindowResize));
            this.cleanup("visual viewport listener", () => window.visualViewport?.removeEventListener("resize", this.handleWindowResize));
        }
        if (typeof document !== "undefined") {
            this.cleanup("fullscreen listener", () => document.removeEventListener("fullscreenchange", this.handleFullscreenChange));
            this.cleanup("visibility listener", () => document.removeEventListener("visibilitychange", this.handleVisibilityChange));
        }
        if (ownsShared) {
            this.cleanup("fullscreen", () => this.exitBrowserFullscreenForDestroy());
            this.cleanup("pointer lock", () => {
                void Mouse.setGrabbed(false).catch(() => undefined);
            });
            this.cleanup("mouse element", () => Mouse.setElement(null));
            this.cleanup("rendering state", () => this.resetRenderingLifecycleState());
            this.cleanup("textures", () => InternalTextureLoader.get().clear());
            this.cleanup("renderer", () => Renderer.getBackend().dispose());
            this.cleanup("audio", () => {
                if (this.preserveAudioCacheOnDestroy) {
                    AL.destroyPreservingAudioCache();
                }
                else {
                    AL.destroy();
                }
            });
            this.cleanup("display", () => Display.destroy());
            this.cleanup("display owner", () => Display.setActiveContainer(null));
        }
        this.cleanup("owned canvas", () => this.removeOwnedCanvas(canvas));
        this.canvas = null;
        this.graphicsLifecycleHandler = null;
        // Keep the shared owner blocked on unsafe teardown. No replacement may start
        // merely because a second call to destroy() did no additional work.
        if (this.destructionFailure !== null) {
            throw this.destructionFailure;
        }
        if (ownsShared && AppGameContainer.resourceOwner === this) {
            AppGameContainer.resourceOwner = null;
        }
    }
    setDefaultMouseCursor() {
        if (!this.destroyed) {
            super.setDefaultMouseCursor();
        }
    }
    setDisplayModeFromDisplay(mode) {
        if (this.destroyed) {
            return;
        }
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
        if (!this.destroyed && this.canvas) {
            this.canvas.style.cursor = cursor;
        }
    }
    ownsSharedResources() {
        return !this.destroyed && AppGameContainer.resourceOwner === this;
    }
    isLifetimeCurrent(lifetime) {
        return this.ownsSharedResources() && lifetime === this.lifetime;
    }
    cleanup(label, operation) {
        try {
            operation();
        }
        catch (error) {
            this.destructionFailure ??= new Error(`Unable to clean up AppGameContainer ${label}; reload is required.`, { cause: error });
            Log.error(`Unable to clean up AppGameContainer ${label}`, error);
        }
    }
    loop = (time) => {
        this.animationFrame = 0;
        if (!this.ownsSharedResources() || this.loopSuspended || this.contextLost || !this.loopReady) {
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
        this.updateGame(delta);
        if (!this.ownsSharedResources() || this.loopSuspended || this.contextLost) {
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
            this.graphics.__prepareForGameRender();
            try {
                this.game.render(this, this.graphics);
            }
            finally {
                this.graphics.resetTransform();
            }
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
        return this.targetFrameRate <= 0 || time - this.lastFrameTime >= 1000 / this.targetFrameRate;
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
                if (this.destroyed || this.loopSuspended || this.contextLost) {
                    return;
                }
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
        this.resetRenderingLifecycleState();
        InternalTextureLoader.get().clear();
        Music.resetPlaybackState();
        if (this.preserveAudioCacheOnDestroy) {
            SoundStore.get().stopAllPlayback();
        }
        else {
            SoundStore.get().clear();
        }
        Renderer.getBackend().dispose();
        if (this.canvas) {
            Renderer.getBackend().initialize(this.canvas, { alpha: true, antialias: this.multiSample > 0, stencil: GameContainer.stencil }, this.width, this.height, this.backingWidth, this.backingHeight);
        }
        else {
            Renderer.getBackend().initDisplay(this.width, this.height, this.backingWidth, this.backingHeight);
        }
        AL.create();
        Display.setActiveContainer(this);
        Display.create();
        Display.setTitle(this.title);
        if (!SoundStore.get().isUsingExplicitPlaybackGenerations()) {
            this.setMusicVolume(1);
            this.setSoundVolume(1);
        }
        this.graphics = new Graphics(this.width, this.height);
        this.defaultFont = this.graphics.getFont();
        Renderer.get().enterOrtho(this.width, this.height);
        this.resetFrameBookkeeping();
    }
    resetRenderingLifecycleState() {
        Graphics.__resetSharedState();
        Image.__resetUseState();
        SpriteSheet.__resetUseState();
    }
    resetFrameBookkeeping() {
        this.resetLoopResumeTiming();
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
        if (!this.ownsSharedResources() ||
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
        if (!this.ownsSharedResources()) {
            return;
        }
        try {
            this.handleBrowserResize();
        }
        catch (error) {
            this.reportError(error);
        }
    };
    handleBrowserResize() {
        if (this.isFullscreen()) {
            this.applyBrowserDisplaySize();
        }
        else {
            this.refreshCurrentCanvasBacking();
        }
    }
    handleFullscreenChange = () => {
        if (!this.ownsSharedResources() || !this.canvas || typeof document === "undefined") {
            return;
        }
        try {
            const fullscreenElement = document.fullscreenElement;
            if (fullscreenElement === this.canvas) {
                this.fullscreen = true;
                this.applyBrowserDisplaySize();
                return;
            }
            // Fullscreen may be owned by a host/PWA wrapper. That does not change
            // Slick's canvas-owned fullscreen state and must not rewrite its sizing.
            if (fullscreenElement !== null) {
                return;
            }
            // Ignore an unrelated fullscreen element leaving the document. Restore
            // only when this container previously believed its canvas was fullscreen.
            if (!this.fullscreen) {
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
        if (!this.ownsSharedResources() || typeof document === "undefined" || document.visibilityState === "hidden") {
            return;
        }
        try {
            this.lastFrameTime = this.now();
            this.refreshCurrentCanvasBacking();
        }
        catch (error) {
            this.reportError(error);
        }
    };
    handleWebGLContextLost = (event) => {
        event.preventDefault();
        if (!this.ownsSharedResources() || this.contextLost) {
            return;
        }
        this.contextLost = true;
        this.cancelScheduledFrame();
        this.storedDelta = 0;
        if (this.graphicsLifecycleHandler !== null) {
            this.loopSuspended = true;
        }
        this.cleanup("lost image state", () => Image.__resetUseState());
        this.cleanup("lost sprite state", () => SpriteSheet.__resetUseState());
        this.cleanup("lost renderer", () => Renderer.getBackend().handleContextLost());
        this.cleanup("lost textures", () => InternalTextureLoader.get().invalidate());
        try {
            this.graphicsLifecycleHandler?.("lost");
        }
        catch (error) {
            let reported = this.toError(error, "Graphics-loss handler failed");
            try {
                SoundStore.get().endPlaybackGeneration();
            }
            catch (cleanupError) {
                reported = new AggregateError([reported, cleanupError], "Graphics-loss handling and audio retirement failed.");
            }
            this.reportError(reported);
            return;
        }
        if (this.destructionFailure !== null) {
            this.reportError(this.destructionFailure);
        }
    };
    handleWebGLContextRestored = () => {
        if (!this.ownsSharedResources() || !this.canvas || !this.contextLost) {
            return;
        }
        try {
            Renderer.getBackend().handleContextRestored();
            this.contextLost = false;
            this.refreshCurrentCanvasBacking();
            this.resetLoopResumeTiming();
            this.graphicsLifecycleHandler?.("restored");
            this.scheduleNextFrame(); // A PWA remains loopSuspended until explicit Continue.
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
        if (this.canvasWithContextHandlers) {
            this.canvasWithContextHandlers.removeEventListener("webglcontextlost", this.handleWebGLContextLost);
            this.canvasWithContextHandlers.removeEventListener("webglcontextrestored", this.handleWebGLContextRestored);
            this.canvasWithContextHandlers = null;
        }
    }
    removeOwnedCanvas(canvas) {
        if (this.ownsCanvas && canvas) {
            canvas.parentNode?.removeChild(canvas);
            this.ownsCanvas = false;
        }
    }
    applyFavicon(ref) {
        if (this.destroyed || typeof document === "undefined") {
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
        if (this.canvas) {
            this.applySizedCanvas(width, height, `${width}px`, `${height}px`, true);
        }
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
        if (!this.canvas || AppGameContainer.resourceOwner !== this) {
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
        if (notify && logicalOrStyleChanged && !this.destroyed) {
            Display.markResized(logicalWidth, logicalHeight);
            this.notifyContainerSizeChanged();
        }
    }
    refreshCurrentCanvasBacking() {
        if (this.destroyed) {
            return;
        }
        if (!this.canvas) {
            this.displayPixelRatio = 1;
            this.backingWidth = this.width;
            this.backingHeight = this.height;
            return; // A not-yet-started container does not own the global renderer.
        }
        this.applySizedCanvas(this.width, this.height, this.canvas.style.width || `${this.width}px`, this.canvas.style.height || `${this.height}px`, false);
    }
    resolveDisplayPixelRatio() {
        if (!this.highDpiEnabled || typeof window === "undefined") {
            return 1;
        }
        const raw = Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : 1;
        return Math.max(1, Math.min(raw || 1, this.maxDevicePixelRatio));
    }
    setLastWindowedDisplayMode(width, height) {
        this.lastWindowedDisplayMode = { width: Math.max(1, Math.trunc(width)), height: Math.max(1, Math.trunc(height)) };
    }
    exitBrowserFullscreenForDestroy() {
        if (!this.canvas || typeof document === "undefined") {
            return;
        }
        const ownsCanvasFullscreen = document.fullscreenElement === this.canvas;
        this.fullscreen = false;
        if (!ownsCanvasFullscreen) {
            return;
        }
        // The fullscreenchange listener is already removed during terminal teardown,
        // so synchronously restore the remembered windowed canvas before asking the
        // browser to finish exiting Slick-owned canvas fullscreen. Host/PWA wrapper
        // fullscreen is owned by the host and must remain completely untouched here.
        this.applyWindowedDisplayMode(this.lastWindowedDisplayMode.width, this.lastWindowedDisplayMode.height, false);
        Mouse.restoreNativeCursorAfterForcedFullscreenExit();
        if (document.exitFullscreen) {
            void document.exitFullscreen().catch(() => undefined);
        }
    }
    waitForQueuedResources() {
        const lifetime = this.lifetime;
        const wait = ++this.resourceWait;
        this.waitingForResources = true;
        void ResourceLoader.waitForAll().then(() => {
            if (!this.isLifetimeCurrent(lifetime) || wait !== this.resourceWait) {
                return;
            }
            this.waitingForResources = false;
            this.lastFrameTime = this.now();
            this.scheduleNextFrame();
        }, (error) => {
            if (!this.isLifetimeCurrent(lifetime) || wait !== this.resourceWait) {
                return;
            }
            this.waitingForResources = false;
            this.reportError(error);
        });
    }
    observeAsyncFailure(operation, token) {
        void operation.catch((error) => {
            if (this.isDisplayOperationCurrent(token)) {
                this.reportRecoverableError(error);
            }
        });
        return operation;
    }
    reportRecoverableError(error) {
        if (this.destroyed) {
            return;
        }
        const reported = this.toError(error, "Failed to complete AppGameContainer asynchronous operation");
        if (this.errorHandler) {
            try {
                this.errorHandler(reported);
            }
            catch (handlerError) {
                Log.error("AppGameContainer error handler failed", handlerError);
            }
        }
        else {
            Log.error(reported);
        }
    }
    reportError(error) {
        if (this.destroyed) {
            return;
        }
        this.resourceError = null;
        const handler = this.errorHandler;
        const reported = this.destroyAfterError(this.toError(error, "Failed to run AppGameContainer frame"));
        if (handler) {
            try {
                handler(reported);
            }
            catch (handlerError) {
                Log.error("AppGameContainer error handler failed", handlerError);
            }
        }
        else {
            Log.error(reported); // Do not throw into a later replacement session's global handler.
        }
    }
    /** Keep the original fault and still notify the shell after failed cleanup. */
    destroyAfterError(reported) {
        try {
            this.destroy();
            return reported;
        }
        catch (cleanupError) {
            return new AggregateError([reported, cleanupError], "AppGameContainer failed and could not be destroyed safely.");
        }
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
        if (this.destroyed) {
            return;
        }
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
        if (this.canvas && this.ownsSharedResources()) {
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
        if (!this.destroyed && isResizeAwareGame(this.game)) {
            this.game.containerSizeChanged(this);
        }
    }
}
//# sourceMappingURL=AppGameContainer.js.map