/**
 * Java Slick2D counterpart: org.newdawn.slick.SlickException.
 *
 * Error type used for resource, display, audio, rendering, and parity failures.
 */
export class SlickException extends Error {
    cause;
    /**
     * Java Slick2D counterpart: SlickException(String message).
     *
     * Creates a Slick-compatible error with an optional cause.
     */
    constructor(message, cause) {
        super(message);
        this.name = "SlickException";
        this.cause = cause;
    }
}
//# sourceMappingURL=SlickException.js.map