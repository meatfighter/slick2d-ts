import { Cursor } from "../../lwjgl/input/Cursor.js";
import type { ImageData } from "./ImageData.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.opengl.CursorLoader.
 *
 * Cursor factory preserving Slick2D's overload shapes.
 */
export declare class CursorLoader {
    private static readonly instance;
    /** Java Slick2D counterpart: CursorLoader.get(). */
    static get(): CursorLoader;
    /** Java Slick2D counterpart: CursorLoader.getCursor(String, int, int). */
    getCursor(ref: string, x: number, y: number): Promise<Cursor>;
    /** Java Slick2D counterpart: CursorLoader.getCursor(ByteBuffer, int, int, int, int). */
    getCursor(buf: Uint8Array, x: number, y: number, width: number, height: number): Cursor;
    /** Java Slick2D counterpart: CursorLoader.getCursor(ImageData, int, int). */
    getCursor(imageData: ImageData, x: number, y: number): Cursor;
    /** Java Slick2D counterpart: CursorLoader.getAnimatedCursor(String, int, int, int, int, int[]). */
    getAnimatedCursor(ref: string, x: number, y: number, width: number, height: number, cursorDelays: number[]): Promise<Cursor>;
}
//# sourceMappingURL=CursorLoader.d.ts.map