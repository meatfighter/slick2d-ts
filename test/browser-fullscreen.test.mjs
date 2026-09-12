import assert from "node:assert/strict";
import test from "node:test";

import {
    exitBrowserFullscreen,
    getBrowserFullscreenCapability,
    getBrowserFullscreenElement,
    isBrowserFullscreenElement,
    requestBrowserFullscreen
} from "../dist/slick/util/BrowserFullscreen.js";

const standardRequestRoot = () => ({
    requestFullscreen() {}
});

const webkitRequestRoot = () => ({
    webkitRequestFullscreen() {}
});

test("fullscreen capability distinguishes explicit available, explicit unavailable, and mixed reports", () => {
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: true, documentElement: standardRequestRoot() }), "available");
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: false, documentElement: standardRequestRoot() }), "unavailable");
    assert.equal(getBrowserFullscreenCapability({ webkitFullscreenEnabled: true, documentElement: webkitRequestRoot() }), "available");
    assert.equal(getBrowserFullscreenCapability({ webkitFullscreenEnabled: false, documentElement: webkitRequestRoot() }), "unavailable");
    assert.equal(
        getBrowserFullscreenCapability({
            fullscreenEnabled: false,
            webkitFullscreenEnabled: true,
            documentElement: standardRequestRoot()
        }),
        "available"
    );
});

test("missing request methods are unavailable while method-only capability remains unknown", () => {
    assert.equal(getBrowserFullscreenCapability({}), "unavailable");
    assert.equal(getBrowserFullscreenCapability({ documentElement: {} }), "unavailable");
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: true, documentElement: {} }), "unavailable");
    assert.equal(getBrowserFullscreenCapability({ webkitFullscreenEnabled: true, documentElement: {} }), "unavailable");
    assert.equal(getBrowserFullscreenCapability({ documentElement: standardRequestRoot() }), "unknown");
    assert.equal(getBrowserFullscreenCapability({ documentElement: webkitRequestRoot() }), "unknown");
});

test("unreadable capability and request getters degrade safely", () => {
    const brokenStandard = { documentElement: standardRequestRoot() };
    Object.defineProperty(brokenStandard, "fullscreenEnabled", {
        get() {
            throw new Error("broken standard capability getter");
        }
    });
    assert.equal(getBrowserFullscreenCapability(brokenStandard), "unknown");

    const usablePrefixed = { webkitFullscreenEnabled: true, documentElement: webkitRequestRoot() };
    Object.defineProperty(usablePrefixed, "fullscreenEnabled", {
        get() {
            throw new Error("broken standard capability getter");
        }
    });
    assert.equal(getBrowserFullscreenCapability(usablePrefixed), "available");

    const brokenStandardRequest = {};
    Object.defineProperty(brokenStandardRequest, "requestFullscreen", {
        get() {
            throw new Error("broken standard request getter");
        }
    });
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: true, documentElement: brokenStandardRequest }), "unavailable");

    const prefixedFallback = { webkitRequestFullscreen() {} };
    Object.defineProperty(prefixedFallback, "requestFullscreen", {
        get() {
            throw new Error("broken standard request getter");
        }
    });
    assert.equal(getBrowserFullscreenCapability({ fullscreenEnabled: true, documentElement: prefixedFallback }), "available");

    const brokenDocumentElement = { fullscreenEnabled: true };
    Object.defineProperty(brokenDocumentElement, "documentElement", {
        get() {
            throw new Error("broken documentElement getter");
        }
    });
    assert.equal(getBrowserFullscreenCapability(brokenDocumentElement), "unavailable");
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

test("synchronous request and exit throws become rejected promises", async () => {
    const requestError = new Error("request denied");
    const requestPromise = requestBrowserFullscreen({
        requestFullscreen() {
            throw requestError;
        }
    });
    await assert.rejects(requestPromise, requestError);

    const exitError = new Error("exit denied");
    const exitPromise = exitBrowserFullscreen({
        exitFullscreen() {
            throw exitError;
        }
    });
    await assert.rejects(exitPromise, exitError);
});
