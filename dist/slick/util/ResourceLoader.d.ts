export type TrackedResourceError = {
    label: string;
    error: unknown;
};
export type ResourcePreloadProgress = {
    ref: string;
    loaded: number;
    total: number;
    bytesLoaded: number;
};
/**
 * Java Slick2D counterpart: org.newdawn.slick.util.ResourceLoader.
 *
 * Synchronous facade over resources that have already been preloaded or queued
 * by the browser resource manager.
 */
export declare class ResourceLoader {
    private static locations;
    private static records;
    private static trackedPromises;
    private static trackedErrors;
    private static trackingGeneration;
    private static cacheBustValue;
    private static retryCount;
    private static retryDelay;
    /**
     * Java Slick2D counterpart: ResourceLoader.addResourceLocation(ResourceLocation).
     *
     * Adds a base URL/path string used to resolve future resource requests.
     */
    static addResourceLocation(location: unknown): void;
    /**
     * Java Slick2D counterpart: ResourceLoader.removeResourceLocation(ResourceLocation).
     *
     * Removes a previously registered base URL/path string.
     */
    static removeResourceLocation(location: unknown): void;
    /**
     * Java Slick2D counterpart: ResourceLoader.removeAllResourceLocations().
     *
     * Clears base URL/path strings. No network resources resolve until a
     * location is added or bytes are registered directly.
     */
    static removeAllResourceLocations(): void;
    /**
     * Browser parity helper.
     *
     * Adds or clears a cache-version query parameter on network fetch URLs
     * while preserving the original Java ref string as the cache key.
     */
    static setCacheBust(value: string | number | null): void;
    /**
     * Browser parity helper.
     *
     * Configures retry attempts for browser resource fetches.
     */
    static setRetryOptions(retries: number, delayMs?: number): void;
    /**
     * Java Slick2D counterpart: ResourceLoader.getResource(String).
     *
     * Returns a URL for a resource path if it can be resolved syntactically.
     */
    static getResource(ref: string): URL | null;
    /**
     * Java Slick2D counterpart: ResourceLoader.getResourceAsStream(String).
     *
     * Returns already-loaded bytes or null; it never performs a synchronous fetch.
     */
    static getResourceAsStream(ref: string): ArrayBuffer | null;
    /**
     * Java Slick2D counterpart: ResourceLoader.resourceExists(String).
     *
     * Returns true when bytes are already loaded for the resource.
     */
    static resourceExists(ref: string): boolean;
    /**
     * Browser parity helper.
     *
     * Registers already-available bytes under the original Java path string.
     */
    static registerResource(ref: string, data: ArrayBuffer | Uint8Array): void;
    /**
     * Browser parity helper.
     *
     * Queues an async fetch for a resource and caches in-flight requests.
     */
    static loadResource(ref: string): Promise<ArrayBuffer>;
    /**
     * Browser parity helper.
     *
     * Fetches a manifest of original Java resource paths before game init so
     * later Java-style constructors can read synchronously through
     * getResourceAsStream(ref).
     */
    static preloadResources(refs: Iterable<string>, onProgress?: (progress: ResourcePreloadProgress) => void): Promise<Map<string, ArrayBuffer>>;
    /**
     * Browser parity helper.
     *
     * Adds a non-Java decode/prepare promise to the same preload barrier used
     * by Java-style synchronous resource consumers.
     */
    static track<T>(promise: Promise<T>, refOrLabel?: string): Promise<T>;
    /**
     * Browser parity helper.
     *
     * Returns the number of browser resource or decode operations still queued.
     */
    static getPendingCount(): number;
    /**
     * Browser parity helper.
     *
     * Returns true while any tracked browser resource work is still pending.
     */
    static hasPending(): boolean;
    /**
     * Browser parity helper.
     *
     * Returns true when a queued resource failed.
     */
    static resourceFailed(ref: string): boolean;
    /**
     * Browser parity helper.
     *
     * Returns the original error for a failed resource.
     */
    static getResourceError(ref: string): unknown;
    /**
     * Browser parity helper.
     *
     * Returns retained failures from tracked decode/preparation tasks.
     */
    static getTrackedErrors(): TrackedResourceError[];
    /**
     * Browser parity helper.
     *
     * Returns true when any fetch or tracked preparation task has failed.
     */
    static hasFailed(): boolean;
    /**
     * Browser parity helper.
     *
     * Waits for all currently queued resource requests.
     */
    static waitForAll(): Promise<void>;
    /**
     * Browser parity helper.
     *
     * Clears all cached resource bytes and in-flight handles.
     */
    static clearCache(): void;
    /**
     * Browser parity helper.
     *
     * Clears retained failed resource/decode state without removing successful
     * preloaded resource bytes.
     */
    static clearFailures(): void;
    private static toTrackedFailureException;
    private static withCacheBust;
    private static getResourceCandidates;
    private static resolveLocation;
    private static fetchFromCandidates;
    private static fetchWithRetry;
}
//# sourceMappingURL=ResourceLoader.d.ts.map