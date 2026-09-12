import assert from "node:assert/strict";
import test from "node:test";

import {
    exitBrowserFullscreen,
    getBrowserFullscreenCapability,
    getBrowserFullscreenElement,
    isBrowserFullscreenElement,
    requestBrowserFullscreen
} from "../dist/slick/util/BrowserFullscreen.js";

test("fullscreen capability distinguishes explicit available, explicit unavailable, and unknown", () => {
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: true }), "available");
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: false }), "unavailable");
    assert.equal(getBrowserFullscreenCapability({ webkitFullscreenEnabled: true }), "available");
    assert.equal(getBrowserFullscreenCapability({ webkitFullscreenEnabled: false }), "unavailable");
    assert.equal(getBrowserFullscreenCapability({}), "unknown");
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: false, webkitFullscreenEnabled: true }), "available");
});

test("missing request methods do not convert an unreported capability into unavailable", () => {
    assert.equal(getBrowserFullscreenCapability({}), "unknown");
    assert.equal(getBrowserFullscreenCapability({ documentElement: {} }), "unknown");
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: true, documentElement: {} }), "available");
    assert.equal(getBrowserFullscreenCapability({ webkitFullscreenEnabled: true, documentElement: {} }), "available");
});

test("unreadable capability getters degrade to the remaining report or unknown", () => {
    const brokenStandard = {};
    Object.defineProperty(brokenStandard, "fullscreenEnabled", {
        get() {
            throw new Error("broken standard capability getter");
        }
    });
    assert.equal(getBrowserFullscreenCapability(brokenStandard), "unknown");

    const usablePrefixed = { webkitFullscreenEnabled: true };
    Object.defineProperty(usablePrefixed, "fullscreenEnabled", {
        get() {
            throw new Error("broken standard capability getter");
        }
    });
    assert.equal(getBrowserFullscreenCapability(usablePrefixed), "available");
});

test("fullscreen element lookup supports standard and WebKit surfaces", () => {
    const element = {};
    assert.equal(getBrowserFullscreenElement({ fullscreenElement: element }), element);
    assert.equal(getBrowserFullscreenElement({ fullscreenElement: null, webkitFullscreenElement: element }), element);
    assert.equal(getBrowserFullscreenElement({}), null);
    assert.equal(isBrowserFullscreenElement(element, { fullscreenElement: element }), true);
    assert.equal(isBrowserFullscreenElement(element, { fullscreenElement: null }), false);
});

test("fullscreen element lookup tolerates broken browser getters", () => {
    const element = {};
    const brokenStandard = { webkitFullscreenElement: element };
    Object.defineProperty(brokenStandard, "fullscreenElement", {
        get() {
            throw new Error("broken standard element getter");
        }
    });
    assert.equal(getBrowserFullscreenElement(brokenStandard), element);

    const brokenBoth = {};
    Object.defineProperty(brokenBoth, "fullscreenElement", {
        get() {
            throw new Error("broken standard element getter");
        }
    });
    Object.defineProperty(brokenBoth, "webkitFullscreenElement", {
        get() {
            throw new Error("broken prefixed element getter");
        }
    });
    assert.equal(getBrowserFullscreenElement(brokenBoth), null);
});

test("requestBrowserFullscreen invokes standard request synchronously", async () => {
    const calls = [];
    let resolveRequest;
    const request = new Promise((resolve) => {
        resolveRequest = resolve;
    });
    const element = {
        requestFullscreen() {
            calls.push("request");
            return request;
        }
    };

    const result = requestBrowserFullscreen(element);
    calls.push("after");
    assert.deepEqual(calls, ["request", "after"]);
    resolveRequest();
    assert.equal(await result, true);
});

test("requestBrowserFullscreen falls back to WebKit and reports no method without throwing", async () => {
    let webkitCalls = 0;
    assert.equal(
        await requestBrowserFullscreen({
            webkitRequestFullscreen() {
                webkitCalls++;
            }
        }),
        true
    );
    assert.equal(webkitCalls, 1);
    assert.equal(await requestBrowserFullscreen({}), false);
});

test("requestBrowserFullscreen preserves asynchronous rejection", async () => {
    const expected = new Error("denied asynchronously");
    await assert.rejects(
        requestBrowserFullscreen({
            requestFullscreen() {
                return Promise.reject(expected);
            }
        }),
        expected
    );
});

test("exitBrowserFullscreen supports standard, WebKit, and no-method cases", async () => {
    let standardCalls = 0;
    assert.equal(
        await exitBrowserFullscreen({
            exitFullscreen() {
                standardCalls++;
                return Promise.resolve();
            }
        }),
        true
    );
    assert.equal(standardCalls, 1);

    let webkitCalls = 0;
    assert.equal(
        await exitBrowserFullscreen({
            webkitExitFullscreen() {
                webkitCalls++;
            }
        }),
        true
    );
    assert.equal(webkitCalls, 1);
    assert.equal(await exitBrowserFullscreen({}), false);
});

test("synchronous throws become rejected promises without changing call timing", async () => {
    const expected = new Error("denied");
    const promise = requestBrowserFullscreen({
        requestFullscreen() {
            throw expected;
        }
    });
    await assert.rejects(promise, expected);
});
