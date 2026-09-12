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

test("fullscreen element lookup supports standard and WebKit surfaces", () => {
    const element = {};
    assert.equal(getBrowserFullscreenElement({ fullscreenElement: element }), element);
    assert.equal(getBrowserFullscreenElement({ fullscreenElement: null, webkitFullscreenElement: element }), element);
    assert.equal(getBrowserFullscreenElement({}), null);
    assert.equal(isBrowserFullscreenElement(element, { fullscreenElement: element }), true);
    assert.equal(isBrowserFullscreenElement(element, { fullscreenElement: null }), false);
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
