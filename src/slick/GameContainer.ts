import { Cursor } from "../lwjgl/input/Cursor.js";
import { Mouse } from "../lwjgl/input/Mouse.js";
import type { DisplayMode } from "../lwjgl/opengl/DisplayMode.js";
import { Display } from "../lwjgl/opengl/Display.js";
import type { Font } from "./Font.js";
import type { Game } from "./Game.js";
import { Graphics } from "./Graphics.js";
import { Image } from "./Image.js";
import { Input } from "./Input.js";
import { SoundStore } from "./openal/SoundStore.js";
import type { ImageData as SlickImageData } from "./opengl/ImageData.js";
import { Renderer } from "./opengl/renderer/Renderer.js";
import { SlickException } from "./SlickException.js";
import { Log } from "./util/Log.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

type DomImageData = globalThis.ImageData;

function isSlickImageData(value: unknown): value is SlickImageData {
    const candidate = value as Partial<SlickImageData> | null;
    return !!candidate
        && typeof candidate.getWidth === "function"
        && typeof candidate.getHeight === "function"
        && typeof candidate.getImageBufferData === "function";
}

class ContainerFont implements Font {
    /** Java Slick2D counterpart: Font.getWidth(String). */
    public getWidth(text: string): number {
        return text.length * 8;
    }

    /** Java Slick2D counterpart: Font.getHeight(String). */
    public getHeight(_text: string): number {
        return 16;
    }

    /** Java Slick2D counterpart: Font.getLineHeight(). */
    public getLineHeight(): number {
        return 16;
    }

    /** Java Slick2D counterpart: Font.drawString(...). */
    public drawString(_x: number, _y: number, _text: string): void {
    }
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.GameContainer.
 *
 * Base container state for Slick-style games running in the browser.
 */
export abstract class GameContainer {
    public static stencil = false;
    private static sharedContext: unknown | null = null;
    private static sharedContextEnabled = false;

    protected readonly game: Game;
    protected input: Input;
    protected graphics: Graphics;
    protected width = 640;
    protected height = 480;
    protected screenWidth = 640;
    protected screenHeight = 480;
    protected fps = 0;
    protected lastSleep = 0;
    protected alwaysRender = false;
    protected clearEachFrame = true;
    protected showFPS = true;
    protected smoothDeltas = false;
    protected vsync = false;
    protected targetFrameRate = -1;
    protected minimumLogicUpdateInterval = 1;
    protected maximumLogicUpdateInterval = 0;
    protected updateOnlyWhenVisible = false;
    protected fullscreen = false;
    protected paused = false;
    protected forceExit = true;
    protected multiSample = 0;
    protected defaultFont: Font = new ContainerFont();
    protected iconRefs: string[] = [];
    protected animatedCursorDelays: number[] = [];

    /**
     * Java Slick2D counterpart: GameContainer(Game).
     *
     * Creates core input and graphics facades for a Slick game.
     */
    public constructor(game: Game) {
        this.game = game;
        this.input = new Input(this.height);
        this.graphics = new Graphics(this.width, this.height);
    }

    /** Java Slick2D counterpart: GameContainer.enableStencil(). */
    public static enableStencil(): void {
        GameContainer.stencil = true;
    }

    /** Java Slick2D counterpart: GameContainer.enableSharedContext(). */
    public static enableSharedContext(): void {
        const context = Renderer.getBackend().getContext();
        GameContainer.sharedContext = context ?? Renderer.getBackend();
        GameContainer.sharedContextEnabled = true;
        if (!GameContainer.sharedContext) {
            throw new SlickException("Unable to create shared WebGL context");
        }
    }

    /** Java Slick2D counterpart: GameContainer.getSharedContext(). */
    public static getSharedContext(): unknown | null {
        return GameContainer.sharedContextEnabled ? GameContainer.sharedContext : null;
    }

    /** Java Slick2D counterpart: GameContainer.getBuildVersion(). */
    public static getBuildVersion(): number {
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
        } catch {
            Log.info("Unable to determine Slick build number");
            return -1;
        }
    }

    /** Java Slick2D counterpart: GameContainer.getInput(). */
    public getInput(): Input {
        return this.input;
    }

    /** Java Slick2D counterpart: GameContainer.getGraphics(). */
    public getGraphics(): Graphics {
        return this.graphics;
    }

    /** Java Slick2D counterpart: GameContainer.getWidth(). */
    public getWidth(): number {
        return this.width;
    }

    /** Java Slick2D counterpart: GameContainer.getHeight(). */
    public getHeight(): number {
        return this.height;
    }

    /** Java Slick2D counterpart: GameContainer.getScreenWidth(). */
    public getScreenWidth(): number {
        return this.screenWidth;
    }

    /** Java Slick2D counterpart: GameContainer.getScreenHeight(). */
    public getScreenHeight(): number {
        return this.screenHeight;
    }

    /** Java Slick2D counterpart: GameContainer.getAspectRatio(). */
    public getAspectRatio(): number {
        return this.width / (this.height || 1);
    }

    /** Java Slick2D counterpart: GameContainer.getFPS(). */
    public getFPS(): number {
        return this.fps;
    }

    /** Java Slick2D counterpart: GameContainer.getTime(). */
    public getTime(): number {
        return Math.trunc(typeof performance !== "undefined" ? performance.now() : Date.now());
    }

    /** Java Slick2D counterpart: GameContainer.sleep(long). */
    public sleep(milliseconds: number): void {
        this.lastSleep = milliseconds;
    }

    /** Browser parity helper: last requested sleep duration. */
    public getLastSleep(): number {
        return this.lastSleep;
    }

    /** Java Slick2D counterpart: GameContainer.setAlwaysRender(boolean). */
    public setAlwaysRender(alwaysRender: boolean): void {
        this.alwaysRender = alwaysRender;
    }

    /** Java Slick2D counterpart: GameContainer.getAlwaysRender(). */
    public getAlwaysRender(): boolean {
        return this.alwaysRender;
    }

    /** Java Slick2D counterpart: GameContainer.setClearEachFrame(boolean). */
    public setClearEachFrame(clear: boolean): void {
        this.clearEachFrame = clear;
    }

    /** Java Slick2D counterpart: GameContainer.setShowFPS(boolean). */
    public setShowFPS(show: boolean): void {
        this.showFPS = show;
    }

    /** Java Slick2D counterpart: GameContainer.isShowingFPS(). */
    public isShowingFPS(): boolean {
        return this.showFPS;
    }

    /** Java Slick2D counterpart: GameContainer.setSmoothDeltas(boolean). */
    public setSmoothDeltas(smooth: boolean): void {
        this.smoothDeltas = smooth;
    }

    /** Java Slick2D counterpart: GameContainer.setVSync(boolean). */
    public setVSync(sync: boolean): void {
        this.vsync = sync;
        Display.setVSyncEnabled(sync);
    }

    /** Java Slick2D counterpart: GameContainer.isVSyncRequested(). */
    public isVSyncRequested(): boolean {
        return this.vsync;
    }

    /** Java Slick2D counterpart: GameContainer.setTargetFrameRate(int). */
    public setTargetFrameRate(frameRate: number): void {
        this.targetFrameRate = frameRate;
        Display.sync(frameRate);
    }

    /** Java Slick2D counterpart: GameContainer.setMinimumLogicUpdateInterval(int). */
    public setMinimumLogicUpdateInterval(interval: number): void {
        this.minimumLogicUpdateInterval = interval;
    }

    /** Java Slick2D counterpart: GameContainer.setMaximumLogicUpdateInterval(int). */
    public setMaximumLogicUpdateInterval(interval: number): void {
        this.maximumLogicUpdateInterval = interval;
    }

    /** Java Slick2D counterpart: GameContainer.setUpdateOnlyWhenVisible(boolean). */
    public setUpdateOnlyWhenVisible(updateOnlyWhenVisible: boolean): void {
        this.updateOnlyWhenVisible = updateOnlyWhenVisible;
    }

    /** Java Slick2D counterpart: GameContainer.isUpdatingOnlyWhenVisible(). */
    public isUpdatingOnlyWhenVisible(): boolean {
        return this.updateOnlyWhenVisible;
    }

    /** Java Slick2D counterpart: GameContainer.setSoundOn(boolean). */
    public setSoundOn(on: boolean): void {
        SoundStore.get().setSoundsOn(on);
    }

    /** Java Slick2D counterpart: GameContainer.isSoundOn(). */
    public isSoundOn(): boolean {
        return SoundStore.get().soundsOn();
    }

    /** Java Slick2D counterpart: GameContainer.setMusicOn(boolean). */
    public setMusicOn(on: boolean): void {
        SoundStore.get().setMusicOn(on);
    }

    /** Java Slick2D counterpart: GameContainer.isMusicOn(). */
    public isMusicOn(): boolean {
        return SoundStore.get().musicOn();
    }

    /** Java Slick2D counterpart: GameContainer.setSoundVolume(float). */
    public setSoundVolume(volume: number): void {
        SoundStore.get().setSoundVolume(volume);
    }

    /** Java Slick2D counterpart: GameContainer.getSoundVolume(). */
    public getSoundVolume(): number {
        return SoundStore.get().getSoundVolume();
    }

    /** Java Slick2D counterpart: GameContainer.setMusicVolume(float). */
    public setMusicVolume(volume: number): void {
        SoundStore.get().setMusicVolume(volume);
    }

    /** Java Slick2D counterpart: GameContainer.getMusicVolume(). */
    public getMusicVolume(): number {
        return SoundStore.get().getMusicVolume();
    }

    /** Java Slick2D counterpart: GameContainer.setFullscreen(boolean). */
    public setFullscreen(fullscreen: boolean): void | Promise<void> {
        this.fullscreen = fullscreen;
    }

    /** Java Slick2D counterpart: GameContainer.isFullscreen(). */
    public isFullscreen(): boolean {
        return this.fullscreen;
    }

    /** Java Slick2D counterpart: GameContainer.setIcon(String). */
    public setIcon(ref: string): void {
        this.setIcons([ref]);
    }

    /** Java Slick2D counterpart: GameContainer.setIcons(String[]). */
    public setIcons(refs: string[]): void {
        this.iconRefs = refs.slice();
    }

    public setMouseCursor(ref: string, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(data: DomImageData | SlickImageData, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(image: Image, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    public setMouseCursor(cursor: Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    /** Java Slick2D counterpart: GameContainer.setMouseCursor(...). */
    public setMouseCursor(cursorLike: string | DomImageData | SlickImageData | Image | Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void> {
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
    public setAnimatedMouseCursor(ref: string, x: number, y: number, _width: number, _height: number, cursorDelays: number[]): void | Promise<void> {
        this.animatedCursorDelays = cursorDelays.slice();
        return this.setMouseCursor(ref, x, y);
    }

    /** Java Slick2D counterpart: GameContainer.setDefaultMouseCursor(). */
    public setDefaultMouseCursor(): void {
        Mouse.setNativeCursor(null);
        this.setCssCursor("");
    }

    /** Java Slick2D counterpart: GameContainer.setDefaultFont(Font). */
    public setDefaultFont(font: Font): void {
        this.defaultFont = font;
        this.graphics.setFont(font);
    }

    /** Java Slick2D counterpart: GameContainer.getDefaultFont(). */
    public getDefaultFont(): Font {
        return this.defaultFont;
    }

    /** Java Slick2D counterpart: GameContainer.setMouseGrabbed(boolean). */
    public setMouseGrabbed(grabbed: boolean): void | Promise<void> {
        return Mouse.setGrabbed(grabbed);
    }

    /** Java Slick2D counterpart: GameContainer.isMouseGrabbed(). */
    public isMouseGrabbed(): boolean {
        return Mouse.isGrabbed();
    }

    /** Java Slick2D counterpart: GameContainer.setPaused(boolean). */
    public setPaused(paused: boolean): void {
        this.paused = paused;
        if (paused) {
            this.input.pause();
        } else {
            this.input.resume();
        }
    }

    /** Java Slick2D counterpart: GameContainer.isPaused(). */
    public isPaused(): boolean {
        return this.paused;
    }

    /** Java Slick2D counterpart: GameContainer.pause(). */
    public pause(): void {
        this.setPaused(true);
    }

    /** Java Slick2D counterpart: GameContainer.resume(). */
    public resume(): void {
        this.setPaused(false);
    }

    /** Java Slick2D counterpart: GameContainer.setForceExit(boolean). */
    public setForceExit(forceExit: boolean): void {
        this.forceExit = forceExit;
    }

    /** Java Slick2D counterpart: GameContainer.exit(). */
    public exit(): void {
        Display.requestClose();
    }

    /** Java Slick2D counterpart: GameContainer.hasFocus(). */
    public hasFocus(): boolean {
        return typeof document === "undefined" || document.hasFocus();
    }

    /** Java Slick2D counterpart: GameContainer.reinit(). */
    public reinit(): void | Promise<void> {
        return this.game.init(this);
    }

    /** Java Slick2D counterpart: GameContainer.setMultiSample(int). */
    public setMultiSample(samples: number): void {
        this.multiSample = Math.max(0, samples);
    }

    /** Java Slick2D counterpart: GameContainer.supportsMultiSample(). */
    public supportsMultiSample(): boolean {
        return true;
    }

    /** Java Slick2D counterpart: GameContainer.getSamples(). */
    public getSamples(): number {
        return this.multiSample;
    }

    /** Java Slick2D counterpart: GameContainer.setVerbose(boolean). */
    public setVerbose(verbose: boolean): void {
        Log.setVerbose(verbose);
    }

    /** Browser parity helper used by Display.setDisplayMode. */
    public setDisplayModeFromDisplay(mode: DisplayMode): void {
        this.width = mode.getWidth();
        this.height = mode.getHeight();
        this.screenWidth = mode.getWidth();
        this.screenHeight = mode.getHeight();
        this.graphics.setDimensions(this.width, this.height);
    }

    protected setDimensions(width: number, height: number): void {
        this.width = width;
        this.height = height;
        this.screenWidth = width;
        this.screenHeight = height;
        this.graphics.setDimensions(width, height);
    }

    protected setCssCursor(_cursor: string): void {
    }

    private static cursorCssFromDomImageData(data: DomImageData, hotSpotX: number, hotSpotY: number): string {
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
