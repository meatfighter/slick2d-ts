import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Color, Graphics, Image as SlickImage, Renderer, ResourceLoader } from "../dist/index.js";

class Pixel2DContext {
    drawImage() {}

    getImageData() {
        return { data: new Uint8ClampedArray([1, 0, 254, 255]) };
    }

    putImageData() {}
}

class PixelCanvas {
    constructor() {
        this.height = 1;
        this.width = 1;
    }

    getContext(type) {
        return type === "2d" ? new Pixel2DContext() : null;
    }
}

class PixelReadbackGL {
    constructor() {
        this.FRAMEBUFFER = 0x8d40;
        this.RGBA = 0x1908;
        this.SCISSOR_TEST = 0x0c11;
        this.UNSIGNED_BYTE = 0x1401;
        this.lastRead = null;
    }

    bindFramebuffer() {}

    disable() {}

    readPixels(x, y, width, height, format, type, target) {
        this.lastRead = [x, y, width, height, format, type];
        for (let offset = 0; offset < target.byteLength; offset += 4) {
            target.set([1, 0, 254, 255], offset);
        }
    }

    viewport() {}
}

afterEach(() => {
    ResourceLoader.clearCache();
    Graphics.setCurrent(null);
    Renderer.setRenderer(Renderer.IMMEDIATE_RENDERER);
    delete globalThis.createImageBitmap;
    delete globalThis.document;
});

test("explicit Color int and float constructors preserve Java overload intent", () => {
    const byteColor = Color.fromInts(1, 0, 254, 255);

    assert.equal(byteColor.r, 1 / 255);
    assert.equal(byteColor.g, 0);
    assert.equal(byteColor.b, 254 / 255);
    assert.equal(byteColor.a, 1);
    assert.equal(byteColor.getRed(), 1);
    assert.equal(byteColor.getBlue(), 254);
    assert.equal(byteColor.toInt(), 0xff0100fe);

    const floatColor = Color.fromFloats(1, 0, 0, 1);

    assert.equal(floatColor.r, 1);
    assert.equal(floatColor.g, 0);
    assert.equal(floatColor.b, 0);
    assert.equal(floatColor.a, 1);
    assert.equal(floatColor.toInt(), 0xffff0000);
});

test("fade table uses Java integer division before Color.fromInts", () => {
    const alphas = Array.from({ length: 23 }, (_value, index) => {
        const alpha = Math.trunc((255 * index) / (23 - 1));
        return Color.fromInts(0, 0, 0, alpha).getAlpha();
    });

    assert.deepEqual(alphas, [0, 11, 23, 34, 46, 57, 69, 81, 92, 104, 115, 127, 139, 150, 162, 173, 185, 197, 208, 220, 231, 243, 255]);
});

test("Image.getColor reads 0-255 texture bytes through the explicit int path", async () => {
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: {
            createElement: () => new PixelCanvas()
        },
        writable: true
    });
    globalThis.createImageBitmap = async () => ({ width: 1, height: 1 });
    ResourceLoader.registerResource("images/pixel.png", new Uint8Array([1, 2, 3, 4]));

    const image = new SlickImage("images/pixel.png");

    await ResourceLoader.waitForAll();

    const color = image.getColor(0, 0);

    assert.equal(color.getRed(), 1);
    assert.equal(color.getGreen(), 0);
    assert.equal(color.getBlue(), 254);
    assert.equal(color.getAlpha(), 255);
});

test("Graphics.getPixel reads framebuffer bytes through the explicit int path", () => {
    const gl = new PixelReadbackGL();
    const renderer = Renderer.getBackend();
    renderer.gl = gl;
    renderer.initDisplay(10, 10);

    const color = new Graphics(10, 10).getPixel(3, 4);

    assert.deepEqual(gl.lastRead, [3, 5, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE]);
    assert.equal(color.getRed(), 1);
    assert.equal(color.getGreen(), 0);
    assert.equal(color.getBlue(), 254);
    assert.equal(color.getAlpha(), 255);
});

test("Graphics.getPixel reads high-DPI framebuffer bytes from the logical pixel area", () => {
    const gl = new PixelReadbackGL();
    const renderer = Renderer.getBackend();
    renderer.gl = gl;
    renderer.initDisplay(10, 10, 20, 20);

    const color = new Graphics(10, 10).getPixel(3, 4);

    assert.deepEqual(gl.lastRead, [6, 10, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE]);
    assert.equal(color.getRed(), 1);
    assert.equal(color.getGreen(), 0);
    assert.equal(color.getBlue(), 254);
    assert.equal(color.getAlpha(), 255);
});
