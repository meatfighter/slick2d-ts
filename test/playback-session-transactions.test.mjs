import assert from "node:assert/strict";
import test from "node:test";
import { PlaybackSession } from "../dist/slick/openal/PlaybackSession.js";

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

async function flush() {
    for (let i = 0; i < 12; i++) {
        await Promise.resolve();
    }
}

class Manager {
    generation = 0;
    context = false;
    installed = 0;
    starts = [];
    commits = [];
    retired = [];
    beginOperation = () => Promise.resolve(true);
    commitOperation = () => Promise.resolve(this.context);
    retirementFailure = false;

    install() {
        this.installed++;
    }

    getGeneration() {
        return this.generation;
    }

    beginPlaybackGeneration(deferPlayback) {
        this.starts.push(deferPlayback);
        this.generation++;
        this.context = true;
        return this.beginOperation();
    }

    commitPlaybackGeneration(generation) {
        this.commits.push(generation);
        return this.commitOperation();
    }

    endPlaybackGeneration(expected) {
        if (expected !== this.generation) {
            return;
        }
        if (this.retirementFailure) {
            throw new Error("retirement failed");
        }
        this.retired.push(expected);
        this.generation++;
        this.context = false;
    }

    setInterruptionHandler(handler) {
        this.interrupted = handler;
    }
}

function fixture(t) {
    t.mock.method(console, "warn", () => {});
    t.mock.method(console, "error", () => {});
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const manager = new Manager();
    const session = new PlaybackSession(manager, 10);
    return { manager, session };
}

async function resultAfter(promise, action) {
    let result = "pending";
    void promise.then((value) => {
        result = value;
    });
    await action();
    await flush();
    return result;
}

test("playback context starts synchronously, remains deferred, and commits once", async (t) => {
    const { manager, session } = fixture(t);
    const attempt = session.begin();
    assert.deepEqual(manager.starts, [true]);
    assert.deepEqual(manager.commits, []);
    assert.equal(await attempt.ready, true);
    assert.equal(await session.commit(attempt), true);
    assert.equal(await session.commit(attempt), true);
    assert.equal(manager.commits.length, 1);
});

test("ordinary unavailable audio is accepted silently without an extra commit retirement", async (t) => {
    const { manager, session } = fixture(t);
    manager.beginOperation = () => Promise.resolve(false);
    const attempt = session.begin();
    assert.equal(await attempt.ready, true);
    assert.equal(manager.context, false);
    const retired = manager.retired.length;
    assert.equal(await session.commit(attempt), true);
    assert.equal(manager.commits.length, 1);
    assert.equal(manager.retired.length, retired);
});

for (const synchronous of [true, false]) {
    test(`${synchronous ? "synchronous" : "rejected"} commit failure enters one bounded silent fallback`, async (t) => {
        const { manager, session } = fixture(t);
        const attempt = session.begin();
        await attempt.ready;
        let calls = 0;
        manager.commitOperation = () => {
            if (++calls === 1) {
                if (synchronous) {
                    throw new Error("attach failed");
                }
                return Promise.reject(new Error("attach failed"));
            }
            return Promise.resolve(false);
        };
        assert.equal(await session.commit(attempt), true);
        assert.equal(calls, 2);
        assert.equal(manager.retired.length, 1);
        assert.equal(manager.context, false);
    });
}

test("concurrent commits share the same operation and completion", async (t) => {
    const { manager, session } = fixture(t);
    const pending = deferred();
    const attempt = session.begin();
    await attempt.ready;
    manager.commitOperation = () => pending.promise;
    const first = session.commit(attempt);
    const second = session.commit(attempt);
    assert.equal(first, second);
    assert.equal(manager.commits.length, 1);
    pending.resolve(true);
    assert.equal(await first, true);
    assert.equal(await second, true);
});

test("timed-out commit also bounds a stalled silent fallback", async (t) => {
    const { manager, session } = fixture(t);
    const attempt = session.begin();
    await attempt.ready;
    manager.commitOperation = () => new Promise(() => {});
    const committed = session.commit(attempt);
    await flush();
    t.mock.timers.tick(10);
    await flush();
    assert.equal(manager.commits.length, 2);
    assert.equal(await resultAfter(committed, () => t.mock.timers.tick(10)), false);
    assert.equal(session.isCurrent(attempt), false);
    assert.equal(manager.context, false);
});

test("cancelled silent fallback settles without waiting for its native promise", async (t) => {
    const { manager, session } = fixture(t);
    const attempt = session.begin();
    await attempt.ready;
    manager.commitOperation = () => new Promise(() => {});
    const committed = session.commit(attempt);
    await flush();
    t.mock.timers.tick(10);
    await flush();
    assert.equal(manager.commits.length, 2);
    assert.equal(await resultAfter(committed, () => session.cancel()), false);
    assert.equal(session.isCurrent(attempt), false);
});

test("rejected silent fallback cancels instead of claiming successful gameplay", async (t) => {
    const { manager, session } = fixture(t);
    const attempt = session.begin();
    await attempt.ready;
    manager.commitOperation = () => Promise.reject(new Error("both commits failed"));
    assert.equal(await session.commit(attempt), false);
    assert.equal(manager.commits.length, 2);
    assert.equal(session.isCurrent(attempt), false);
});

test("old activation rejection cannot retire the new attempt", async (t) => {
    const { manager, session } = fixture(t);
    const old = deferred();
    manager.beginOperation = () => old.promise;
    const first = session.begin();
    session.cancel();
    manager.beginOperation = () => Promise.resolve(true);
    const second = session.begin();
    assert.equal(await second.ready, true);
    assert.equal(await session.commit(second), true);
    const generation = manager.generation;
    const retired = manager.retired.length;
    old.reject(new Error("obsolete native rejection"));
    assert.equal(await first.ready, false);
    await flush();
    assert.equal(manager.generation, generation);
    assert.equal(manager.retired.length, retired);
    assert.equal(session.isCurrent(second), true);
});

test("late rejected commit cannot retire a replacement generation", async (t) => {
    const { manager, session } = fixture(t);
    const pending = deferred();
    const first = session.begin();
    await first.ready;
    manager.commitOperation = () => pending.promise;
    const committed = session.commit(first);
    session.cancel();
    manager.commitOperation = () => Promise.resolve(true);
    const second = session.begin();
    await second.ready;
    await session.commit(second);
    const generation = manager.generation;
    const retired = manager.retired.length;
    pending.reject(new Error("obsolete attach rejection"));
    assert.equal(await committed, false);
    assert.equal(manager.generation, generation);
    assert.equal(manager.retired.length, retired);
    assert.equal(session.isCurrent(second), true);
});

test("failed prepare retirement settles readiness and invalidates the attempt", async (t) => {
    const { manager, session } = fixture(t);
    manager.beginOperation = () => Promise.resolve(false);
    manager.retirementFailure = true;
    const attempt = session.begin();
    assert.equal(await attempt.ready, false);
    assert.equal(session.isCurrent(attempt), false);
    assert.throws(() => session.assertRetirementSafe(), /Playback retirement failed/);
    assert.equal(await session.begin().ready, false);
});

test("cancel settles readiness and exposes manager retirement failure", async (t) => {
    const { manager, session } = fixture(t);
    manager.beginOperation = () => new Promise(() => {});
    const attempt = session.begin();
    manager.retirementFailure = true;

    assert.throws(() => session.cancel(), /Playback retirement failed/);
    assert.equal(await attempt.ready, false);
    assert.equal(session.isCurrent(attempt), false);
    assert.throws(() => session.assertRetirementSafe(), /Playback retirement failed/);
    assert.throws(() => session.cancel(), /Playback retirement failed/);
});

test("interruption notifications only reach the current committing or committed generation", async (t) => {
    const { manager, session } = fixture(t);
    const reasons = [];
    session.setInterruptionHandler((reason) => reasons.push(reason));
    const attempt = session.begin();
    manager.interrupted("starting", manager.generation);
    await attempt.ready;
    await session.commit(attempt);
    manager.interrupted("obsolete", manager.generation - 1);
    manager.interrupted("current", manager.generation);
    session.cancel();
    manager.interrupted("retired", manager.generation - 1);
    assert.deepEqual(reasons, ["current"]);
});
