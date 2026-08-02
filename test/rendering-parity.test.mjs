import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Color, Graphics, Image, Renderer } from "../dist/index.js";

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
