import { Cursor } from "../lwjgl/input/Cursor.js";
import { Mouse } from "../lwjgl/input/Mouse.js";
import { Display } from "../lwjgl/opengl/Display.js";
import { Graphics } from "./Graphics.js";
import { Image } from "./Image.js";
import { Input } from "./Input.js";
import { SoundStore } from "./openal/SoundStore.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import { SlickException } from "./SlickException.js";
import { CanvasFont } from "./support/CanvasFont.js";
import { Log } from "./util/Log.js";
import { ResourceLoader } from "./util/ResourceLoader.js";
function isSlickImageData(value) {
    const candidate = value;
    return (!!candidate &&
        typeof candidate.getWidth === "function" &&
        typeof candidate.getHeight === "function" &&
        typeof candidate.getImageBufferData === "function");
}
/**
 * Java Slick2D counterpart: org.newdawn.slick.GameContainer.
 *
 * Base container state for Slick-style games running in the browser.
 */
export class GameContainer {
    static stencil = false;
    static sharedContext = null;
    static sharedContextEnabled = false;
    game;
    input;
    graphics;
    width = 640;
    height = 480;
    screenWidth = 640;
    screenHeight = 480;
    fps = 0;
    lastSleep = 0;
    alwaysRender = false;
    clearEachFrame = true;
    showFPS = true;
    smoothDeltas = false;
    vsync = false;
    targetFrameRate = -1;
    minimumLogicUpdateInterval = 1;
    maximumLogicUpdateInterval = 0;
    storedDelta = 0;
    updateOnlyWhenVisible = false;
    fullscreen = false;
    paused = false;
    forceExit = true;
    multiSample = 0;
    defaultFont = new CanvasFont();
    iconRefs = [];
    animatedCursorDelays = [];
    /**
     * Java Slick2D counterpart: GameContainer(Game).
     *
     * Creates core input and graphics facades for a Slick game.
     */
    constructor(game) {
        this.game = game;
        this.input = new Input(this.height);
        this.graphics = new Graphics(this.width, this.height);
    }
    /** Java Slick2D counterpart: GameContainer.enableStencil(). */
    static enableStencil() {
        GameContainer.stencil = true;
    }
    /** Java Slick2D counterpart: GameContainer.enableSharedContext(). */
    static enableSharedContext() {
        const context = Renderer.getBackend().getContext();
        GameContainer.sharedContext = context ?? Renderer.getBackend();
        GameContainer.sharedContextEnabled = true;
        if (!GameContainer.sharedContext) {
            throw new SlickException("Unable to create shared WebGL context");
        }
    }
    /** Java Slick2D counterpart: GameContainer.getSharedContext(). */
    static getSharedContext() {
        return GameContainer.sharedContextEnabled ? GameContainer.sharedContext : null;
    }
    /** Java Slick2D counterpart: GameContainer.getBuildVersion(). */
    static getBuildVersion() {
        try {
            const bytes = ResourceLoader.getResourceAsStream("version");
            if (!bytes) {
                throw new SlickException("Missing version resource");
            }
            const text = new TextDecoder().decode(bytes);
            const line = text.split(/\r?\n/g).find((entry) => entry.trim().startsWith("build="));
            if (!line) {
                throw new SlickException("Missing build property");
            }
            const build = Number.parseInt(line.substring(line.indexOf("=") + 1).trim(), 10);
            if (!Number.isFinite(build)) {
                throw new SlickException("Invalid build property");
            }
            Log.info(`Slick Build #${build}`);
            return build;
        }
        catch {
            Log.info("Unable to determine Slick build number");
            return -1;
        }
    }
    /** Java Slick2D counterpart: GameContainer.getInput(). */
    getInput() {
        return this.input;
    }
    /** Java Slick2D counterpart: GameContainer.getGraphics(). */
    getGraphics() {
        return this.graphics;
    }
    /** Java Slick2D counterpart: GameContainer.getWidth(). */
    getWidth() {
        return this.width;
    }
    /** Java Slick2D counterpart: GameContainer.getHeight(). */
    getHeight() {
        return this.height;
    }
    /** Java Slick2D counterpart: GameContainer.getScreenWidth(). */
    getScreenWidth() {
        return this.screenWidth;
    }
    /** Java Slick2D counterpart: GameContainer.getScreenHeight(). */
    getScreenHeight() {
        return this.screenHeight;
    }
    /** Java Slick2D counterpart: GameContainer.getAspectRatio(). */
    getAspectRatio() {
        return this.width / (this.height || 1);
    }
    /** Java Slick2D counterpart: GameContainer.getFPS(). */
    getFPS() {
        return this.fps;
    }
    /** Java Slick2D counterpart: GameContainer.getTime(). */
    getTime() {
        return Math.trunc(typeof performance !== "undefined" ? performance.now() : Date.now());
    }
    /** Java Slick2D counterpart: GameContainer.sleep(long). */
    sleep(milliseconds) {
        this.lastSleep = milliseconds;
    }
    /** Browser parity helper: last requested sleep duration. */
    getLastSleep() {
        return this.lastSleep;
    }
    /** Java Slick2D counterpart: GameContainer.setAlwaysRender(boolean). */
    setAlwaysRender(alwaysRender) {
        this.alwaysRender = alwaysRender;
    }
    /** Java Slick2D counterpart: GameContainer.getAlwaysRender(). */
    getAlwaysRender() {
        return this.alwaysRender;
    }
    /** Java Slick2D counterpart: GameContainer.setClearEachFrame(boolean). */
    setClearEachFrame(clear) {
        this.clearEachFrame = clear;
    }
    /** Java Slick2D counterpart: GameContainer.setShowFPS(boolean). */
    setShowFPS(show) {
        this.showFPS = show;
    }
    /** Java Slick2D counterpart: GameContainer.isShowingFPS(). */
    isShowingFPS() {
        return this.showFPS;
    }
    /** Java Slick2D counterpart: GameContainer.setSmoothDeltas(boolean). */
    setSmoothDeltas(smooth) {
        this.smoothDeltas = smooth;
    }
    /** Java Slick2D counterpart: GameContainer.setVSync(boolean). */
    setVSync(sync) {
        this.vsync = sync;
        Display.setVSyncEnabled(sync);
    }
    /** Java Slick2D counterpart: GameContainer.isVSyncRequested(). */
    isVSyncRequested() {
        return this.vsync;
    }
    /** Java Slick2D counterpart: GameContainer.setTargetFrameRate(int). */
    setTargetFrameRate(frameRate) {
        this.targetFrameRate = Math.trunc(frameRate);
    }
    /** Java Slick2D counterpart: GameContainer.setMinimumLogicUpdateInterval(int). */
    setMinimumLogicUpdateInterval(interval) {
        this.minimumLogicUpdateInterval = Math.trunc(interval);
    }
    /** Java Slick2D counterpart: GameContainer.setMaximumLogicUpdateInterval(int). */
    setMaximumLogicUpdateInterval(interval) {
        this.maximumLogicUpdateInterval = Math.trunc(interval);
    }
    /** Java Slick2D counterpart: GameContainer.setUpdateOnlyWhenVisible(boolean). */
    setUpdateOnlyWhenVisible(updateOnlyWhenVisible) {
        this.updateOnlyWhenVisible = updateOnlyWhenVisible;
    }
    /** Java Slick2D counterpart: GameContainer.isUpdatingOnlyWhenVisible(). */
    isUpdatingOnlyWhenVisible() {
        return this.updateOnlyWhenVisible;
    }
    /** Java Slick2D counterpart: GameContainer.setSoundOn(boolean). */
    setSoundOn(on) {
        SoundStore.get().setSoundsOn(on);
    }
    /** Java Slick2D counterpart: GameContainer.isSoundOn(). */
    isSoundOn() {
        return SoundStore.get().soundsOn();
    }
    /** Browser/PWA helper: stops active sound effects without changing music or sound toggles. */
    stopSoundEffects() {
        SoundStore.get().stopSoundEffects();
    }
    /** Java Slick2D counterpart: GameContainer.setMusicOn(boolean). */
    setMusicOn(on) {
        SoundStore.get().setMusicOn(on);
    }
    /** Java Slick2D counterpart: GameContainer.isMusicOn(). */
    isMusicOn() {
        return SoundStore.get().musicOn();
    }
    /** Java Slick2D counterpart: GameContainer.setSoundVolume(float). */
    setSoundVolume(volume) {
        SoundStore.get().setSoundVolume(volume);
    }
    /** Java Slick2D counterpart: GameContainer.getSoundVolume(). */
    getSoundVolume() {
        return SoundStore.get().getSoundVolume();
    }
    /** Java Slick2D counterpart: GameContainer.setMusicVolume(float). */
    setMusicVolume(volume) {
        SoundStore.get().setMusicVolume(volume);
    }
    /** Java Slick2D counterpart: GameContainer.getMusicVolume(). */
    getMusicVolume() {
        return SoundStore.get().getMusicVolume();
    }
    /** Java Slick2D counterpart: GameContainer.setFullscreen(boolean). */
    setFullscreen(fullscreen) {
        this.fullscreen = fullscreen;
    }
    /** Java Slick2D counterpart: GameContainer.isFullscreen(). */
    isFullscreen() {
        return this.fullscreen;
    }
    /** Java Slick2D counterpart: GameContainer.setIcon(String). */
    setIcon(ref) {
        this.setIcons([ref]);
    }
    /** Java Slick2D counterpart: GameContainer.setIcons(String[]). */
    setIcons(refs) {
        this.iconRefs = refs.slice();
    }
    /** Java Slick2D counterpart: GameContainer.setMouseCursor(...). */
    setMouseCursor(cursorLike, hotSpotX, hotSpotY) {
        return this.setMouseCursorImpl(cursorLike, hotSpotX, hotSpotY);
    }
    setMouseCursorImpl(cursorLike, hotSpotX, hotSpotY) {
        if (typeof cursorLike === "string") {
            this.setCssCursor(`url("${ResourceLoader.getResource(cursorLike)?.toString() ?? cursorLike}") ${hotSpotX} ${hotSpotY}, auto`);
            return;
        }
        if (cursorLike instanceof Cursor) {
            Mouse.setNativeCursor(cursorLike);
            return;
        }
        if (cursorLike instanceof Image) {
            const ref = cursorLike.getResourceReference();
            this.setCssCursor(ref ? `url("${ResourceLoader.getResource(ref)?.toString() ?? ref}") ${hotSpotX} ${hotSpotY}, auto` : "auto");
            return;
        }
        if (typeof globalThis.ImageData !== "undefined" && cursorLike instanceof globalThis.ImageData) {
            this.setCssCursor(GameContainer.cursorCssFromDomImageData(cursorLike, hotSpotX, hotSpotY));
            return;
        }
        if (isSlickImageData(cursorLike)) {
            Mouse.setNativeCursor(new Cursor(cursorLike.getWidth(), cursorLike.getHeight(), hotSpotX, hotSpotY, 1, cursorLike.getImageBufferData(), null));
        }
    }
    /** Java Slick2D counterpart: GameContainer.setAnimatedMouseCursor(...). */
    setAnimatedMouseCursor(ref, x, y, _width, _height, cursorDelays) {
        this.animatedCursorDelays = cursorDelays.slice();
        return this.setMouseCursor(ref, x, y);
    }
    /** Java Slick2D counterpart: GameContainer.setDefaultMouseCursor(). */
    setDefaultMouseCursor() {
        Mouse.setNativeCursor(null);
        this.setCssCursor("");
    }
    /** Java Slick2D counterpart: GameContainer.setDefaultFont(Font). */
    setDefaultFont(font) {
        this.defaultFont = font;
        this.graphics.setFont(font);
    }
    /** Java Slick2D counterpart: GameContainer.getDefaultFont(). */
    getDefaultFont() {
        return this.defaultFont;
    }
    /** Java Slick2D counterpart: GameContainer.setMouseGrabbed(boolean). */
    setMouseGrabbed(grabbed) {
        return Mouse.setGrabbed(grabbed);
    }
    /** Java Slick2D counterpart: GameContainer.isMouseGrabbed(). */
    isMouseGrabbed() {
        return Mouse.isGrabbed();
    }
    /** Java Slick2D counterpart: GameContainer.setPaused(boolean). */
    setPaused(paused) {
        this.paused = paused;
        if (paused) {
            this.input.pause();
        }
        else {
            this.input.resume();
        }
    }
    /** Java Slick2D counterpart: GameContainer.isPaused(). */
    isPaused() {
        return this.paused;
    }
    /** Java Slick2D counterpart: GameContainer.pause(). */
    pause() {
        this.setPaused(true);
    }
    /** Java Slick2D counterpart: GameContainer.resume(). */
    resume() {
        this.setPaused(false);
    }
    /** Java Slick2D counterpart: GameContainer.setForceExit(boolean). */
    setForceExit(forceExit) {
        this.forceExit = forceExit;
    }
    /** Java Slick2D counterpart: GameContainer.exit(). */
    exit() {
        Display.requestClose();
    }
    /** Java Slick2D counterpart: GameContainer.hasFocus(). */
    hasFocus() {
        return typeof document === "undefined" || document.hasFocus();
    }
    /** Java Slick2D counterpart: GameContainer.reinit(). */
    reinit() {
        return this.game.init(this);
    }
    /** Java Slick2D counterpart: GameContainer.setMultiSample(int). */
    setMultiSample(samples) {
        this.multiSample = Math.max(0, samples);
    }
    /** Java Slick2D counterpart: GameContainer.supportsMultiSample(). */
    supportsMultiSample() {
        return true;
    }
    /** Java Slick2D counterpart: GameContainer.getSamples(). */
    getSamples() {
        return this.multiSample;
    }
    /** Java Slick2D counterpart: GameContainer.setVerbose(boolean). */
    setVerbose(verbose) {
        Log.setVerbose(verbose);
    }
    /** Browser parity helper used by Display.setDisplayMode. */
    setDisplayModeFromDisplay(mode) {
        this.width = mode.getWidth();
        this.height = mode.getHeight();
        this.screenWidth = mode.getWidth();
        this.screenHeight = mode.getHeight();
        this.graphics.setDimensions(this.width, this.height);
    }
    setDimensions(width, height) {
        this.width = width;
        this.height = height;
        this.screenWidth = width;
        this.screenHeight = height;
        this.graphics.setDimensions(width, height);
    }
    setCssCursor(_cursor) { }
    static cursorCssFromDomImageData(data, hotSpotX, hotSpotY) {
        if (typeof document === "undefined") {
            return "auto";
        }
        const canvas = document.createElement("canvas");
        canvas.width = data.width;
        canvas.height = data.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return "auto";
        }
        ctx.putImageData(data, 0, 0);
        return `url("${canvas.toDataURL("image/png")}") ${hotSpotX} ${hotSpotY}, auto`;
    }
}
//# sourceMappingURL=GameContainer.js.map