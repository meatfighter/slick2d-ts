import { GameContainer } from "../../slick/GameContainer.js";
import { DisplayMode } from "./DisplayMode.js";
function pushUnique(modes, width, height) {
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
    static activeContainer = null;
    static parent = null;
    static currentMode = new DisplayMode(640, 480);
    static created = false;
    static title = "";
    static fullscreen = false;
    static resizable = false;
    static vsync = false;
    static frameRate = 0;
    static resized = false;
    static closeRequested = false;
    /** Browser parity helper: registers the active Slick container. */
    static setActiveContainer(container) {
        Display.activeContainer = container;
        if (container) {
            Display.currentMode = new DisplayMode(container.getScreenWidth(), container.getScreenHeight());
            Display.fullscreen = container.isFullscreen();
            Display.created = true;
            Display.closeRequested = false;
        }
        else {
            Display.fullscreen = false;
        }
    }
    /** Browser parity helper: returns the parent element recorded by setParent. */
    static getParent() {
        return Display.parent;
    }
    /** Browser parity helper: returns the requested frame cap. */
    static getSyncFrameRate() {
        return Display.frameRate;
    }
    /** Browser parity helper: records a browser-driven display size change. */
    static markResized(width, height) {
        Display.resized = true;
        if (width !== undefined && height !== undefined) {
            Display.currentMode = new DisplayMode(width, height);
        }
    }
    /** Java LWJGL counterpart: Display.create(...). */
    static create(_pixelFormat, _sharedContext) {
        Display.created = true;
        Display.closeRequested = false;
        if (_pixelFormat && _pixelFormat.getStencilBits() > 0) {
            GameContainer.enableStencil();
        }
    }
    /** Java LWJGL counterpart: Display.destroy(). */
    static destroy() {
        Display.created = false;
        Display.closeRequested = false;
        Display.fullscreen = false;
    }
    /** Java LWJGL counterpart: Display.isCreated(). */
    static isCreated() {
        return Display.created;
    }
    /** Java LWJGL counterpart: Display.update(). */
    static update() { }
    /** Java LWJGL counterpart: Display.sync(int). */
    static sync(frameRate) {
        Display.frameRate = frameRate;
    }
    /** Java LWJGL counterpart: Display.setParent(Canvas). */
    static setParent(parent) {
        Display.parent = parent;
    }
    /** Java LWJGL counterpart: Display.setVSyncEnabled(boolean). */
    static setVSyncEnabled(enabled) {
        Display.vsync = enabled;
    }
    /** Browser parity helper: returns the requested VSync flag. */
    static isVSyncEnabled() {
        return Display.vsync;
    }
    /** Java LWJGL counterpart: Display.setTitle(String). */
    static setTitle(title) {
        Display.title = title;
        if (typeof document !== "undefined") {
            document.title = title;
        }
    }
    /** Browser parity helper: returns the last requested title. */
    static getTitle() {
        return Display.title;
    }
    /** Java LWJGL counterpart: Display.setIcon(ByteBuffer[]). */
    static setIcon(_icons) { }
    /** Java LWJGL counterpart: Display.setResizable(boolean). */
    static setResizable(resizable) {
        Display.resizable = resizable;
    }
    /** Java LWJGL counterpart: Display.isResizable(). */
    static isResizable() {
        return Display.resizable;
    }
    /** Java LWJGL counterpart: Display.getDisplayMode(). */
    static getDisplayMode() {
        if (Display.activeContainer) {
            return new DisplayMode(Display.activeContainer.getScreenWidth(), Display.activeContainer.getScreenHeight());
        }
        if (typeof screen !== "undefined" && screen.width > 0 && screen.height > 0) {
            return new DisplayMode(screen.width, screen.height);
        }
        return Display.currentMode;
    }
    /** Java LWJGL counterpart: Display.getAvailableDisplayModes(). */
    static getAvailableDisplayModes() {
        const modes = [];
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
    static setDisplayMode(mode) {
        Display.currentMode = mode;
        Display.resized = true;
        if (Display.activeContainer?.setDisplayModeFromDisplay) {
            Display.activeContainer.setDisplayModeFromDisplay(mode);
        }
        else if (Display.activeContainer) {
            void Display.activeContainer.setDisplayMode(mode.getWidth(), mode.getHeight(), Display.fullscreen);
        }
    }
    /** Java LWJGL counterpart: Display.setFullscreen(boolean). */
    static setFullscreen(fullscreen) {
        const previousFullscreen = Display.fullscreen;
        Display.fullscreen = fullscreen;
        const result = Display.activeContainer?.setFullscreen(fullscreen);
        if (result instanceof Promise) {
            const operation = result
                .then(() => {
                Display.fullscreen = Display.activeContainer?.isFullscreen() ?? fullscreen;
            })
                .catch((error) => {
                Display.fullscreen = previousFullscreen;
                throw error;
            });
            void operation.catch(() => { });
            return operation;
        }
        Display.fullscreen = Display.activeContainer?.isFullscreen() ?? fullscreen;
    }
    /** Java LWJGL counterpart: Display.isFullscreen(). */
    static isFullscreen() {
        return Display.activeContainer?.isFullscreen() ?? Display.fullscreen;
    }
    /** Java LWJGL counterpart: Display.isActive(). */
    static isActive() {
        return Display.activeContainer?.hasFocus() ?? (typeof document === "undefined" || document.hasFocus());
    }
    /** Java LWJGL counterpart: Display.isVisible(). */
    static isVisible() {
        return typeof document === "undefined" || document.visibilityState !== "hidden";
    }
    /** Java LWJGL counterpart: Display.isCloseRequested(). */
    static isCloseRequested() {
        return Display.closeRequested;
    }
    /** Browser parity helper: records a close request for copied loops. */
    static requestClose() {
        Display.closeRequested = true;
    }
    /** Java LWJGL counterpart: Display.wasResized(). */
    static wasResized() {
        const resized = Display.resized;
        Display.resized = false;
        return resized;
    }
    /** Java LWJGL counterpart: Display.getWidth(). */
    static getWidth() {
        return Display.getDisplayMode().getWidth();
    }
    /** Java LWJGL counterpart: Display.getHeight(). */
    static getHeight() {
        return Display.getDisplayMode().getHeight();
    }
}
//# sourceMappingURL=Display.js.map