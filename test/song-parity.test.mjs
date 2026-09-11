import assert from "node:assert/strict";
import { test } from "node:test";
import { Music, Song } from "../dist/index.js";

function fakeMusic(name, events, initialTransport = "stopped") {
    const music = Object.create(Music.prototype);
    music.transport = initialTransport;
    music.loop = () => {
        events.push(`${name}.loop`);
        music.transport = "playing";
    };
    music.play = () => {
        events.push(`${name}.play`);
        music.transport = "playing";
    };
    music.playing = () => music.transport === "playing";
    music.getTransportState = () => music.transport;
    music.isTransportActive = () => music.transport === "playing" || music.transport === "paused";
    music.stop = () => {
        events.push(`${name}.stop`);
        music.transport = "stopped";
    };
    return music;
}

test("Song.play stops an active selected part before restarting it", () => {
    const events = [];
    const intro = fakeMusic("intro", events, "playing");
    const song = new Song(intro);

    song.play();

    assert.deepEqual(events, ["intro.stop", "intro.play"]);
    assert.equal(song.playing, true);
});

test("Song.play preserves Java ordering while starting the selected part", () => {
    const events = [];
    let song;
    const intro = fakeMusic("intro", events);
    intro.play = () => {
        events.push(`intro.play songPlaying=${song.playing}`);
        intro.transport = "playing";
    };
    song = new Song(intro);

    song.play();

    assert.deepEqual(events, ["intro.play songPlaying=false"]);
    assert.equal(song.playing, true);
});

test("Song starts an intro2-only song exactly once before its loop", () => {
    const events = [];
    const intro2 = fakeMusic("intro2", events);
    const loop = fakeMusic("loop", events);
    const song = new Song(null, intro2, loop);

    song.play();

    assert.deepEqual(events, ["intro2.play"]);
    assert.equal(song.playedIntro2, true);

    song.update();
    assert.deepEqual(events, ["intro2.play"]);

    intro2.transport = "stopped";
    song.update();

    assert.deepEqual(events, ["intro2.play", "loop.loop"]);
});

test("Song.update does not skip or restart a paused part", () => {
    const events = [];
    const intro = fakeMusic("intro", events, "paused");
    const loop = fakeMusic("loop", events);
    const song = new Song(intro, loop);
    song.playing = true;

    song.update();

    assert.deepEqual(events, []);
    assert.equal(loop.transport, "stopped");
});

test("Song.stop includes paused transports and resets phase flags", () => {
    const events = [];
    const intro = fakeMusic("intro", events, "stopped");
    const intro2 = fakeMusic("intro2", events, "paused");
    const loop = fakeMusic("loop", events, "playing");
    const song = new Song(intro, intro2, loop);

    song.playing = true;
    song.playedIntro2 = true;
    song.stop();

    assert.deepEqual(events, ["intro2.stop", "loop.stop"]);
    assert.equal(song.playing, false);
    assert.equal(song.playedIntro2, false);
});
