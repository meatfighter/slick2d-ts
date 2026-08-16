/**
 * Java Slick2D counterpart: org.newdawn.slick.util.Log.
 *
 * Console-backed logging facade that preserves Slick2D's static method names.
 */
export class Log {
    static verbose = true;
    /**
     * Java Slick2D counterpart: Log.setVerbose(boolean verbose).
     *
     * Enables or disables informational and debug logging.
     */
    static setVerbose(verbose) {
        Log.verbose = verbose;
    }
    /**
     * Java Slick2D counterpart: Log.checkVerboseLogSetting().
     *
     * Compatibility hook; browser builds keep the current verbose flag.
     */
    static checkVerboseLogSetting() { }
    /**
     * Java Slick2D counterpart: Log.error(String message), Log.error(Throwable), Log.error(String, Throwable).
     *
     * Writes an error message or cause to the console.
     */
    static error(messageOrCause, cause) {
        if (typeof messageOrCause === "string") {
            console.error(messageOrCause, cause ?? "");
        }
        else {
            console.error(messageOrCause);
        }
    }
    /**
     * Java Slick2D counterpart: Log.warn(String message), Log.warn(String, Throwable).
     *
     * Writes a warning to the console.
     */
    static warn(message, cause) {
        console.warn(message, cause ?? "");
    }
    /**
     * Java Slick2D counterpart: Log.info(String message).
     *
     * Writes an informational message when verbose logging is enabled.
     */
    static info(message) {
        if (Log.verbose) {
            console.info(message);
        }
    }
    /**
     * Java Slick2D counterpart: Log.debug(String message).
     *
     * Writes a debug message when verbose logging is enabled.
     */
    static debug(message) {
        if (Log.verbose) {
            console.debug(message);
        }
    }
}
//# sourceMappingURL=Log.js.map