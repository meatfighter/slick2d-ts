import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Color, Graphics, Image, Renderer } from "../dist/index.js";
import { WebGLRenderer } from "../dist/slick/rendering/WebGLRenderer.js";
import { identityMatrix3 } from "../dist/slick/rendering/RenderBackend.js";

class Fake2DContext {
    constructor(canvas) {
        this.canvas = canvas;
        this.fillStyle = "";
        this.font = "";
        this.textBaseline = "";
    }

    clearRect() {
    }

    drawImage() {
    }

    fillText() {
    }

    getImageData(_x, _y, width, height) {
        return { data: new Uint8ClampedArray(width * height * 4) };
    }

    measureText(text) {
        return { width: text.length * 8 };
    }

    putImageData() {
    }
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
        this.STREAM_DRAW = 0x88E0;
        this.TEXTURE_2D = 0x0DE1;
        this.FLOAT = 0x1406;
        this.TRIANGLES = 0x0004;
        this.drawArraysCalls = [];
        this.bufferSubDataCalls = [];
        this.uniform1fCalls = [];
    }

    bindBuffer() {
    }

    bindTexture() {
    }

    bufferData() {
    }

    bufferSubData(_target, _offset, _data, sourceOffset, length) {
        this.bufferSubDataCalls.push({ sourceOffset, length });
    }

    drawArrays(mode, first, count) {
        this.drawArraysCalls.push({ mode, first, count });
    }

    enableVertexAttribArray() {
    }

    uniform4f() {
    }

    uniform1f(location, value) {
        this.uniform1fCalls.push({ location, value });
    }

    useProgram() {
    }

    vertexAttribPointer() {
    }

    viewport() {
    }
}

function fakeProgram() {
    return {
        program: {},
        getAttribLocation: (_gl, name) => ({ a_position: 0, a_texCoord: 1, a_color: 2 }[name] ?? 0),
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
    assert.deepEqual(gl.uniform1fCalls[0], { location: "u_flash", value: 0 });

    renderer.flush();

    assert.equal(gl.drawArraysCalls.length, 2);
    assert.deepEqual(gl.uniform1fCalls[1], { location: "u_flash", value: 1 });
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
