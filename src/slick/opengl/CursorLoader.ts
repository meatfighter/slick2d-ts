import { Cursor } from "../../lwjgl/input/Cursor.js";
import { Image } from "../Image.js";
import type { ImageData } from "./ImageData.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.CursorLoader.
 *
 * Cursor factory preserving Slick2D's overload shapes.
 */
export class CursorLoader {
    private static readonly instance = new CursorLoader();

    /** Java Slick2D counterpart: CursorLoader.get(). */
    public static get(): CursorLoader {
        return CursorLoader.instance;
    }

    /** Java Slick2D counterpart: CursorLoader.getCursor(String, int, int). */
    public async getCursor(ref: string, x: number, y: number): Promise<Cursor>;
    /** Java Slick2D counterpart: CursorLoader.getCursor(ByteBuffer, int, int, int, int). */
    public getCursor(buf: Uint8Array, x: number, y: number, width: number, height: number): Cursor;
    /** Java Slick2D counterpart: CursorLoader.getCursor(ImageData, int, int). */
    public getCursor(imageData: ImageData, x: number, y: number): Cursor;
    public getCursor(refOrBufOrImageData: string | Uint8Array | ImageData, x: number, y: number, width?: number, height?: number): Promise<Cursor> | Cursor {
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
    public async getAnimatedCursor(ref: string, x: number, y: number, width: number, height: number, cursorDelays: number[]): Promise<Cursor> {
        return new Cursor(width, height, x, y, cursorDelays.length, ref, cursorDelays);
    }
}
