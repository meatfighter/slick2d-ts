import { Cursor } from "../../lwjgl/input/Cursor.js";
import { Image } from "../Image.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.CursorLoader.
 *
 * Cursor factory preserving Slick2D's overload shapes.
 */
export class CursorLoader {
    static instance = new CursorLoader();
    /** Java Slick2D counterpart: CursorLoader.get(). */
    static get() {
        return CursorLoader.instance;
    }
    getCursor(refOrBufOrImageData, x, y, width, height) {
        if (typeof refOrBufOrImageData === "string") {
            const image = new Image(refOrBufOrImageData);
            return Promise.resolve(new Cursor(image.getWidth(), image.getHeight(), x, y, 1, image, null));
        }
        if (refOrBufOrImageData instanceof Uint8Array) {
            return new Cursor(width ?? 0, height ?? 0, x, y, 1, refOrBufOrImageData, null);
        }
        return new Cursor(refOrBufOrImageData.getWidth(), refOrBufOrImageData.getHeight(), x, y, 1, refOrBufOrImageData.getImageBufferData(), null);
    }
    /** Java Slick2D counterpart: CursorLoader.getAnimatedCursor(String, int, int, int, int, int[]). */
    async getAnimatedCursor(ref, x, y, width, height, cursorDelays) {
        return new Cursor(width, height, x, y, cursorDelays.length, ref, cursorDelays);
    }
}
//# sourceMappingURL=CursorLoader.js.map