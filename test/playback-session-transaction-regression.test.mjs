import assert from "node:assert/strict";
import test from "node:test";
import { PlaybackSession } from "../dist/slick/openal/PlaybackSession.js";

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

async function flush() {
    for (let i = 0; i < 12; i++) {
        await Promise.resolve();
    }
}

function fixture(t, { begin, commit, end } = {}) {
    let serial = 0;
    const timers = new Map();
    t.mock.method(globalThis, "setTimeout", (callback) => {
        const id = ++serial;
        timers.set(id, callback);
        return id;
    });
    t.mock.method(globalThis, "clearTimeout", (id) => timers.delete(id));
    t.mock.method(console, "warn", () => {});
    t.mock.method(console, "error", () => {});
    const events = { began: [], committed: [], ended: [], installed: 0 };
    const manager = {
        generation: 0,
        handler: null,
        install() {
            events.installed++;
        },
        getGeneration() {
            return this.generation;
        },
        beginPlaybackGeneration(defer) {
            this.generation++;
            events.began.push({ generation: this.generation, defer });
            return begin?.(this, events) ?? Promise.resolve(true);
        },
        commitPlaybackGeneration(generation) {
            events.committed.push(generation);
            return commit?.(this, events) ?? Promise.resolve(true);
        },
        endPlaybackGeneration(generation) {
            events.ended.push(generation);
            if (end) {
                end(this, events);
            }
            if (generation === this.generation) {
                this.generation++;
            }
        },
        setInterruptionHandler(handler) {
            this.handler = handler;
        }
    };
    const session = new PlaybackSession(manager, 25);
    t.after(() => session.cancel());
    return {
        session,
        manager,
        events,
        timers,
        expire() {
            const callbacks = [...timers.values()];
            timers.clear();
            callbacks.forEach((callback) => callback());
        }
    };
}

test("fresh context construction stays in the synchronous activation call", async (t) => {
    const f = fixture(t);
    const attempt = f.session.begin();
    assert.deepEqual(f.events.began, [{ generation: 1, defer: true }]);
    assert.equal(await attempt.ready, true);
    assert.equal(await f.session.commit(attempt), true);
    assert.equal(f.timers.size, 0);
});

test("synchronous commit exception is handled and can enter a bounded silent fallback", async (t) => {
    const f = fixture(t, {
        commit(_manager, events) {
            if (events.committed.length === 1) {
                throw new Error("graph attachment failed synchronously");
            }
            return Promise.resolve(false);
        }
    });
    const attempt = f.session.begin();
    await attempt.ready;
    assert.equal(await f.session.commit(attempt), true);
    assert.equal(f.events.committed.length, 2);
    assert.equal(f.events.ended.length, 1);
    assert.equal(f.timers.size, 0);
});

test("silent fallback has its own deadline and fails closed when it never settles", async (t) => {
    const f = fixture(t, {
        commit(_manager, events) {
            return events.committed.length === 1 ? Promise.reject(new Error("attach failed")) : new Promise(() => {});
        }
    });
    const attempt = f.session.begin();
    await attempt.ready;
    const committed = f.session.commit(attempt);
    await flush();
    assert.equal(f.events.committed.length, 2);
    assert.equal(f.timers.size, 1);
    f.expire();
    await flush();
    let result;
    void committed.then((value) => {
        result = value;
    });
    await flush();
    assert.equal(result, false, "the fallback must settle instead of leaving STARTING stuck");
    assert.equal(f.session.isCurrent(attempt), false);
    assert.equal(f.timers.size, 0);
});

test("rejected silent fallback is failure, not permission to resume gameplay", async (t) => {
    const f = fixture(t, {
        commit(_manager, events) {
            return Promise.reject(new Error(events.committed.length === 1 ? "attach failed" : "silent clock failed"));
        }
    });
    const attempt = f.session.begin();
    await attempt.ready;
    assert.equal(await f.session.commit(attempt), false);
    assert.equal(f.session.isCurrent(attempt), false);
});

test("duplicate commit callers share one in-flight transaction", async (t) => {
    const pending = deferred();
    const f = fixture(t, { commit: () => pending.promise });
    const attempt = f.session.begin();
    await attempt.ready;
    const first = f.session.commit(attempt);
    const second = f.session.commit(attempt);
    assert.equal(first, second);
    pending.resolve(true);
    assert.equal(await first, true);
    assert.equal(f.events.committed.length, 1);
    assert.equal(await f.session.commit(attempt), true);
    assert.equal(f.events.committed.length, 1);
});

for (const settleOld of ["resolve", "reject"]) {
    test(`cancelled fallback ${settleOld} cannot retire its replacement`, async (t) => {
        const old = deferred();
        const f = fixture(t, {
            commit(_manager, events) {
                if (events.committed.length === 1) {
                    return Promise.reject(new Error("attach failed"));
                }
                return events.committed.length === 2 ? old.promise : Promise.resolve(true);
            }
        });
        const first = f.session.begin();
        await first.ready;
        const oldCommit = f.session.commit(first);
        await flush();
        f.session.cancel();
        const replacement = f.session.begin();
        await replacement.ready;
        assert.equal(await f.session.commit(replacement), true);
        const generation = f.manager.getGeneration();
        const ends = f.events.ended.length;
        old[settleOld](settleOld === "resolve" ? true : new Error("old failure"));
        assert.equal(await oldCommit, false);
        await flush();
        assert.equal(f.manager.getGeneration(), generation);
        assert.equal(f.events.ended.length, ends);
        assert.equal(f.session.isCurrent(replacement), true);
    });
}

test("cancelling preparation settles ready before an unresolved native resume", async (t) => {
    const pending = deferred();
    const f = fixture(t, { begin: () => pending.promise });
    const attempt = f.session.begin();
    f.session.cancel();
    assert.equal(await attempt.ready, false);
    pending.resolve(true);
    await flush();
    assert.equal(f.session.isCurrent(attempt), false);
    assert.equal(f.events.committed.length, 0);
});

test("late preparation rejection cannot damage a later accepted attempt", async (t) => {
    const pending = deferred();
    const f = fixture(t, { begin: (_manager, events) => (events.began.length === 1 ? pending.promise : Promise.resolve(true)) });
    const first = f.session.begin();
    const second = f.session.begin();
    assert.equal(await first.ready, false);
    await second.ready;
    assert.equal(await f.session.commit(second), true);
    const generation = f.manager.getGeneration();
    pending.reject(new Error("obsolete resume rejected"));
    await flush();
    assert.equal(f.manager.getGeneration(), generation);
    assert.equal(f.session.isCurrent(second), true);
});

test("retirement failure settles readiness and blocks subsequent starts", async (t) => {
    const f = fixture(t, {
        begin: () => Promise.resolve(false),
        end: () => {
            throw new Error("ownership could not be retired");
        }
    });
    const attempt = f.session.begin();
    let ready;
    void attempt.ready.then((value) => {
        ready = value;
    });
    await flush();
    assert.equal(ready, false);
    assert.equal(await f.session.begin().ready, false);
    assert.equal(f.events.began.length, 1);
    assert.equal(f.events.ended.length, 1);
});

test("synchronous departure during native construction retires the newly assigned context", async (t) => {
    let session;
    const f = fixture(t, {
        begin: () => {
            session.cancel();
            return Promise.resolve(true);
        }
    });
    session = f.session;
    const attempt = session.begin();
    assert.equal(await attempt.ready, false);
    await flush();
    assert.equal(session.isCurrent(attempt), false);
    assert.ok(f.events.ended.includes(1), "cancel must retire the generation assigned during construction");
});

test("reentrant begin during native construction cannot replace the outer transaction", async (t) => {
    let session;
    let rejected;
    const f = fixture(t, {
        begin: () => {
            rejected = session.begin();
            return Promise.resolve(true);
        }
    });
    session = f.session;
    const accepted = session.begin();
    assert.equal(await rejected.ready, false);
    assert.equal(await accepted.ready, true);
    assert.equal(f.events.began.length, 1);
    assert.equal(session.isCurrent(accepted), true);
});

test("only the accepted current generation can deliver an interruption", async (t) => {
    const f = fixture(t);
    const reasons = [];
    f.session.setInterruptionHandler((reason) => reasons.push(reason));
    const attempt = f.session.begin();
    await attempt.ready;
    f.manager.handler("initial-suspend", f.manager.getGeneration());
    assert.deepEqual(reasons, []);
    await f.session.commit(attempt);
    f.manager.handler("obsolete", f.manager.getGeneration() - 1);
    f.manager.handler("current-interruption", f.manager.getGeneration());
    assert.deepEqual(reasons, ["current-interruption"]);
    f.session.cancel();
    f.manager.handler("closed", f.manager.getGeneration());
    assert.deepEqual(reasons, ["current-interruption"]);
});

test("fulfilled false commits a deliberate silent session without redundant retirement", async (t) => {
    const f = fixture(t, { commit: () => Promise.resolve(false) });
    const attempt = f.session.begin();
    await attempt.ready;
    assert.equal(await f.session.commit(attempt), true);
    assert.equal(f.events.committed.length, 1);
    assert.equal(f.events.ended.length, 0);
});

test("reentrant commit sees the already published shared completion", async (t) => {
    let attempt;
    let session;
    let inner;
    const f = fixture(t, {
        commit: () => {
            inner = session.commit(attempt);
            return Promise.resolve(true);
        }
    });
    session = f.session;
    attempt = session.begin();
    await attempt.ready;
    const outer = session.commit(attempt);
    assert.equal(outer, inner);
    assert.equal(await outer, true);
    assert.equal(f.events.committed.length, 1);
});

test("a replacement started by a teardown hook is not overwritten by the outer begin", async (t) => {
    let session;
    let replacement;
    let reentered = false;
    const f = fixture(t, {
        end: () => {
            if (!reentered) {
                reentered = true;
                replacement = session.begin();
            }
        }
    });
    session = f.session;
    const first = session.begin();
    await first.ready;
    const superseded = session.begin();
    assert.equal(await superseded.ready, false);
    assert.equal(await replacement.ready, true);
    assert.equal(session.isCurrent(replacement), true);
    assert.equal(f.events.began.length, 2);
});

test("external generation replacement invalidates an otherwise matching interruption callback", async (t) => {
    const f = fixture(t);
    const reasons = [];
    f.session.setInterruptionHandler((reason) => reasons.push(reason));
    const attempt = f.session.begin();
    await attempt.ready;
    await f.session.commit(attempt);
    const retiredGeneration = f.manager.getGeneration();
    f.manager.generation++;
    f.manager.handler("stale-context", retiredGeneration);
    assert.deepEqual(reasons, []);
});
