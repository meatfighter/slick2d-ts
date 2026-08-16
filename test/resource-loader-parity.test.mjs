import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Image as SlickImage, ResourceLoader } from "../dist/index.js";

function response(bytes, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        arrayBuffer: async () => new Uint8Array(bytes).buffer
    };
}

function installLocation() {
    Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: {
            href: "https://example.test/game/index.html"
        },
        writable: true
    });
}

afterEach(() => {
    ResourceLoader.clearCache();
    ResourceLoader.removeAllResourceLocations();
    ResourceLoader.addResourceLocation("");
    ResourceLoader.setCacheBust(null);
    ResourceLoader.setRetryOptions(0);
    delete globalThis.fetch;
    delete globalThis.createImageBitmap;
    delete globalThis.location;
});

test("preloadResources fetches a manifest with retries and registers original Java refs", async () => {
    installLocation();
    ResourceLoader.clearCache();
    ResourceLoader.removeAllResourceLocations();
    ResourceLoader.addResourceLocation("/assets");
    ResourceLoader.setCacheBust("build-42");
    ResourceLoader.setRetryOptions(1, 0);

    const attempts = new Map();
    const urls = [];
    globalThis.fetch = async (url) => {
        const href = String(url);
        urls.push(href);
        const path = new URL(href).pathname.replace(/^\/assets\//, "");
        const count = (attempts.get(path) ?? 0) + 1;
        attempts.set(path, count);
        if (path === "images/font.xml" && count === 1) {
            throw new Error("transient");
        }
        return response(path === "images/font.xml" ? [1, 2, 3] : [4, 5]);
    };

    const progress = [];
    const loaded = await ResourceLoader.preloadResources(["images/font.xml", "maps/level.dat", "images/font.xml"], (entry) => progress.push(entry));

    assert.equal(loaded.size, 2);
    assert.equal(loaded.get("images/font.xml").byteLength, 3);
    assert.equal(ResourceLoader.getResourceAsStream("images/font.xml").byteLength, 3);
    assert.equal(ResourceLoader.getResourceAsStream("maps/level.dat").byteLength, 2);
    assert.equal(attempts.get("images/font.xml"), 2);
    assert.equal(progress.length, 2);
    assert.deepEqual(
        progress.map((entry) => entry.total),
        [2, 2]
    );
    assert.ok(urls.every((url) => url.includes("v=build-42")));
    assert.ok(urls.every((url) => url.includes("/assets/")));
});

test("preloadResources reports permanent failures with the Java resource path", async () => {
    installLocation();
    ResourceLoader.clearCache();
    ResourceLoader.removeAllResourceLocations();
    ResourceLoader.addResourceLocation("/assets");
    ResourceLoader.setRetryOptions(0);

    globalThis.fetch = async () => response([], 404);

    await assert.rejects(ResourceLoader.preloadResources(["missing/file.dat"]), /Failed to load resource missing\/file\.dat: HTTP 404/);
    assert.equal(ResourceLoader.resourceFailed("missing/file.dat"), true);
});

test("tracked preparation failures remain queryable after the promise settles", async () => {
    const tracked = ResourceLoader.track(Promise.reject(new Error("bad decode")), "images/decode.png");

    await assert.rejects(tracked, /Failed to prepare resource images\/decode\.png/);

    assert.equal(ResourceLoader.hasPending(), false);
    assert.equal(ResourceLoader.hasFailed(), true);
    assert.equal(ResourceLoader.getTrackedErrors().length, 1);
    assert.equal(ResourceLoader.getTrackedErrors()[0].label, "images/decode.png");
    await assert.rejects(ResourceLoader.waitForAll(), /images\/decode\.png/);

    ResourceLoader.clearCache();

    assert.equal(ResourceLoader.hasFailed(), false);
    assert.equal(ResourceLoader.getTrackedErrors().length, 0);
});

test("image decode failures remain visible to the shared loading barrier", async () => {
    ResourceLoader.registerResource("images/bad.png", new Uint8Array([1, 2, 3, 4]));
    globalThis.createImageBitmap = async () => {
        throw new Error("bad image");
    };

    const image = new SlickImage("images/bad.png");

    assert.equal(image.getResourceReference(), "images/bad.png");
    await assert.rejects(ResourceLoader.waitForAll(), /images\/bad\.png/);
    assert.equal(ResourceLoader.hasPending(), false);
    assert.equal(ResourceLoader.hasFailed(), true);
    assert.equal(ResourceLoader.getTrackedErrors()[0].label, "images/bad.png");
    await assert.rejects(ResourceLoader.waitForAll(), /images\/bad\.png/);
});
