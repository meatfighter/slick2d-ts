import { SlickException } from "../SlickException.js";
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
    /**
     * Java Slick2D counterpart: ResourceLoader.addResourceLocation(ResourceLocation).
     *
     * Adds a base URL/path string used to resolve future resource requests.
     */
    static addResourceLocation(location) {
        ResourceLoader.locations.push(String(location));
    }
    /**
     * Java Slick2D counterpart: ResourceLoader.removeResourceLocation(ResourceLocation).
     *
     * Removes a previously registered base URL/path string.
     */
    static removeResourceLocation(location) {
        const value = String(location);
        ResourceLoader.locations = ResourceLoader.locations.filter((entry) => entry !== value);
    }
    /**
     * Java Slick2D counterpart: ResourceLoader.removeAllResourceLocations().
     *
     * Clears base URL/path strings. No network resources resolve until a
     * location is added or bytes are registered directly.
     */
    static removeAllResourceLocations() {
        ResourceLoader.locations = [];
    }
    /**
     * Browser parity helper.
     *
     * Adds or clears a cache-version query parameter on network fetch URLs
     * while preserving the original Java ref string as the cache key.
     */
    static setCacheBust(value) {
        ResourceLoader.cacheBustValue = value === null ? null : String(value);
    }
    /**
     * Browser parity helper.
     *
     * Configures retry attempts for browser resource fetches.
     */
    static setRetryOptions(retries, delayMs = 250) {
        ResourceLoader.retryCount = Math.max(0, Math.trunc(retries));
        ResourceLoader.retryDelay = Math.max(0, Math.trunc(delayMs));
    }
    /**
     * Java Slick2D counterpart: ResourceLoader.getResource(String).
     *
     * Returns a URL for a resource path if it can be resolved syntactically.
     */
    static getResource(ref) {
        return ResourceLoader.getResourceCandidates(ref)[0] ?? null;
    }
    /**
     * Java Slick2D counterpart: ResourceLoader.getResourceAsStream(String).
     *
     * Returns already-loaded bytes or null; it never performs a synchronous fetch.
     */
    static getResourceAsStream(ref) {
        const record = ResourceLoader.records.get(ref);
        if (!record || !record.data) {
            return null;
        }
        return record.data.slice(0);
    }
    /**
     * Java Slick2D counterpart: ResourceLoader.resourceExists(String).
     *
     * Returns true when bytes are already loaded for the resource.
     */
    static resourceExists(ref) {
        return ResourceLoader.records.get(ref)?.data !== undefined;
    }
    /**
     * Browser parity helper.
     *
     * Registers already-available bytes under the original Java path string.
     */
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
     * Browser parity helper.
     *
     * Queues an async fetch for a resource and caches in-flight requests.
     */
    static async loadResource(ref) {
        const existing = ResourceLoader.records.get(ref);
        if (existing?.data) {
            return existing.data.slice(0);
        }
        if (existing?.promise && existing.error === undefined) {
            return existing.promise;
        }
        const urls = ResourceLoader.getResourceCandidates(ref);
        if (urls.length === 0 || !globalThis.fetch) {
            throw new SlickException(`Unable to resolve resource: ${ref}`);
        }
        const record = { ref };
        record.promise = ResourceLoader.fetchFromCandidates(urls, ref)
            .then(async (response) => {
            const data = await response.arrayBuffer();
            record.data = data;
            return data.slice(0);
        })
            .catch((error) => {
            record.error = error;
            throw error;
        });
        ResourceLoader.records.set(ref, record);
        return record.promise;
    }
    /**
     * Browser parity helper.
     *
     * Fetches a manifest of original Java resource paths before game init so
     * later Java-style constructors can read synchronously through
     * getResourceAsStream(ref).
     */
    static async preloadResources(refs, onProgress) {
        const uniqueRefs = Array.from(new Set(refs));
        const results = new Map();
        const total = uniqueRefs.length;
        let loaded = 0;
        let bytesLoaded = 0;
        if (total === 0) {
            return results;
        }
        await Promise.all(uniqueRefs.map(async (ref) => {
            try {
                const bytes = await ResourceLoader.loadResource(ref);
                const copy = bytes.slice(0);
                results.set(ref, copy);
                loaded++;
                bytesLoaded += copy.byteLength;
                onProgress?.({ ref, loaded, total, bytesLoaded });
            }
            catch (error) {
                throw error instanceof SlickException ? error : new SlickException(`Failed to preload resource ${ref}`, error);
            }
        }));
        return results;
    }
    /**
     * Browser parity helper.
     *
     * Adds a non-Java decode/prepare promise to the same preload barrier used
     * by Java-style synchronous resource consumers.
     */
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
    /**
     * Browser parity helper.
     *
     * Returns the number of browser resource or decode operations still queued.
     */
    static getPendingCount() {
        let pendingFetches = 0;
        for (const record of ResourceLoader.records.values()) {
            if (record.promise !== undefined && record.data === undefined && record.error === undefined) {
                pendingFetches++;
            }
        }
        return pendingFetches + ResourceLoader.trackedPromises.size;
    }
    /**
     * Browser parity helper.
     *
     * Returns true while any tracked browser resource work is still pending.
     */
    static hasPending() {
        return ResourceLoader.getPendingCount() > 0;
    }
    /**
     * Browser parity helper.
     *
     * Returns true when a queued resource failed.
     */
    static resourceFailed(ref) {
        return ResourceLoader.records.get(ref)?.error !== undefined;
    }
    /**
     * Browser parity helper.
     *
     * Returns the original error for a failed resource.
     */
    static getResourceError(ref) {
        return ResourceLoader.records.get(ref)?.error;
    }
    /**
     * Browser parity helper.
     *
     * Returns retained failures from tracked decode/preparation tasks.
     */
    static getTrackedErrors() {
        return ResourceLoader.trackedErrors.slice();
    }
    /**
     * Browser parity helper.
     *
     * Returns true when any fetch or tracked preparation task has failed.
     */
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
     * Browser parity helper.
     *
     * Waits for all currently queued resource requests.
     */
    static async waitForAll() {
        if (ResourceLoader.trackedErrors.length > 0) {
            throw ResourceLoader.toTrackedFailureException();
        }
        const promises = [];
        for (const record of ResourceLoader.records.values()) {
            if (record.promise !== undefined) {
                promises.push(record.promise);
            }
        }
        for (const promise of ResourceLoader.trackedPromises) {
            promises.push(promise);
        }
        await Promise.all(promises);
        if (ResourceLoader.trackedErrors.length > 0) {
            throw ResourceLoader.toTrackedFailureException();
        }
    }
    /**
     * Browser parity helper.
     *
     * Clears all cached resource bytes and in-flight handles.
     */
    static clearCache() {
        ResourceLoader.records.clear();
        ResourceLoader.trackedPromises.clear();
        ResourceLoader.trackedErrors = [];
        ResourceLoader.trackingGeneration++;
    }
    /**
     * Browser parity helper.
     *
     * Clears retained failed resource/decode state without removing successful
     * preloaded resource bytes.
     */
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
    static toTrackedFailureException() {
        const first = ResourceLoader.trackedErrors[0];
        return new SlickException(`Failed tracked resource: ${first.label}`, first.error);
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
    static async fetchFromCandidates(urls, ref) {
        let failure = null;
        for (const url of urls) {
            try {
                return await ResourceLoader.fetchWithRetry(url, ref);
            }
            catch (error) {
                failure = error;
            }
        }
        if (failure instanceof SlickException) {
            throw failure;
        }
        throw new SlickException(`Failed to load resource ${ref}`, failure);
    }
    static async fetchWithRetry(url, ref) {
        let failure = null;
        for (let attempt = 0; attempt <= ResourceLoader.retryCount; attempt++) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return response;
                }
                failure = { status: response.status };
            }
            catch (cause) {
                failure = { cause };
            }
            if (attempt < ResourceLoader.retryCount && ResourceLoader.retryDelay > 0) {
                await new Promise((resolve) => {
                    setTimeout(resolve, ResourceLoader.retryDelay);
                });
            }
        }
        if (failure?.status !== undefined) {
            throw new SlickException(`Failed to load resource ${ref}: HTTP ${failure.status}`);
        }
        throw new SlickException(`Failed to load resource ${ref}`, failure?.cause);
    }
}
//# sourceMappingURL=ResourceLoader.js.map