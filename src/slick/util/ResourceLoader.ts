import { SlickException } from "../SlickException.js";

type ResourceRecord = {
    ref: string;
    data?: ArrayBuffer;
    promise?: Promise<ArrayBuffer>;
    error?: unknown;
};

function trimSlashes(value: string): string {
    return value.replace(/^\/+|\/+$/g, "");
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
     * Clears base URL/path strings and keeps the default relative lookup.
     */
    public static removeAllResourceLocations(): void {
        ResourceLoader.locations = [""];
    }

    /**
     * Java Slick2D counterpart: ResourceLoader.getResource(String).
     *
     * Returns a URL for a resource path if it can be resolved syntactically.
     */
    public static getResource(ref: string): URL | null {
        for (const location of ResourceLoader.locations) {
            try {
                if (location.length === 0) {
                    return new URL(ref, globalThis.location?.href ?? "http://localhost/");
                }
                return new URL(`${trimSlashes(location)}/${ref}`, globalThis.location?.href ?? "http://localhost/");
            } catch {
                continue;
            }
        }
        return null;
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
        if (existing?.promise) {
            return existing.promise;
        }

        const url = ResourceLoader.getResource(ref);
        if (!url || !globalThis.fetch) {
            throw new SlickException(`Unable to resolve resource: ${ref}`);
        }

        const record: ResourceRecord = { ref };
        record.promise = fetch(url)
            .then(async (response) => {
                if (!response.ok) {
                    throw new SlickException(`Failed to load resource ${ref}: HTTP ${response.status}`);
                }
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
}
