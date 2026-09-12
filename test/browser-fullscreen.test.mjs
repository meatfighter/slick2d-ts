import assert from "node:assert/strict";
import test from "node:test";

import {
    exitBrowserFullscreen,
    getBrowserFullscreenCapability,
    getBrowserFullscreenElement,
    isBrowserFullscreenElement,
    requestBrowserFullscreen
} from "../dist/slick/util/BrowserFullscreen.js";

const standardProbe = {
    requestFullscreen() {}
};

const webkitProbe = {
    webkitRequestFullscreen() {}
};

test("fullscreen capability distinguishes available, unavailable, and unknown", () => {
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: true }, standardProbe), "available");
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: false }, standardProbe), "unavailable");
    assert.equal(getBrowserFullscreenCapability({ webkitFullscreenEnabled: true }, webkitProbe), "available");
    assert.equal(getBrowserFullscreenCapability({ webkitFullscreenEnabled: false }, webkitProbe), "unavailable");
    assert.equal(getBrowserFullscreenCapability({}, standardProbe), "unknown");
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: false, webkitFullscreenEnabled: true }, webkitProbe), "available");
});

test("fullscreen capability is unavailable when arbitrary elements expose no request method", () => {
    assert.equal(getBrowserFullscreenCapability({}), "unavailable");
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: true }, {}), "unavailable");
    assert.equal(getBrowserFullscreenCapability({ webkitFullscreenEnabled: true }, {}), "unavailable");
});

test("fullscreen capability probes documentElement by default", () => {
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: true, documentElement: standardProbe }), "available");
    assert.equal(getBrowserFullscreenCapability({ documentElement: webkitProbe }), "unknown");
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

test("requestBrowserFullscreen falls back to WebKit and reports no method", async () => {
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
