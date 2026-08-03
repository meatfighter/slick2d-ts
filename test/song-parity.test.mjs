import assert from "node:assert/strict";
import { test } from "node:test";
import { Music, Song } from "../dist/index.js";

function fakeMusic(name, events, initiallyPlaying = false) {
    const music = Object.create(Music.prototype);
    music.isPlaying = initiallyPlaying;
    music.loop = () => {
        events.push(`${name}.loop`);
        music.isPlaying = true;
    };
    music.play = () => {
        events.push(`${name}.play`);
        music.isPlaying = true;
    };
    music.playing = () => music.isPlaying;
    music.stop = () => {
        events.push(`${name}.stop`);
        music.isPlaying = false;
    };
    return music;
}

test("Song.play calls stop before starting the selected music part", () => {
    const events = [];
    const intro = fakeMusic("intro", events, true);
    const song = new Song(intro);

    song.play();

    assert.deepEqual(events, ["intro.stop", "intro.play"]);
    assert.equal(song.playing, true);
});

test("Song.play sets playing only after the selected start call", () => {
    const events = [];
    let song;
    const intro = fakeMusic("intro", events);
    intro.play = () => {
        events.push(`intro.play songPlaying=${song.playing}`);
        intro.isPlaying = true;
    };
    song = new Song(intro);

    song.play();

    assert.deepEqual(events, ["intro.play songPlaying=false"]);
    assert.equal(song.playing, true);
});

test("Song preserves Jackal's no-intro intro2 replay lifecycle", () => {
    const events = [];
    const intro2 = fakeMusic("intro2", events);
    const loop = fakeMusic("loop", events);
    const song = new Song(null, intro2, loop);

    song.play();

    assert.deepEqual(events, ["intro2.play"]);
    assert.equal(song.playedIntro2, false);

    song.update();

    assert.deepEqual(events, ["intro2.play", "intro2.play"]);
    assert.equal(song.playedIntro2, true);

    intro2.isPlaying = false;
    song.update();

    assert.deepEqual(events, ["intro2.play", "intro2.play", "loop.loop"]);
});

test("Song.stop only stops music parts that report playing", () => {
    const events = [];
    const intro = fakeMusic("intro", events, false);
    const intro2 = fakeMusic("intro2", events, true);
    const loop = fakeMusic("loop", events, false);
    const song = new Song(intro, intro2, loop);

    song.playing = true;
    song.playedIntro2 = true;
    song.stop();

    assert.deepEqual(events, ["intro2.stop"]);
    assert.equal(song.playing, false);
    assert.equal(song.playedIntro2, false);
});
