export type BrowserFullscreenCapability = "available" | "unavailable" | "unknown";

type WebKitDocument = Document & {
    webkitFullscreenElement?: Element | null;
    webkitFullscreenEnabled?: boolean;
    webkitExitFullscreen?: () => void | Promise<void>;
};

type WebKitElement = HTMLElement & {
    webkitRequestFullscreen?: () => void | Promise<void>;
};

function hasBrowserFullscreenRequestMethod(element: HTMLElement | null | undefined): boolean {
    if (element === null || element === undefined) {
        return false;
    }
    return typeof element.requestFullscreen === "function" || typeof (element as WebKitElement).webkitRequestFullscreen === "function";
}

/**
 * Reports whether arbitrary-element fullscreen can actually be requested. A browser
 * with no standard or recognized WebKit element request method is definitively
 * unavailable. When a request method exists but the document exposes no boolean
 * capability report, the result remains "unknown" so callers can optimistically try.
 */
export function getBrowserFullscreenCapability(
    doc: Document = document,
    probeElement: HTMLElement | null | undefined = doc.documentElement
): BrowserFullscreenCapability {
    if (!hasBrowserFullscreenRequestMethod(probeElement)) {
        return "unavailable";
    }

    const reports: boolean[] = [];
    if (typeof doc.fullscreenEnabled === "boolean") {
        reports.push(doc.fullscreenEnabled);
    }
    const webkitDocument = doc as WebKitDocument;
    if (typeof webkitDocument.webkitFullscreenEnabled === "boolean") {
        reports.push(webkitDocument.webkitFullscreenEnabled);
    }
    if (reports.some(Boolean)) {
        return "available";
    }
    return reports.length === 0 ? "unknown" : "unavailable";
}

export function getBrowserFullscreenElement(doc: Document = document): Element | null {
    return doc.fullscreenElement ?? (doc as WebKitDocument).webkitFullscreenElement ?? null;
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
