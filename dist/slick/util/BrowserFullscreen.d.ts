export type BrowserFullscreenCapability = "available" | "unavailable" | "unknown";
/**
 * Report only what the Fullscreen API itself explicitly exposes. Missing request
 * methods do not turn an otherwise unreported capability into "unavailable": a
 * caller may optimistically try and let requestBrowserFullscreen() return false.
 * Broken capability getters are treated as no report rather than breaking the host UI.
 */
export declare function getBrowserFullscreenCapability(doc?: Document): BrowserFullscreenCapability;
export declare function getBrowserFullscreenElement(doc?: Document): Element | null;
export declare function isBrowserFullscreenElement(element: Element, doc?: Document): boolean;
/**
 * Invokes the request synchronously so callers can use it directly from a trusted
 * user-activation handler. Resolves false when no request method exists.
 */
export declare function requestBrowserFullscreen(element: HTMLElement): Promise<boolean>;
/** Resolves false when the document exposes no fullscreen-exit operation. */
export declare function exitBrowserFullscreen(doc?: Document): Promise<boolean>;
//# sourceMappingURL=BrowserFullscreen.d.ts.map