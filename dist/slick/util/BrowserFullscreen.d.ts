export type BrowserFullscreenCapability = "available" | "unavailable" | "unknown";
/**
 * Report whether this document can plausibly request arbitrary-element fullscreen.
 * A browser that exposes no standard/WebKit request method is unavailable even when
 * its capability-reporting surface is absent or inconsistent. If a request method
 * exists but no readable boolean capability report exists, callers may still try it
 * optimistically and treat the capability as unknown. Broken browser-owned getters
 * degrade safely rather than breaking the host UI.
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