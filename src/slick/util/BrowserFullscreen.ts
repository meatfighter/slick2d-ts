export type BrowserFullscreenCapability = "available" | "unavailable" | "unknown";

type WebKitDocument = Document & {
    webkitFullscreenElement?: Element | null;
    webkitFullscreenEnabled?: boolean;
    webkitExitFullscreen?: () => void | Promise<void>;
};

type WebKitElement = HTMLElement & {
    webkitRequestFullscreen?: () => void | Promise<void>;
};

/**
 * Report whether this document can plausibly request arbitrary-element fullscreen.
 * A browser that exposes no standard/WebKit request method is unavailable even when
 * its capability-reporting surface is absent or inconsistent. If a request method
 * exists but no readable boolean capability report exists, callers may still try it
 * optimistically and treat the capability as unknown. Broken browser-owned getters
 * degrade safely rather than breaking the host UI.
 */
export function getBrowserFullscreenCapability(doc: Document = document): BrowserFullscreenCapability {
    const reports: boolean[] = [];
    try {
        const standard = doc.fullscreenEnabled;
        if (typeof standard === "boolean") {
            reports.push(standard);
        }
    } catch {
        // A browser-owned capability getter must not prevent responsive fallback.
    }
    try {
        const webkit = (doc as WebKitDocument).webkitFullscreenEnabled;
        if (typeof webkit === "boolean") {
            reports.push(webkit);
        }
    } catch {
        // Treat an unreadable prefixed capability as unreported.
    }
    if (reports.length > 0 && !reports.some(Boolean)) {
        return "unavailable";
    }
    if (!hasBrowserFullscreenRequestMethod(doc)) {
        return "unavailable";
    }
    return reports.some(Boolean) ? "available" : "unknown";
}

function hasBrowserFullscreenRequestMethod(doc: Document): boolean {
    let root: HTMLElement | null;
    try {
        root = doc.documentElement;
    } catch {
        return false;
    }
    if (root === null || root === undefined) {
        return false;
    }
    try {
        if (typeof root.requestFullscreen === "function") {
            return true;
        }
    } catch {
        // Fall through to the prefixed request surface.
    }
    try {
        return typeof (root as WebKitElement).webkitRequestFullscreen === "function";
    } catch {
        return false;
    }
}

export function getBrowserFullscreenElement(doc: Document = document): Element | null {
    try {
        const standard = doc.fullscreenElement;
        if (standard !== null && standard !== undefined) {
            return standard;
        }
    } catch {
        // Fall through to the prefixed surface.
    }
    try {
        return (doc as WebKitDocument).webkitFullscreenElement ?? null;
    } catch {
        return null;
    }
}

export function isBrowserFullscreenElement(element: Element, doc: Document = document): boolean {
    return getBrowserFullscreenElement(doc) === element;
}

/**
 * Invokes the request synchronously so callers can use it directly from a trusted
 * user-activation handler. Resolves false when no request method exists.
 */
export function requestBrowserFullscreen(element: HTMLElement): Promise<boolean> {
    try {
        if (typeof element.requestFullscreen === "function") {
            return Promise.resolve(element.requestFullscreen()).then(() => true);
        }
        const webkitElement = element as WebKitElement;
        if (typeof webkitElement.webkitRequestFullscreen === "function") {
            return Promise.resolve(webkitElement.webkitRequestFullscreen()).then(() => true);
        }
        return Promise.resolve(false);
    } catch (error) {
        return Promise.reject(error);
    }
}

/** Resolves false when the document exposes no fullscreen-exit operation. */
export function exitBrowserFullscreen(doc: Document = document): Promise<boolean> {
    try {
        if (typeof doc.exitFullscreen === "function") {
            return Promise.resolve(doc.exitFullscreen()).then(() => true);
        }
        const webkitDocument = doc as WebKitDocument;
        if (typeof webkitDocument.webkitExitFullscreen === "function") {
            return Promise.resolve(webkitDocument.webkitExitFullscreen()).then(() => true);
        }
        return Promise.resolve(false);
    } catch (error) {
        return Promise.reject(error);
    }
}
