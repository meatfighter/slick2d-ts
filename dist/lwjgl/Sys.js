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
    static getTime() {
        const perf = globalThis.performance;
        return Math.floor(perf ? perf.now() : Date.now());
    }
    /**
     * Java LWJGL counterpart: Sys.getTimerResolution().
     *
     * Returns the fixed browser compatibility resolution.
     */
    static getTimerResolution() {
        return 1000;
    }
    /**
     * Java LWJGL counterpart: Sys.getVersion().
     *
     * Returns a descriptive compatibility version string.
     */
    static getVersion() {
        return "slick2d-ts";
    }
}
//# sourceMappingURL=Sys.js.map