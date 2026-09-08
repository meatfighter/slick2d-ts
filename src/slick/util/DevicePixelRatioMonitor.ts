/**
 * Watches browser device-pixel-ratio changes even when the CSS viewport size is
 * unchanged (for example, moving a window between monitors with different scale
 * factors or changing page zoom).
 */
export class DevicePixelRatioMonitor {
    private mediaQuery: MediaQueryList | null = null;
    private running = false;

    public constructor(private readonly changed: () => void) {}

    public start(): void {
        if (this.running || typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }
        this.running = true;
        this.installQuery();
    }

    public stop(): void {
        this.running = false;
        this.removeQuery();
    }

    private readonly handleChange = (): void => {
        if (!this.running) {
            return;
        }
        this.removeQuery();
        this.installQuery();
        this.changed();
    };

    private installQuery(): void {
        const dpr = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
        const mediaQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);
        mediaQuery.addEventListener("change", this.handleChange);
        this.mediaQuery = mediaQuery;
    }

    private removeQuery(): void {
        this.mediaQuery?.removeEventListener("change", this.handleChange);
        this.mediaQuery = null;
    }
}
