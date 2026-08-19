import { Cursor } from "./Cursor.js";
/**
 * Java LWJGL counterpart: org.lwjgl.input.Mouse.
 *
 * Pointer-lock and CSS cursor compatibility shim.
 */
export declare class Mouse {
    private static grabbed;
    private static nativeCursor;
    private static nativeCursorBeforeTransparentHide;
    private static element;
    private static pointerLockDocument;
    /** Browser parity helper: sets the element used for pointer lock and cursor CSS. */
    static setElement(element: HTMLElement | null): void;
    /** Java LWJGL counterpart: Mouse.setGrabbed(boolean). */
    static setGrabbed(grabbed: boolean): Promise<void>;
    /** Java LWJGL counterpart: Mouse.isGrabbed(). */
    static isGrabbed(): boolean;
    /** Java LWJGL counterpart: Mouse.setNativeCursor(Cursor). */
    static setNativeCursor(cursor: Cursor | null): void;
    /** Java LWJGL counterpart: Mouse.getNativeCursor(). */
    static getNativeCursor(): Cursor | null;
    /** Browser parity helper: restores a cursor hidden for fullscreen when the browser exits fullscreen directly. */
    static restoreNativeCursorAfterForcedFullscreenExit(): void;
    private static cursorCss;
    private static isTransparentNativeCursor;
    private static isTransparentCursor;
    private static installPointerLockListeners;
    private static readonly handlePointerLockChange;
    private static readonly handlePointerLockError;
    private static syncGrabbedFromDocument;
    private static isPromiseLike;
}
//# sourceMappingURL=Mouse.d.ts.map