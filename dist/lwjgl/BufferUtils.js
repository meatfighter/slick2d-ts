/**
 * Java LWJGL counterpart: org.lwjgl.BufferUtils.
 *
 * Typed-array factory shim for copied Slick helper code.
 */
export class BufferUtils {
    /** Java LWJGL counterpart: BufferUtils.createByteBuffer(int). */
    static createByteBuffer(size) {
        return new Uint8Array(size);
    }
    /** Java LWJGL counterpart: BufferUtils.createIntBuffer(int). */
    static createIntBuffer(size) {
        return new Int32Array(size);
    }
    /** Java LWJGL counterpart: BufferUtils.createFloatBuffer(int). */
    static createFloatBuffer(size) {
        return new Float32Array(size);
    }
    /** Java LWJGL counterpart: BufferUtils.createDoubleBuffer(int). */
    static createDoubleBuffer(size) {
        return new Float64Array(size);
    }
}
//# sourceMappingURL=BufferUtils.js.map