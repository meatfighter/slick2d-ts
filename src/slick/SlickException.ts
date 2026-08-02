/**
 * Java Slick2D counterpart: org.newdawn.slick.SlickException.
 *
 * Error type used for resource, display, audio, rendering, and parity failures.
 */
export class SlickException extends Error {
    public override cause?: unknown;

    /**
     * Java Slick2D counterpart: SlickException(String message).
     *
     * Creates a Slick-compatible error with an optional cause.
     */
    public constructor(message: string, cause?: unknown) {
        super(message);
        this.name = "SlickException";
        this.cause = cause;
    }
}
