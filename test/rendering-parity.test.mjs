import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Color, Graphics, Image, Renderer } from "../dist/index.js";
import { WebGLRenderer } from "../dist/slick/rendering/WebGLRenderer.js";
import { WebGLRenderTarget } from "../dist/slick/rendering/WebGLRenderTarget.js";
import { WebGLTextureResource } from "../dist/slick/rendering/WebGLTextureResource.js";
import { identityMatrix3 } from "../dist/slick/rendering/RenderBackend.js";

class Fake2DContext {
    constructor(canvas) {
        this.canvas = canvas;
        this.fillStyle = "";
        this.font = "";
        this.textBaseline = "";
    }

    clearRect() {}

    drawImage() {}

    fillText() {}

    getImageData(_x, _y, width, height) {
        return { data: new Uint8ClampedArray(width * height * 4) };
    }

    measureText(text) {
        return { width: text.length * 8 };
    }

    putImageData() {}
}

class FakeCanvas {
    constructor() {
        this.height = 1;
        this.width = 1;
    }

    getContext(type) {
        return type === "2d" ? new Fake2DContext(this) : null;
    }
}

class FakeBatchGL {
    constructor() {
        this.ARRAY_BUFFER = 0x8892;
        this.COLOR_BUFFER_BIT = 0x4000;
        this.FRAMEBUFFER = 0x8d40;
        this.SCISSOR_TEST = 0x0c11;
        this.STREAM_DRAW = 0x88e0;
        this.TEXTURE_2D = 0x0de1;
        this.FLOAT = 0x1406;
        this.TRIANGLES = 0x0004;
        this.drawArraysCalls = [];
        this.bufferSubDataCalls = [];
        this.uniform1fCalls = [];
    }

    bindBuffer() {}

    bindFramebuffer() {}

    bindTexture() {}

    bufferData() {}

    bufferSubData(_target, _offset, _data, sourceOffset, length) {
        this.bufferSubDataCalls.push({ sourceOffset, length });
    }

    drawArrays(mode, first, count) {
        this.drawArraysCalls.push({ mode, first, count });
    }

    clear() {}

    clearColor() {}

    disable() {}

    enableVertexAttribArray() {}

    uniform4f() {}

    uniform1f(location, value) {
        this.uniform1fCalls.push({ location, value });
    }

    useProgram() {}

    scissor() {}

    vertexAttribPointer() {}

    viewport() {}
}

class FakeTargetStackGL extends FakeBatchGL {
    constructor() {
        super();
        this.bindFramebufferCalls = [];
        this.disableCalls = [];
        this.enableCalls = [];
        this.scissorCalls = [];
        this.viewportCalls = [];
    }

    bindFramebuffer(target, framebuffer) {
        this.bindFramebufferCalls.push([target, framebuffer]);
    }

    disable(capability) {
        this.disableCalls.push(capability);
    }

    enable(capability) {
        this.enableCalls.push(capability);
    }

    scissor(...args) {
        this.scissorCalls.push(args);
    }

    viewport(...args) {
        this.viewportCalls.push(args);
    }
}

class FakeCopyGL {
    constructor() {
        this.COLOR_BUFFER_BIT = 0x4000;
        this.DRAW_FRAMEBUFFER = 0x8ca9;
        this.FRAMEBUFFER = 0x8d40;
        this.FRAMEBUFFER_BINDING = 0x8ca6;
        this.NEAREST = 0x2600;
        this.READ_FRAMEBUFFER = 0x8ca8;
        this.TEXTURE_2D = 0x0de1;
        this.bindFramebufferCalls = [];
        this.blitFramebufferCalls = [];
        this.copyTexSubImage2DCalls = [];
    }

    bindFramebuffer(target, framebuffer) {
        this.bindFramebufferCalls.push([target, framebuffer]);
    }

    bindTexture() {}

    blitFramebuffer(...args) {
        this.blitFramebufferCalls.push(args);
    }

    copyTexSubImage2D(...args) {
        this.copyTexSubImage2DCalls.push(args);
    }

    getParameter(parameter) {
        return parameter === this.FRAMEBUFFER_BINDING ? "source-framebuffer" : null;
    }

    viewport() {}
}

class FakeTextureGL {
    constructor() {
        this.CLAMP_TO_EDGE = 0x812f;
        this.COLOR_ATTACHMENT0 = 0x8ce0;
        this.FRAMEBUFFER = 0x8d40;
        this.LINEAR = 0x2601;
        this.NEAREST = 0x2600;
        this.RGBA = 0x1908;
        this.TEXTURE_2D = 0x0de1;
        this.TEXTURE_MAG_FILTER = 0x2800;
        this.TEXTURE_MIN_FILTER = 0x2801;
        this.TEXTURE_WRAP_S = 0x2802;
        this.TEXTURE_WRAP_T = 0x2803;
        this.UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
        this.UNSIGNED_BYTE = 0x1401;
        this.deletedFramebuffers = [];
        this.deletedTextures = [];
        this.framebuffers = new Set();
        this.isTextureCalls = 0;
        this.nextFramebuffer = 1;
        this.nextTexture = 1;
        this.textures = new Set();
    }

    bindFramebuffer() {}

    bindTexture() {}

    createFramebuffer() {
        const framebuffer = { id: this.nextFramebuffer++ };
        this.framebuffers.add(framebuffer);
        return framebuffer;
    }

    createTexture() {
        const texture = { id: this.nextTexture++ };
        this.textures.add(texture);
        return texture;
    }

    deleteFramebuffer(framebuffer) {
        this.deletedFramebuffers.push(framebuffer);
        this.framebuffers.delete(framebuffer);
    }

    deleteTexture(texture) {
        this.deletedTextures.push(texture);
        this.textures.delete(texture);
    }

    framebufferTexture2D() {}

    isContextLost() {
        return false;
    }

    isFramebuffer(framebuffer) {
        return this.framebuffers.has(framebuffer);
    }

    isTexture(texture) {
        this.isTextureCalls += 1;
        return this.textures.has(texture);
    }

    pixelStorei() {}

    texImage2D() {}

    texParameteri() {}
}

function fakeProgram() {
    return {
        dispose: () => undefined,
        program: {},
        getAttribLocation: (_gl, name) => ({ a_position: 0, a_texCoord: 1, a_color: 2 })[name] ?? 0,
        getUniformLocation: (_gl, name) => name
    };
}

function fakeImageForTexture(texture) {
    return {
        __getCornerColors: () => null,
        __getTextureResource: () => ({
            ensureTexture: () => texture,
            height: 16,
            width: 16
        })
    };
}

class FakeStateGL {
    constructor() {
        this.calls = [];
    }

    blendFunc(src, dest) {
        this.calls.push(["blendFunc", src, dest]);
    }

    colorMask(red, green, blue, alpha) {
        this.calls.push(["colorMask", red, green, blue, alpha]);
    }

    disable(capability) {
        this.calls.push(["disable", capability]);
    }

    enable(capability) {
        this.calls.push(["enable", capability]);
    }
}

function installCanvasDocument() {
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: {
            createElement: () => new FakeCanvas()
        },
        writable: true
    });
}

afterEach(() => {
    delete globalThis.document;
});

test("Graphics shape and gradient-line parity methods are implemented", () => {
    const graphics = new Graphics(320, 240);

    assert.doesNotThrow(() => graphics.drawOval(10, 20, 30, 40));
    assert.doesNotThrow(() => graphics.drawOval(10, 20, 30, 40, 12));
    assert.doesNotThrow(() => graphics.fillOval(10, 20, 30, 40));
    assert.doesNotThrow(() => graphics.drawArc(10, 20, 30, 40, 15, 125));
    assert.doesNotThrow(() => graphics.fillArc(10, 20, 30, 40, 12, 15, 125));
    assert.doesNotThrow(() => graphics.drawRoundRect(10, 20, 30, 40, 6));
    assert.doesNotThrow(() => graphics.fillRoundRect(10, 20, 30, 40, 6));
    assert.doesNotThrow(() => graphics.drawGradientLine(0, 0, 1, 0, 0, 1, 20, 20, 0, 0, 1, 1));
    assert.doesNotThrow(() => graphics.drawGradientLine(0, 0, Color.red, 20, 20, Color.blue));
});

test("Image warped/sheared drawing and copyArea Image return paths are implemented", () => {
    installCanvasDocument();
    const graphics = new Graphics(32, 32);
    const image = new Image(8, 8);

    assert.doesNotThrow(() => image.drawSheared(0, 0, 2, 3));
    assert.doesNotThrow(() => image.drawSheared(0, 0, 2, 3, Color.white));
    assert.doesNotThrow(() => image.drawWarped(0, 0, 8, 1, 9, 9, 1, 8));
    assert.doesNotThrow(() => graphics.copyArea(image, 0, 0));

    const copied = graphics.getArea(0, 0, 4, 4);
    assert.equal(copied.getWidth(), 4);
    assert.equal(copied.getHeight(), 4);
});

test("Image.copy follows Java subimage copy draw-state reset semantics", () => {
    installCanvasDocument();
    const image = new Image(8, 8);
    image.setAlpha(0.25);
    image.setRotation(90);
    image.setCenterOfRotation(1, 2);
    image.setName("source");
    image.setImageColor(0.5, 0.25, 0.125, 0.75);

    const copy = image.copy();

    assert.equal(copy.getAlpha(), 1);
    assert.equal(copy.getRotation(), 0);
    assert.equal(copy.getCenterOfRotationX(), 4);
    assert.equal(copy.getCenterOfRotationY(), 4);
    assert.equal(copy.getName(), null);
    assert.equal(copy.__getCornerColors(), null);

    const scaled = image.getScaledCopy(16, 12);

    assert.equal(scaled.getAlpha(), 1);
    assert.equal(scaled.getRotation(), 0);
    assert.equal(scaled.getCenterOfRotationX(), 8);
    assert.equal(scaled.getCenterOfRotationY(), 6);
});

test("Image texture coordinate accessors match Java subimage and flipped-copy signs", () => {
    installCanvasDocument();
    const image = new Image(100, 50);
    const sub = image.getSubImage(10, 5, 20, 10);

    assert.equal(sub.getTextureOffsetX(), 0.1);
    assert.equal(sub.getTextureOffsetY(), 0.1);
    assert.equal(sub.getTextureWidth(), 0.2);
    assert.equal(sub.getTextureHeight(), 0.2);

    const flipped = sub.getFlippedCopy(true, true);

    assert.equal(flipped.getTextureOffsetX(), 0.3);
    assert.equal(flipped.getTextureOffsetY(), 0.3);
    assert.equal(flipped.getTextureWidth(), -0.2);
    assert.equal(flipped.getTextureHeight(), -0.2);
});

test("Image.draw scale-filter overload scales and preserves the supplied tint", () => {
    installCanvasDocument();
    const renderer = Renderer.getBackend();
    const originalDrawImage = renderer.drawImage;
    const calls = [];
    try {
        renderer.drawImage = (...args) => calls.push(args);
        const image = new Image(100, 50);
        image.setAlpha(0.5);

        image.draw(2, 3, 2, Color.red);

        assert.equal(calls.length, 1);
        assert.equal(calls[0][1], 2);
        assert.equal(calls[0][2], 3);
        assert.equal(calls[0][3], 200);
        assert.equal(calls[0][4], 100);
        assert.equal(calls[0][9], 0.5);
        assert.equal(calls[0][10], Color.red);
        assert.equal(calls[0][12], true);
    } finally {
        renderer.drawImage = originalDrawImage;
    }
});

test("Image source-rectangle draw paths match Java embedded corner-color behavior", () => {
    installCanvasDocument();
    const renderer = Renderer.getBackend();
    const originalDrawImage = renderer.drawImage;
    const calls = [];
    try {
        renderer.drawImage = (...args) => calls.push(args);
        const image = new Image(100, 50);
        image.setImageColor(0.1, 0.2, 0.3, 0.4);

        image.draw(1, 2, 5, 6);
        image.draw(3, 4, 5, 10, 45, 30);
        image.draw(7, 8, 27, 38, 5, 10, 45, 30, Color.blue);

        assert.equal(calls[0][12], true);
        assert.deepEqual(calls[1].slice(1, 11), [3, 4, 100, 50, 5, 10, 40, 20, 1, null]);
        assert.equal(calls[1][12], false);
        assert.deepEqual(calls[2].slice(1, 11), [7, 8, 20, 30, 5, 10, 40, 20, 1, Color.blue]);
        assert.equal(calls[2][12], false);
    } finally {
        renderer.drawImage = originalDrawImage;
    }
});

test("Image.drawEmbedded source-rectangle overloads draw without image alpha or rotation", () => {
    installCanvasDocument();
    const renderer = Renderer.getBackend();
    const originalDrawImage = renderer.drawImage;
    const originalPush = renderer.pushTransform;
    const originalPop = renderer.popTransform;
    const originalRotate = renderer.rotate;
    const calls = [];
    let transformCallCount = 0;
    try {
        renderer.drawImage = (...args) => calls.push(args);
        renderer.pushTransform = () => {
            transformCallCount++;
        };
        renderer.popTransform = () => {
            transformCallCount++;
        };
        renderer.rotate = () => {
            transformCallCount++;
        };
        const image = new Image(100, 50);
        image.setAlpha(0.25);
        image.setRotation(90);
        image.setImageColor(0.1, 0.2, 0.3, 0.4);

        image.drawEmbedded(1, 2, 20, 10);
        image.drawEmbedded(10, 20, 30, 50, 5, 10, 45, 30);
        image.drawEmbedded(11, 21, 31, 51, 6, 11, 46, 31, Color.green);

        assert.equal(transformCallCount, 0);
        assert.deepEqual(calls[0].slice(1, 11), [1, 2, 20, 10, 0, 0, 100, 50, 1, null]);
        assert.equal(calls[0][12], true);
        assert.equal(calls[0][13], true);
        assert.deepEqual(calls[1].slice(1, 11), [10, 20, 20, 30, 5, 10, 40, 20, 1, null]);
        assert.equal(calls[1][12], false);
        assert.equal(calls[1][13], true);
        assert.deepEqual(calls[2].slice(1, 11), [11, 21, 20, 30, 6, 11, 40, 20, 1, Color.green]);
        assert.equal(calls[2][12], false);
        assert.equal(calls[2][13], false);
    } finally {
        renderer.drawImage = originalDrawImage;
        renderer.pushTransform = originalPush;
        renderer.popTransform = originalPop;
        renderer.rotate = originalRotate;
    }
});

test("Image startUse and endUse preserve Java lifecycle errors", () => {
    installCanvasDocument();
    const first = new Image(8, 8);
    const second = new Image(8, 8);
    let firstEnded = false;
    try {
        first.startUse();
        assert.throws(() => second.startUse(), /Attempt to start use/);
        assert.throws(() => second.endUse(), /not currently in use/);
        first.endUse();
        firstEnded = true;
        assert.throws(() => first.endUse(), /not currently in use/);
    } finally {
        if (!firstEnded) {
            first.endUse();
        }
    }
});

test("Graphics.drawImage overloads match Java arity and ignore current color by default", () => {
    const graphics = new Graphics(64, 64);
    const calls = [];
    const image = {
        draw: (...args) => calls.push(args),
        getHeight: () => 11,
        getWidth: () => 17
    };

    graphics.setColor(Color.red);
    graphics.drawImage(image, 2, 3);
    graphics.drawImage(image, 4, 5, Color.blue);
    graphics.drawImage(image, 6, 7, 1, 2, 3, 4);
    graphics.drawImage(image, 8, 9, 1, 2, 3, 4, Color.green);
    graphics.drawImage(image, 10, 11, 20, 21, 1, 2, 3, 4);
    graphics.drawImage(image, 12, 13, 22, 23, 1, 2, 3, 4, Color.yellow);

    assert.equal(calls[0][2], Color.white);
    assert.equal(calls[1][2], Color.blue);
    assert.deepEqual(calls[2], [6, 7, 1, 2, 3, 4]);
    assert.deepEqual(calls[3], [8, 9, 25, 20, 1, 2, 3, 4, Color.green]);
    assert.deepEqual(calls[4], [10, 11, 20, 21, 1, 2, 3, 4]);
    assert.deepEqual(calls[5], [12, 13, 22, 23, 1, 2, 3, 4, Color.yellow]);
});

test("Graphics patterned fillRect tiles with offsets and restores world clip", () => {
    const graphics = new Graphics(64, 64);
    const draws = [];
    const pattern = {
        draw: (x, y) => draws.push([x, y]),
        getHeight: () => 4,
        getWidth: () => 8
    };

    graphics.setWorldClip(1, 2, 3, 4);
    graphics.fillRect(10, 20, 18, 10, pattern, 3, 1);

    assert.deepEqual(graphics.getWorldClip(), { x: 1, y: 2, width: 3, height: 4 });
    assert.equal(draws.length, 25);
    assert.deepEqual(draws[0], [7, 19]);
    assert.deepEqual(draws[1], [7, 23]);
    assert.deepEqual(draws[5], [15, 19]);
});

test("WebGLRenderer batches same-texture image quads until a Slick flush boundary", () => {
    const gl = new FakeBatchGL();
    const renderer = new WebGLRenderer();
    renderer.gl = gl;
    renderer.textureProgram = fakeProgram();
    renderer.solidProgram = fakeProgram();
    renderer.buffer = {};
    renderer.initDisplay(64, 64);

    const texture = {};
    const image = fakeImageForTexture(texture);
    const transform = identityMatrix3();

    renderer.drawImageWarped(image, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 8, 8, 1, null, transform);
    renderer.drawImageWarped(image, 8, 0, 16, 0, 16, 8, 8, 8, 0, 0, 8, 8, 0.5, Color.red, transform);

    assert.equal(gl.drawArraysCalls.length, 0);

    renderer.flush();

    assert.equal(gl.drawArraysCalls.length, 1);
    assert.deepEqual(gl.drawArraysCalls[0], { mode: gl.TRIANGLES, first: 0, count: 12 });
    assert.deepEqual(gl.bufferSubDataCalls[0], { sourceOffset: 0, length: 12 * 8 });

    renderer.drawImageWarped(image, 0, 8, 8, 8, 8, 16, 0, 16, 0, 0, 8, 8, 1, null, transform);
    renderer.fillRect(0, 0, 4, 4, Color.white);

    assert.equal(gl.drawArraysCalls.length, 3);
    assert.deepEqual(gl.drawArraysCalls[1], { mode: gl.TRIANGLES, first: 0, count: 6 });
    assert.deepEqual(gl.drawArraysCalls[2], { mode: gl.TRIANGLES, first: 0, count: 6 });
});

test("WebGLRenderer high-DPI backing size does not change logical projection", () => {
    const gl = new FakeBatchGL();
    const renderer = new WebGLRenderer();
    renderer.gl = gl;
    renderer.textureProgram = fakeProgram();
    renderer.solidProgram = fakeProgram();
    renderer.buffer = {};
    renderer.initDisplay(100, 50, 200, 100);

    const texture = {};
    const image = fakeImageForTexture(texture);
    renderer.drawImageWarped(image, 0, 0, 100, 0, 100, 50, 0, 50, 0, 0, 16, 16, 1, null, identityMatrix3());

    assert.equal(renderer.textureBatchVertices[0], -1);
    assert.equal(renderer.textureBatchVertices[1], 1);
    assert.equal(renderer.textureBatchVertices[8], 1);
    assert.equal(renderer.textureBatchVertices[9], 1);
    assert.equal(renderer.textureBatchVertices[16], 1);
    assert.equal(renderer.textureBatchVertices[17], -1);
});

test("WebGLRenderer copyArea resolves high-DPI source rectangles into logical render targets", () => {
    const gl = new FakeCopyGL();
    const renderer = new WebGLRenderer();
    renderer.gl = gl;
    renderer.initDisplay(10, 10, 20, 20);
    const target = {
        framebuffer: "target-framebuffer",
        height: 2,
        texture: "target-texture",
        textureResource: {
            applyFilter: () => undefined
        },
        width: 3,
        ensure: () => undefined
    };

    renderer.copyAreaToRenderTarget(target, 2, 3);

    assert.deepEqual(gl.copyTexSubImage2DCalls, []);
    assert.deepEqual(gl.blitFramebufferCalls, [[4, 10, 10, 14, 0, 0, 3, 2, gl.COLOR_BUFFER_BIT, gl.NEAREST]]);
    assert.deepEqual(gl.bindFramebufferCalls.at(-1), [gl.FRAMEBUFFER, "source-framebuffer"]);
});

test("WebGLRenderer render target stack restores display and target dimensions", () => {
    const gl = new FakeTargetStackGL();
    const renderer = new WebGLRenderer();
    renderer.gl = gl;
    renderer.initDisplay(100, 50, 200, 100);
    renderer.setClip(10, 5, 20, 10);
    const targetA = {
        framebuffer: "target-a",
        height: 25,
        width: 50,
        ensure: () => undefined
    };
    const targetB = {
        framebuffer: "target-b",
        height: 30,
        width: 60,
        ensure: () => undefined
    };

    renderer.pushRenderTarget(targetA);

    assert.equal(renderer.getRenderTarget(), targetA);
    assert.deepEqual(gl.bindFramebufferCalls.at(-1), [gl.FRAMEBUFFER, "target-a"]);
    assert.deepEqual(gl.viewportCalls.at(-1), [0, 0, 50, 25]);
    assert.deepEqual(gl.scissorCalls.at(-1), [10, 10, 20, 10]);

    renderer.pushRenderTarget(targetB);
    assert.equal(renderer.getRenderTarget(), targetB);

    renderer.popRenderTarget();
    assert.equal(renderer.getRenderTarget(), targetA);
    assert.deepEqual(gl.bindFramebufferCalls.at(-1), [gl.FRAMEBUFFER, "target-a"]);

    renderer.popRenderTarget();
    assert.equal(renderer.getRenderTarget(), null);
    assert.deepEqual(gl.bindFramebufferCalls.at(-1), [gl.FRAMEBUFFER, null]);
    assert.deepEqual(gl.viewportCalls.at(-1), [0, 0, 200, 100]);
    assert.deepEqual(gl.scissorCalls.at(-1), [20, 70, 40, 20]);
    assert.throws(() => renderer.popRenderTarget(), /underflow/);
});

test("WebGLRenderer flash image draws use flash shader mode and split normal batches", () => {
    const gl = new FakeBatchGL();
    const renderer = new WebGLRenderer();
    renderer.gl = gl;
    renderer.textureProgram = fakeProgram();
    renderer.solidProgram = fakeProgram();
    renderer.buffer = {};
    renderer.initDisplay(64, 64);

    const texture = {};
    const image = fakeImageForTexture(texture);
    const transform = identityMatrix3();

    renderer.drawImageWarped(image, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 8, 8, 1, null, transform);
    renderer.drawImageFlash(image, 8, 0, 8, 8, 0, 0, 8, 8, Color.red, transform);

    assert.equal(gl.drawArraysCalls.length, 1);
    assert.deepEqual(
        gl.uniform1fCalls.filter((call) => call.location === "u_flash"),
        [{ location: "u_flash", value: 0 }]
    );

    renderer.flush();

    assert.equal(gl.drawArraysCalls.length, 2);
    assert.deepEqual(
        gl.uniform1fCalls.filter((call) => call.location === "u_flash"),
        [
            { location: "u_flash", value: 0 },
            { location: "u_flash", value: 1 }
        ]
    );
});

test("WebGLRenderer color inversion drives solid and texture shader uniforms", () => {
    const gl = new FakeBatchGL();
    const renderer = new WebGLRenderer();
    renderer.gl = gl;
    renderer.textureProgram = fakeProgram();
    renderer.solidProgram = fakeProgram();
    renderer.buffer = {};
    renderer.initDisplay(64, 64);

    renderer.setColorInverted(true);
    renderer.fillRect(0, 0, 4, 4, new Color(0.2, 0.3, 0.4, 0.5));

    assert.equal(renderer.isColorInverted(), true);
    assert.deepEqual(gl.uniform1fCalls.at(-1), { location: "u_invert", value: 1 });

    const texture = {};
    const image = fakeImageForTexture(texture);
    const transform = identityMatrix3();
    renderer.drawImageWarped(image, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 8, 8, 0.25, Color.red, transform);
    assert.equal(renderer.textureBatchVertices[7], 0.25);
    renderer.flush();

    assert.deepEqual(gl.uniform1fCalls.at(-1), { location: "u_invert", value: 1 });

    renderer.setColorInverted(false);
    renderer.fillRect(0, 0, 4, 4, new Color(0.2, 0.3, 0.4, 0.5));

    assert.equal(renderer.isColorInverted(), false);
    assert.deepEqual(gl.uniform1fCalls.at(-1), { location: "u_invert", value: 0 });
});

test("WebGLRenderer splits texture batches on color inversion changes", () => {
    const gl = new FakeBatchGL();
    const renderer = new WebGLRenderer();
    renderer.gl = gl;
    renderer.textureProgram = fakeProgram();
    renderer.solidProgram = fakeProgram();
    renderer.buffer = {};
    renderer.initDisplay(64, 64);

    const texture = {};
    const image = fakeImageForTexture(texture);
    const transform = identityMatrix3();

    renderer.setColorInverted(true);
    renderer.drawImageWarped(image, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 8, 8, 1, null, transform);
    renderer.setColorInverted(false);

    assert.equal(gl.drawArraysCalls.length, 1);
    assert.deepEqual(gl.uniform1fCalls.at(-1), { location: "u_invert", value: 1 });

    renderer.drawImageWarped(image, 8, 0, 16, 0, 16, 8, 8, 8, 0, 0, 8, 8, 1, null, transform);
    renderer.flush();

    assert.equal(gl.drawArraysCalls.length, 2);
    assert.deepEqual(gl.drawArraysCalls[0], { mode: gl.TRIANGLES, first: 0, count: 6 });
    assert.deepEqual(gl.drawArraysCalls[1], { mode: gl.TRIANGLES, first: 0, count: 6 });
    assert.deepEqual(
        gl.uniform1fCalls.filter((call) => call.location === "u_invert"),
        [
            { location: "u_invert", value: 1 },
            { location: "u_invert", value: 0 }
        ]
    );
});

test("WebGLRenderer color inversion resets at safe renderer lifecycle boundaries", () => {
    const gl = new FakeBatchGL();
    const renderer = new WebGLRenderer();
    renderer.gl = gl;
    renderer.textureProgram = fakeProgram();
    renderer.solidProgram = fakeProgram();
    renderer.buffer = {};
    renderer.initDisplay(64, 64);

    const texture = {};
    const image = fakeImageForTexture(texture);
    const transform = identityMatrix3();

    renderer.setColorInverted(true);
    renderer.drawImageWarped(image, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 8, 8, 1, null, transform);
    renderer.beginFrame(64, 64, Color.black);

    assert.equal(renderer.isColorInverted(), false);
    assert.deepEqual(
        gl.uniform1fCalls.filter((call) => call.location === "u_invert"),
        [{ location: "u_invert", value: 1 }]
    );

    renderer.setColorInverted(true);
    renderer.initDisplay(64, 64);
    assert.equal(renderer.isColorInverted(), false);

    renderer.setColorInverted(true);
    renderer.handleContextLost();
    assert.equal(renderer.isColorInverted(), false);

    renderer.setColorInverted(true);
    renderer.dispose();
    assert.equal(renderer.isColorInverted(), false);
});

test("WebGLTextureResource invalidation recreates stale GPU handles without disposing the resource", () => {
    const gl = new FakeTextureGL();
    const source = { height: 4, width: 4 };
    const resource = new WebGLTextureResource(source, Image.FILTER_NEAREST, null);

    try {
        const first = resource.ensureTexture(gl);
        assert.ok(first);

        resource.invalidateTexture(gl);

        assert.deepEqual(gl.deletedTextures, [first]);
        assert.equal(resource.ensureTexture(gl), resource.ensureTexture(gl));
        assert.notEqual(resource.ensureTexture(gl), first);
    } finally {
        resource.dispose(null);
    }
});

test("WebGLTextureResource cached reuse avoids WebGL validity checks", () => {
    const gl = new FakeTextureGL();
    const source = { height: 4, width: 4 };
    const resource = new WebGLTextureResource(source, Image.FILTER_NEAREST, null);

    try {
        const first = resource.ensureTexture(gl);

        assert.ok(first);
        assert.equal(resource.ensureTexture(gl), first);
        assert.equal(resource.ensureTexture(gl), first);
        assert.equal(gl.isTextureCalls, 0);
    } finally {
        resource.dispose(null);
    }
});

test("WebGLRenderTarget invalidation recreates framebuffer-backed texture handles", () => {
    const gl = new FakeTextureGL();
    const source = { height: 8, width: 8 };
    const resource = new WebGLTextureResource(source, Image.FILTER_NEAREST, null);
    const target = new WebGLRenderTarget(8, 8, resource);

    try {
        target.ensure(gl);
        const firstFramebuffer = target.framebuffer;
        const firstTexture = target.texture;

        target.invalidate(gl);

        assert.deepEqual(gl.deletedFramebuffers, [firstFramebuffer]);
        assert.deepEqual(gl.deletedTextures, [firstTexture]);
        assert.equal(target.framebuffer, null);
        assert.equal(target.texture, null);

        target.ensure(gl);

        assert.notEqual(target.framebuffer, firstFramebuffer);
        assert.notEqual(target.texture, firstTexture);
    } finally {
        target.dispose(null);
        resource.dispose(null);
    }
});

test("Graphics color inversion facade controls the active renderer state", () => {
    const renderer = Renderer.getBackend();
    const graphics = new Graphics(32, 16);
    try {
        graphics.setColorInverted(true);
        assert.equal(graphics.isColorInverted(), true);
        assert.equal(renderer.isColorInverted(), true);
    } finally {
        graphics.setColorInverted(false);
    }
    assert.equal(renderer.isColorInverted(), false);
});

test("WebGLRenderer preserves Java embedded null-tint current-color semantics", () => {
    const gl = new FakeBatchGL();
    const renderer = new WebGLRenderer();
    renderer.gl = gl;
    renderer.textureProgram = fakeProgram();
    renderer.solidProgram = fakeProgram();
    renderer.buffer = {};
    renderer.initDisplay(64, 64);

    const texture = {};
    const image = fakeImageForTexture(texture);
    const transform = identityMatrix3();

    renderer.glColor4f(0.25, 0.5, 0.75, 0.5);
    renderer.drawImageWarped(image, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 8, 8, 1, null, transform, false, true);

    assert.equal(renderer.textureBatchVertices[4], 0.25);
    assert.equal(renderer.textureBatchVertices[5], 0.5);
    assert.equal(renderer.textureBatchVertices[6], 0.75);
    assert.equal(renderer.textureBatchVertices[7], 0.5);

    renderer.textureBatchVertexCount = 0;
    renderer.textureBatchTexture = null;
    renderer.drawImageWarped(image, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 8, 8, 1, null, transform, false, false);

    assert.equal(renderer.textureBatchVertices[4], 1);
    assert.equal(renderer.textureBatchVertices[5], 1);
    assert.equal(renderer.textureBatchVertices[6], 1);
    assert.equal(renderer.textureBatchVertices[7], 1);

    renderer.textureBatchVertexCount = 0;
    renderer.textureBatchTexture = null;
    const corneredImage = {
        __getCornerColors: () => [Color.red, Color.white, Color.white, Color.white],
        __getTextureResource: image.__getTextureResource
    };
    renderer.drawImageWarped(corneredImage, 0, 0, 8, 0, 8, 8, 0, 8, 0, 0, 8, 8, 1, null, transform, true, true);

    assert.equal(renderer.textureBatchVertices[4], 1);
    assert.equal(renderer.textureBatchVertices[5], 0);
    assert.equal(renderer.textureBatchVertices[6], 0);
    assert.equal(renderer.textureBatchVertices[7], 1);
});

test("Graphics draw modes drive Java Slick2D blend and color-mask state", () => {
    const renderer = Renderer.getBackend();
    const originalGl = renderer.gl;
    const gl = new FakeStateGL();
    renderer.gl = gl;
    try {
        const graphics = new Graphics(32, 16);

        graphics.setDrawMode(Graphics.MODE_ALPHA_MAP);
        graphics.setDrawMode(Graphics.MODE_ALPHA_BLEND);
        graphics.setDrawMode(Graphics.MODE_COLOR_MULTIPLY);
        graphics.setDrawMode(Graphics.MODE_ADD);
        graphics.setDrawMode(Graphics.MODE_SCREEN);
        graphics.setDrawMode(Graphics.MODE_NORMAL);

        assert.deepEqual(gl.calls, [
            ["disable", renderer.GL_BLEND],
            ["colorMask", false, false, false, true],
            ["enable", renderer.GL_BLEND],
            ["colorMask", true, true, true, false],
            ["blendFunc", renderer.GL_DST_ALPHA, renderer.GL_ONE_MINUS_DST_ALPHA],
            ["enable", renderer.GL_BLEND],
            ["colorMask", true, true, true, true],
            ["blendFunc", renderer.GL_ONE_MINUS_SRC_COLOR, renderer.GL_SRC_COLOR],
            ["enable", renderer.GL_BLEND],
            ["colorMask", true, true, true, true],
            ["blendFunc", renderer.GL_ONE, renderer.GL_ONE],
            ["enable", renderer.GL_BLEND],
            ["colorMask", true, true, true, true],
            ["blendFunc", renderer.GL_ONE, renderer.GL_ONE_MINUS_SRC_COLOR],
            ["enable", renderer.GL_BLEND],
            ["colorMask", true, true, true, true],
            ["blendFunc", renderer.GL_SRC_ALPHA, renderer.GL_ONE_MINUS_SRC_ALPHA]
        ]);
    } finally {
        renderer.gl = originalGl;
    }
});

test("Graphics.clearAlphaMap restores Java draw mode after alpha-only clear", () => {
    const renderer = Renderer.getBackend();
    const originalGl = renderer.gl;
    renderer.gl = new FakeStateGL();
    try {
        const graphics = new Graphics(32, 16);
        graphics.setDrawMode(Graphics.MODE_ADD);
        graphics.clearAlphaMap();

        assert.equal(graphics.getDrawMode(), Graphics.MODE_ADD);
        assert.equal(graphics.getColor().a, 0);
    } finally {
        renderer.gl = originalGl;
    }
});

test("SGL display lists record and replay exposed immediate-mode commands", () => {
    const gl = Renderer.get();
    const list = gl.glGenLists(1);

    assert.doesNotThrow(() => {
        gl.glNewList(list, gl.GL_COMPILE);
        gl.glPushMatrix();
        gl.glTranslatef(1, 2, 0);
        gl.glBegin(gl.GL_LINES);
        gl.glColor4f(1, 0, 0, 1);
        gl.glVertex2f(0, 0);
        gl.glVertex2f(10, 10);
        gl.glEnd();
        gl.glPopMatrix();
        gl.glEndList();
        gl.glCallList(list);
        gl.glDeleteLists(list, 1);
    });
});
