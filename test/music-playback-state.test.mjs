import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { Music, ResourceLoader, SoundStore } from "../dist/index.js";

class FakeOfflineAudioContext {
    decodeAudioData(_bytes, ok) {
        const buffer = { duration: 42.5 };
        ok?.(buffer);
        return Promise.resolve(buffer);
    }
}

function installOfflineAudio() {
    Object.defineProperty(globalThis, "OfflineAudioContext", {
        configurable: true,
        value: FakeOfflineAudioContext,
        writable: true
    });
}

afterEach(() => {
    Music.resetPlaybackState();
    try {
        SoundStore.get().destroy();
    } catch {}
    ResourceLoader.clearCache();
    delete globalThis.OfflineAudioContext;
});

test("Music exposes persistence-safe playback state without private field access", async () => {
    installOfflineAudio();
    const store = SoundStore.get();
    store.enableExplicitPlaybackGenerations();
    ResourceLoader.registerResource("state.ogg", new Uint8Array([1, 2, 3, 4]));
    const music = new Music("state.ogg");
    await music.ready();

    music.restorePlaybackState({
        transport: "paused",
        looped: true,
        playbackRate: 1.25,
        positionSeconds: 7.5,
        volume: 0.6,
        fade: {
            durationMs: 1000,
            elapsedMs: 250,
            startVolume: 0.8,
            endVolume: 0.2,
            stopAfterFade: false
        }
    });

    assert.equal(music.isLooped(), true);
    assert.equal(music.isPaused(), true);
    assert.equal(music.getPlaybackRate(), 1.25);
    assert.equal(music.getDuration(), 42.5);
    assert.deepEqual(music.capturePlaybackState(), {
        transport: "paused",
        looped: true,
        playbackRate: 1.25,
        positionSeconds: 7.5,
        volume: 0.6,
        fade: {
            durationMs: 1000,
            elapsedMs: 250,
            startVolume: 0.8,
            endVolume: 0.2,
            stopAfterFade: false
        }
    });
});
