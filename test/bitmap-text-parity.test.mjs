import assert from "node:assert/strict";
import { test } from "node:test";
import { BitmapText } from "../dist/index.js";

class FakeGlyph {
    constructor() {
        this.alpha = 0.25;
        this.draws = [];
    }

    draw(x, y) {
        this.draws.push({ alpha: this.alpha, x, y });
    }

    getAlpha() {
        return this.alpha;
    }

    getHeight() {
        return 8;
    }

    getWidth() {
        return 8;
    }

    setAlpha(alpha) {
        this.alpha = alpha;
    }
}

test("BitmapText.drawStringAlpha resets glyph alpha to one after drawing", () => {
    const glyph = new FakeGlyph();
    const glyphs = [];
    glyphs["A".charCodeAt(0)] = glyph;
    const text = new BitmapText(glyphs, {
        glyphHeight: 8,
        glyphWidth: 8,
        xAdvance: 8
    });

    text.drawStringAlpha("A", 10, 20, 0.6);

    assert.deepEqual(glyph.draws, [{ alpha: 0.6, x: 10, y: 20 }]);
    assert.equal(glyph.getAlpha(), 1);
});
