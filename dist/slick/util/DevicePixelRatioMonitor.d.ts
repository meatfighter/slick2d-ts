/**
 * Watches browser device-pixel-ratio changes even when the CSS viewport size is
 * unchanged (for example, moving a window between monitors with different scale
 * factors or changing page zoom).
 */
export declare class DevicePixelRatioMonitor {
    private readonly changed;
    private mediaQuery;
    private running;
    constructor(changed: () => void);
    start(): void;
    stop(): void;
    private readonly handleChange;
    private installQuery;
    private removeQuery;
}
//# sourceMappingURL=DevicePixelRatioMonitor.d.ts.map