import { SoundStore } from "./SoundStore.js";
import { ResourceLoadException, ResourceLoader, type ResourceLoadOptions } from "../util/ResourceLoader.js";

type WebAudioGlobal = typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
};

type SoundStoreInternals = {
    inited: boolean;
    soundWorksFlag: boolean;
    musicEnabled: boolean;
    soundsEnabled: boolean;
    musicVolume: number;
    context: AudioContext | null;
    soundBus: GainNode | null;
    musicBus: GainNode | null;
    buffers: Map<string, Promise<AudioBuffer>>;
    activeHandles: Set<{ stop(): void; suspend?(): void }>;
    musicHandles: Set<{ stop(): void; suspend?(): void }>;
    soundSources: Array<unknown | null>;
    maxSources: number;
    loadAudioBuffer(ref: string, options?: ResourceLoadOptions): Promise<AudioBuffer>;
    stopSoundEffects(): void;
};
/**
 * PWA-specific Web Audio generation owner used by the three browser games.
 *
 * SoundStore's decoded-buffer cache is retained for the page lifetime. This
 * manager replaces only its context-bound playback graph. It also redirects
 * SoundStore audio decoding through OfflineAudioContext so boot preparation does
 * not establish the AudioContext that will later be used for gameplay.
 */
export class PwaAudioManager {
    private static readonly instance = new PwaAudioManager();
    private installed = false;
    private decoder: BaseAudioContext | null = null;
    private originalLoadAudioBuffer: ((ref: string, options?: ResourceLoadOptions) => Promise<AudioBuffer>) | null = null;
    private generation = 0;

    public static get(): PwaAudioManager {
        return PwaAudioManager.instance;
    }

    /** Install decode-only preload semantics once, before a PWA starts preparing resources. */
    public install(): void {
        if (this.installed) {
            return;
        }
        this.installed = true;
        const store = this.store();
        this.originalLoadAudioBuffer = store.loadAudioBuffer.bind(store);
        store.loadAudioBuffer = (ref: string, options: ResourceLoadOptions = {}) => this.loadAudioBuffer(ref, options);
    }

    /** Current physical playback generation number. */
    public getGeneration(): number {
        return this.generation;
    }

    public hasPlaybackGeneration(): boolean {
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
    public beginPlaybackGeneration(protectFromImmediateContainerDestroy = false): Promise<boolean> {
        this.install();
        this.retirePhysicalContext(false);

        const Ctor = globalThis.AudioContext ?? (globalThis as WebAudioGlobal).webkitAudioContext;
        if (!Ctor) {
            return Promise.resolve(false);
        }

        const store = this.store();
        let context: AudioContext | null = null;
        let soundBus: GainNode | null = null;
        let musicBus: GainNode | null = null;
        try {
            context = new Ctor();
            soundBus = context.createGain();
            musicBus = context.createGain();
            soundBus.gain.value = 1;
            musicBus.gain.value = store.musicVolume;
            soundBus.connect(context.destination);
            musicBus.connect(context.destination);
        } catch {
            try {
                soundBus?.disconnect();
            } catch {}
            try {
                musicBus?.disconnect();
            } catch {}
            if (context !== null) {
                try {
                    void context.close().catch(() => undefined);
                } catch {}
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
        store.soundSources = new Array<unknown | null>(store.maxSources).fill(null);

        let resumeOperation: Promise<void>;
        try {
            resumeOperation = Promise.resolve(context.resume());
        } catch {
            resumeOperation = Promise.resolve();
        }

        return resumeOperation.then(
            () => {
                if (this.generation !== generation || store.context !== context) {
                    return false;
                }
                if (protectFromImmediateContainerDestroy && !store.soundWorksFlag) {
                    // If there was no old container, restore ordinary initialized
                    // state after the activation turn. If AL.destroy ran, its later
                    // AL.create() will perform the same initialization instead.
                    store.soundWorksFlag = true;
                }
                return String(context.state) === "running";
            },
            () => false
        );
    }

    /**
     * End gameplay's physical Web Audio generation without clearing decoded
     * AudioBuffers. Music handles are suspended first so their existing Music
     * objects preserve logical position/loop state; SFX are discarded.
     */
    public endPlaybackGeneration(): void {
        this.install();
        const store = this.store();
        for (const handle of Array.from(store.musicHandles)) {
            handle.suspend?.();
        }
        store.stopSoundEffects();
        this.retirePhysicalContext(true);
    }

    private loadAudioBuffer(ref: string, options: ResourceLoadOptions): Promise<AudioBuffer> {
        const store = this.store();
        const existing = store.buffers.get(ref);
        if (existing !== undefined) {
            return this.waitForAbort(existing, options.signal, ref);
        }

        const decoder = this.getDecoder();
        if (decoder === null) {
            return this.originalLoadAudioBuffer!(ref, options);
        }

        const promise = (async (): Promise<AudioBuffer> => {
            this.throwIfAborted(options.signal, ref);
            const bytes = await ResourceLoader.loadResource(ref, options);
            this.throwIfAborted(options.signal, ref);
            try {
                const buffer = await this.decodeAudioData(decoder, bytes.slice(0));
                this.throwIfAborted(options.signal, ref);
                return buffer;
            } catch (error) {
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

    private getDecoder(): BaseAudioContext | null {
        if (this.decoder !== null) {
            return this.decoder;
        }
        const Ctor = globalThis.OfflineAudioContext ?? (globalThis as WebAudioGlobal).webkitOfflineAudioContext;
        if (!Ctor) {
            return null;
        }
        try {
            this.decoder = new Ctor(2, 1, 44100);
            return this.decoder;
        } catch {
            return null;
        }
    }

    private decodeAudioData(context: BaseAudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
        return new Promise<AudioBuffer>((resolve, reject) => {
            let settled = false;
            const succeed = (buffer: AudioBuffer): void => {
                if (!settled) {
                    settled = true;
                    resolve(buffer);
                }
            };
            const fail = (error: unknown): void => {
                if (!settled) {
                    settled = true;
                    reject(error);
                }
            };
            try {
                const result = context.decodeAudioData(bytes, succeed, fail as DecodeErrorCallback);
                if (result && typeof (result as Promise<AudioBuffer>).then === "function") {
                    void (result as Promise<AudioBuffer>).then(succeed, fail);
                }
            } catch (error) {
                fail(error);
            }
        });
    }

    private retirePhysicalContext(markMenu: boolean): void {
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
        store.soundSources = new Array<unknown | null>(store.maxSources).fill(null);
        if (context !== null || soundBus !== null || musicBus !== null) {
            this.generation++;
        }
        try {
            soundBus?.disconnect();
        } catch {}
        try {
            musicBus?.disconnect();
        } catch {}
        if (context !== null) {
            try {
                void context.close().catch(() => undefined);
            } catch {}
        }
    }

    private store(): SoundStoreInternals {
        return SoundStore.get() as unknown as SoundStoreInternals;
    }

    private throwIfAborted(signal: AbortSignal | undefined, ref: string): void {
        if (signal?.aborted) {
            throw this.abortException(ref, signal.reason);
        }
    }

    private abortException(ref: string, cause?: unknown): ResourceLoadException {
        return new ResourceLoadException(`Resource load aborted: ${ref}`, {
            ref,
            url: ResourceLoader.getResource(ref)?.href ?? null,
            kind: "abort",
            phase: "decode",
            cause
        });
    }

    private waitForAbort(promise: Promise<AudioBuffer>, signal: AbortSignal | undefined, ref: string): Promise<AudioBuffer> {
        if (signal === undefined) {
            return promise;
        }
        this.throwIfAborted(signal, ref);
        return new Promise<AudioBuffer>((resolve, reject) => {
            const abort = (): void => {
                signal.removeEventListener("abort", abort);
                reject(this.abortException(ref, signal.reason));
            };
            signal.addEventListener("abort", abort, { once: true });
            void promise.then(
                (value) => {
                    signal.removeEventListener("abort", abort);
                    resolve(value);
                },
                (error) => {
                    signal.removeEventListener("abort", abort);
                    reject(error);
                }
            );
        });
    }
}
