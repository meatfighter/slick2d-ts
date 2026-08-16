import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { Graphics, Renderer, SpriteDrawing } from "../dist/index.js";

function transformPoint(matrix, x, y) {
    return [matrix[0] * x + matrix[1] * y + matrix[2], matrix[3] * x + matrix[4] * y + matrix[5]];
}

function assertPoint(actual, expected) {
    assert.equal(actual.length, expected.length);
    for (let i = 0; i < actual.length; i++) {
        assert.ok(Math.abs(actual[i] - expected[i]) < 0.000001, `${actual} != ${expected}`);
    }
}

class FakeImage {
    constructor(width = 64, height = 64) {
        this.alpha = 0.4;
        this.centerCalls = 0;
        this.draws = [];
        this.height = height;
        this.rotationCalls = 0;
        this.width = width;
    }

    draw(x, y, width = this.width, height = this.height) {
        const matrix = Renderer.getBackend().currentMatrix();
        this.draws.push({
            alpha: this.alpha,
            bottomRight: transformPoint(matrix, x + width, y + height),
            topLeft: transformPoint(matrix, x, y),
            x,
            y
        });
    }

    getAlpha() {
        return this.alpha;
    }

    getHeight() {
        return this.height;
    }

    getWidth() {
        return this.width;
    }

    setAlpha(alpha) {
        this.alpha = alpha;
    }

    setCenterOfRotation() {
        this.centerCalls += 1;
    }

    setRotation() {
        this.rotationCalls += 1;
    }
}

beforeEach(() => {
    Renderer.setRenderer(Renderer.IMMEDIATE_RENDERER);
    Renderer.getBackend().glLoadIdentity();
    Graphics.setCurrent(null);
});

afterEach(() => {
    Graphics.setCurrent(null);
    Renderer.setRenderer(Renderer.IMMEDIATE_RENDERER);
});

test("drawRotated without explicit center draws centered on the transform origin", () => {
    const image = new FakeImage();

    SpriteDrawing.drawRotated(image, 100, 100, 0);

    assertPoint(image.draws[0].topLeft, [68, 68]);
    assertPoint(image.draws[0].bottomRight, [132, 132]);
    assert.equal(image.rotationCalls, 0);
    assert.equal(image.centerCalls, 0);
});

test("drawRotated explicit center arguments are local draw offsets", () => {
    const image = new FakeImage();

    SpriteDrawing.drawRotated(image, 100, 100, -29, -29, 0);

    assertPoint(image.draws[0].topLeft, [71, 71]);
    assertPoint(image.draws[0].bottomRight, [135, 135]);
});

test("drawRotated applies translate then rotate before drawing local offsets", () => {
    const image = new FakeImage();

    SpriteDrawing.drawRotated(image, 100, 100, -29, -29, 90);

    assertPoint(image.draws[0].topLeft, [129, 71]);
    assertPoint(image.draws[0].bottomRight, [65, 135]);
});

test("drawRotatedScaled applies translate rotate and non-uniform scale", () => {
    const image = new FakeImage();

    SpriteDrawing.drawRotatedScaled(image, 100, 100, -29, -29, 0, 2, 3);

    assertPoint(image.draws[0].topLeft, [42, 13]);
    assertPoint(image.draws[0].bottomRight, [170, 205]);
});

test("drawScaled treats x and y as the Java local transform origin", () => {
    const image = new FakeImage();

    SpriteDrawing.drawScaled(image, 100, 100, 2);

    assertPoint(image.draws[0].topLeft, [36, 36]);
    assertPoint(image.draws[0].bottomRight, [164, 164]);
});

test("drawScaled scale-alpha overload supports scales greater than one", () => {
    const image = new FakeImage();

    SpriteDrawing.drawScaled(image, 100, 100, 2.25, 0.6);

    assertPoint(image.draws[0].topLeft, [28, 28]);
    assertPoint(image.draws[0].bottomRight, [172, 172]);
    assert.equal(image.draws[0].alpha, 0.6);
    assert.equal(image.getAlpha(), 1);
});

test("drawScaled scale-alpha overload keeps the same route for small scales", () => {
    const image = new FakeImage();

    SpriteDrawing.drawScaled(image, 100, 100, 0.5, 0.6);

    assertPoint(image.draws[0].topLeft, [84, 84]);
    assertPoint(image.draws[0].bottomRight, [116, 116]);
    assert.equal(image.draws[0].alpha, 0.6);
    assert.equal(image.getAlpha(), 1);
});

test("drawSized is the explicit top-left width-height convenience helper", () => {
    const image = new FakeImage();

    SpriteDrawing.drawSized(image, 100, 100, 2.25, 0.6);

    assertPoint(image.draws[0].topLeft, [100, 100]);
    assertPoint(image.draws[0].bottomRight, [102.25, 100.6]);
    assert.equal(image.draws[0].alpha, 0.4);
});

test("drawOffset draws at local coordinates inside active transforms", () => {
    const image = new FakeImage();

    SpriteDrawing.withRotation(100, 100, 90, () => {
        SpriteDrawing.drawOffset(image, -154, -80);
    });

    assert.equal(image.draws[0].x, -154);
    assert.equal(image.draws[0].y, -80);
    assertPoint(image.draws[0].topLeft, [180, -54]);
    assertPoint(image.draws[0].bottomRight, [116, 10]);
});

test("drawOffset alpha overload draws local coordinates and resets alpha", () => {
    const image = new FakeImage();

    SpriteDrawing.drawOffset(image, -38, -40, 0.5);

    assert.equal(image.draws[0].x, -38);
    assert.equal(image.draws[0].y, -40);
    assert.equal(image.draws[0].alpha, 0.5);
    assert.equal(image.getAlpha(), 1);
});

test("drawCameraOffset keeps camera subtraction out of drawOffset", () => {
    const image = new FakeImage();

    SpriteDrawing.drawCameraOffset(image, 100, 100, 10, 20);

    assert.equal(image.draws[0].x, 90);
    assert.equal(image.draws[0].y, 80);
});

test("SpriteDrawing helpers compose with an outer rotateGraphics-style transform", () => {
    const image = new FakeImage();

    SpriteDrawing.withRotation(10, 20, 90, () => {
        SpriteDrawing.drawRotated(image, 100, 100, -29, -29, 0);
    });

    assertPoint(image.draws[0].topLeft, [-61, 91]);
    assertPoint(image.draws[0].bottomRight, [-125, 155]);
});

test("alpha overloads reset image alpha to one and do not mutate rotation state", () => {
    const image = new FakeImage();

    SpriteDrawing.drawRotated(image, 100, 100, -29, -29, 0, 1, 0.25);

    assert.equal(image.draws[0].alpha, 0.25);
    assert.equal(image.getAlpha(), 1);
    assert.equal(image.rotationCalls, 0);
    assert.equal(image.centerCalls, 0);
});
