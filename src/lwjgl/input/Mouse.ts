import { Cursor } from "./Cursor.js";

/**
 * Java LWJGL counterpart: org.lwjgl.input.Mouse.
 *
 * Pointer-lock and CSS cursor compatibility shim.
 */
export class Mouse {
    private static grabbed = false;
    private static nativeCursor: Cursor | null = null;
    private static nativeCursorBeforeTransparentHide: Cursor | null = null;
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
        const currentCursor = Mouse.nativeCursor;
        if (cursor && Mouse.isTransparentNativeCursor(cursor) && !Mouse.isTransparentNativeCursor(currentCursor)) {
            Mouse.nativeCursorBeforeTransparentHide = currentCursor;
        } else if (!cursor || !Mouse.isTransparentNativeCursor(cursor)) {
            Mouse.nativeCursorBeforeTransparentHide = null;
        }
        Mouse.nativeCursor = cursor;
        if (!Mouse.element) {
            return;
        }
        if (!cursor) {
            Mouse.element.style.cursor = "";
            return;
        }
        Mouse.element.style.cursor = Mouse.cursorCss(cursor);
    }

    /** Java LWJGL counterpart: Mouse.getNativeCursor(). */
    public static getNativeCursor(): Cursor | null {
        return Mouse.nativeCursor;
    }

    /** Browser parity helper: restores a cursor hidden for fullscreen when the browser exits fullscreen directly. */
    public static restoreNativeCursorAfterForcedFullscreenExit(): void {
        if (!Mouse.isTransparentNativeCursor(Mouse.nativeCursor)) {
            return;
        }
        Mouse.setNativeCursor(Mouse.nativeCursorBeforeTransparentHide);
    }

    private static cursorCss(cursor: Cursor): string {
        if (!(cursor.images instanceof Uint8Array) || cursor.width <= 0 || cursor.height <= 0) {
            return "default";
        }
        if (Mouse.isTransparentCursor(cursor.images, cursor.width, cursor.height)) {
            return "none";
        }
        if (typeof document === "undefined" || typeof globalThis.ImageData === "undefined") {
            return "default";
        }
        const canvas = document.createElement("canvas");
        canvas.width = cursor.width;
        canvas.height = cursor.height;
        const context = canvas.getContext("2d");
        if (!context) {
            return "default";
        }
        const pixels = new Uint8ClampedArray(cursor.width * cursor.height * 4);
        pixels.set(cursor.images.subarray(0, pixels.length));
        context.putImageData(new globalThis.ImageData(pixels, cursor.width, cursor.height), 0, 0);
        return `url("${canvas.toDataURL("image/png")}") ${cursor.xHotspot} ${cursor.yHotspot}, auto`;
    }

    private static isTransparentNativeCursor(cursor: Cursor | null): boolean {
        return (
            !!cursor &&
            cursor.images instanceof Uint8Array &&
            cursor.width > 0 &&
            cursor.height > 0 &&
            Mouse.isTransparentCursor(cursor.images, cursor.width, cursor.height)
        );
    }

    private static isTransparentCursor(data: Uint8Array, width: number, height: number): boolean {
        const pixelBytes = Math.min(data.length, width * height * 4);
        if (pixelBytes === 0) {
            return true;
        }
        for (let index = 0; index < pixelBytes; index += 4) {
            if ((data[index] ?? 0) !== 0 || (data[index + 1] ?? 0) !== 0 || (data[index + 2] ?? 0) !== 0 || (data[index + 3] ?? 0) !== 0) {
                return false;
            }
        }
        return true;
    }
}
