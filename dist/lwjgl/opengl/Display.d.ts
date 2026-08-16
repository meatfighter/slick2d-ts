import { GameContainer } from "../../slick/GameContainer.js";
import { DisplayMode } from "./DisplayMode.js";
import type { PixelFormat } from "./PixelFormat.js";
type DisplayBackedContainer = GameContainer & {
    destroy(): void;
    setDisplayMode(width: number, height: number, fullscreen: boolean): void | Promise<void>;
    setDisplayModeFromDisplay?(mode: DisplayMode): void;
};
/**
 * Java LWJGL counterpart: org.lwjgl.opengl.Display.
 *
 * Static browser display shim that delegates to the active AppGameContainer.
 */
export declare class Display {
    private static activeContainer;
    private static parent;
    private static currentMode;
    private static created;
    private static title;
    private static fullscreen;
    private static resizable;
    private static vsync;
    private static frameRate;
    private static resized;
    private static closeRequested;
    /** Browser parity helper: registers the active Slick container. */
    static setActiveContainer(container: DisplayBackedContainer | null): void;
    /** Browser parity helper: returns the parent element recorded by setParent. */
    static getParent(): unknown;
    /** Browser parity helper: returns the requested frame cap. */
    static getSyncFrameRate(): number;
    /** Browser parity helper: records a browser-driven display size change. */
    static markResized(width?: number, height?: number): void;
    static create(): void;
    static create(pixelFormat: PixelFormat): void;
    static create(pixelFormat: PixelFormat, sharedContext: unknown): void;
    /** Java LWJGL counterpart: Display.destroy(). */
    static destroy(): void;
    /** Java LWJGL counterpart: Display.isCreated(). */
    static isCreated(): boolean;
    /** Java LWJGL counterpart: Display.update(). */
    static update(): void;
    /** Java LWJGL counterpart: Display.sync(int). */
    static sync(frameRate: number): void;
    /** Java LWJGL counterpart: Display.setParent(Canvas). */
    static setParent(parent: unknown): void;
    /** Java LWJGL counterpart: Display.setVSyncEnabled(boolean). */
    static setVSyncEnabled(enabled: boolean): void;
    /** Browser parity helper: returns the requested VSync flag. */
    static isVSyncEnabled(): boolean;
    /** Java LWJGL counterpart: Display.setTitle(String). */
    static setTitle(title: string): void;
    /** Browser parity helper: returns the last requested title. */
    static getTitle(): string;
    /** Java LWJGL counterpart: Display.setIcon(ByteBuffer[]). */
    static setIcon(_icons: unknown[]): void;
    /** Java LWJGL counterpart: Display.setResizable(boolean). */
    static setResizable(resizable: boolean): void;
    /** Java LWJGL counterpart: Display.isResizable(). */
    static isResizable(): boolean;
    /** Java LWJGL counterpart: Display.getDisplayMode(). */
    static getDisplayMode(): DisplayMode;
    /** Java LWJGL counterpart: Display.getAvailableDisplayModes(). */
    static getAvailableDisplayModes(): DisplayMode[];
    /** Java LWJGL counterpart: Display.setDisplayMode(DisplayMode). */
    static setDisplayMode(mode: DisplayMode): void;
    /** Java LWJGL counterpart: Display.setFullscreen(boolean). */
    static setFullscreen(fullscreen: boolean): void | Promise<void>;
    /** Java LWJGL counterpart: Display.isFullscreen(). */
    static isFullscreen(): boolean;
    /** Java LWJGL counterpart: Display.isActive(). */
    static isActive(): boolean;
    /** Java LWJGL counterpart: Display.isVisible(). */
    static isVisible(): boolean;
    /** Java LWJGL counterpart: Display.isCloseRequested(). */
    static isCloseRequested(): boolean;
    /** Browser parity helper: records a close request for copied loops. */
    static requestClose(): void;
    /** Java LWJGL counterpart: Display.wasResized(). */
    static wasResized(): boolean;
    /** Java LWJGL counterpart: Display.getWidth(). */
    static getWidth(): number;
    /** Java LWJGL counterpart: Display.getHeight(). */
    static getHeight(): number;
}
export {};
//# sourceMappingURL=Display.d.ts.map