/**
 * Java LWJGL counterpart: org.lwjgl.BufferUtils.
 *
 * Typed-array factory shim for copied Slick helper code.
 */
export class BufferUtils {
    /** Java LWJGL counterpart: BufferUtils.createByteBuffer(int). */
    public static createByteBuffer(size: number): Uint8Array {
        return new Uint8Array(size);
    }

    /** Java LWJGL counterpart: BufferUtils.createIntBuffer(int). */
    public static createIntBuffer(size: number): Int32Array {
        return new Int32Array(size);
    }

    /** Java LWJGL counterpart: BufferUtils.createFloatBuffer(int). */
    public static createFloatBuffer(size: number): Float32Array {
        return new Float32Array(size);
    }

    /** Java LWJGL counterpart: BufferUtils.createDoubleBuffer(int). */
    public static createDoubleBuffer(size: number): Float64Array {
        return new Float64Array(size);
    }
}
