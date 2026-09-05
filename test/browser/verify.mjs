import { AppGameContainer, Color, Display, Image, Input, Music, Renderer, ResourceLoader, SoundStore, XMLPackedSheet } from "../../dist/index.js";
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

        first.destroy();
        first = null;

        second = new AppGameContainer(noopGame("browser restart B"), 4, 4, false);
        await second.start();
        const secondPixel = await drawPathTextureAndReadPixel(ref);
        assert(closeTo(secondPixel[1], 255) && secondPixel[0] < 3 && secondPixel[2] < 3, "Second container did not render the reused path texture");
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

    input.unbind();
    loaded.destroy();
    dynamic.destroy();
    renderer.dispose();

    await verifyContainerRestartPathTexture();
    passed.push("container restart texture cache boundary");

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
