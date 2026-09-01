import { SlickException } from "../SlickException.js";
/** Browser resource failure with stable, application-readable semantics. */
export class ResourceLoadException extends SlickException {
    ref;
    url;
    status;
    kind;
    phase;
    constructor(message, details) {
        super(message, details.cause);
        this.name = "ResourceLoadException";
        this.ref = details.ref;
        this.url = details.url ?? null;
        this.status = details.status ?? null;
        this.kind = details.kind;
        this.phase = details.phase;
    }
}
/**
 * Java Slick2D counterpart: org.newdawn.slick.util.ResourceLoader.
 *
 * Synchronous facade over resources that have already been preloaded or queued
 * by the browser resource manager.
 */
export class ResourceLoader {
    static locations = [""];
    static records = new Map();
    static trackedPromises = new Set();
    static trackedErrors = [];
    static trackingGeneration = 0;
    static cacheBustValue = null;
    static retryCount = 0;
    static retryDelay = 250;
    /** Java Slick2D counterpart: ResourceLoader.addResourceLocation(ResourceLocation). */
    static addResourceLocation(location) {
        ResourceLoader.locations.push(String(location));
    }
    /** Java Slick2D counterpart: ResourceLoader.removeResourceLocation(ResourceLocation). */
    static removeResourceLocation(location) {
        const value = String(location);
        ResourceLoader.locations = ResourceLoader.locations.filter((entry) => entry !== value);
    }
    /** Java Slick2D counterpart: ResourceLoader.removeAllResourceLocations(). */
    static removeAllResourceLocations() {
        ResourceLoader.locations = [];
    }
    /** Adds or clears a cache-version query parameter while retaining Java refs as cache keys. */
    static setCacheBust(value) {
        ResourceLoader.cacheBustValue = value === null ? null : String(value);
    }
    /** Configures transient browser fetch retries. Permanent HTTP failures are not retried. */
    static setRetryOptions(retries, delayMs = 250) {
        if (!Number.isSafeInteger(retries) || retries < 0) {
            throw new RangeError("Resource retry count must be a nonnegative safe integer.");
        }
        if (!Number.isFinite(delayMs) || delayMs < 0) {
            throw new RangeError("Resource retry delay must be a finite nonnegative number.");
        }
        ResourceLoader.retryCount = retries;
        ResourceLoader.retryDelay = delayMs;
    }
    /** Java Slick2D counterpart: ResourceLoader.getResource(String). */
    static getResource(ref) {
        return ResourceLoader.getResourceCandidates(ref)[0] ?? null;
    }
    /** Java Slick2D counterpart: ResourceLoader.getResourceAsStream(String). */
    static getResourceAsStream(ref) {
        const record = ResourceLoader.records.get(ref);
        if (!record?.data) {
            return null;
        }
        return record.data.slice(0);
    }
    /** Java Slick2D counterpart: ResourceLoader.resourceExists(String). */
    static resourceExists(ref) {
        return ResourceLoader.records.get(ref)?.data !== undefined;
    }
    /** Registers already-available bytes under the original Java path string. */
    static registerResource(ref, data) {
        let bytes;
        if (data instanceof Uint8Array) {
            const copy = new Uint8Array(data.byteLength);
            copy.set(data);
            bytes = copy.buffer;
        }
        else {
            bytes = data.slice(0);
        }
        ResourceLoader.records.set(ref, { ref, data: bytes });
    }
    /**
     * Queues an async fetch for a resource and caches in-flight requests.
     *
     * The signal supplied by the first uncached caller owns cancellation of the
     * underlying shared fetch. A later caller reusing that request can cancel
     * only its own wait; aborting the first signal rejects every shared waiter.
     */
    static async loadResource(ref, options = {}) {
        ResourceLoader.throwIfAborted(options.signal, ref, null, "fetch");
        const existing = ResourceLoader.records.get(ref);
        if (existing?.data) {
            return existing.data.slice(0);
        }
        if (existing?.promise && existing.error === undefined) {
            return ResourceLoader.waitForPromise(existing.promise, options.signal, ref);
        }
        const urls = ResourceLoader.getResourceCandidates(ref);
        if (urls.length === 0 || !globalThis.fetch) {
            throw new ResourceLoadException(`Unable to resolve resource: ${ref}`, {
                ref,
                kind: "resolution",
                phase: "resolve"
            });
        }
        const record = { ref };
        const promise = ResourceLoader.fetchFromCandidates(urls, ref, options.signal)
            .then(async (response) => {
            ResourceLoader.throwIfAborted(options.signal, ref, response.url || null, "read");
            let data;
            try {
                data = await response.arrayBuffer();
            }
            catch (cause) {
                if (ResourceLoader.isAbortError(cause) || options.signal?.aborted) {
                    throw ResourceLoader.abortException(ref, response.url || null, "read", cause);
                }
                throw new ResourceLoadException(`Failed to read resource ${ref}`, {
                    ref,
                    url: response.url || null,
                    kind: "network",
                    phase: "read",
                    cause
                });
            }
            ResourceLoader.throwIfAborted(options.signal, ref, response.url || null, "read");
            record.data = data;
            return data.slice(0);
        })
            .catch((error) => {
            record.error = error;
            throw error;
        });
        record.promise = promise;
        ResourceLoader.records.set(ref, record);
        return promise;
    }
    /** Fetches a manifest before Java-style synchronous consumers initialize. */
    static async preloadResources(refs, onProgressOrOptions) {
        const options = ResourceLoader.normalizePreloadOptions(onProgressOrOptions);
        ResourceLoader.throwIfAborted(options.signal, "resource manifest", null, "fetch");
        const uniqueRefs = Array.from(new Set(refs));
        const results = new Map();
        const total = uniqueRefs.length;
        let loaded = 0;
        let bytesLoaded = 0;
        if (total === 0) {
            return results;
        }
        const settled = await Promise.allSettled(uniqueRefs.map(async (ref) => {
            const bytes = await ResourceLoader.loadResource(ref, options);
            results.set(ref, bytes);
            loaded++;
            bytesLoaded += bytes.byteLength;
            options.onProgress?.({ ref, loaded, total, bytesLoaded });
        }));
        const failure = settled.find((entry) => entry.status === "rejected");
        if (failure) {
            throw failure.reason;
        }
        return results;
    }
    /** Adds a decode/prepare promise to the shared preload barrier. */
    static track(promise, refOrLabel = "tracked resource") {
        const generation = ResourceLoader.trackingGeneration;
        const tracked = promise
            .catch((error) => {
            const reported = error instanceof SlickException ? error : new SlickException(`Failed to prepare resource ${refOrLabel}`, error);
            if (generation === ResourceLoader.trackingGeneration) {
                ResourceLoader.trackedErrors.push({ label: refOrLabel, error: reported });
            }
            throw reported;
        })
            .finally(() => {
            if (generation === ResourceLoader.trackingGeneration) {
                ResourceLoader.trackedPromises.delete(tracked);
            }
        });
        ResourceLoader.trackedPromises.add(tracked);
        void tracked.catch(() => undefined);
        return tracked;
    }
    /** Returns the number of browser resource or decode operations still queued. */
    static getPendingCount() {
        let pendingFetches = 0;
        for (const record of ResourceLoader.records.values()) {
            if (record.promise !== undefined && record.data === undefined && record.error === undefined) {
                pendingFetches++;
            }
        }
        return pendingFetches + ResourceLoader.trackedPromises.size;
    }
    static hasPending() {
        return ResourceLoader.getPendingCount() > 0;
    }
    static resourceFailed(ref) {
        return ResourceLoader.records.get(ref)?.error !== undefined;
    }
    static getResourceError(ref) {
        return ResourceLoader.records.get(ref)?.error;
    }
    static getTrackedErrors() {
        return ResourceLoader.trackedErrors.slice();
    }
    static hasFailed() {
        if (ResourceLoader.trackedErrors.length > 0) {
            return true;
        }
        for (const record of ResourceLoader.records.values()) {
            if (record.error !== undefined) {
                return true;
            }
        }
        return false;
    }
    /**
     * Waits until all work belonging to the current barrier has settled. Work
     * queued by another tracked operation is included before the method returns.
     */
    static async waitForAll() {
        while (ResourceLoader.hasPending()) {
            const promises = [];
            for (const record of ResourceLoader.records.values()) {
                if (record.promise !== undefined && record.data === undefined && record.error === undefined) {
                    promises.push(record.promise);
                }
            }
            for (const promise of ResourceLoader.trackedPromises) {
                promises.push(promise);
            }
            if (promises.length === 0) {
                break;
            }
            await Promise.allSettled(promises);
        }
        if (ResourceLoader.trackedErrors.length > 0) {
            throw ResourceLoader.toTrackedFailureException();
        }
        for (const record of ResourceLoader.records.values()) {
            if (record.error !== undefined) {
                throw record.error;
            }
        }
    }
    /** Clears all cached resource bytes and in-flight handles. */
    static clearCache() {
        ResourceLoader.records.clear();
        ResourceLoader.trackedPromises.clear();
        ResourceLoader.trackedErrors = [];
        ResourceLoader.trackingGeneration++;
    }
    /** Clears retained failures without removing successfully preloaded bytes. */
    static clearFailures() {
        for (const [ref, record] of ResourceLoader.records.entries()) {
            if (record.error !== undefined) {
                ResourceLoader.records.delete(ref);
            }
        }
        ResourceLoader.trackedPromises.clear();
        ResourceLoader.trackedErrors = [];
        ResourceLoader.trackingGeneration++;
    }
    static normalizePreloadOptions(value) {
        return typeof value === "function" ? { onProgress: value } : (value ?? {});
    }
    static toTrackedFailureException() {
        const first = ResourceLoader.trackedErrors[0];
        return first.error instanceof SlickException ? first.error : new SlickException(`Failed tracked resource: ${first.label}`, first.error);
    }
    static withCacheBust(url) {
        if (ResourceLoader.cacheBustValue !== null) {
            url.searchParams.set("v", ResourceLoader.cacheBustValue);
        }
        return url;
    }
    static getResourceCandidates(ref) {
        const urls = [];
        for (const location of ResourceLoader.locations) {
            try {
                urls.push(ResourceLoader.withCacheBust(ResourceLoader.resolveLocation(location, ref)));
            }
            catch {
                continue;
            }
        }
        return urls;
    }
    static resolveLocation(location, ref) {
        const baseHref = globalThis.location?.href ?? "https://example.invalid/";
        if (location.length === 0) {
            return new URL(ref, baseHref);
        }
        const normalizedLocation = location.endsWith("/") ? location : `${location}/`;
        const normalizedRef = ref.replace(/^\/+/, "");
        return new URL(normalizedRef, new URL(normalizedLocation, baseHref));
    }
    static async fetchFromCandidates(urls, ref, signal) {
        let failure = null;
        for (const url of urls) {
            try {
                return await ResourceLoader.fetchWithRetry(url, ref, signal);
            }
            catch (error) {
                if (error instanceof ResourceLoadException && error.kind === "abort") {
                    throw error;
                }
                failure = error;
            }
        }
        if (failure instanceof SlickException) {
            throw failure;
        }
        throw new ResourceLoadException(`Failed to load resource ${ref}`, {
            ref,
            kind: "network",
            phase: "fetch",
            cause: failure
        });
    }
    static async fetchWithRetry(url, ref, signal) {
        let failure = null;
        for (let attempt = 0; attempt <= ResourceLoader.retryCount; attempt++) {
            ResourceLoader.throwIfAborted(signal, ref, url.href, "fetch");
            try {
                const response = await fetch(url, { signal });
                if (response.ok) {
                    return response;
                }
                failure = new ResourceLoadException(`Failed to load resource ${ref}: HTTP ${response.status}`, {
                    ref,
                    url: url.href,
                    status: response.status,
                    kind: "http",
                    phase: "fetch"
                });
            }
            catch (cause) {
                if (ResourceLoader.isAbortError(cause) || signal?.aborted) {
                    throw ResourceLoader.abortException(ref, url.href, "fetch", cause);
                }
                failure = new ResourceLoadException(`Failed to load resource ${ref}`, {
                    ref,
                    url: url.href,
                    kind: "network",
                    phase: "fetch",
                    cause
                });
            }
            if (attempt >= ResourceLoader.retryCount || !ResourceLoader.isRetryable(failure)) {
                break;
            }
            await ResourceLoader.waitBeforeRetry(signal, ref, url.href);
        }
        throw (failure ??
            new ResourceLoadException(`Failed to load resource ${ref}`, {
                ref,
                url: url.href,
                kind: "network",
                phase: "fetch"
            }));
    }
    static isRetryable(error) {
        if (error.kind === "network") {
            return true;
        }
        if (error.kind !== "http" || error.status === null) {
            return false;
        }
        return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
    }
    static async waitBeforeRetry(signal, ref, url) {
        if (ResourceLoader.retryDelay <= 0) {
            return;
        }
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                signal?.removeEventListener("abort", abort);
                resolve();
            }, ResourceLoader.retryDelay);
            const abort = () => {
                clearTimeout(timeout);
                signal?.removeEventListener("abort", abort);
                reject(ResourceLoader.abortException(ref, url, "fetch", signal?.reason));
            };
            if (signal?.aborted) {
                abort();
                return;
            }
            signal?.addEventListener("abort", abort, { once: true });
        });
    }
    static async waitForPromise(promise, signal, ref) {
        if (!signal) {
            return promise;
        }
        ResourceLoader.throwIfAborted(signal, ref, null, "fetch");
        return new Promise((resolve, reject) => {
            const abort = () => {
                signal.removeEventListener("abort", abort);
                reject(ResourceLoader.abortException(ref, null, "fetch", signal.reason));
            };
            signal.addEventListener("abort", abort, { once: true });
            void promise.then((value) => {
                signal.removeEventListener("abort", abort);
                resolve(value);
            }, (error) => {
                signal.removeEventListener("abort", abort);
                reject(error);
            });
        });
    }
    static throwIfAborted(signal, ref, url, phase) {
        if (signal?.aborted) {
            throw ResourceLoader.abortException(ref, url, phase, signal.reason);
        }
    }
    static abortException(ref, url, phase, cause) {
        return new ResourceLoadException(`Resource load aborted: ${ref}`, {
            ref,
            url,
            kind: "abort",
            phase,
            cause
        });
    }
    static isAbortError(error) {
        return ((typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
            (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"));
    }
}
//# sourceMappingURL=ResourceLoader.js.map