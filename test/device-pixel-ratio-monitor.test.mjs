import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, test } from "node:test";
import { DevicePixelRatioMonitor } from "../dist/index.js";

class FakeMediaQueryList {
    constructor(query) {
        this.media = query;
        this.listener = null;
        this.addCalls = 0;
        this.removeCalls = 0;
    }

    addEventListener(type, listener) {
        assert.equal(type, "change");
        this.addCalls++;
        this.listener = listener;
    }

    removeEventListener(type, listener) {
        assert.equal(type, "change");
        this.removeCalls++;
        if (this.listener === listener) {
            this.listener = null;
        }
    }

    fire() {
        this.listener?.({ matches: false, media: this.media });
    }
}

function installWindow(dpr = 1) {
    const queries = [];
    globalThis.window = {
        devicePixelRatio: dpr,
        matchMedia: (query) => {
            const media = new FakeMediaQueryList(query);
            queries.push(media);
            return media;
        }
    };
    return queries;
}

afterEach(() => {
    delete globalThis.window;
});

test("DPR monitor re-registers at the new scale and reports the change", () => {
    const queries = installWindow(1);
    let changes = 0;
    const monitor = new DevicePixelRatioMonitor(() => changes++);

    monitor.start();
    assert.equal(queries.length, 1);
    assert.equal(queries[0].media, "(resolution: 1dppx)");

    globalThis.window.devicePixelRatio = 2;
    queries[0].fire();
    assert.equal(changes, 1);
    assert.equal(queries[0].removeCalls, 1);
    assert.equal(queries.length, 2);
    assert.equal(queries[1].media, "(resolution: 2dppx)");

    monitor.stop();
    assert.equal(queries[1].removeCalls, 1);
});

test("DPR monitor start and stop are idempotent", () => {
    const queries = installWindow(1.25);
    const monitor = new DevicePixelRatioMonitor(() => {});

    monitor.start();
    monitor.start();
    assert.equal(queries.length, 1);

    monitor.stop();
    monitor.stop();
    assert.equal(queries[0].removeCalls, 1);
});

test("AppGameContainer owns DPR monitoring without synthetic window resize", () => {
    const source = readFileSync("src/slick/AppGameContainer.ts", "utf8");
    assert.match(source, /new DevicePixelRatioMonitor\(this\.handleDevicePixelRatioChange\)/);
    assert.match(source, /this\.devicePixelRatioMonitor\.start\(\)/);
    assert.match(source, /this\.devicePixelRatioMonitor\.stop\(\)/);
    assert.match(source, /handleDevicePixelRatioChange[\s\S]*this\.refreshCurrentCanvasBacking\(\)/);
    assert.doesNotMatch(source, /DevicePixelRatioMonitor[\s\S]*dispatchEvent\(new Event\("resize"\)\)/);
});
