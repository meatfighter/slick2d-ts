import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const legacyPaths = [
    "src/slick/openal/AudioContextLifecycle.ts",
    "src/slick/openal/BrowserAudioLifecycle.ts",
    "dist/slick/openal/AudioContextLifecycle.js",
    "dist/slick/openal/AudioContextLifecycle.d.ts",
    "dist/slick/openal/BrowserAudioLifecycle.js",
    "dist/slick/openal/BrowserAudioLifecycle.d.ts"
];

async function exists(path) {
    try {
        await access(path, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

test("persistent-context lifecycle modules stay removed from source and generated dist", async () => {
    for (const path of legacyPaths) {
        assert.equal(await exists(path), false, `${path} must not be restored`);
    }
});

test("public entry point does not re-export persistent-context recovery APIs", async () => {
    const source = await readFile("src/index.ts", "utf8");
    assert.equal(source.includes("AudioContextLifecycle"), false);
    assert.equal(source.includes("BrowserAudioLifecycle"), false);
});
