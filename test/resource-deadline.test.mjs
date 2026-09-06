import assert from "node:assert/strict";
import test from "node:test";
import { ResourceLoader } from "../dist/slick/util/ResourceLoader.js";

for (const phase of ["headers", "body"]) {
    test(`resource deadline cancels stalled ${phase} and permits a clean retry`, async () => {
        const originalFetch = globalThis.fetch;
        let aborted = false;
        ResourceLoader.clearCache();
        ResourceLoader.removeAllResourceLocations();
        ResourceLoader.addResourceLocation("https://example.test/");
        ResourceLoader.setRetryOptions(0);
        globalThis.fetch = async (_url, { signal }) => {
            const pending = () =>
                new Promise((_resolve, reject) => {
                    signal.addEventListener(
                        "abort",
                        () => {
                            aborted = true;
                            reject(signal.reason);
                        },
                        { once: true }
                    );
                });
            if (phase === "headers") return pending();
            return { ok: true, status: 200, url: "https://example.test/stalled", arrayBuffer: pending };
        };
        try {
            await assert.rejects(ResourceLoader.loadResource("stalled", { timeoutMs: 10 }), (error) => error.kind === "abort");
            assert.equal(aborted, true);
            globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]));
            ResourceLoader.clearFailures();
            assert.deepEqual(new Uint8Array(await ResourceLoader.loadResource("stalled")), new Uint8Array([1, 2, 3]));
        } finally {
            globalThis.fetch = originalFetch;
            ResourceLoader.clearCache();
        }
    });
}
