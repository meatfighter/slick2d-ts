/**
 * Java LWJGL counterpart: org.lwjgl.LWJGLException.
 *
 * Compatibility error type used by LWJGL shims.
 */
export class LWJGLException extends Error {
    cause;
    /**
     * Java LWJGL counterpart: LWJGLException(String message).
     *
     * Creates an LWJGL-compatible error with an optional cause.
     */
    constructor(message, cause) {
        super(message);
        this.name = "LWJGLException";
        this.cause = cause;
    }
}
//# sourceMappingURL=LWJGLException.js.map