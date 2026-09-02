import assert from "node:assert/strict";
import test from "node:test";
import { Music } from "../dist/index.js";

test("Music exposes persistence-safe playback state without private field access", () => {
    const music = Object.create(Music.prototype);
    music.looped = true;
    music.paused = true;
    music.playbackRate = 1.25;
    music.buffer = { duration: 42.5 };

    assert.equal(music.isLooped(), true);
    assert.equal(music.isPaused(), true);
    assert.equal(music.getPlaybackRate(), 1.25);
    assert.equal(music.getDuration(), 42.5);

    music.buffer = null;
    assert.equal(music.getDuration(), null);
});
