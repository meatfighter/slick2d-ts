/**
 * Java LWJGL counterpart: org.lwjgl.Sys.
 *
 * Browser timing/version shim for copied Slick2D helper code.
 */
export class Sys {
    /**
     * Java LWJGL counterpart: Sys.getTime().
     *
     * Returns integer monotonic milliseconds.
     */
    public static getTime(): number {
        const perf = globalThis.performance;
        return Math.floor(perf ? perf.now() : Date.now());
    }

    /**
     * Java LWJGL counterpart: Sys.getTimerResolution().
     *
     * Returns the fixed browser compatibility resolution.
     */
    public static getTimerResolution(): number {
        return 1000;
    }

    /**
     * Java LWJGL counterpart: Sys.getVersion().
     *
     * Returns a descriptive compatibility version string.
     */
    public static getVersion(): string {
        return "slick2d-ts";
    }
}
