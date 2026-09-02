import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { SoundStore } from "../dist/slick/openal/SoundStore.js";
import { ResourceLoader } from "../dist/slick/util/ResourceLoader.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    ResourceLoader.clearCache();
    ResourceLoader.removeAllResourceLocations();
    ResourceLoader.addResourceLocation("");
    ResourceLoader.setCacheBust(null);
    ResourceLoader.setRetryOptions(0, 0);
});

function responseFor(url, byteLength = 4) {
    return {
        ok: true,
        status: 200,
        url: String(url),
        async arrayBuffer() {
            return new Uint8Array(byteLength).buffer;
        }
    };
}

test("per-resource cache versions preserve Java refs while versioning resolved URLs", () => {
    ResourceLoader.removeAllResourceLocations();
    ResourceLoader.addResourceLocation("https://example.test/resources/");
    ResourceLoader.setCacheVersionResolver((ref) => (ref === "images/a.png" ? "content-a" : null));

    assert.equal(ResourceLoader.getResource("images/a.png")?.href, "https://example.test/resources/images/a.png?v=content-a");
    assert.equal(ResourceLoader.getResource("images/b.png")?.href, "https://example.test/resources/images/b.png");

    ResourceLoader.setCacheBust("build-7");
    assert.equal(ResourceLoader.getResource("images/a.png")?.href, "https://example.test/resources/images/a.png?v=build-7");
});

test("resource preload concurrency bounds simultaneous fetches", async () => {
    ResourceLoader.removeAllResourceLocations();
    ResourceLoader.addResourceLocation("https://example.test/resources/");
    let active = 0;
    let peak = 0;
    globalThis.fetch = async (url) => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        return responseFor(url);
    };

    const refs = Array.from({ length: 7 }, (_, index) => `resource-${index}.bin`);
    const result = await ResourceLoader.preloadResources(refs, { concurrency: 2 });
    assert.equal(result.size, refs.length);
    assert.equal(peak, 2);
});

test("resource preload rejects invalid concurrency", async () => {
    await assert.rejects(ResourceLoader.preloadResources(["a.bin"], { concurrency: 0 }), RangeError);
});

test("audio preload concurrency bounds simultaneous decodes", async () => {
    const store = SoundStore.get();
    const originalPreloadAudioBuffer = store.preloadAudioBuffer;
    let active = 0;
    let peak = 0;
    store.preloadAudioBuffer = async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
    };
    try {
        const refs = Array.from({ length: 6 }, (_, index) => `audio-${index}.ogg`);
        await store.preloadAudioBuffers(refs, { concurrency: 3 });
        assert.equal(peak, 3);
    } finally {
        store.preloadAudioBuffer = originalPreloadAudioBuffer;
    }
});
