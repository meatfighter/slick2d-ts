import { SlickException } from "../SlickException.js";

type ResourceRecord = {
    ref: string;
    data?: ArrayBuffer;
    promise?: Promise<ArrayBuffer>;
    error?: unknown;
};

type FetchFailure = {
    status?: number;
    cause?: unknown;
};

/**
 * Java Slick2D counterpart: org.newdawn.slick.util.ResourceLoader.
 *
 * Synchronous facade over resources that have already been preloaded or queued
 * by the browser resource manager.
 */
export class ResourceLoader {
    private static locations: string[] = [""];
    private static records = new Map<string, ResourceRecord>();
    private static trackedPromises = new Set<Promise<unknown>>();
    private static cacheBustValue: string | null = null;
    private static retryCount = 0;
    private static retryDelay = 250;

    /**
     * Java Slick2D counterpart: ResourceLoader.addResourceLocation(ResourceLocation).
     *
     * Adds a base URL/path string used to resolve future resource requests.
     */
    public static addResourceLocation(location: unknown): void {
        ResourceLoader.locations.push(String(location));
    }

    /**
     * Java Slick2D counterpart: ResourceLoader.removeResourceLocation(ResourceLocation).
     *
     * Removes a previously registered base URL/path string.
     */
    public static removeResourceLocation(location: unknown): void {
        const value = String(location);
        ResourceLoader.locations = ResourceLoader.locations.filter((entry) => entry !== value);
    }

    /**
     * Java Slick2D counterpart: ResourceLoader.removeAllResourceLocations().
     *
     * Clears base URL/path strings. No network resources resolve until a
     * location is added or bytes are registered directly.
     */
    public static removeAllResourceLocations(): void {
        ResourceLoader.locations = [];
    }

    /**
     * Browser parity helper.
     *
     * Adds or clears a cache-version query parameter on network fetch URLs
     * while preserving the original Java ref string as the cache key.
     */
    public static setCacheBust(value: string | number | null): void {
        ResourceLoader.cacheBustValue = value === null ? null : String(value);
    }

    /**
     * Browser parity helper.
     *
     * Configures retry attempts for browser resource fetches.
     */
    public static setRetryOptions(retries: number, delayMs: number = 250): void {
        ResourceLoader.retryCount = Math.max(0, Math.trunc(retries));
        ResourceLoader.retryDelay = Math.max(0, Math.trunc(delayMs));
    }

    /**
     * Java Slick2D counterpart: ResourceLoader.getResource(String).
     *
     * Returns a URL for a resource path if it can be resolved syntactically.
     */
    public static getResource(ref: string): URL | null {
        return ResourceLoader.getResourceCandidates(ref)[0] ?? null;
    }

    /**
     * Java Slick2D counterpart: ResourceLoader.getResourceAsStream(String).
     *
     * Returns already-loaded bytes or null; it never performs a synchronous fetch.
     */
    public static getResourceAsStream(ref: string): ArrayBuffer | null {
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
    public static resourceExists(ref: string): boolean {
        return ResourceLoader.records.get(ref)?.data !== undefined;
    }

    /**
     * Browser parity helper.
     *
     * Registers already-available bytes under the original Java path string.
     */
    public static registerResource(ref: string, data: ArrayBuffer | Uint8Array): void {
        let bytes: ArrayBuffer;
        if (data instanceof Uint8Array) {
            const copy = new Uint8Array(data.byteLength);
            copy.set(data);
            bytes = copy.buffer as ArrayBuffer;
        } else {
            bytes = data.slice(0);
        }
        ResourceLoader.records.set(ref, { ref, data: bytes });
    }

    /**
     * Browser parity helper.
     *
     * Queues an async fetch for a resource and caches in-flight requests.
     */
    public static async loadResource(ref: string): Promise<ArrayBuffer> {
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

        const record: ResourceRecord = { ref };
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
     * Adds a non-Java decode/prepare promise to the same preload barrier used
     * by Java-style synchronous resource consumers.
     */
    public static track<T>(promise: Promise<T>): Promise<T> {
        const tracked = promise.finally(() => {
            ResourceLoader.trackedPromises.delete(tracked);
        });
        ResourceLoader.trackedPromises.add(tracked);
        return tracked;
    }

    /**
     * Browser parity helper.
     *
     * Returns the number of browser resource or decode operations still queued.
     */
    public static getPendingCount(): number {
        const pendingFetches = Array.from(ResourceLoader.records.values())
            .filter((record) => record.promise !== undefined && record.data === undefined && record.error === undefined)
            .length;
        return pendingFetches + ResourceLoader.trackedPromises.size;
    }

    /**
     * Browser parity helper.
     *
     * Returns true while any tracked browser resource work is still pending.
     */
    public static hasPending(): boolean {
        return ResourceLoader.getPendingCount() > 0;
    }

    /**
     * Browser parity helper.
     *
     * Returns true when a queued resource failed.
     */
    public static resourceFailed(ref: string): boolean {
        return ResourceLoader.records.get(ref)?.error !== undefined;
    }

    /**
     * Browser parity helper.
     *
     * Returns the original error for a failed resource.
     */
    public static getResourceError(ref: string): unknown {
        return ResourceLoader.records.get(ref)?.error;
    }

    /**
     * Browser parity helper.
     *
     * Waits for all currently queued resource requests.
     */
    public static async waitForAll(): Promise<void> {
        const promises = Array.from(ResourceLoader.records.values())
            .map((record) => record.promise)
            .filter((promise): promise is Promise<ArrayBuffer> => promise !== undefined);
        await Promise.all([...promises, ...ResourceLoader.trackedPromises]);
    }

    /**
     * Browser parity helper.
     *
     * Clears all cached resource bytes and in-flight handles.
     */
    public static clearCache(): void {
        ResourceLoader.records.clear();
        ResourceLoader.trackedPromises.clear();
    }

    private static withCacheBust(url: URL): URL {
        if (ResourceLoader.cacheBustValue !== null) {
            url.searchParams.set("v", ResourceLoader.cacheBustValue);
        }
        return url;
    }

    private static getResourceCandidates(ref: string): URL[] {
        const urls: URL[] = [];
        for (const location of ResourceLoader.locations) {
            try {
                urls.push(ResourceLoader.withCacheBust(ResourceLoader.resolveLocation(location, ref)));
            } catch {
                continue;
            }
        }
        return urls;
    }

    private static resolveLocation(location: string, ref: string): URL {
        const baseHref = globalThis.location?.href ?? "http://localhost/";
        if (location.length === 0) {
            return new URL(ref, baseHref);
        }
        const normalizedLocation = location.endsWith("/") ? location : `${location}/`;
        const normalizedRef = ref.replace(/^\/+/, "");
        return new URL(normalizedRef, new URL(normalizedLocation, baseHref));
    }

    private static async fetchFromCandidates(urls: URL[], ref: string): Promise<Response> {
        let failure: unknown = null;
        for (const url of urls) {
            try {
                return await ResourceLoader.fetchWithRetry(url, ref);
            } catch (error) {
                failure = error;
            }
        }
        if (failure instanceof SlickException) {
            throw failure;
        }
        throw new SlickException(`Failed to load resource ${ref}`, failure);
    }

    private static async fetchWithRetry(url: URL, ref: string): Promise<Response> {
        let failure: FetchFailure | null = null;
        for (let attempt = 0; attempt <= ResourceLoader.retryCount; attempt++) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    return response;
                }
                failure = { status: response.status };
            } catch (cause) {
                failure = { cause };
            }
            if (attempt < ResourceLoader.retryCount && ResourceLoader.retryDelay > 0) {
                await new Promise<void>((resolve) => {
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
