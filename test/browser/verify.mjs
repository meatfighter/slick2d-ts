import { Color, Image, Input, Renderer } from "../../dist/index.js";
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

    input.unbind();
    loaded.destroy();
    dynamic.destroy();
    renderer.dispose();
}

try {
    await run();
    result.dataset.status = "passed";
    result.textContent = `PASS: ${passed.join("; ")}`;
} catch (error) {
    result.dataset.status = "failed";
    result.textContent = `FAIL: ${error instanceof Error ? error.message : String(error)}`;
}
