/**
 * Watches browser device-pixel-ratio changes even when the CSS viewport size is
 * unchanged (for example, moving a window between monitors with different scale
 * factors or changing page zoom).
 */
export class DevicePixelRatioMonitor {
    changed;
    mediaQuery = null;
    running = false;
    constructor(changed) {
        this.changed = changed;
    }
    start() {
        if (this.running || typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }
        this.running = true;
        this.installQuery();
    }
    stop() {
        this.running = false;
        this.removeQuery();
    }
    handleChange = () => {
        if (!this.running) {
            return;
        }
        this.removeQuery();
        this.installQuery();
        this.changed();
    };
    installQuery() {
        const dpr = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
        const mediaQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);
        mediaQuery.addEventListener("change", this.handleChange);
        this.mediaQuery = mediaQuery;
    }
    removeQuery() {
        this.mediaQuery?.removeEventListener("change", this.handleChange);
        this.mediaQuery = null;
    }
}
//# sourceMappingURL=DevicePixelRatioMonitor.js.map