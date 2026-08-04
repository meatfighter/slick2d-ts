import assert from "node:assert/strict";
import { test } from "node:test";
import { JavaRandom } from "../dist/index.js";

const SEEDS = [0, 1, 123456789, -1, 25214903917];

test("JavaRandom.nextInt matches Java unbounded vectors", () => {
    const expected = new Map([
        [0, [-1155484576, -723955400, 1033096058, -1690734402, -1557280266]],
        [1, [-1155869325, 431529176, 1761283695, 1749940626, 892128508]],
        [123456789, [-1442945365, -1016548095, 1962592967, 1094656688, 1677212580]],
        [-1, [1155099827, 1887904451, 52699159, -1941176418, -1451336087]],
        [25214903917, [0, 4232237, 178803790, 758674372, 1565954732]]
    ]);

    for (const seed of SEEDS) {
        const random = new JavaRandom(seed);
        assert.deepEqual(
            Array.from({ length: 5 }, () => random.nextInt()),
            expected.get(seed)
        );
    }
});

test("JavaRandom.nextInt(bound) matches Java bounded vectors", () => {
    const bounds = [1, 2, 3, 5, 7, 16, 31, 32, 1000, 2147483647];
    const expected = new Map([
        [0, [0, 1, 1, 2, 4, 4, 1, 3, 719, 1678332854]],
        [1, [0, 0, 1, 3, 6, 0, 4, 21, 978, 1526301748]],
        [123456789, [0, 1, 2, 4, 4, 3, 6, 13, 297, 925572887]],
        [-1, [0, 0, 0, 4, 6, 9, 29, 12, 765, 121412731]],
        [25214903917, [0, 0, 2, 1, 3, 1, 13, 15, 612, 975888346]]
    ]);

    for (const seed of SEEDS) {
        const random = new JavaRandom(seed);
        assert.deepEqual(
            bounds.map((bound) => random.nextInt(bound)),
            expected.get(seed)
        );
    }
});

test("JavaRandom.nextInt(bound) preserves Java rejection-loop behavior", () => {
    const bound = 1073741825;
    const expected = new Map([
        [0, [516548029, 663681053, 251269761, 715581077, 542832677, 827187473, 49567875, 377907320]],
        [1, [215764588, 880641847, 874970313, 446064254, 77814904, 714504434, 13136569, 327998473]],
        [123456789, [981296483, 547328344, 838606290, 465137554, 913732807, 925572887, 771983441, 1052992961]],
        [987654321, [657000536, 422320121, 98087148, 359444801, 554741714, 20859218, 775302182, 299652577]]
    ]);

    for (const [seed, values] of expected) {
        const random = new JavaRandom(seed);
        assert.deepEqual(
            Array.from({ length: values.length }, () => random.nextInt(bound)),
            values
        );
    }
});

test("JavaRandom.nextFloat matches Java next(24) vectors exactly", () => {
    const expected = new Map([
        [0, [0.7309677600860596, 0.8314409852027893, 0.2405363917350769]],
        [1, [0.7308781743049622, 0.10047316551208496, 0.41008079051971436]],
        [123456789, [0.6640380620956421, 0.7633164525032043, 0.45695173740386963]],
        [-1, [0.26894259452819824, 0.43956196308135986, 0.012269973754882812]],
        [25214903917, [0, 0.0009853839874267578, 0.04163098335266113]]
    ]);

    for (const seed of SEEDS) {
        const random = new JavaRandom(seed);
        assert.deepEqual(
            Array.from({ length: 3 }, () => random.nextFloat()),
            expected.get(seed)
        );
    }
});

test("JavaRandom.nextBoolean matches Java vectors", () => {
    const expected = new Map([
        [0, [true, true, false, true, true, false]],
        [1, [true, false, false, false, false, false]],
        [123456789, [true, true, false, false, false, false]],
        [-1, [false, false, false, true, true, true]],
        [25214903917, [false, false, false, false, false, false]]
    ]);

    for (const seed of SEEDS) {
        const random = new JavaRandom(seed);
        assert.deepEqual(
            Array.from({ length: 6 }, () => random.nextBoolean()),
            expected.get(seed)
        );
    }
});

test("JavaRandom.nextInt(bound) rejects nonpositive bounds", () => {
    const random = new JavaRandom(0);

    assert.throws(() => random.nextInt(0), /bound must be positive/);
    assert.throws(() => random.nextInt(-1), /bound must be positive/);
});
