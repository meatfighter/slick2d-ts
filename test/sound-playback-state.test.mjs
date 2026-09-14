import assert from "node:assert/strict";
import test from "node:test";
import { copySoundPlaybackSnapshot, isSoundPlaybackSnapshot, isSoundVoicePlaybackSnapshot } from "../dist/slick/SoundPlaybackState.js";

const voice = {
    looped: false,
    playbackRate: 1,
    positionSeconds: 1.25,
    gain: 0.75,
    spatialPosition: null
};

test("sound playback snapshot accepts empty and polyphonic logical state", () => {
    assert.equal(isSoundPlaybackSnapshot({ voices: [], activeVoiceIndex: null }), true);
    assert.equal(isSoundPlaybackSnapshot({ voices: [voice, { ...voice, looped: true }], activeVoiceIndex: 1 }), true);
    assert.equal(isSoundPlaybackSnapshot({ voices: [voice], activeVoiceIndex: null }), true);
});

test("sound playback snapshot rejects invalid active indexes and malformed voices", () => {
    assert.equal(isSoundPlaybackSnapshot({ voices: [], activeVoiceIndex: 0 }), false);
    assert.equal(isSoundPlaybackSnapshot({ voices: [voice], activeVoiceIndex: -1 }), false);
    assert.equal(isSoundPlaybackSnapshot({ voices: [voice], activeVoiceIndex: 1 }), false);
    assert.equal(isSoundPlaybackSnapshot({ voices: [{ ...voice, playbackRate: 0.2 }], activeVoiceIndex: 0 }), false);
    assert.equal(isSoundPlaybackSnapshot({ voices: [{ ...voice, positionSeconds: -1 }], activeVoiceIndex: 0 }), false);
    assert.equal(isSoundPlaybackSnapshot({ voices: [{ ...voice, gain: -1 }], activeVoiceIndex: 0 }), false);
    assert.equal(isSoundPlaybackSnapshot({ voices: [{ ...voice, positionSeconds: Number.NaN }], activeVoiceIndex: 0 }), false);
    assert.equal(isSoundPlaybackSnapshot({ voices: [{ ...voice, gain: Number.POSITIVE_INFINITY }], activeVoiceIndex: 0 }), false);
});

test("sound voice snapshot validates optional spatial coordinates", () => {
    assert.equal(isSoundVoicePlaybackSnapshot({ ...voice, spatialPosition: { x: 1, y: -2, z: 3 } }), true);
    assert.equal(isSoundVoicePlaybackSnapshot({ ...voice, spatialPosition: { x: Number.NaN, y: 0, z: 0 } }), false);
    assert.equal(isSoundVoicePlaybackSnapshot({ ...voice, spatialPosition: { x: 0, y: 0 } }), false);
});

test("sound playback snapshot rejects excessive voice counts", () => {
    assert.equal(isSoundPlaybackSnapshot({ voices: new Array(4097).fill(voice), activeVoiceIndex: null }), false);
});

test("copySoundPlaybackSnapshot deeply detaches spatial state", () => {
    const original = {
        voices: [{ ...voice, spatialPosition: { x: 1, y: 2, z: 3 } }],
        activeVoiceIndex: 0
    };
    const copied = copySoundPlaybackSnapshot(original);

    original.voices[0].spatialPosition.x = 99;

    assert.equal(copied.voices[0].spatialPosition.x, 1);
    assert.notEqual(copied.voices, original.voices);
    assert.notEqual(copied.voices[0], original.voices[0]);
});
