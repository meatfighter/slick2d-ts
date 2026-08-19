/**
 * Java LWJGL counterpart: org.lwjgl.input.Mouse.
 *
 * Pointer-lock and CSS cursor compatibility shim.
 */
export class Mouse {
    static grabbed = false;
    static nativeCursor = null;
    static nativeCursorBeforeTransparentHide = null;
    static element = null;
    static pointerLockDocument = null;
    /** Browser parity helper: sets the element used for pointer lock and cursor CSS. */
    static setElement(element) {
        if (!element && Mouse.isGrabbed()) {
            void Mouse.setGrabbed(false).catch(() => { });
        }
        Mouse.element = element;
        Mouse.syncGrabbedFromDocument();
    }
    /** Java LWJGL counterpart: Mouse.setGrabbed(boolean). */
    static async setGrabbed(grabbed) {
        if (typeof document === "undefined") {
            Mouse.grabbed = grabbed;
            return;
        }
        if (!Mouse.element) {
            Mouse.grabbed = false;
            return;
        }
        Mouse.installPointerLockListeners();
        if (grabbed && Mouse.element.requestPointerLock) {
            Mouse.grabbed = false;
            try {
                const operation = Mouse.element.requestPointerLock();
                if (Mouse.isPromiseLike(operation)) {
                    await operation;
                }
                Mouse.syncGrabbedFromDocument();
            }
            catch (error) {
                Mouse.syncGrabbedFromDocument();
                throw error;
            }
            return;
        }
        if (!grabbed && document.exitPointerLock) {
            Mouse.grabbed = false;
            if (!("pointerLockElement" in document) || document.pointerLockElement === Mouse.element) {
                const operation = document.exitPointerLock();
                if (Mouse.isPromiseLike(operation)) {
                    await operation;
                }
            }
            Mouse.syncGrabbedFromDocument();
            return;
        }
        Mouse.grabbed = false;
    }
    /** Java LWJGL counterpart: Mouse.isGrabbed(). */
    static isGrabbed() {
        if (typeof document !== "undefined" && Mouse.element && "pointerLockElement" in document) {
            return document.pointerLockElement === Mouse.element;
        }
        return Mouse.grabbed;
    }
    /** Java LWJGL counterpart: Mouse.setNativeCursor(Cursor). */
    static setNativeCursor(cursor) {
        const currentCursor = Mouse.nativeCursor;
        if (cursor && Mouse.isTransparentNativeCursor(cursor) && !Mouse.isTransparentNativeCursor(currentCursor)) {
            Mouse.nativeCursorBeforeTransparentHide = currentCursor;
        }
        else if (!cursor || !Mouse.isTransparentNativeCursor(cursor)) {
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
    static getNativeCursor() {
        return Mouse.nativeCursor;
    }
    /** Browser parity helper: restores a cursor hidden for fullscreen when the browser exits fullscreen directly. */
    static restoreNativeCursorAfterForcedFullscreenExit() {
        if (!Mouse.isTransparentNativeCursor(Mouse.nativeCursor)) {
            return;
        }
        Mouse.setNativeCursor(Mouse.nativeCursorBeforeTransparentHide);
    }
    static cursorCss(cursor) {
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
    static isTransparentNativeCursor(cursor) {
        return (!!cursor &&
            cursor.images instanceof Uint8Array &&
            cursor.width > 0 &&
            cursor.height > 0 &&
            Mouse.isTransparentCursor(cursor.images, cursor.width, cursor.height));
    }
    static isTransparentCursor(data, width, height) {
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
    static installPointerLockListeners() {
        if (typeof document === "undefined" || Mouse.pointerLockDocument === document) {
            return;
        }
        Mouse.pointerLockDocument?.removeEventListener("pointerlockchange", Mouse.handlePointerLockChange);
        Mouse.pointerLockDocument?.removeEventListener("pointerlockerror", Mouse.handlePointerLockError);
        document.addEventListener("pointerlockchange", Mouse.handlePointerLockChange);
        document.addEventListener("pointerlockerror", Mouse.handlePointerLockError);
        Mouse.pointerLockDocument = document;
    }
    static handlePointerLockChange = () => {
        Mouse.syncGrabbedFromDocument();
    };
    static handlePointerLockError = () => {
        Mouse.syncGrabbedFromDocument();
    };
    static syncGrabbedFromDocument() {
        if (typeof document !== "undefined" && Mouse.element && "pointerLockElement" in document) {
            Mouse.grabbed = document.pointerLockElement === Mouse.element;
        }
        else if (!Mouse.element) {
            Mouse.grabbed = false;
        }
    }
    static isPromiseLike(value) {
        return !!value && typeof value.then === "function";
    }
}
//# sourceMappingURL=Mouse.js.map