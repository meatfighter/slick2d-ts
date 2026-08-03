import assert from "node:assert/strict";
import { test } from "node:test";
import { FastTrig, GeometryMath } from "../dist/index.js";

function jf(value) {
    return Math.fround(value);
}

function javaUnitVector2(angle) {
    const a = jf(angle);
    return [jf(Math.cos(a)), jf(Math.sin(a))];
}

function javaRotate(x, y, angle) {
    const fx = jf(x);
    const fy = jf(y);
    const a = jf(angle);
    const cos = jf(Math.cos(a));
    const sin = jf(Math.sin(a));
    return {
        x: jf(jf(fx * cos) - jf(fy * sin)),
        y: jf(jf(fx * sin) + jf(fy * cos))
    };
}

test("GeometryMath diagonal constants use Java float narrowing", () => {
    const expected = jf(1 / Math.sqrt(2));

    assert.equal(GeometryMath.ISQRT2, expected);
    assert.deepEqual(GeometryMath.createUnitVector(45), [expected, expected]);
    assert.deepEqual(GeometryMath.createUnitVector(135), [-expected, expected]);
    assert.deepEqual(GeometryMath.createUnitVector(225), [-expected, -expected]);
    assert.deepEqual(GeometryMath.createUnitVector(315), [expected, -expected]);
});

test("GeometryMath.createUnitVector2 matches Java Math trig narrowed to float", () => {
    for (const angle of [0, Math.PI / 6, Math.PI / 4, -Math.PI / 3, 3.2]) {
        assert.deepEqual(GeometryMath.createUnitVector2(angle), javaUnitVector2(angle));
    }
});

test("GeometryMath.rotate matches Java Point2D.Float arithmetic boundaries", () => {
    for (const angle of [0, Math.PI / 6, Math.PI / 4, -Math.PI / 3, 3.2]) {
        assert.deepEqual(GeometryMath.rotate(1, 2, angle), javaRotate(1, 2, angle));
    }
});

test("GeometryMath.createUnitVector2 does not use Slick FastTrig reduction", () => {
    const actual = GeometryMath.createUnitVector2(3.2);
    const slickTrig = [FastTrig.cos(3.2), FastTrig.sin(3.2)];

    assert.deepEqual(actual, javaUnitVector2(3.2));
    assert.notDeepEqual(actual, slickTrig);
});
