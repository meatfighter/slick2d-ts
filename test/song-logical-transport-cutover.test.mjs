import assert from "node:assert/strict";
import test from "node:test";
import { Song } from "../dist/slick/support/Song.js";

function music(transport = "stopped") {
    return {
        transport,
        starts: 0,
        loops: 0,
        stops: 0,
        getTransportState() {
            return this.transport;
        },
        isTransportActive() {
            return this.transport === "playing" || this.transport === "paused";
        },
        play() {
            this.starts++;
            this.transport = "playing";
        },
        loop() {
            this.loops++;
            this.transport = "playing";
        },
        stop() {
            this.stops++;
            this.transport = "stopped";
        }
    };
}

function song(intro, intro2, loop) {
    return Object.assign(Object.create(Song.prototype), { intro, intro2, loop, playing: false, playedIntro2: false });
}

test("a paused intro does not advance to the loop", () => {
    const intro = music("paused");
    const loop = music();
    const value = song(intro, null, loop);
    value.playing = true;
    value.update();
    assert.equal(loop.loops, 0);
    assert.equal(value.playing, true);
});

test("a logically playing but physically detached intro remains current", () => {
    const intro = music("playing");
    const second = music();
    const value = song(intro, second, music());
    value.playing = true;
    value.update();
    assert.equal(second.starts, 0);
});

test("an intro2-only song starts its intro once", () => {
    const second = music();
    const loop = music();
    const value = song(null, second, loop);
    value.play();
    value.update();
    assert.equal(second.starts, 1);
    assert.equal(value.playedIntro2, true);
    assert.equal(loop.loops, 0);
    second.transport = "ended-pending";
    value.update();
    value.update();
    assert.equal(loop.loops, 1);
});

test("stop includes paused transports", () => {
    const intro = music("paused");
    const value = song(intro, null, null);
    value.playing = true;
    value.stop();
    assert.equal(intro.stops, 1);
    assert.equal(value.playing, false);
});

test("a paused loop is not restarted by the sequencer", () => {
    const loop = music("paused");
    const value = song(null, null, loop);
    value.playing = true;
    value.update();
    assert.equal(loop.loops, 0);
});

test("an empty song never claims to be playing", () => {
    const value = song(null, null, null);
    value.play();
    assert.equal(value.playing, false);
});
