import { Cursor } from "../lwjgl/input/Cursor.js";
import type { DisplayMode } from "../lwjgl/opengl/DisplayMode.js";
import type { Font } from "./Font.js";
import type { Game } from "./Game.js";
import { Graphics } from "./Graphics.js";
import { Image } from "./Image.js";
import { Input } from "./Input.js";
import type { ImageData as SlickImageData } from "./opengl/ImageData.js";
type DomImageData = globalThis.ImageData;
/**
 * Java Slick2D counterpart: org.newdawn.slick.GameContainer.
 *
 * Base container state for Slick-style games running in the browser.
 */
export declare abstract class GameContainer {
    static stencil: boolean;
    private static sharedContext;
    private static sharedContextEnabled;
    protected readonly game: Game;
    protected input: Input;
    protected graphics: Graphics;
    protected width: number;
    protected height: number;
    protected screenWidth: number;
    protected screenHeight: number;
    protected fps: number;
    protected lastSleep: number;
    protected alwaysRender: boolean;
    protected clearEachFrame: boolean;
    protected showFPS: boolean;
    protected smoothDeltas: boolean;
    protected vsync: boolean;
    protected targetFrameRate: number;
    protected minimumLogicUpdateInterval: number;
    protected maximumLogicUpdateInterval: number;
    protected storedDelta: number;
    protected updateOnlyWhenVisible: boolean;
    protected fullscreen: boolean;
    protected paused: boolean;
    protected forceExit: boolean;
    protected multiSample: number;
    protected defaultFont: Font;
    protected iconRefs: string[];
    protected animatedCursorDelays: number[];
    /**
     * Java Slick2D counterpart: GameContainer(Game).
     *
     * Creates core input and graphics facades for a Slick game.
     */
    constructor(game: Game);
    /** Java Slick2D counterpart: GameContainer.enableStencil(). */
    static enableStencil(): void;
    /** Java Slick2D counterpart: GameContainer.enableSharedContext(). */
    static enableSharedContext(): void;
    /** Java Slick2D counterpart: GameContainer.getSharedContext(). */
    static getSharedContext(): unknown | null;
    /** Java Slick2D counterpart: GameContainer.getBuildVersion(). */
    static getBuildVersion(): number;
    /** Java Slick2D counterpart: GameContainer.getInput(). */
    getInput(): Input;
    /** Java Slick2D counterpart: GameContainer.getGraphics(). */
    getGraphics(): Graphics;
    /** Java Slick2D counterpart: GameContainer.getWidth(). */
    getWidth(): number;
    /** Java Slick2D counterpart: GameContainer.getHeight(). */
    getHeight(): number;
    /** Java Slick2D counterpart: GameContainer.getScreenWidth(). */
    getScreenWidth(): number;
    /** Java Slick2D counterpart: GameContainer.getScreenHeight(). */
    getScreenHeight(): number;
    /** Java Slick2D counterpart: GameContainer.getAspectRatio(). */
    getAspectRatio(): number;
    /** Java Slick2D counterpart: GameContainer.getFPS(). */
    getFPS(): number;
    /** Java Slick2D counterpart: GameContainer.getTime(). */
    getTime(): number;
    /** Java Slick2D counterpart: GameContainer.sleep(long). */
    sleep(milliseconds: number): void;
    /** Browser parity helper: last requested sleep duration. */
    getLastSleep(): number;
    /** Java Slick2D counterpart: GameContainer.setAlwaysRender(boolean). */
    setAlwaysRender(alwaysRender: boolean): void;
    /** Java Slick2D counterpart: GameContainer.getAlwaysRender(). */
    getAlwaysRender(): boolean;
    /** Java Slick2D counterpart: GameContainer.setClearEachFrame(boolean). */
    setClearEachFrame(clear: boolean): void;
    /** Java Slick2D counterpart: GameContainer.setShowFPS(boolean). */
    setShowFPS(show: boolean): void;
    /** Java Slick2D counterpart: GameContainer.isShowingFPS(). */
    isShowingFPS(): boolean;
    /** Java Slick2D counterpart: GameContainer.setSmoothDeltas(boolean). */
    setSmoothDeltas(smooth: boolean): void;
    /** Java Slick2D counterpart: GameContainer.setVSync(boolean). */
    setVSync(sync: boolean): void;
    /** Java Slick2D counterpart: GameContainer.isVSyncRequested(). */
    isVSyncRequested(): boolean;
    /** Java Slick2D counterpart: GameContainer.setTargetFrameRate(int). */
    setTargetFrameRate(frameRate: number): void;
    /** Java Slick2D counterpart: GameContainer.setMinimumLogicUpdateInterval(int). */
    setMinimumLogicUpdateInterval(interval: number): void;
    /** Java Slick2D counterpart: GameContainer.setMaximumLogicUpdateInterval(int). */
    setMaximumLogicUpdateInterval(interval: number): void;
    /** Java Slick2D counterpart: GameContainer.setUpdateOnlyWhenVisible(boolean). */
    setUpdateOnlyWhenVisible(updateOnlyWhenVisible: boolean): void;
    /** Java Slick2D counterpart: GameContainer.isUpdatingOnlyWhenVisible(). */
    isUpdatingOnlyWhenVisible(): boolean;
    /** Java Slick2D counterpart: GameContainer.setSoundOn(boolean). */
    setSoundOn(on: boolean): void;
    /** Java Slick2D counterpart: GameContainer.isSoundOn(). */
    isSoundOn(): boolean;
    /** Browser/PWA helper: stops active sound effects without changing music or sound toggles. */
    stopSoundEffects(): void;
    /** Java Slick2D counterpart: GameContainer.setMusicOn(boolean). */
    setMusicOn(on: boolean): void;
    /** Java Slick2D counterpart: GameContainer.isMusicOn(). */
    isMusicOn(): boolean;
    /** Java Slick2D counterpart: GameContainer.setSoundVolume(float). */
    setSoundVolume(volume: number): void;
    /** Java Slick2D counterpart: GameContainer.getSoundVolume(). */
    getSoundVolume(): number;
    /** Java Slick2D counterpart: GameContainer.setMusicVolume(float). */
    setMusicVolume(volume: number): void;
    /** Java Slick2D counterpart: GameContainer.getMusicVolume(). */
    getMusicVolume(): number;
    /** Java Slick2D counterpart: GameContainer.setFullscreen(boolean). */
    setFullscreen(fullscreen: boolean): void | Promise<void>;
    /** Java Slick2D counterpart: GameContainer.isFullscreen(). */
    isFullscreen(): boolean;
    /** Java Slick2D counterpart: GameContainer.setIcon(String). */
    setIcon(ref: string): void;
    /** Java Slick2D counterpart: GameContainer.setIcons(String[]). */
    setIcons(refs: string[]): void;
    setMouseCursor(ref: string, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    setMouseCursor(data: DomImageData | SlickImageData, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    setMouseCursor(image: Image, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    setMouseCursor(cursor: Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    protected setMouseCursorImpl(cursorLike: string | DomImageData | SlickImageData | Image | Cursor, hotSpotX: number, hotSpotY: number): void | Promise<void>;
    /** Java Slick2D counterpart: GameContainer.setAnimatedMouseCursor(...). */
    setAnimatedMouseCursor(ref: string, x: number, y: number, _width: number, _height: number, cursorDelays: number[]): void | Promise<void>;
    /** Java Slick2D counterpart: GameContainer.setDefaultMouseCursor(). */
    setDefaultMouseCursor(): void;
    /** Java Slick2D counterpart: GameContainer.setDefaultFont(Font). */
    setDefaultFont(font: Font): void;
    /** Java Slick2D counterpart: GameContainer.getDefaultFont(). */
    getDefaultFont(): Font;
    /** Java Slick2D counterpart: GameContainer.setMouseGrabbed(boolean). */
    setMouseGrabbed(grabbed: boolean): void | Promise<void>;
    /** Java Slick2D counterpart: GameContainer.isMouseGrabbed(). */
    isMouseGrabbed(): boolean;
    /** Java Slick2D counterpart: GameContainer.setPaused(boolean). */
    setPaused(paused: boolean): void;
    /** Java Slick2D counterpart: GameContainer.isPaused(). */
    isPaused(): boolean;
    /** Java Slick2D counterpart: GameContainer.pause(). */
    pause(): void;
    /** Java Slick2D counterpart: GameContainer.resume(). */
    resume(): void;
    /** Java Slick2D counterpart: GameContainer.setForceExit(boolean). */
    setForceExit(forceExit: boolean): void;
    /** Java Slick2D counterpart: GameContainer.exit(). */
    exit(): void;
    /** Java Slick2D counterpart: GameContainer.hasFocus(). */
    hasFocus(): boolean;
    /** Java Slick2D counterpart: GameContainer.reinit(). */
    reinit(): void | Promise<void>;
    /** Java Slick2D counterpart: GameContainer.setMultiSample(int). */
    setMultiSample(samples: number): void;
    /** Java Slick2D counterpart: GameContainer.supportsMultiSample(). */
    supportsMultiSample(): boolean;
    /** Java Slick2D counterpart: GameContainer.getSamples(). */
    getSamples(): number;
    /** Java Slick2D counterpart: GameContainer.setVerbose(boolean). */
    setVerbose(verbose: boolean): void;
    /** Browser parity helper used by Display.setDisplayMode. */
    setDisplayModeFromDisplay(mode: DisplayMode): void;
    protected setDimensions(width: number, height: number): void;
    protected setCssCursor(_cursor: string): void;
    private static cursorCssFromDomImageData;
}
export {};
//# sourceMappingURL=GameContainer.d.ts.map