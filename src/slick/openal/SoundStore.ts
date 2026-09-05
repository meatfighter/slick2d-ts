import { ResourceLoadException, ResourceLoader, type ResourceLoadOptions } from "../util/ResourceLoader.js";
import { runSettledBatch } from "../util/BatchLoader.js";
import { Log } from "../util/Log.js";

type WebAudioGlobal = typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

type AudioPosition = {
    x: number;
    y: number;
    z: number;
};

export type AudioPreloadProgress = {
    ref: string;
    loaded: number;
    total: number;
};

export interface AudioPreloadOptions extends ResourceLoadOptions {
    readonly onProgress?: (progress: AudioPreloadProgress) => void;
    readonly concurrency?: number;
}

/**
 * Browser Web Audio playback handle.
 */
export interface AudioPlaybackHandle {
    /** Browser parity helper: logical OpenAL source slot, when this handle owns one. */
    readonly sourceId?: number;
    /** Stops playback if the source has started. */
    stop(): void;
    /** Pauses playback when supported by the handle. */
    pause?(): void;
    /** Suspends audible playback for global music-off without changing public Music.pause() state. */
    suspend?(): void;
    /** Resumes playback when supported by the handle. */
    resume?(): void;
    /** Returns true while the source is active. */
    playing(): boolean;
    /** Browser parity helper: returns the fixed per-source gain assigned when playback started. */
    getGain?(): number;
}

/**
 * Java Slick2D counterpart: org.newdawn.slick.openal.SoundStore.
 *
 * Browser Web Audio subsystem singleton and compatibility state holder.
 */
export class SoundStore {
    private static readonly instance = new SoundStore();
    private deferredLoading = false;
    private inited = false;
    private soundWorksFlag = false;
    private musicEnabled = false;
    private soundsEnabled = false;
    private musicVolume = 1;
    private soundVolume = 1;
    private maxSources = 64;
    private context: AudioContext | null = null;
    private soundBus: GainNode | null = null;
    private musicBus: GainNode | null = null;
    private buffers = new Map<string, Promise<AudioBuffer>>();
    private activeHandles = new Set<AudioPlaybackHandle>();
    private musicHandles = new Set<AudioPlaybackHandle>();
    private soundSources: Array<AudioPlaybackHandle | null> = new Array<AudioPlaybackHandle | null>(64).fill(null);

    /** Java Slick2D counterpart: SoundStore.get(). */
    public static get(): SoundStore {
        return SoundStore.instance;
    }

    /** Java Slick2D counterpart: SoundStore.clear(). */
    public clear(): void {
        this.stopAllPlayback();
        this.clearDecodedBuffers();
    }

    /** Browser parity helper: resets the Web Audio/OpenAL lifecycle for AL.destroy(). */
    public destroy(): void {
        this.clear();
        void this.context?.close?.().catch(() => undefined);
        this.context = null;
        this.soundBus = null;
        this.musicBus = null;
        this.inited = false;
        this.soundWorksFlag = false;
        this.musicEnabled = false;
        this.soundsEnabled = false;
    }

    /** Browser/PWA helper: resets playback and flags while preserving decoded buffers and the AudioContext. */
    public destroyPreservingAudioCache(): void {
        this.stopAllPlayback();
        this.inited = false;
        this.soundWorksFlag = false;
        this.musicEnabled = false;
        this.soundsEnabled = false;
    }

    /** Java Slick2D counterpart: SoundStore.disable(). */
    public disable(): void {
        this.musicEnabled = false;
        this.soundsEnabled = false;
        this.soundWorksFlag = false;
        this.inited = true;
        this.clear();
    }

    /** Java Slick2D counterpart: SoundStore.setDeferredLoading(boolean). */
    public setDeferredLoading(deferred: boolean): void {
        this.deferredLoading = deferred;
    }

    /** Java Slick2D counterpart: SoundStore.isDeferredLoading(). */
    public isDeferredLoading(): boolean {
        return this.deferredLoading;
    }

    /** Java Slick2D counterpart: SoundStore.setMusicOn(boolean). */
    public setMusicOn(music: boolean): void {
        if (!this.soundWorksFlag) {
            return;
        }
        this.musicEnabled = music;
        for (const handle of this.musicHandles) {
            if (music) {
                handle.resume?.();
            } else {
                if (handle.suspend) {
                    handle.suspend();
                } else {
                    handle.pause?.();
                }
            }
        }
    }

    /** Java Slick2D counterpart: SoundStore.isMusicOn(). */
    public isMusicOn(): boolean {
        return this.musicEnabled;
    }

    /** Java Slick2D counterpart: SoundStore.setMusicVolume(float). */
    public setMusicVolume(volume: number): void {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicBus) {
            this.musicBus.gain.value = this.musicVolume;
        }
    }

    /** Java Slick2D counterpart: SoundStore.getMusicVolume(). */
    public getMusicVolume(): number {
        return this.musicVolume;
    }

    /** Java Slick2D counterpart: SoundStore.setSoundVolume(float). */
    public setSoundVolume(volume: number): void {
        this.soundVolume = Math.max(0, volume);
    }

    /** Java Slick2D counterpart: SoundStore.getSoundVolume(). */
    public getSoundVolume(): number {
        return this.soundVolume;
    }

    /** Java Slick2D counterpart: SoundStore.setSoundsOn(boolean). */
    public setSoundsOn(sounds: boolean): void {
        if (!this.soundWorksFlag) {
            return;
        }
        this.soundsEnabled = sounds;
    }

    /** Java Slick2D counterpart: SoundStore.soundsOn(). */
    public soundsOn(): boolean {
        return this.soundsEnabled;
    }

    /** Java Slick2D counterpart: SoundStore.musicOn(). */
    public musicOn(): boolean {
        return this.musicEnabled;
    }

    /** Java Slick2D counterpart: SoundStore.soundWorks(). */
    public soundWorks(): boolean {
        return this.soundWorksFlag;
    }

    /** Java Slick2D counterpart: SoundStore.init(). */
    public init(): void {
        if (this.inited) {
            return;
        }
        this.inited = true;
        const context = this.getAudioContext();
        if (context) {
            this.soundWorksFlag = true;
            this.soundsEnabled = true;
            this.musicEnabled = true;
            this.resetSoundSources();
        } else {
            this.soundWorksFlag = false;
            this.soundsEnabled = false;
            this.musicEnabled = false;
        }
    }

    /** Java Slick2D counterpart: SoundStore.poll(int). */
    public poll(_delta: number): void {}

    /** Java Slick2D counterpart: SoundStore.isMusicPlaying(). */
    public isMusicPlaying(): boolean {
        for (const handle of this.musicHandles) {
            if (handle.playing()) {
                return true;
            }
        }
        return false;
    }

    /** Java Slick2D counterpart: SoundStore.stopSoundEffect(int). */
    public stopSoundEffect(id: number): void {
        const sourceId = Math.trunc(id);
        this.soundSources[sourceId]?.stop();
    }

    /** Browser/PWA helper: stops active sound effects without clearing music or decoded buffers. */
    public stopSoundEffects(): void {
        for (const handle of this.activeHandles) {
            if (!this.musicHandles.has(handle)) {
                handle.stop();
            }
        }
    }

    /** Browser/PWA helper: stops active music and sound effects without clearing decoded buffers. */
    public stopAllPlayback(): void {
        for (const handle of this.activeHandles) {
            handle.stop();
        }
        this.resetPlaybackState();
    }

    /** Browser/PWA helper: clears playback bookkeeping without clearing decoded buffers. */
    public resetPlaybackState(): void {
        this.activeHandles.clear();
        this.musicHandles.clear();
        this.resetSoundSources();
    }

    /** Browser/PWA helper: clears decoded Web Audio buffers without changing the AudioContext. */
    public clearDecodedBuffers(): void {
        this.buffers.clear();
    }

    /** Java Slick2D counterpart: SoundStore.getSourceCount(). */
    public getSourceCount(): number {
        return this.maxSources;
    }

    /** Java Slick2D counterpart: SoundStore.setMaxSources(int). */
    public setMaxSources(max: number): void {
        if (!Number.isSafeInteger(max) || max <= 0) {
            throw new RangeError("Maximum source count must be a positive safe integer");
        }
        const normalized = max;
        if (normalized === this.maxSources) {
            return;
        }
        const firstUnavailableEffectSource = Math.max(1, normalized - 1);
        for (let index = firstUnavailableEffectSource; index < this.soundSources.length; index++) {
            this.soundSources[index]?.stop();
        }
        const nextSources = new Array<AudioPlaybackHandle | null>(normalized).fill(null);
        const limit = Math.min(firstUnavailableEffectSource, this.soundSources.length);
        for (let index = 1; index < limit; index++) {
            const handle = this.soundSources[index];
            if (handle?.playing()) {
                nextSources[index] = handle;
            }
        }
        this.maxSources = normalized;
        this.soundSources = nextSources;
    }

    /** Browser parity helper: returns the lazily-created AudioContext. */
    public getAudioContext(): AudioContext | null {
        if (this.context) {
            if (this.context.state !== "closed") {
                return this.context;
            }
            this.context = null;
            this.soundBus = null;
            this.musicBus = null;
        }
        const Ctor = globalThis.AudioContext ?? (globalThis as WebAudioGlobal).webkitAudioContext;
        if (!Ctor) {
            return null;
        }
        try {
            this.context = new Ctor();
        } catch {
            return null;
        }
        this.soundBus = this.context.createGain();
        this.musicBus = this.context.createGain();
        this.soundBus.gain.value = 1;
        this.musicBus.gain.value = this.musicVolume;
        this.soundBus.connect(this.context.destination);
        this.musicBus.connect(this.context.destination);
        return this.context;
    }

    /** Browser parity helper: resumes Web Audio from a user gesture before gameplay playback. */
    public async unlock(): Promise<boolean> {
        const context = this.getAudioContext();
        if (!context) {
            this.soundWorksFlag = false;
            this.soundsEnabled = false;
            this.musicEnabled = false;
            return false;
        }
        const shouldInitializeAudioState = !this.soundWorksFlag;
        this.inited = true;
        this.soundWorksFlag = true;
        if (shouldInitializeAudioState) {
            this.soundsEnabled = true;
            this.musicEnabled = true;
            this.resetSoundSources();
        }
        try {
            await context.resume?.();
            return context.state !== "closed";
        } catch (error) {
            Log.warn("Unable to unlock Web Audio", error);
            return false;
        }
    }

    /** Browser parity helper: returns the global sound-effect gain bus. */
    public getSoundBus(): GainNode | null {
        this.init();
        return this.soundBus;
    }

    /** Browser parity helper: returns the global music gain bus. */
    public getMusicBus(): GainNode | null {
        this.init();
        return this.musicBus;
    }

    /** Browser parity helper: loads and decodes an audio buffer through Web Audio. */
    public loadAudioBuffer(ref: string, options: ResourceLoadOptions = {}): Promise<AudioBuffer> {
        const existing = this.buffers.get(ref);
        if (existing) {
            return SoundStore.waitForAudioPromise(existing, options.signal, ref);
        }
        this.init();
        const context = this.getAudioContext();
        if (!context || !this.soundWorksFlag) {
            return Promise.reject(
                new ResourceLoadException(`Failed to decode audio ${ref}: Web Audio API is not available`, {
                    ref,
                    url: ResourceLoader.getResource(ref)?.href ?? null,
                    kind: "decode",
                    phase: "decode"
                })
            );
        }
        const promise = (async (): Promise<AudioBuffer> => {
            const bytes = await ResourceLoader.loadResource(ref, options);
            SoundStore.throwIfAborted(options.signal, ref);
            try {
                const buffer = await context.decodeAudioData(bytes);
                SoundStore.throwIfAborted(options.signal, ref);
                return buffer;
            } catch (error) {
                if (error instanceof ResourceLoadException) {
                    throw error;
                }
                if (SoundStore.isAbortError(error) || options.signal?.aborted) {
                    throw SoundStore.abortException(ref, options.signal?.reason ?? error);
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
            if (this.buffers.get(ref) === promise) {
                this.buffers.delete(ref);
            }
            throw error;
        });
        this.buffers.set(ref, promise);
        return promise;
    }

    /** Browser parity helper: queues audio decode work into ResourceLoader.waitForAll(). */
    public preloadAudioBuffer(ref: string, options: ResourceLoadOptions = {}): Promise<void> {
        const tracked = ResourceLoader.track(
            this.loadAudioBuffer(ref, options).then(() => undefined),
            ref
        );
        void tracked.catch(() => undefined);
        return tracked;
    }

    public preloadAudioBuffers(refs: Iterable<string>, onProgress?: (progress: AudioPreloadProgress) => void): Promise<void>;
    public preloadAudioBuffers(refs: Iterable<string>, options?: AudioPreloadOptions): Promise<void>;
    /** Browser/PWA helper: queues and tracks a deduplicated batch of audio decodes. */
    public async preloadAudioBuffers(
        refs: Iterable<string>,
        onProgressOrOptions?: ((progress: AudioPreloadProgress) => void) | AudioPreloadOptions
    ): Promise<void> {
        const options = typeof onProgressOrOptions === "function" ? { onProgress: onProgressOrOptions } : (onProgressOrOptions ?? {});
        SoundStore.throwIfAborted(options.signal, "audio manifest");
        const uniqueRefs = Array.from(new Set(refs));
        const total = uniqueRefs.length;
        let loaded = 0;
        if (total === 0) {
            return;
        }
        const settled = await runSettledBatch(uniqueRefs, options.concurrency, async (ref) => {
            await this.preloadAudioBuffer(ref, options);
            loaded++;
            options.onProgress?.({ ref, loaded, total });
        });
        const failure = settled.find((entry): entry is PromiseRejectedResult => entry.status === "rejected");
        if (failure) {
            throw failure.reason;
        }
    }

    private static async waitForAudioPromise(promise: Promise<AudioBuffer>, signal: AbortSignal | undefined, ref: string): Promise<AudioBuffer> {
        if (!signal) {
            return promise;
        }
        SoundStore.throwIfAborted(signal, ref);
        return new Promise<AudioBuffer>((resolve, reject) => {
            const abort = (): void => {
                signal.removeEventListener("abort", abort);
                reject(SoundStore.abortException(ref, signal.reason));
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

    private static throwIfAborted(signal: AbortSignal | undefined, ref: string): void {
        if (signal?.aborted) {
            throw SoundStore.abortException(ref, signal.reason);
        }
    }

    private static abortException(ref: string, cause?: unknown): ResourceLoadException {
        return new ResourceLoadException(`Resource load aborted: ${ref}`, {
            ref,
            url: ResourceLoader.getResource(ref)?.href ?? null,
            kind: "abort",
            phase: "decode",
            cause
        });
    }

    private static isAbortError(error: unknown): boolean {
        return (
            (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
            (typeof error === "object" && error !== null && "name" in error && (error as { name?: unknown }).name === "AbortError")
        );
    }

    /** Browser parity helper: plays a decoded sound effect through Web Audio. */
    public playSound(ref: string, pitch: number, volume: number, loop: boolean, onEnded?: () => void, position?: AudioPosition): AudioPlaybackHandle | null {
        this.init();
        if (!this.soundWorksFlag || !this.soundsEnabled) {
            return null;
        }
        const context = this.getAudioContext();
        const bus = this.getSoundBus();
        if (!context || !bus) {
            return null;
        }
        const sourceId = this.findFreeSoundSource();
        if (sourceId < 0) {
            return null;
        }
        let source: AudioBufferSourceNode | null = null;
        let gain: GainNode | null = null;
        let sourceGain = 0;
        let playing = true;
        let stopped = false;
        let requestedStop = false;
        const handle: AudioPlaybackHandle = {
            sourceId,
            stop: () => {
                stopped = true;
                requestedStop = true;
                if (source) {
                    const stoppedSource = source;
                    source = null;
                    stoppedSource.onended = null;
                    try {
                        stoppedSource.stop();
                    } catch {
                        // Ignore duplicate stop calls; Web Audio throws when a source is already stopped.
                    }
                    try {
                        stoppedSource.disconnect();
                    } catch {
                        // A source can already be disconnected during repeated teardown.
                    }
                }
                try {
                    gain?.disconnect();
                } catch {
                    // A gain node can already be disconnected during repeated teardown.
                }
                gain = null;
                playing = false;
                this.activeHandles.delete(handle);
                this.musicHandles.delete(handle);
                this.releaseSoundSource(sourceId, handle);
            },
            playing: () => playing,
            getGain: () => sourceGain
        };
        this.activeHandles.add(handle);
        this.soundSources[sourceId] = handle;
        void this.loadAudioBuffer(ref)
            .then((buffer) => {
                if (stopped) {
                    return;
                }
                void context.resume().catch(() => undefined);
                gain = context.createGain();
                source = context.createBufferSource();
                source.buffer = buffer;
                source.loop = loop;
                source.playbackRate.value = Math.max(0.25, Math.min(4, pitch));
                sourceGain = Math.max(0, volume * this.soundVolume);
                gain.gain.value = sourceGain;
                source.connect(gain);
                this.connectPositionedSource(context, gain, bus, position);
                const startedSource = source;
                const startedGain = gain;
                source.onended = () => {
                    startedSource.onended = null;
                    try {
                        startedSource.disconnect();
                    } catch {
                        // The source may already have been disconnected by explicit teardown.
                    }
                    try {
                        startedGain.disconnect();
                    } catch {
                        // The gain may already have been disconnected by explicit teardown.
                    }
                    if (source !== startedSource) {
                        return;
                    }
                    const wasLooping = startedSource.loop;
                    source = null;
                    gain = null;
                    if (requestedStop || wasLooping) {
                        return;
                    }
                    playing = false;
                    this.activeHandles.delete(handle);
                    this.musicHandles.delete(handle);
                    this.releaseSoundSource(sourceId, handle);
                    onEnded?.();
                };
                source.start();
            })
            .catch((error) => {
                playing = false;
                this.activeHandles.delete(handle);
                this.musicHandles.delete(handle);
                this.releaseSoundSource(sourceId, handle);
                Log.error(`Failed to play sound: ${ref}`, error);
            });
        return handle;
    }

    /** Browser parity helper: tracks an externally-created Web Audio handle. */
    public track(handle: AudioPlaybackHandle): void {
        this.activeHandles.add(handle);
        this.musicHandles.add(handle);
    }

    /** Browser parity helper: stops tracking an externally-created Web Audio handle. */
    public untrack(handle: AudioPlaybackHandle): void {
        this.activeHandles.delete(handle);
        this.musicHandles.delete(handle);
    }

    private resetSoundSources(): void {
        this.soundSources = new Array<AudioPlaybackHandle | null>(this.maxSources).fill(null);
    }

    private findFreeSoundSource(): number {
        for (let index = 1; index < this.maxSources - 1; index++) {
            const handle = this.soundSources[index];
            if (!handle || !handle.playing()) {
                this.soundSources[index] = null;
                return index;
            }
        }
        return -1;
    }

    private releaseSoundSource(sourceId: number, handle: AudioPlaybackHandle): void {
        if (this.soundSources[sourceId] === handle) {
            this.soundSources[sourceId] = null;
        }
    }

    private connectPositionedSource(context: AudioContext, gain: GainNode, bus: GainNode, position?: AudioPosition): void {
        if (!position || typeof context.createPanner !== "function") {
            gain.connect(bus);
            return;
        }
        try {
            const panner = context.createPanner();
            panner.panningModel = "equalpower";
            panner.distanceModel = "inverse";
            panner.refDistance = 1;
            panner.maxDistance = 10000;
            panner.rolloffFactor = 1;
            const legacyPanner = panner as unknown as { setPosition?: (x: number, y: number, z: number) => void };
            if ("positionX" in panner) {
                panner.positionX.value = position.x;
                panner.positionY.value = position.y;
                panner.positionZ.value = position.z;
            } else if (typeof legacyPanner.setPosition === "function") {
                legacyPanner.setPosition.call(panner, position.x, position.y, position.z);
            }
            gain.connect(panner);
            panner.connect(bus);
        } catch {
            gain.connect(bus);
        }
    }
}
