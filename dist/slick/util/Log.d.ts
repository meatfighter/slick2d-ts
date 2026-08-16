/**
 * Java Slick2D counterpart: org.newdawn.slick.util.Log.
 *
 * Console-backed logging facade that preserves Slick2D's static method names.
 */
export declare class Log {
    private static verbose;
    /**
     * Java Slick2D counterpart: Log.setVerbose(boolean verbose).
     *
     * Enables or disables informational and debug logging.
     */
    static setVerbose(verbose: boolean): void;
    /**
     * Java Slick2D counterpart: Log.checkVerboseLogSetting().
     *
     * Compatibility hook; browser builds keep the current verbose flag.
     */
    static checkVerboseLogSetting(): void;
    /**
     * Java Slick2D counterpart: Log.error(String message), Log.error(Throwable), Log.error(String, Throwable).
     *
     * Writes an error message or cause to the console.
     */
    static error(messageOrCause: string | unknown, cause?: unknown): void;
    /**
     * Java Slick2D counterpart: Log.warn(String message), Log.warn(String, Throwable).
     *
     * Writes a warning to the console.
     */
    static warn(message: string, cause?: unknown): void;
    /**
     * Java Slick2D counterpart: Log.info(String message).
     *
     * Writes an informational message when verbose logging is enabled.
     */
    static info(message: string): void;
    /**
     * Java Slick2D counterpart: Log.debug(String message).
     *
     * Writes a debug message when verbose logging is enabled.
     */
    static debug(message: string): void;
}
//# sourceMappingURL=Log.d.ts.map