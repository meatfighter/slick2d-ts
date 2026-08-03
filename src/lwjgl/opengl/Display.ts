import { GameContainer } from "../../slick/GameContainer.js";
import { DisplayMode } from "./DisplayMode.js";
import type { PixelFormat } from "./PixelFormat.js";

type DisplayBackedContainer = GameContainer & {
    destroy(): void;
    setDisplayMode(width: number, height: number, fullscreen: boolean): void | Promise<void>;
    setDisplayModeFromDisplay?(mode: DisplayMode): void;
};

function pushUnique(modes: DisplayMode[], width: number, height: number): void {
    if (width <= 0 || height <= 0) {
        return;
    }
    if (!modes.some((mode) => mode.getWidth() === width && mode.getHeight() === height)) {
        modes.push(new DisplayMode(width, height, 32));
    }
}

/**
 * Java LWJGL counterpart: org.lwjgl.opengl.Display.
 *
 * Static browser display shim that delegates to the active AppGameContainer.
 */
export class Display {
    private static activeContainer: DisplayBackedContainer | null = null;
    private static parent: unknown = null;
    private static currentMode = new DisplayMode(640, 480);
    private static created = false;
    private static title = "";
    private static fullscreen = false;
    private static resizable = false;
    private static vsync = false;
    private static frameRate = 0;
    private static resized = false;
    private static closeRequested = false;

    /** Browser parity helper: registers the active Slick container. */
    public static setActiveContainer(container: DisplayBackedContainer | null): void {
        Display.activeContainer = container;
        if (container) {
            Display.currentMode = new DisplayMode(container.getScreenWidth(), container.getScreenHeight());
            Display.fullscreen = container.isFullscreen();
            Display.created = true;
            Display.closeRequested = false;
        } else {
            Display.fullscreen = false;
        }
    }

    /** Browser parity helper: returns the parent element recorded by setParent. */
    public static getParent(): unknown {
        return Display.parent;
    }

    /** Browser parity helper: returns the requested frame cap. */
    public static getSyncFrameRate(): number {
        return Display.frameRate;
    }

    /** Browser parity helper: records a browser-driven display size change. */
    public static markResized(width?: number, height?: number): void {
        Display.resized = true;
        if (width !== undefined && height !== undefined) {
            Display.currentMode = new DisplayMode(width, height);
        }
    }

    public static create(): void;
    public static create(pixelFormat: PixelFormat): void;
    public static create(pixelFormat: PixelFormat, sharedContext: unknown): void;
    /** Java LWJGL counterpart: Display.create(...). */
    public static create(_pixelFormat?: PixelFormat, _sharedContext?: unknown): void {
        Display.created = true;
        Display.closeRequested = false;
        if (_pixelFormat && _pixelFormat.getStencilBits() > 0) {
            GameContainer.enableStencil();
        }
    }

    /** Java LWJGL counterpart: Display.destroy(). */
    public static destroy(): void {
        Display.created = false;
        Display.closeRequested = false;
        Display.fullscreen = false;
    }

    /** Java LWJGL counterpart: Display.isCreated(). */
    public static isCreated(): boolean {
        return Display.created;
    }

    /** Java LWJGL counterpart: Display.update(). */
    public static update(): void {
    }

    /** Java LWJGL counterpart: Display.sync(int). */
    public static sync(frameRate: number): void {
        Display.frameRate = frameRate;
    }

    /** Java LWJGL counterpart: Display.setParent(Canvas). */
    public static setParent(parent: unknown): void {
        Display.parent = parent;
    }

    /** Java LWJGL counterpart: Display.setVSyncEnabled(boolean). */
    public static setVSyncEnabled(enabled: boolean): void {
        Display.vsync = enabled;
    }

    /** Browser parity helper: returns the requested VSync flag. */
    public static isVSyncEnabled(): boolean {
        return Display.vsync;
    }

    /** Java LWJGL counterpart: Display.setTitle(String). */
    public static setTitle(title: string): void {
        Display.title = title;
        if (typeof document !== "undefined") {
            document.title = title;
        }
    }

    /** Browser parity helper: returns the last requested title. */
    public static getTitle(): string {
        return Display.title;
    }

    /** Java LWJGL counterpart: Display.setIcon(ByteBuffer[]). */
    public static setIcon(_icons: unknown[]): void {
    }

    /** Java LWJGL counterpart: Display.setResizable(boolean). */
    public static setResizable(resizable: boolean): void {
        Display.resizable = resizable;
    }

    /** Java LWJGL counterpart: Display.isResizable(). */
    public static isResizable(): boolean {
        return Display.resizable;
    }

    /** Java LWJGL counterpart: Display.getDisplayMode(). */
    public static getDisplayMode(): DisplayMode {
        if (Display.activeContainer) {
            return new DisplayMode(Display.activeContainer.getScreenWidth(), Display.activeContainer.getScreenHeight());
        }
        if (typeof screen !== "undefined" && screen.width > 0 && screen.height > 0) {
            return new DisplayMode(screen.width, screen.height);
        }
        return Display.currentMode;
    }

    /** Java LWJGL counterpart: Display.getAvailableDisplayModes(). */
    public static getAvailableDisplayModes(): DisplayMode[] {
        const modes: DisplayMode[] = [];
        if (typeof screen !== "undefined") {
            pushUnique(modes, screen.width, screen.height);
        }
        if (Display.activeContainer) {
            pushUnique(modes, Display.activeContainer.getScreenWidth(), Display.activeContainer.getScreenHeight());
        }
        pushUnique(modes, 640, 480);
        pushUnique(modes, 800, 600);
        return modes;
    }

    /** Java LWJGL counterpart: Display.setDisplayMode(DisplayMode). */
    public static setDisplayMode(mode: DisplayMode): void {
        Display.currentMode = mode;
        Display.resized = true;
        if (Display.activeContainer?.setDisplayModeFromDisplay) {
            Display.activeContainer.setDisplayModeFromDisplay(mode);
        } else if (Display.activeContainer) {
            void Display.activeContainer.setDisplayMode(mode.getWidth(), mode.getHeight(), Display.fullscreen);
        }
    }

    /** Java LWJGL counterpart: Display.setFullscreen(boolean). */
    public static setFullscreen(fullscreen: boolean): void | Promise<void> {
        const previousFullscreen = Display.fullscreen;
        Display.fullscreen = fullscreen;
        const result = Display.activeContainer?.setFullscreen(fullscreen);
        if (result instanceof Promise) {
            const operation = result.then(() => {
                Display.fullscreen = Display.activeContainer?.isFullscreen() ?? fullscreen;
            }).catch((error) => {
                Display.fullscreen = previousFullscreen;
                throw error;
            });
            void operation.catch(() => {
            });
            return operation;
        }
        Display.fullscreen = Display.activeContainer?.isFullscreen() ?? fullscreen;
    }

    /** Java LWJGL counterpart: Display.isFullscreen(). */
    public static isFullscreen(): boolean {
        return Display.activeContainer?.isFullscreen() ?? Display.fullscreen;
    }

    /** Java LWJGL counterpart: Display.isActive(). */
    public static isActive(): boolean {
        return Display.activeContainer?.hasFocus() ?? (typeof document === "undefined" || document.hasFocus());
    }

    /** Java LWJGL counterpart: Display.isVisible(). */
    public static isVisible(): boolean {
        return typeof document === "undefined" || document.visibilityState !== "hidden";
    }

    /** Java LWJGL counterpart: Display.isCloseRequested(). */
    public static isCloseRequested(): boolean {
        return Display.closeRequested;
    }

    /** Browser parity helper: records a close request for copied loops. */
    public static requestClose(): void {
        Display.closeRequested = true;
    }

    /** Java LWJGL counterpart: Display.wasResized(). */
    public static wasResized(): boolean {
        const resized = Display.resized;
        Display.resized = false;
        return resized;
    }

    /** Java LWJGL counterpart: Display.getWidth(). */
    public static getWidth(): number {
        return Display.getDisplayMode().getWidth();
    }

    /** Java LWJGL counterpart: Display.getHeight(). */
    public static getHeight(): number {
        return Display.getDisplayMode().getHeight();
    }
}
