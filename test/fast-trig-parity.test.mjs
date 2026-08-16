import assert from "node:assert/strict";
import { test } from "node:test";
import { FastTrig } from "../dist/index.js";

function javaReduceSinAngle(radians) {
    let reduced = radians % (Math.PI * 2);
    if (Math.abs(reduced) > Math.PI) {
        reduced -= Math.PI * 2;
    }
    if (Math.abs(reduced) > Math.PI / 2) {
        reduced = Math.PI - reduced;
    }
    return reduced;
}

function javaFastSin(radians) {
    const reduced = javaReduceSinAngle(radians);
    if (Math.abs(reduced) <= Math.PI / 4) {
        return Math.sin(reduced);
    }
    return Math.cos(Math.PI / 2 - reduced);
}

function javaFastCos(radians) {
    return javaFastSin(radians + Math.PI / 2);
}

const samples = [0, 0.1, Math.PI / 3, 2.1, 3.14, 4.7, 12.345, 1000.01, -2.1, -1000.01];

test("FastTrig.sin mirrors Java Slick2D angle reduction", () => {
    for (const radians of samples) {
        assert.equal(FastTrig.sin(radians), javaFastSin(radians));
    }
});

test("FastTrig.cos mirrors Java Slick2D sin offset rule", () => {
    for (const radians of samples) {
        assert.equal(FastTrig.cos(radians), javaFastCos(radians));
        assert.equal(FastTrig.cos(radians), FastTrig.sin(radians + Math.PI / 2));
    }
});
