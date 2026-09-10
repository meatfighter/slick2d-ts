import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the production generation methods with deterministic hardware failures.
function loadStore(AudioContext) {
    const path = new URL("../src/slick/openal/SoundStore.ts", import.meta.url);
    const source = ts.createSourceFile(path.pathname, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const owner = source.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === "SoundStore");
    assert.ok(owner);
    const names = new Set([
        "get",
        "enableExplicitPlaybackGenerations",
        "beginPlaybackGenerationFromUserGesture",
        "endPlaybackGeneration",
        "setMusicOn",
        "setSoundsOn",
        "musicOn",
        "soundsOn",
        "soundWorks",
        "hasPlaybackGeneration",
        "stopSoundEffects",
        "completePlaybackGenerationStart",
        "isGenerationContext",
        "invalidateAndRetirePlaybackContext",
        "retirePlaybackContext",
        "resetSoundSources",
        "cleanupBus",
        "closeContext"
    ]);
    const members = owner.members.filter((node) => ts.isPropertyDeclaration(node) || names.has(node.name?.getText(source)));
    for (const name of names) {
        assert.ok(members.some((node) => node.name?.getText(source) === name), `Missing SoundStore method: ${name}`);
    }
    const program = `class SoundStore { ${members.map((node) => node.getText(source)).join("\n")} } globalThis.store = SoundStore.get();`;
    const context = vm.createContext({ AudioContext });
    const compiled = ts.transpileModule(program, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } });
    vm.runInContext(compiled.outputText, context);
    return {
        store: context.store,
        setHardware: (ctor) => {
            context.AudioContext = ctor;
        }
    };
}

class WorkingContext {
    constructor() {
        this.state = "suspended";
        this.destination = {};
    }
    createGain() {
        return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }
    resume() {
        this.state = "running";
        return Promise.resolve();
    }
    close() {
        this.state = "closed";
        return Promise.resolve();
    }
}

class FailedConstructor {
    constructor() {
        throw new Error("hardware unavailable");
    }
}

class FailedGain extends WorkingContext {
    createGain() {
        throw new Error("gain unavailable");
    }
}

const failures = [
    ["missing API", undefined],
    ["constructor failure", FailedConstructor],
    ["gain-node failure", FailedGain]
];

for (const [name, ctor] of failures) {
    test(`first PWA ${name} preserves logical audio defaults`, async () => {
        const { store } = loadStore(ctor);
        assert.equal(await store.beginPlaybackGenerationFromUserGesture(), false);
        assert.equal(store.hasPlaybackGeneration(), false);
        assert.equal(store.soundWorks(), false);
        assert.equal(store.musicOn(), true);
        assert.equal(store.soundsOn(), true);
    });

    test(`Continue restores intended audio after first PWA ${name}`, async () => {
        const { store, setHardware } = loadStore(ctor);
        assert.equal(await store.beginPlaybackGenerationFromUserGesture(), false);
        const musicOn = store.musicOn();
        const soundsOn = store.soundsOn();
        store.setMusicOn(false);
        store.setSoundsOn(false);
        store.endPlaybackGeneration();
        setHardware(WorkingContext);
        assert.equal(await store.beginPlaybackGenerationFromUserGesture(), true);
        store.setMusicOn(musicOn);
        store.setSoundsOn(soundsOn);
        assert.equal(store.musicOn(), true);
        assert.equal(store.soundsOn(), true);
    });
}

test("successful PWA retry does not overwrite an intentional disabled-audio choice", async () => {
    const { store, setHardware } = loadStore(undefined);
    await store.beginPlaybackGenerationFromUserGesture();
    store.setMusicOn(false);
    store.setSoundsOn(false);
    setHardware(WorkingContext);
    assert.equal(await store.beginPlaybackGenerationFromUserGesture(), true);
    assert.equal(store.musicOn(), false);
    assert.equal(store.soundsOn(), false);
});

test("physical generation replacement retains independently selected music and sound flags", async () => {
    const { store } = loadStore(WorkingContext);
    assert.equal(await store.beginPlaybackGenerationFromUserGesture(), true);
    store.setMusicOn(false);
    store.setSoundsOn(true);
    store.endPlaybackGeneration();
    assert.equal(await store.beginPlaybackGenerationFromUserGesture(), true);
    assert.equal(store.musicOn(), false);
    assert.equal(store.soundsOn(), true);
});
