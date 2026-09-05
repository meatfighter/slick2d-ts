import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = join(repositoryRoot, "dist");
const browserEntry = join(repositoryRoot, "test", "browser", "verify.mjs");
const candidates = [
    process.env.CHROMIUM_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
].filter(Boolean);

const debug = (...values) => {
    if (process.env.BROWSER_TEST_DEBUG === "1") {
        console.error("[browser-test]", ...values);
    }
};

async function findBrowser() {
    for (const candidate of candidates) {
        try {
            await access(candidate);
            return candidate;
        } catch {
            // Continue to the next known browser path.
        }
    }
    throw new Error("Chromium was not found. Set CHROMIUM_PATH to a Chrome or Chromium executable.");
}

async function collectJavaScriptFiles(directory) {
    const files = [];
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectJavaScriptFiles(path)));
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
            files.push(path);
        }
    }
    return files;
}

function moduleId(path) {
    if (path === browserEntry) {
        return "@slick2d-ts/browser-verification";
    }
    const distRelative = relative(distRoot, path).split(sep).join("/");
    if (distRelative.startsWith("../") || distRelative === "..") {
        throw new Error(`Browser module is outside dist: ${path}`);
    }
    return `@slick2d-ts/${distRelative}`;
}

function rewriteModuleSpecifiers(source, sourcePath, knownPaths) {
    const staticOrDynamicImport = /(\b(?:from|import)\s*(?:\(\s*)?)(["'])([^"']+)\2/g;
    return source.replace(staticOrDynamicImport, (match, prefix, quote, specifier) => {
        if (!specifier.startsWith(".")) {
            return match;
        }
        const resolved = resolve(dirname(sourcePath), specifier);
        if (!knownPaths.has(resolved)) {
            throw new Error(`Could not resolve browser module ${specifier} from ${sourcePath}`);
        }
        return `${prefix}${quote}${moduleId(resolved)}${quote}`;
    });
}

async function buildBrowserDocument() {
    const modulePaths = await collectJavaScriptFiles(distRoot);
    modulePaths.push(browserEntry);
    const knownPaths = new Set(modulePaths);
    const imports = {};

    for (const path of modulePaths) {
        let source = await readFile(path, "utf8");
        source = source.replace(/^\/\/# sourceMappingURL=.*$/gm, "");
        source = rewriteModuleSpecifiers(source, path, knownPaths);
        imports[moduleId(path)] = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
    }

    const importMap = JSON.stringify({ imports }).replaceAll("<", "\\u003c");
    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <title>slick2d-ts browser verification</title>
        <script type="importmap">${importMap}</script>
    </head>
    <body>
        <canvas id="game" width="64" height="64" tabindex="0"></canvas>
        <pre id="result" data-status="pending">Browser verification is running.</pre>
        <script type="module">import "@slick2d-ts/browser-verification";</script>
    </body>
</html>`;
}

function withTimeout(promise, milliseconds, message) {
    let timer;
    const timeout = new Promise((_, rejectTimeout) => {
        timer = setTimeout(() => rejectTimeout(new Error(message)), milliseconds);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function waitForDevTools(child, stderrChunks) {
    return withTimeout(
        new Promise((resolveEndpoint, rejectEndpoint) => {
            let buffer = "";
            const cleanup = () => {
                child.stderr.off("data", onData);
                child.off("exit", onExit);
                child.off("error", onError);
            };
            const onData = (chunk) => {
                const text = String(chunk);
                stderrChunks.push(text);
                buffer += text;
                const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(buffer);
                if (match) {
                    cleanup();
                    resolveEndpoint(match[1]);
                }
            };
            const onExit = (code, signal) => {
                cleanup();
                rejectEndpoint(new Error(`Chromium exited before exposing DevTools (code=${code}, signal=${signal}).`));
            };
            const onError = (error) => {
                cleanup();
                rejectEndpoint(error);
            };
            child.stderr.on("data", onData);
            child.once("exit", onExit);
            child.once("error", onError);
        }),
        15_000,
        "Chromium did not expose a DevTools endpoint within 15 seconds."
    );
}

async function findPageEndpoint(debuggingPort) {
    const endpoint = `http://127.0.0.1:${debuggingPort}/json/list`;
    const deadline = Date.now() + 15_000;
    let lastTargets = [];
    while (Date.now() < deadline) {
        try {
            const response = await fetch(endpoint, { signal: AbortSignal.timeout(1_000) });
            if (response.ok) {
                lastTargets = await response.json();
                const page = lastTargets.find((target) => target.type === "page");
                if (page?.webSocketDebuggerUrl) {
                    return page.webSocketDebuggerUrl;
                }
            }
        } catch {
            // DevTools can briefly reject requests while the browser starts.
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
    throw new Error(`The browser page did not expose a DevTools target. Targets: ${JSON.stringify(lastTargets)}`);
}

async function connectCdp(webSocketUrl) {
    debug("connecting CDP", webSocketUrl);
    const socket = new WebSocket(webSocketUrl);
    await withTimeout(
        new Promise((resolveOpen, rejectOpen) => {
            socket.addEventListener("open", resolveOpen, { once: true });
            socket.addEventListener("error", () => rejectOpen(new Error(`Could not connect to ${webSocketUrl}`)), {
                once: true
            });
        }),
        10_000,
        `Timed out connecting to ${webSocketUrl}`
    );

    let nextId = 1;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
        let message;
        try {
            const text = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8");
            message = JSON.parse(text);
        } catch (error) {
            for (const request of pending.values()) {
                request.reject(error);
            }
            pending.clear();
            return;
        }
        if (typeof message.id !== "number") {
            return;
        }
        const request = pending.get(message.id);
        if (!request) {
            return;
        }
        pending.delete(message.id);
        if (message.error) {
            request.reject(new Error(`${request.method}: ${message.error.message}`));
        } else {
            request.resolve(message.result);
        }
    });
    socket.addEventListener("close", () => {
        for (const request of pending.values()) {
            request.reject(new Error(`DevTools connection closed while calling ${request.method}`));
        }
        pending.clear();
    });

    return {
        call(method, params = {}) {
            const id = nextId++;
            return withTimeout(
                new Promise((resolveCall, rejectCall) => {
                    pending.set(id, { method, resolve: resolveCall, reject: rejectCall });
                    socket.send(JSON.stringify({ id, method, params }));
                }),
                10_000,
                `DevTools call ${method} did not complete within 10 seconds.`
            ).finally(() => pending.delete(id));
        },
        close() {
            socket.close();
        }
    };
}

async function waitForBrowserResult(page, html) {
    await page.call("Page.enable");
    await page.call("Runtime.enable");
    await page.call("Emulation.setFocusEmulationEnabled", { enabled: true });
    const frameTree = await page.call("Page.getFrameTree");
    const frameId = frameTree.frameTree?.frame?.id;
    if (!frameId) {
        throw new Error("Chromium did not expose a main frame for browser verification.");
    }
    await page.call("Page.setDocumentContent", { frameId, html });

    const deadline = Date.now() + 30_000;
    let lastResult = null;
    let previousStatus = null;
    while (Date.now() < deadline) {
        const evaluation = await page.call("Runtime.evaluate", {
            expression: `(() => {
                const element = document.querySelector("#result");
                return {
                    readyState: document.readyState,
                    status: element?.dataset.status ?? "missing",
                    text: element?.textContent ?? ""
                };
            })()`,
            returnByValue: true
        });
        if (evaluation.exceptionDetails) {
            throw new Error(`Browser result evaluation failed: ${JSON.stringify(evaluation.exceptionDetails)}`);
        }
        lastResult = evaluation.result?.value ?? null;
        if (lastResult?.status !== previousStatus) {
            debug("browser status", lastResult?.status ?? "unavailable");
            previousStatus = lastResult?.status;
        }
        if (lastResult?.status === "passed") {
            return lastResult.text;
        }
        if (lastResult?.status === "failed") {
            throw new Error(lastResult.text || "Browser verification reported failure.");
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
    throw new Error(`Browser verification did not finish within 30 seconds. Last result: ${JSON.stringify(lastResult)}`);
}

async function collectBrowserListenerCount(page) {
    await page.call("HeapProfiler.collectGarbage");
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 75));
    await page.call("HeapProfiler.collectGarbage");
    const counters = await page.call("Memory.getDOMCounters");
    return counters.jsEventListeners;
}

async function runAudioLifecycleCycles(page, method, cycles) {
    const evaluation = await page.call("Runtime.evaluate", {
        expression: `(async () => {
            const api = globalThis.__slickAudioLifecycle;
            if (!api) throw new Error("Audio lifecycle browser fixture is unavailable");
            for (let index = 0; index < ${cycles}; index++) {
                await api[${JSON.stringify(method)}]();
            }
            return true;
        })()`,
        awaitPromise: true,
        returnByValue: true
    });
    if (evaluation.exceptionDetails) {
        throw new Error(`Audio lifecycle evaluation failed: ${JSON.stringify(evaluation.exceptionDetails)}`);
    }
}

async function verifyAudioLifecycleListenerCleanup(page) {
    for (const [label, method] of [
        ["Music", "runMusicCycle"],
        ["SoundStore", "runSoundCycle"]
    ]) {
        await runAudioLifecycleCycles(page, method, 1);
        const baseline = await collectBrowserListenerCount(page);
        await runAudioLifecycleCycles(page, method, 8);
        const after = await collectBrowserListenerCount(page);
        const growth = after - baseline;
        console.log(`${label} listener lifecycle: ${baseline} -> ${after} (${growth >= 0 ? "+" : ""}${growth})`);
        if (growth > 0) {
            throw new Error(`${label} leaked ${growth} browser event listener(s) across eight explicit stop cycles.`);
        }
    }
    await page.call("Runtime.evaluate", {
        expression: "globalThis.__slickAudioLifecycle?.cleanup(); true;",
        returnByValue: true
    });
}

async function pathExists(path) {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

async function startVirtualDisplay() {
    if (process.platform !== "linux" || process.env.CHROMIUM_HEADLESS === "1") {
        return null;
    }
    const configuredDisplay = process.env.DISPLAY;
    if (configuredDisplay) {
        const localDisplay = /^:(\d+)(?:\.\d+)?$/.exec(configuredDisplay);
        if (!localDisplay || (await pathExists(`/tmp/.X11-unix/X${localDisplay[1]}`))) {
            return null;
        }
        debug("configured DISPLAY is unavailable; starting Xvfb instead", configuredDisplay);
    }
    const xvfbCandidates = [process.env.XVFB_PATH, "/usr/bin/Xvfb", "/usr/local/bin/Xvfb"].filter(Boolean);
    let executable = null;
    for (const candidate of xvfbCandidates) {
        try {
            await access(candidate);
            executable = candidate;
            break;
        } catch {
            // Continue to the next known Xvfb path.
        }
    }
    if (!executable) {
        return null;
    }

    let displayNumber = null;
    for (let candidate = 90; candidate < 140; candidate++) {
        if (!(await pathExists(`/tmp/.X11-unix/X${candidate}`)) && !(await pathExists(`/tmp/.X${candidate}-lock`))) {
            displayNumber = candidate;
            break;
        }
    }
    if (displayNumber === null) {
        throw new Error("No unused Xvfb display number was available for Chromium verification.");
    }

    const display = `:${displayNumber}`;
    debug("starting Xvfb", display);
    const child = spawn(executable, [display, "-screen", "0", "1280x720x24", "-nolisten", "tcp", "-ac"], { stdio: ["ignore", "ignore", "pipe"] });
    const exitPromise = new Promise((resolveExit) => child.once("exit", resolveExit));
    let diagnostics = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
        diagnostics += String(chunk);
    });

    const socketPath = `/tmp/.X11-unix/X${displayNumber}`;
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null || child.signalCode !== null) {
            throw new Error(`Xvfb exited before startup. ${diagnostics}`.trim());
        }
        if (await pathExists(socketPath)) {
            return { child, display, exitPromise };
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
    }
    child.kill("SIGKILL");
    await exitPromise;
    throw new Error(`Xvfb did not become ready within 5 seconds. ${diagnostics}`.trim());
}

async function stopChild(child, exitPromise) {
    if (child.exitCode !== null || child.signalCode !== null) {
        return;
    }
    child.kill("SIGTERM");
    try {
        await withTimeout(exitPromise, 2_000, "Chromium did not exit after SIGTERM.");
    } catch {
        if (child.exitCode === null && child.signalCode === null) {
            child.kill("SIGKILL");
        }
        await withTimeout(exitPromise, 2_000, "Chromium did not exit after SIGKILL.");
    }
}

const browser = await findBrowser();
const browserDocument = await buildBrowserDocument();
const userDataDirectory = await mkdtemp(join(tmpdir(), "slick2d-ts-browser-"));
const virtualDisplay = await startVirtualDisplay();
let child = null;
let childExitPromise = null;
let page = null;
const stderrChunks = [];

try {
    const args = [
        ...(virtualDisplay || process.env.CHROMIUM_HEADLESS === "0" ? [] : ["--headless=new"]),
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu-sandbox",
        "--enable-webgl",
        "--use-gl=angle",
        "--use-angle=swiftshader-webgl",
        "--ignore-gpu-blocklist",
        "--enable-unsafe-swiftshader",
        "--remote-debugging-port=0",
        "--remote-allow-origins=*",
        `--user-data-dir=${userDataDirectory}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--no-proxy-server",
        "about:blank"
    ];
    debug("launching", browser);
    child = spawn(browser, args, {
        env: virtualDisplay ? { ...process.env, DISPLAY: virtualDisplay.display } : process.env,
        stdio: ["ignore", "ignore", "pipe"]
    });
    childExitPromise = new Promise((resolveExit) => child.once("exit", resolveExit));
    child.stderr.setEncoding("utf8");

    const browserWebSocketUrl = await waitForDevTools(child, stderrChunks);
    child.stderr.on("data", (chunk) => stderrChunks.push(String(chunk)));
    const debuggingPort = Number(new URL(browserWebSocketUrl).port);
    const pageWebSocketUrl = await findPageEndpoint(debuggingPort);
    page = await connectCdp(pageWebSocketUrl);
    const output = await waitForBrowserResult(page, browserDocument);
    console.log(output);
    await verifyAudioLifecycleListenerCleanup(page);
} catch (error) {
    const diagnostics = stderrChunks.join("").trim();
    const suffix = diagnostics ? `\n\nChromium diagnostics:\n${diagnostics}` : "";
    throw new Error(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}${suffix}`);
} finally {
    page?.close();
    if (child && childExitPromise) {
        await stopChild(child, childExitPromise);
    }
    if (virtualDisplay) {
        await stopChild(virtualDisplay.child, virtualDisplay.exitPromise);
    }
    await rm(userDataDirectory, { force: true, maxRetries: 20, recursive: true, retryDelay: 100 });
}
