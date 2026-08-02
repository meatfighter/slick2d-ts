import { Cursor } from "./Cursor.js";

/**
 * Java LWJGL counterpart: org.lwjgl.input.Mouse.
 *
 * Pointer-lock and CSS cursor compatibility shim.
 */
export class Mouse {
    private static grabbed = false;
    private static nativeCursor: Cursor | null = null;
    private static element: HTMLElement | null = null;

    /** Browser parity helper: sets the element used for pointer lock and cursor CSS. */
    public static setElement(element: HTMLElement | null): void {
        Mouse.element = element;
    }

    /** Java LWJGL counterpart: Mouse.setGrabbed(boolean). */
    public static async setGrabbed(grabbed: boolean): Promise<void> {
        Mouse.grabbed = grabbed;
        if (!Mouse.element || typeof document === "undefined") {
            return;
        }
        if (grabbed && Mouse.element.requestPointerLock) {
            Mouse.element.requestPointerLock();
        } else if (!grabbed && document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    /** Java LWJGL counterpart: Mouse.isGrabbed(). */
    public static isGrabbed(): boolean {
        if (typeof document !== "undefined" && document.pointerLockElement) {
            return document.pointerLockElement === Mouse.element;
        }
        return Mouse.grabbed;
    }

    /** Java LWJGL counterpart: Mouse.setNativeCursor(Cursor). */
    public static setNativeCursor(cursor: Cursor | null): void {
        Mouse.nativeCursor = cursor;
        if (!Mouse.element) {
            return;
        }
        if (!cursor) {
            Mouse.element.style.cursor = "";
            return;
        }
        Mouse.element.style.cursor = "default";
    }

    /** Java LWJGL counterpart: Mouse.getNativeCursor(). */
    public static getNativeCursor(): Cursor | null {
        return Mouse.nativeCursor;
    }
}
