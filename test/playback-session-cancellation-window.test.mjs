import assert from "node:assert/strict";
import test from "node:test";
import { PlaybackSession } from "../dist/slick/openal/PlaybackSession.js";

test("external cancel invalidates begin while predecessor retirement is in progress", async (t) => {
    let session;
    let generation = 0;
    let reentered = false;
    const began = [];
    const ended = [];
    const manager = {
        install() {},
        getGeneration() {
            return generation;
        },
        beginPlaybackGeneration(defer) {
            generation++;
            began.push({ generation, defer });
            return Promise.resolve(true);
        },
        commitPlaybackGeneration() {
            return Promise.resolve(true);
        },
        endPlaybackGeneration(expectedGeneration) {
            ended.push(expectedGeneration);
            if (!reentered) {
                reentered = true;
                // cancelActive() has already detached the predecessor at this point.
                // This explicit departure must still invalidate the outer begin().
                session.cancel();
            }
            if (expectedGeneration === generation) {
                generation++;
            }
        },
        setInterruptionHandler() {}
    };

    session = new PlaybackSession(manager, 25);
    t.after(() => session.cancel());

    const first = session.begin();
    assert.equal(await first.ready, true);
    assert.equal(began.length, 1);

    const cancelledReplacement = session.begin();
    assert.equal(await cancelledReplacement.ready, false);
    assert.equal(session.isCurrent(cancelledReplacement), false);
    assert.equal(began.length, 1, "the cancelled begin must not construct a new playback generation");
    assert.deepEqual(ended, [1]);
});
