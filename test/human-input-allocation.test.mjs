import assert from "node:assert/strict";
import { test } from "node:test";
import { ButtonMapping, HumanInput } from "../dist/index.js";

test("HumanInput.snap reuses its persistent snapshot object", () => {
    const downKeys = new Set();
    const input = {
        isButtonPressed: () => false,
        isControllerDown: () => false,
        isControllerLeft: () => false,
        isControllerRight: () => false,
        isControllerUp: () => false,
        isKeyDown: (key) => downKeys.has(key)
    };
    const mapping = new ButtonMapping();
    mapping.controller = false;
    const humanInput = new HumanInput(mapping, { getInput: () => input });
    const snapshot = humanInput.snapshot;

    humanInput.snap();
    downKeys.add(mapping.keyUp);
    humanInput.snap();

    assert.equal(humanInput.snapshot, snapshot);
    assert.equal(humanInput.isUp(), true);
});
