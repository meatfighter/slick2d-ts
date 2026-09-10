import { SoundStore } from "./SoundStore.js";
import { ResourceLoadException, ResourceLoader } from "../util/ResourceLoader.js";
/**
 * PWA-specific Web Audio generation owner used by the three browser games.
 *
 * SoundStore's decoded-buffer cache is retained for the page lifetime. This
 * manager replaces only its context-bound playback graph. It also redirects
 * SoundStore audio decoding through OfflineAudioContext so boot preparation does
 * not establish the AudioContext that will later be used for gameplay.
 */
export class PwaAudioManager {
    static instance = new PwaAudioManager();
    installed = false;
    decoder = null;
    originalLoadAudioBuffer = null;
    generation = 0;
    static get() {
        return PwaAudioManager.instance;
    }
    /** Install decode-only preload semantics once, before a PWA starts preparing resources. */
    install() {
        if (this.installed) {
            return;
        }
        this.installed = true;
        const store = this.store();
        this.originalLoadAudioBuffer = store.loadAudioBuffer.bind(store);
        store.loadAudioBuffer = (ref, options = {}) => this.loadAudioBuffer(ref, options);
    }
    /** Current physical playback generation number. */
    getGeneration() {
        return this.generation;
    }
    hasPlaybackGeneration() {
        const context = this.store().context;
        return context !== null && String(context.state) !== "closed";
    }
    /**
     * Create a brand-new playback context from a New Game/Continue activation.
     * Construction and native resume() invocation happen synchronously before the
     * returned Promise can yield, which is the user-activation property validated
     * by the standalone 008 game-shell test.
     *
     * protectFromImmediateContainerDestroy covers Ms. Pac-Man's existing launch
     * ordering: it creates audio immediately before synchronously destroying a
     * retained old container. During that narrow turn soundWorks is false, so the
     * old container's BrowserAudioLifecycle teardown cannot suspend the new context.
     */
    beginPlaybackGeneration(protectFromImmediateContainerDestroy = false) {
        this.install();
        this.retirePhysicalContext(false);
        const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!Ctor) {
            return Promise.resolve(false);
        }
        const store = this.store();
        let context = null;
        let soundBus = null;
        let musicBus = null;
        try {
            context = new Ctor();
            soundBus = context.createGain();
            musicBus = context.createGain();
            soundBus.gain.value = 1;
            musicBus.gain.value = store.musicVolume;
            soundBus.connect(context.destination);
            musicBus.connect(context.destination);
        }
        catch {
            try {
                soundBus?.disconnect();
            }
            catch { }
            try {
                musicBus?.disconnect();
            }
            catch { }
            if (context !== null) {
                try {
                    void context.close().catch(() => undefined);
                }
                catch { }
            }
            return Promise.resolve(false);
        }
        const generation = ++this.generation;
        store.context = context;
        store.soundBus = soundBus;
        store.musicBus = musicBus;
        store.inited = true;
        store.soundWorksFlag = !protectFromImmediateContainerDestroy;
        store.soundsEnabled = true;
        store.musicEnabled = true;
        store.soundSources = new Array(store.maxSources).fill(null);
        let resumeOperation;
        try {
            resumeOperation = Promise.resolve(context.resume());
        }
        catch {
            resumeOperation = Promise.resolve();
        }
        return resumeOperation.then(() => {
            if (this.generation !== generation || store.context !== context) {
                return false;
            }
            if (protectFromImmediateContainerDestroy && !store.soundWorksFlag) {
                store.soundWorksFlag = true;
            }
            return String(context.state) === "running";
        }, () => false);
    }
    /**
     * End gameplay's physical Web Audio generation without clearing decoded
     * AudioBuffers. Music handles are suspended first so their existing Music
     * objects preserve logical position/loop state; SFX are discarded.
     */
    endPlaybackGeneration() {
        this.install();
        const store = this.store();
        for (const handle of Array.from(store.musicHandles)) {
            handle.suspend?.();
        }
        store.stopSoundEffects();
        this.retirePhysicalContext(true);
    }
    loadAudioBuffer(ref, options) {
        const store = this.store();
        const existing = store.buffers.get(ref);
        if (existing !== undefined) {
            return this.waitForAbort(existing, options.signal, ref);
        }
        const decoder = this.getDecoder();
        if (decoder === null) {
            return this.originalLoadAudioBuffer(ref, options);
        }
        const promise = (async () => {
            this.throwIfAborted(options.signal, ref);
            const bytes = await ResourceLoader.loadResource(ref, options);
            this.throwIfAborted(options.signal, ref);
            try {
                const buffer = await this.decodeAudioData(decoder, bytes.slice(0));
                this.throwIfAborted(options.signal, ref);
                return buffer;
            }
            catch (error) {
                if (error instanceof ResourceLoadException) {
                    throw error;
                }
                if (options.signal?.aborted) {
                    throw this.abortException(ref, options.signal.reason ?? error);
                }
                throw new ResourceLoadException(`Failed to load audio: ${ref}`, {
                    ref,
                    url: ResourceLoader.getResource(ref)?.href ?? null,
                    kind: "decode",
                    phase: "decode",
                    cause: error
                });
            }
        })().catch((error) => {
            if (store.buffers.get(ref) === promise) {
                store.buffers.delete(ref);
            }
            throw error;
        });
        store.buffers.set(ref, promise);
        return this.waitForAbort(promise, options.signal, ref);
    }
    getDecoder() {
        if (this.decoder !== null) {
            return this.decoder;
        }
        const Ctor = globalThis.OfflineAudioContext ?? globalThis.webkitOfflineAudioContext;
        if (!Ctor) {
            return null;
        }
        try {
            this.decoder = new Ctor(2, 1, 44100);
            return this.decoder;
        }
        catch {
            return null;
        }
    }
    decodeAudioData(context, bytes) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const succeed = (buffer) => {
                if (!settled) {
                    settled = true;
                    resolve(buffer);
                }
            };
            const fail = (error) => {
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            };
            try {
                const result = context.decodeAudioData(bytes, succeed, fail);
                if (result && typeof result.then === "function") {
                    void result.then(succeed, fail);
                }
            }
            catch (error) {
                fail(error);
            }
        });
    }
    retirePhysicalContext(markMenu) {
        const store = this.store();
        const context = store.context;
        const soundBus = store.soundBus;
        const musicBus = store.musicBus;
        store.context = null;
        store.soundBus = null;
        store.musicBus = null;
        store.inited = markMenu;
        store.soundWorksFlag = false;
        store.soundsEnabled = false;
        store.musicEnabled = false;
        store.soundSources = new Array(store.maxSources).fill(null);
        if (context !== null || soundBus !== null || musicBus !== null) {
            this.generation++;
        }
        try {
            soundBus?.disconnect();
        }
        catch { }
        try {
            musicBus?.disconnect();
        }
        catch { }
        if (context !== null) {
            try {
                void context.close().catch(() => undefined);
            }
            catch { }
        }
    }
    store() {
        return SoundStore.get();
    }
    throwIfAborted(signal, ref) {
        if (signal?.aborted) {
            throw this.abortException(ref, signal.reason);
        }
    }
    abortException(ref, cause) {
        return new ResourceLoadException(`Resource load aborted: ${ref}`, {
            ref,
            url: ResourceLoader.getResource(ref)?.href ?? null,
            kind: "abort",
            phase: "decode",
            cause
        });
    }
    waitForAbort(promise, signal, ref) {
        if (signal === undefined) {
            return promise;
        }
        this.throwIfAborted(signal, ref);
        return new Promise((resolve, reject) => {
            const abort = () => {
                signal.removeEventListener("abort", abort);
                reject(this.abortException(ref, signal.reason));
            };
            signal.addEventListener("abort", abort, { once: true });
            void promise.then((value) => {
                signal.removeEventListener("abort", abort);
                resolve(value);
            }, (error) => {
                signal.removeEventListener("abort", abort);
                reject(error);
            });
        });
    }
}
//# sourceMappingURL=PwaAudioManager.js.map
