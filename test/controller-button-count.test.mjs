import assert from "node:assert/strict";
import test from "node:test";
import { Input } from "../dist/index.js";

test("Input reports button count for dense logical controllers", () => {
    const input = new Input(600);
    input.getFrameGamepads = () => [
        { buttons: [{ pressed: false }, { pressed: true }], axes: [] },
        { buttons: [{ pressed: false }], axes: [] }
    ];

    assert.equal(input.getButtonCount(0), 2);
    assert.equal(input.getButtonCount(1), 1);
    assert.equal(input.getButtonCount(2), 0);
});
