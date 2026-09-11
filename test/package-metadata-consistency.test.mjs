import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(path) {
    return JSON.parse(await readFile(path, "utf8"));
}

test("package manifest and lock describe the same package version and dependency set", async () => {
    const manifest = await readJson("package.json");
    const lock = await readJson("package-lock.json");
    const root = lock.packages?.[""];

    assert.equal(lock.name, manifest.name);
    assert.equal(root?.name, manifest.name);
    assert.equal(lock.version, manifest.version, "run npm install --package-lock-only after changing the package version");
    assert.equal(root?.version, manifest.version, "root lock package must match package.json");
    assert.equal(manifest.dependencies?.["package-lock.json"], undefined);
    assert.equal(root?.dependencies?.["package-lock.json"], undefined, "the accidental package-lock.json dependency must be removed by npm");
    assert.equal(lock.packages?.["node_modules/package-lock.json"], undefined, "the accidental package must not remain installed");
});
