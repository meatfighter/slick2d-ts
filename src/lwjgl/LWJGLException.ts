/**
 * Java LWJGL counterpart: org.lwjgl.LWJGLException.
 *
 * Compatibility error type used by LWJGL shims.
 */
export class LWJGLException extends Error {
    public override cause?: unknown;

    /**
     * Java LWJGL counterpart: LWJGLException(String message).
     *
     * Creates an LWJGL-compatible error with an optional cause.
     */
    public constructor(message: string, cause?: unknown) {
        super(message);
        this.name = "LWJGLException";
        this.cause = cause;
    }
}
