/**
 * Java LWJGL counterpart: org.lwjgl.LWJGLException.
 *
 * Compatibility error type used by LWJGL shims.
 */
export declare class LWJGLException extends Error {
    cause?: unknown;
    /**
     * Java LWJGL counterpart: LWJGLException(String message).
     *
     * Creates an LWJGL-compatible error with an optional cause.
     */
    constructor(message: string, cause?: unknown);
}
//# sourceMappingURL=LWJGLException.d.ts.map