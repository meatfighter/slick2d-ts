import { SlickException } from "../SlickException.js";

type ResourceRecord = {
    ref: string;
    data?: ArrayBuffer;
    promise?: Promise<ArrayBuffer>;
    error?: unknown;
};

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
export class ResourceLoadException extends SlickException {
    public readonly ref: string;
    public readonly url: string | null;
    public readonly status: number | null;
    public readonly kind: ResourceLoadFailureKind;
    public readonly phase: ResourceLoadPhase;

    public constructor(message: string, details: ResourceLoadFailureDetails) {
        super(message, details.cause);
        this.name = "ResourceLoadException";
        this.ref = details.ref;
        this.url = details.url ?? null;
        this.status = details.status ?? null;
        this.kind = details.kind;
        this.phase = details.phase;
    }
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
export class ResourceLoader {
    private static locations: string[] = [""];
    private static records = new Map<string, ResourceRecord>();
    private static trackedPromises = new Set<Promise<unknown>>();
    private static trackedErrors: TrackedResourceError[] = [];
    private static trackingGeneration = 0;
    private static cacheBustValue: string | null = null;
    private static retryCount = 0;
    private static retryDelay = 250;

    /** Java Slick2D counterpart: ResourceLoader.addResourceLocation(ResourceLocation). */
    public static addResourceLocation(location: unknown): void {
        ResourceLoader.locations.push(String(location));
    }

    /** Java Slick2D counterpart: ResourceLoader.removeResourceLocation(ResourceLocation). */
    public static removeResourceLocation(location: unknown): void {
        const value = String(location);
        ResourceLoader.locations = ResourceLoader.locations.filter((entry) => entry !== value);
    }

    /** Java Slick2D counterpart: ResourceLoader.removeAllResourceLocations(). */
    public static removeAllResourceLocations(): void {
        ResourceLoader.locations = [];
    }

    /** Adds or clears a cache-version query parameter while retaining Java refs as cache keys. */
    public static setCacheBust(value: string | number | null): void {
        ResourceLoader.cacheBustValue = value === null ? null : String(value);
    }

    /** Configures transient browser fetch retries. Permanent HTTP failures are not retried. */
    public static setRetryOptions(retries: number, delayMs: number = 250): void {
        ResourceLoader.retryCount = Math.max(0, Math.trunc(retries));
        ResourceLoader.retryDelay = Math.max(0, Math.trunc(delayMs));
    }

    /** Java Slick2D counterpart: ResourceLoader.getResource(String). */
    public static getResource(ref: string): URL | null {
        return ResourceLoader.getResourceCandidates(ref)[0] ?? null;
    }

    /** Java Slick2D counterpart: ResourceLoader.getResourceAsStream(String). */
    public static getResourceAsStream(ref: string): ArrayBuffer | null {
        const record = ResourceLoader.records.get(ref);
        if (!record?.data) {
            return null;
        }
        return record.data.slice(0);
    }

    /** Java Slick2D counterpart: ResourceLoader.resourceExists(String). */
    public static resourceExists(ref: string): boolean {
        return ResourceLoader.records.get(ref)?.data !== undefined;
    }

    /** Registers already-available bytes under the original Java path string. */
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

    /** Queues an async fetch for a resource and caches in-flight requests. */
    public static async loadResource(ref: string, options: ResourceLoadOptions = {}): Promise<ArrayBuffer> {
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

        const record: ResourceRecord = { ref };
        const promise = ResourceLoader.fetchFromCandidates(urls, ref, options.signal)
            .then(async (response) => {
                ResourceLoader.throwIfAborted(options.signal, ref, response.url || null, "read");
                let data: ArrayBuffer;
                try {
                    data = await response.arrayBuffer();
                } catch (cause) {
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

    public static preloadResources(refs: Iterable<string>, onProgress?: (progress: ResourcePreloadProgress) => void): Promise<Map<string, ArrayBuffer>>;
    public static preloadResources(refs: Iterable<string>, options?: ResourcePreloadOptions): Promise<Map<string, ArrayBuffer>>;
    /** Fetches a manifest before Java-style synchronous consumers initialize. */
    public static async preloadResources(
        refs: Iterable<string>,
        onProgressOrOptions?: ((progress: ResourcePreloadProgress) => void) | ResourcePreloadOptions
    ): Promise<Map<string, ArrayBuffer>> {
        const options = ResourceLoader.normalizePreloadOptions(onProgressOrOptions);
        ResourceLoader.throwIfAborted(options.signal, "resource manifest", null, "fetch");
        const uniqueRefs = Array.from(new Set(refs));
        const results = new Map<string, ArrayBuffer>();
        const total = uniqueRefs.length;
        let loaded = 0;
        let bytesLoaded = 0;
        if (total === 0) {
            return results;
        }

        const settled = await Promise.allSettled(
            uniqueRefs.map(async (ref) => {
                const bytes = await ResourceLoader.loadResource(ref, options);
                results.set(ref, bytes);
                loaded++;
                bytesLoaded += bytes.byteLength;
                options.onProgress?.({ ref, loaded, total, bytesLoaded });
            })
        );
        const failure = settled.find((entry): entry is PromiseRejectedResult => entry.status === "rejected");
        if (failure) {
            throw failure.reason;
        }
        return results;
    }

    /** Adds a decode/prepare promise to the shared preload barrier. */
    public static track<T>(promise: Promise<T>, refOrLabel: string = "tracked resource"): Promise<T> {
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
    public static getPendingCount(): number {
        let pendingFetches = 0;
        for (const record of ResourceLoader.records.values()) {
            if (record.promise !== undefined && record.data === undefined && record.error === undefined) {
                pendingFetches++;
            }
        }
        return pendingFetches + ResourceLoader.trackedPromises.size;
    }

    public static hasPending(): boolean {
        return ResourceLoader.getPendingCount() > 0;
    }

    public static resourceFailed(ref: string): boolean {
        return ResourceLoader.records.get(ref)?.error !== undefined;
    }

    public static getResourceError(ref: string): unknown {
        return ResourceLoader.records.get(ref)?.error;
    }

    public static getTrackedErrors(): TrackedResourceError[] {
        return ResourceLoader.trackedErrors.slice();
    }

    public static hasFailed(): boolean {
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
    public static async waitForAll(): Promise<void> {
        while (ResourceLoader.hasPending()) {
            const promises: Promise<unknown>[] = [];
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
    public static clearCache(): void {
        ResourceLoader.records.clear();
        ResourceLoader.trackedPromises.clear();
        ResourceLoader.trackedErrors = [];
        ResourceLoader.trackingGeneration++;
    }

    /** Clears retained failures without removing successfully preloaded bytes. */
    public static clearFailures(): void {
        for (const [ref, record] of ResourceLoader.records.entries()) {
            if (record.error !== undefined) {
                ResourceLoader.records.delete(ref);
            }
        }
        ResourceLoader.trackedPromises.clear();
        ResourceLoader.trackedErrors = [];
        ResourceLoader.trackingGeneration++;
    }

    private static normalizePreloadOptions(value?: ((progress: ResourcePreloadProgress) => void) | ResourcePreloadOptions): ResourcePreloadOptions {
        return typeof value === "function" ? { onProgress: value } : (value ?? {});
    }

    private static toTrackedFailureException(): SlickException {
        const first = ResourceLoader.trackedErrors[0];
        return first.error instanceof SlickException ? first.error : new SlickException(`Failed tracked resource: ${first.label}`, first.error);
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
        const baseHref = globalThis.location?.href ?? "https://example.invalid/";
        if (location.length === 0) {
            return new URL(ref, baseHref);
        }
        const normalizedLocation = location.endsWith("/") ? location : `${location}/`;
        const normalizedRef = ref.replace(/^\/+/, "");
        return new URL(normalizedRef, new URL(normalizedLocation, baseHref));
    }

    private static async fetchFromCandidates(urls: URL[], ref: string, signal?: AbortSignal): Promise<Response> {
        let failure: unknown = null;
        for (const url of urls) {
            try {
                return await ResourceLoader.fetchWithRetry(url, ref, signal);
            } catch (error) {
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

    private static async fetchWithRetry(url: URL, ref: string, signal?: AbortSignal): Promise<Response> {
        let failure: ResourceLoadException | null = null;
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
            } catch (cause) {
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
        throw (
            failure ??
            new ResourceLoadException(`Failed to load resource ${ref}`, {
                ref,
                url: url.href,
                kind: "network",
                phase: "fetch"
            })
        );
    }

    private static isRetryable(error: ResourceLoadException): boolean {
        if (error.kind === "network") {
            return true;
        }
        if (error.kind !== "http" || error.status === null) {
            return false;
        }
        return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500;
    }

    private static async waitBeforeRetry(signal: AbortSignal | undefined, ref: string, url: string): Promise<void> {
        if (ResourceLoader.retryDelay <= 0) {
            return;
        }
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                signal?.removeEventListener("abort", abort);
                resolve();
            }, ResourceLoader.retryDelay);
            const abort = (): void => {
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

    private static async waitForPromise(promise: Promise<ArrayBuffer>, signal: AbortSignal | undefined, ref: string): Promise<ArrayBuffer> {
        if (!signal) {
            return promise;
        }
        ResourceLoader.throwIfAborted(signal, ref, null, "fetch");
        return new Promise<ArrayBuffer>((resolve, reject) => {
            const abort = (): void => {
                signal.removeEventListener("abort", abort);
                reject(ResourceLoader.abortException(ref, null, "fetch", signal.reason));
            };
            signal.addEventListener("abort", abort, { once: true });
            void promise.then(
                (value) => {
                    signal.removeEventListener("abort", abort);
                    resolve(value);
                },
                (error) => {
                    signal.removeEventListener("abort", abort);
                    reject(error);
                }
            );
        });
    }

    private static throwIfAborted(signal: AbortSignal | undefined, ref: string, url: string | null, phase: ResourceLoadPhase): void {
        if (signal?.aborted) {
            throw ResourceLoader.abortException(ref, url, phase, signal.reason);
        }
    }

    private static abortException(ref: string, url: string | null, phase: ResourceLoadPhase, cause?: unknown): ResourceLoadException {
        return new ResourceLoadException(`Resource load aborted: ${ref}`, {
            ref,
            url,
            kind: "abort",
            phase,
            cause
        });
    }

    private static isAbortError(error: unknown): boolean {
        return (
            (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
            (typeof error === "object" && error !== null && "name" in error && (error as { name?: unknown }).name === "AbortError")
        );
    }
}
