import { SlickException } from "../SlickException.js";
export type TrackedResourceError = {
    label: string;
    error: unknown;
};
export type ResourceLoadFailureKind = "resolution" | "network" | "http" | "abort" | "decode";
export type ResourceLoadPhase = "resolve" | "fetch" | "read" | "decode";
export interface ResourceLoadFailureDetails {
    readonly ref: string;
    readonly url?: string | null;
    readonly status?: number | null;
    readonly kind: ResourceLoadFailureKind;
    readonly phase: ResourceLoadPhase;
    readonly cause?: unknown;
}
/** Browser resource failure with stable, application-readable semantics. */
export declare class ResourceLoadException extends SlickException {
    readonly ref: string;
    readonly url: string | null;
    readonly status: number | null;
    readonly kind: ResourceLoadFailureKind;
    readonly phase: ResourceLoadPhase;
    constructor(message: string, details: ResourceLoadFailureDetails);
}
export interface ResourceLoadOptions {
    readonly signal?: AbortSignal;
}
export type ResourcePreloadProgress = {
    ref: string;
    loaded: number;
    total: number;
    bytesLoaded: number;
};
export interface ResourcePreloadOptions extends ResourceLoadOptions {
    readonly onProgress?: (progress: ResourcePreloadProgress) => void;
}
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
    /** Java Slick2D counterpart: ResourceLoader.addResourceLocation(ResourceLocation). */
    static addResourceLocation(location: unknown): void;
    /** Java Slick2D counterpart: ResourceLoader.removeResourceLocation(ResourceLocation). */
    static removeResourceLocation(location: unknown): void;
    /** Java Slick2D counterpart: ResourceLoader.removeAllResourceLocations(). */
    static removeAllResourceLocations(): void;
    /** Adds or clears a cache-version query parameter while retaining Java refs as cache keys. */
    static setCacheBust(value: string | number | null): void;
    /** Configures transient browser fetch retries. Permanent HTTP failures are not retried. */
    static setRetryOptions(retries: number, delayMs?: number): void;
    /** Java Slick2D counterpart: ResourceLoader.getResource(String). */
    static getResource(ref: string): URL | null;
    /** Java Slick2D counterpart: ResourceLoader.getResourceAsStream(String). */
    static getResourceAsStream(ref: string): ArrayBuffer | null;
    /** Java Slick2D counterpart: ResourceLoader.resourceExists(String). */
    static resourceExists(ref: string): boolean;
    /** Registers already-available bytes under the original Java path string. */
    static registerResource(ref: string, data: ArrayBuffer | Uint8Array): void;
    /** Queues an async fetch for a resource and caches in-flight requests. */
    static loadResource(ref: string, options?: ResourceLoadOptions): Promise<ArrayBuffer>;
    static preloadResources(refs: Iterable<string>, onProgress?: (progress: ResourcePreloadProgress) => void): Promise<Map<string, ArrayBuffer>>;
    static preloadResources(refs: Iterable<string>, options?: ResourcePreloadOptions): Promise<Map<string, ArrayBuffer>>;
    /** Adds a decode/prepare promise to the shared preload barrier. */
    static track<T>(promise: Promise<T>, refOrLabel?: string): Promise<T>;
    /** Returns the number of browser resource or decode operations still queued. */
    static getPendingCount(): number;
    static hasPending(): boolean;
    static resourceFailed(ref: string): boolean;
    static getResourceError(ref: string): unknown;
    static getTrackedErrors(): TrackedResourceError[];
    static hasFailed(): boolean;
    /**
     * Waits until all work belonging to the current barrier has settled. Work
     * queued by another tracked operation is included before the method returns.
     */
    static waitForAll(): Promise<void>;
    /** Clears all cached resource bytes and in-flight handles. */
    static clearCache(): void;
    /** Clears retained failures without removing successfully preloaded bytes. */
    static clearFailures(): void;
    private static normalizePreloadOptions;
    private static toTrackedFailureException;
    private static withCacheBust;
    private static getResourceCandidates;
    private static resolveLocation;
    private static fetchFromCandidates;
    private static fetchWithRetry;
    private static isRetryable;
    private static waitBeforeRetry;
    private static waitForPromise;
    private static throwIfAborted;
    private static abortException;
    private static isAbortError;
}
//# sourceMappingURL=ResourceLoader.d.ts.map