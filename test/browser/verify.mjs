import {
    AppGameContainer,
    BufferedScalableGame,
    Color,
    Display,
    Graphics,
    Image,
    Input,
    Music,
    Renderer,
    ResourceLoader,
    SoundStore,
    SpriteSheet,
    XMLPackedSheet
} from "../../dist/index.js";
import { WebGLTextureResource } from "../../dist/slick/rendering/WebGLTextureResource.js";

const result = document.querySelector("#result");
const canvas = document.querySelector("#game");
const passed = [];

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function closeTo(actual, expected, tolerance = 2) {
    return Math.abs(actual - expected) <= tolerance;
}

function keyListener(events) {
    return {
        inputEnded: () => events.push("ended"),
        inputStarted: () => events.push("started"),
        isAcceptingInput: () => true,
        keyPressed: (key, character) => events.push(["pressed", key, character]),
        keyReleased: (key, character) => events.push(["released", key, character]),
        setInput: () => undefined
    };
}

function noopGame(title) {
    return {
        closeRequested: () => true,
        getTitle: () => title,
        init: () => undefined,
        render: () => undefined,
        update: () => undefined
    };
}

const audioLifecycleRef = "audio/browser-lifecycle.wav";
let audioLifecycleReady = null;

function silentWavBytes() {
    const sampleRate = 8000;
    const sampleCount = 80;
    const bytes = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(bytes);
    const writeAscii = (offset, value) => {
        for (let index = 0; index < value.length; index++) {
            view.setUint8(offset + index, value.charCodeAt(index));
        }
    };
    writeAscii(0, "RIFF");
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeAscii(8, "WAVE");
    writeAscii(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeAscii(36, "data");
    view.setUint32(40, sampleCount * 2, true);
    return bytes;
}

async function prepareAudioLifecycle() {
    if (audioLifecycleReady === null) {
        ResourceLoader.registerResource(audioLifecycleRef, silentWavBytes());
        const store = SoundStore.get();
        store.init();
        audioLifecycleReady = store.preloadAudioBuffer(audioLifecycleRef);
    }
    await audioLifecycleReady;
}

async function runMusicLifecycleCycle() {
    await prepareAudioLifecycle();
    const music = new Music(audioLifecycleRef);
    await music.ready();
    music.loop();
    await new Promise((resolve) => setTimeout(resolve, 0));
    music.stop();
    await new Promise((resolve) => setTimeout(resolve, 10));
}

async function runSoundLifecycleCycle() {
    await prepareAudioLifecycle();
    const handle = SoundStore.get().playSound(audioLifecycleRef, 1, 1, true);
    assert(handle !== null, "SoundStore did not create an audio lifecycle test handle");
    await new Promise((resolve) => setTimeout(resolve, 0));
    handle.stop();
    await new Promise((resolve) => setTimeout(resolve, 10));
}

function cleanupAudioLifecycle() {
    SoundStore.get().destroy();
    ResourceLoader.clearCache();
    audioLifecycleReady = null;
}

globalThis.__slickAudioLifecycle = {
    runMusicCycle: runMusicLifecycleCycle,
    runSoundCycle: runSoundLifecycleCycle,
    cleanup: cleanupAudioLifecycle
};

async function pngBytes(red, green, blue) {
    return canvasPngBytes(4, 4, (sourceContext) => {
        sourceContext.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        sourceContext.fillRect(0, 0, 4, 4);
    });
}

async function canvasPngBytes(width, height, draw) {
    const source = document.createElement("canvas");
    source.width = width;
    source.height = height;
    const sourceContext = source.getContext("2d");
    draw(sourceContext);
    const blob = await new Promise((resolve) => source.toBlob(resolve, "image/png"));
    assert(blob, "Test browser could not encode a PNG fixture");
    return blob.arrayBuffer();
}

async function drawPathTextureAndReadPixel(ref) {
    const image = new Image(ref, false, Image.FILTER_NEAREST);
    await ResourceLoader.waitForAll();
    const renderer = Renderer.getBackend();
    renderer.beginFrame(4, 4, Color.transparent, 4, 4);
    image.draw(0, 0, 4, 4);
    renderer.endFrame();
    const pixel = new Uint8Array(4);
    renderer.readPixels(1, 1, 1, 1, pixel);
    return pixel;
}

async function verifyContainerRestartPathTexture() {
    const ref = "images/browser-container-restart.png";
    ResourceLoader.registerResource(ref, await pngBytes(0, 255, 0));
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    let first = null;
    let second = null;
    try {
        Display.setParent(parent);
        first = new AppGameContainer(noopGame("browser restart A"), 4, 4, false);
        await first.start();
        const firstPixel = await drawPathTextureAndReadPixel(ref);
        assert(closeTo(firstPixel[1], 255) && firstPixel[0] < 3 && firstPixel[2] < 3, "First container did not render the path texture");

        Renderer.get().setGlobalAlphaScale(0.25);
        Renderer.get().glColor4f(0.25, 0.5, 0.75, 0.5);
        const interruptedBacking = new Image(2, 2);
        const interruptedSheet = new SpriteSheet(interruptedBacking, 1, 1);
        interruptedSheet.startUse();

        first.destroy();
        first = null;

        second = new AppGameContainer(noopGame("browser restart B"), 4, 4, false);
        await second.start();
        const currentColor = Renderer.get().getCurrentColor();
        assert(
            currentColor.length >= 4 && currentColor[0] === 1 && currentColor[1] === 1 && currentColor[2] === 1 && currentColor[3] === 1,
            "Renderer current color leaked across container recreation"
        );

        const secondBacking = new Image(2, 2);
        const secondSheet = new SpriteSheet(secondBacking, 1, 1);
        secondSheet.startUse();
        secondSheet.endUse();
        secondSheet.destroy();

        const secondPixel = await drawPathTextureAndReadPixel(ref);
        assert(
            closeTo(secondPixel[1], 255) && secondPixel[0] < 3 && secondPixel[2] < 3 && closeTo(secondPixel[3], 255),
            "Second container inherited renderer alpha state or failed to render the reused path texture"
        );
    } finally {
        first?.destroy();
        second?.destroy();
        Display.setParent(null);
        parent.remove();
        ResourceLoader.clearCache();
    }
}

async function verifyXmlPackedSheetAsyncSubImages() {
    const imageRef = "images/browser-packed-sheet.png";
    const xmlRef = "images/browser-packed-sheet.xml";
    ResourceLoader.registerResource(
        imageRef,
        await canvasPngBytes(4, 2, (context) => {
            context.fillStyle = "rgb(255, 0, 0)";
            context.fillRect(0, 0, 2, 2);
            context.fillStyle = "rgb(0, 255, 0)";
            context.fillRect(2, 0, 2, 2);
        })
    );
    ResourceLoader.registerResource(xmlRef, new TextEncoder().encode('<sprites><sprite name="right" x="2" y="0" width="2" height="2" /></sprites>'));

    const sheet = new XMLPackedSheet(imageRef, xmlRef);
    const sprite = sheet.getSprite("right");
    assert(sprite !== null, "XMLPackedSheet did not create the sprite");
    await ResourceLoader.waitForAll();

    assert(sprite.getWidth() === 2 && sprite.getHeight() === 2, "Packed-sheet sprite dimensions changed after image decode");
    assert(closeTo(sprite.getTextureOffsetX(), 0.5, 0.00001), "Packed-sheet sprite lost its atlas X offset");
    assert(closeTo(sprite.getTextureOffsetY(), 0, 0.00001), "Packed-sheet sprite lost its atlas Y offset");
    assert(closeTo(sprite.getTextureWidth(), 0.5, 0.00001), "Packed-sheet sprite lost its atlas source width");
    assert(closeTo(sprite.getTextureHeight(), 1, 0.00001), "Packed-sheet sprite lost its atlas source height");

    const renderer = Renderer.getBackend();
    renderer.beginFrame(2, 2, Color.transparent, 2, 2);
    sprite.draw(0, 0, 2, 2);
    renderer.endFrame();
    const pixel = new Uint8Array(4);
    renderer.readPixels(0, 1, 1, 1, pixel);
    assert(closeTo(pixel[1], 255) && pixel[0] < 3 && pixel[2] < 3, "Packed-sheet sprite rendered the wrong atlas region");

    sprite.destroy();
    ResourceLoader.clearCache();
}

async function waitForBrowserCondition(predicate, message, timeoutMilliseconds = 5000) {
    const deadline = performance.now() + timeoutMilliseconds;
    while (performance.now() < deadline) {
        if (predicate()) {
            return;
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    throw new Error(message);
}

async function verifyLiveImageFilterUpdates() {
    const source = document.createElement("canvas");
    source.width = 2;
    source.height = 2;
    const context = source.getContext("2d");
    context.fillStyle = "rgb(255, 255, 255)";
    context.fillRect(0, 0, 2, 2);
    const image = new Image(new WebGLTextureResource(source, Image.FILTER_NEAREST, "browser-live-filter"));
    const renderer = Renderer.getBackend();
    const gl = renderer.getContext();
    assert(gl, "Live filter test did not have a WebGL context");

    renderer.beginFrame(4, 4, Color.transparent, 4, 4);
    image.draw(0, 0, 4, 4);
    renderer.endFrame();

    image.setFilter(Image.FILTER_LINEAR);
    image.bind();
    assert(gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER) === gl.LINEAR, "Image.setFilter(LINEAR) did not update an existing GPU texture");
    assert(gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER) === gl.LINEAR, "Image.setFilter(LINEAR) did not update GPU magnification filtering");

    image.setFilter(Image.FILTER_NEAREST);
    image.bind();
    assert(gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER) === gl.NEAREST, "Image.setFilter(NEAREST) did not update an existing GPU texture");
    assert(gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER) === gl.NEAREST, "Image.setFilter(NEAREST) did not update GPU magnification filtering");
    image.destroy();
}

async function verifyTrueGraphicsClear() {
    const target = new Image(8, 8, Image.FILTER_NEAREST);
    const graphics = target.getGraphics();
    graphics.setColor(Color.fromInts(0, 0, 255));
    graphics.fillRect(0, 0, 8, 8);
    graphics.flush();

    graphics.setBackground(Color.fromInts(255, 0, 0));
    graphics.setClip(0, 0, 2, 2);
    graphics.setWorldClip(0, 0, 2, 2);
    graphics.translate(100, 100);
    Renderer.get().setGlobalAlphaScale(0.25);
    graphics.setColorInverted(true);
    graphics.setDrawMode(Graphics.MODE_ALPHA_MAP);
    Renderer.get().glColorMask(false, false, false, false);
    graphics.clear();

    const pixel = target.getColor(6, 6);
    assert(
        closeTo(pixel.getRed(), 255) && pixel.getGreen() < 3 && pixel.getBlue() < 3 && closeTo(pixel.getAlpha(), 255),
        "Graphics.clear() was affected by transform, clip, draw mode, alpha, color mask, or color effects"
    );
    const screenClip = graphics.getClip();
    const worldClip = graphics.getWorldClip();
    assert(screenClip?.width === 2 && screenClip?.height === 2, "Graphics.clear() did not restore the screen clip");
    assert(worldClip?.width === 2 && worldClip?.height === 2, "Graphics.clear() did not restore the world clip");

    Renderer.get().glColorMask(true, true, true, true);
    graphics.setDrawMode(Graphics.MODE_NORMAL);
    graphics.setColorInverted(false);
    Renderer.get().setGlobalAlphaScale(1);
    graphics.clearClip();
    graphics.clearWorldClip();
    graphics.resetTransform();
    target.destroy();
}

async function verifyBufferedFrameStateReset() {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const state = { error: null, renders: 0, verified: false };
    let defaultFont = null;
    const customFont = {
        drawString: () => undefined,
        getHeight: () => 1,
        getLineHeight: () => 1,
        getWidth: () => 1
    };
    const held = {
        closeRequested: () => true,
        getTitle: () => "frame reset",
        init: () => undefined,
        render: (_container, graphics) => {
            if (state.renders === 0) {
                defaultFont = graphics.getFont();
                graphics.setFont(customFont);
                graphics.setLineWidth(5);
                graphics.setAntiAlias(true);
                graphics.translate(7, 9);
            } else if (!state.verified) {
                assert(graphics.getFont() === defaultFont, "Buffered game font leaked across frames");
                assert(graphics.getLineWidth() === 1, "Buffered game line width leaked across frames");
                assert(graphics.isAntiAlias() === false, "Buffered game anti-alias flag leaked across frames");
                const matrix = Renderer.getBackend().getCurrentMatrix();
                assert(
                    closeTo(matrix[0], 1, 0.00001) &&
                        closeTo(matrix[1], 0, 0.00001) &&
                        closeTo(matrix[2], 0, 0.00001) &&
                        closeTo(matrix[3], 0, 0.00001) &&
                        closeTo(matrix[4], 1, 0.00001) &&
                        closeTo(matrix[5], 0, 0.00001),
                    "Buffered game transform leaked across frames"
                );
                state.verified = true;
            }
            state.renders++;
        },
        update: () => undefined
    };
    let app = null;
    try {
        Display.setParent(parent);
        app = new AppGameContainer(new BufferedScalableGame(held, 16, 16, { maintainAspect: true }), 32, 32, false);
        app.setShowFPS(false);
        app.setAlwaysRender(true);
        app.setErrorHandler((error) => {
            state.error = error;
        });
        await app.start();
        await waitForBrowserCondition(() => state.verified || state.error !== null, "Buffered per-frame state reset did not complete");
        if (state.error) {
            throw state.error;
        }
    } finally {
        app?.destroy();
        Display.setParent(null);
        parent.remove();
    }
}

async function verifyDefaultFontLifecycleAndContextRestore() {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const createGame = (title, state) => ({
        closeRequested: () => true,
        getTitle: () => title,
        init: () => undefined,
        render: (_container, graphics) => {
            graphics.setColor(Color.white);
            graphics.drawString("Slick font cache", 1, 1);
            state.renders++;

            if (state.capturePostRestore && !state.capturedBrightPixel) {
                graphics.flush();
                const pixels = new Uint8Array(64 * 32 * 4);
                Renderer.getBackend().readPixels(0, 0, 64, 32, pixels);
                for (let index = 0; index < pixels.length; index += 4) {
                    if (pixels[index] > 180 && pixels[index + 1] > 180 && pixels[index + 2] > 180) {
                        state.capturedBrightPixel = true;
                        break;
                    }
                }
            }
        },
        update: () => undefined
    });
    let first = null;
    let second = null;
    try {
        Display.setParent(parent);
        const firstState = { capturePostRestore: false, capturedBrightPixel: false, renders: 0 };
        first = new AppGameContainer(createGame("font lifecycle A", firstState), 64, 32, false);
        first.setShowFPS(false);
        first.setAlwaysRender(true);
        await first.start();
        await waitForBrowserCondition(() => firstState.renders > 0, "First default-font container did not render");
        const firstFont = first.getGraphics().getFont();
        first.destroy();
        first = null;

        const secondState = {
            capturePostRestore: false,
            capturedBrightPixel: false,
            error: null,
            renders: 0
        };
        second = new AppGameContainer(createGame("font lifecycle B", secondState), 64, 32, false);
        second.setShowFPS(false);
        second.setAlwaysRender(true);
        second.setErrorHandler((error) => {
            secondState.error = error;
        });
        await second.start();
        await waitForBrowserCondition(() => secondState.renders > 0 || secondState.error !== null, "Second default-font container did not render");
        if (secondState.error) {
            throw secondState.error;
        }
        assert(second.getGraphics().getFont() !== firstFont, "Default CanvasFont cache survived container destruction");

        const renderer = Renderer.getBackend();
        const gl = renderer.getContext();
        const loseContext = gl?.getExtension("WEBGL_lose_context");
        assert(gl && loseContext, "WEBGL_lose_context is unavailable for default-font lifecycle verification");
        loseContext.loseContext();
        await waitForBrowserCondition(() => Renderer.getBackend().getContext() === null, "AppGameContainer did not observe WebGL context loss");
        secondState.capturePostRestore = true;
        loseContext.restoreContext();
        await waitForBrowserCondition(() => Renderer.getBackend().getContext() !== null, "AppGameContainer did not restore the WebGL context");
        await waitForBrowserCondition(
            () => secondState.capturedBrightPixel || secondState.error !== null,
            "Default-font rendering did not produce pixels after context restoration"
        );
        if (secondState.error) {
            throw secondState.error;
        }
        assert(secondState.capturedBrightPixel, "Default CanvasFont did not render after context restoration");
    } finally {
        first?.destroy();
        second?.destroy();
        Display.setParent(null);
        parent.remove();
    }
}

async function run() {
    const renderer = Renderer.getBackend();
    renderer.initialize(
        canvas,
        {
            alpha: true,
            antialias: false,
            stencil: false
        },
        64,
        64,
        64,
        64
    );
    assert(renderer.getContext() instanceof WebGL2RenderingContext, "WebGL2 context was not created");
    passed.push("WebGL2 initialization");

    const dynamic = new Image(8, 8);
    const firstGraphics = dynamic.getGraphics();
    const secondGraphics = dynamic.getGraphics();
    assert(firstGraphics === secondGraphics, "Image.getGraphics() did not return its cached Graphics");
    firstGraphics.setColor(Color.fromInts(255, 0, 0));
    firstGraphics.fillRect(0, 0, 8, 8);
    firstGraphics.flush();
    const dynamicPixel = dynamic.getColor(4, 4);
    assert(closeTo(dynamicPixel.getRed(), 255) && dynamicPixel.getGreen() < 3, "Dynamic image readback was not red");
    passed.push("framebuffer draw and readback");

    const source = document.createElement("canvas");
    source.width = 4;
    source.height = 4;
    const sourceContext = source.getContext("2d");
    sourceContext.fillStyle = "rgb(0, 0, 255)";
    sourceContext.fillRect(0, 0, 4, 4);
    const loaded = new Image(new WebGLTextureResource(source, Image.FILTER_NEAREST, "browser-source"));
    const loadedGraphics = loaded.getGraphics();
    assert(loadedGraphics === loaded.getGraphics(), "Loaded texture Graphics was not cached");
    const loadedPixel = loaded.getColor(2, 2);
    assert(closeTo(loadedPixel.getBlue(), 255) && loadedPixel.getRed() < 3, "GraphicsFactory blanked an existing loaded texture");
    loadedGraphics.setColor(Color.fromInts(0, 255, 0));
    loadedGraphics.fillRect(0, 0, 4, 4);
    loadedGraphics.flush();
    const modifiedPixel = loaded.getColor(2, 2);
    assert(closeTo(modifiedPixel.getGreen(), 255) && modifiedPixel.getBlue() < 3, "Loaded texture modifications were not readable");
    passed.push("loaded-texture GraphicsFactory preservation");

    const input = new Input(64);
    const inputEvents = [];
    input.bindToElement(canvas);
    input.setPreventDefaultElement(canvas);
    input.addKeyListener(keyListener(inputEvents));
    canvas.focus();
    canvas.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, code: "KeyA", key: "a" }));
    assert(input.isKeyDown(Input.KEY_A), "Raw held-key state was not updated synchronously");
    assert(inputEvents.length === 0, "Slick key callback escaped the poll boundary");
    input.poll(64, 64);
    assert(inputEvents[0] === "started", `inputStarted() was not the first poll callback: ${JSON.stringify(inputEvents)}`);
    assert(Array.isArray(inputEvents[1]) && inputEvents[1][0] === "pressed", "Queued key press was not dispatched");
    assert(inputEvents.at(-1) === "ended", "inputEnded() was not the final poll callback");
    passed.push("poll-time browser input dispatch");

    await verifyXmlPackedSheetAsyncSubImages();
    passed.push("XML packed-sheet async subimages");

    await verifyLiveImageFilterUpdates();
    passed.push("live Image filter updates");

    await verifyTrueGraphicsClear();
    passed.push("true Graphics clear semantics");

    input.unbind();
    loaded.destroy();
    dynamic.destroy();
    renderer.dispose();

    await verifyContainerRestartPathTexture();
    passed.push("container restart texture cache boundary");

    await verifyBufferedFrameStateReset();
    passed.push("buffered per-frame Graphics reset");

    await verifyDefaultFontLifecycleAndContextRestore();
    passed.push("default-font container/context lifecycle");

    await prepareAudioLifecycle();
    passed.push("audio lifecycle fixture");
}

try {
    await run();
    result.dataset.status = "passed";
    result.textContent = `PASS: ${passed.join("; ")}`;
} catch (error) {
    result.dataset.status = "failed";
    result.textContent = `FAIL: ${error instanceof Error ? error.message : String(error)}`;
}
