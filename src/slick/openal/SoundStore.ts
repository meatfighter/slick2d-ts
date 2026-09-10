import { AudioContextLifecycle } from "./AudioContextLifecycle.js";
import { ResourceLoadException, ResourceLoader, type ResourceLoadOptions } from "../util/ResourceLoader.js";
import { runSettledBatch } from "../util/BatchLoader.js";
import { Log } from "../util/Log.js";

type WebAudioGlobal = typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
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
    /** Detaches context-bound playback while preserving logical music state. */
    detachPlaybackGeneration?(): void;
    /** Rebuilds context-bound playback for a newly created generation. */
    attachPlaybackGeneration?(): void;
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
    private explicitPlaybackGenerationMode = false;
    private playbackGeneration = 0;
    private offlineDecoder: BaseAudioContext | null = null;
    private activeOfflineDecodes = 0;
    private offlineDecodeBatchDepth = 0;

    /** Java Slick2D counterpart: SoundStore.get(). */
    public static get(): SoundStore {
        return SoundStore.instance;
    }

    /** Enable PWA playback-generation ownership. This mode lasts for the page lifetime. */
    public enableExplicitPlaybackGenerations(): void {
        if (this.explicitPlaybackGenerationMode) {
            return;
        }
        this.explicitPlaybackGenerationMode = true;
        if (this.context !== null) {
            this.endPlaybackGeneration();
        }
    }

    /** Reports whether lazy persistent-context behavior has been disabled for a PWA. */
    public isUsingExplicitPlaybackGenerations(): boolean {
        return this.explicitPlaybackGenerationMode;
    }

    /** Current generation token used to reject stale asynchronous playback work. */
    public getPlaybackGeneration(): number {
        return this.playbackGeneration;
    }

    /** True only while the application owns a usable physical playback context. */
    public hasPlaybackGeneration(): boolean {
        return this.context !== null && String(this.context.state) !== "closed";
    }

    /** Checks that asynchronous work still belongs to the current PWA playback generation. */
    public isPlaybackGenerationCurrent(generation: number, context?: AudioContext | null): boolean {
        if (!this.explicitPlaybackGenerationMode || generation !== this.playbackGeneration || !this.hasPlaybackGeneration()) {
            return false;
        }
        return context === undefined || context === this.context;
    }

    /**
     * Creates a brand-new playback generation. AudioContext construction and the
     * native resume() call happen synchronously before this method returns.
     */
    public beginPlaybackGenerationFromUserGesture(): Promise<boolean> {
        this.enableExplicitPlaybackGenerations();
        if (this.context !== null) {
            this.endPlaybackGeneration();
        }

        // Logical defaults must survive a first hardware-context failure.
        if (!this.inited) {
            this.inited = true;
            this.musicEnabled = true;
            this.soundsEnabled = true;
        }

        const Ctor = globalThis.AudioContext ?? (globalThis as WebAudioGlobal).webkitAudioContext;
        if (!Ctor) {
            this.soundWorksFlag = false;
            return Promise.resolve(false);
        }

        let context: AudioContext | null = null;
        let soundBus: GainNode | null = null;
        let musicBus: GainNode | null = null;
        try {
            context = new Ctor();
            soundBus = context.createGain();
            musicBus = context.createGain();
            soundBus.gain.value = 1;
            musicBus.gain.value = this.musicVolume;
            soundBus.connect(context.destination);
            musicBus.connect(context.destination);
        } catch {
            SoundStore.cleanupBus(soundBus);
            SoundStore.cleanupBus(musicBus);
            SoundStore.closeContext(context);
            this.soundWorksFlag = false;
            return Promise.resolve(false);
        }

        const generation = ++this.playbackGeneration;
        this.context = context;
        this.soundBus = soundBus;
        this.musicBus = musicBus;
        this.soundWorksFlag = false;
        this.resetSoundSources();

        let resumeOperation: Promise<void>;
        try {
            resumeOperation = Promise.resolve(context.resume());
        } catch {
            resumeOperation = Promise.reject(new Error("AudioContext.resume() failed synchronously."));
        }

        return resumeOperation.then(
            () => this.completePlaybackGenerationStart(generation, context),
            () => {
                if (this.isGenerationContext(generation, context)) {
                    this.invalidateAndRetirePlaybackContext();
                }
                return false;
            }
        );
    }

    /**
     * Retires physical Web Audio ownership while preserving decoded buffers and
     * logical music state. SFX are discarded and cannot attach to a later generation.
     */
    public endPlaybackGeneration(): void {
        this.enableExplicitPlaybackGenerations();
        for (const handle of Array.from(this.musicHandles)) {
            if (handle.playing()) {
                handle.detachPlaybackGeneration?.();
            }
        }
        this.stopSoundEffects();
        this.playbackGeneration++;
        this.retirePlaybackContext();
        this.resetSoundSources();
    }

    /** Java Slick2D counterpart: SoundStore.clear(). */
    public clear(): void {
        this.stopAllPlayback();
        this.clearDecodedBuffers();
    }

    /** Browser parity helper: resets the Web Audio/OpenAL lifecycle for AL.destroy(). */
    public destroy(): void {
        this.stopAllPlayback();
        this.clearDecodedBuffers();
        this.playbackGeneration++;
        this.retirePlaybackContext();
        this.offlineDecoder = null;
        this.activeOfflineDecodes = 0;
        this.offlineDecodeBatchDepth = 0;
        this.inited = false;
        this.soundWorksFlag = false;
        this.musicEnabled = false;
        this.soundsEnabled = false;
    }

    /**
     * Browser/PWA helper: resets playback and flags while preserving decoded audio.
     * Explicit PWA generation mode also retires the playback context; legacy mode
     * retains its historical context-preserving behavior for compatibility.
     */
    public destroyPreservingAudioCache(): void {
        this.stopAllPlayback();
        if (this.explicitPlaybackGenerationMode) {
            this.playbackGeneration++;
            this.retirePlaybackContext();
        }
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
        if (!this.soundWorksFlag && !(this.explicitPlaybackGenerationMode && this.inited)) {
            return;
        }
        this.musicEnabled = music;
        for (const handle of this.musicHandles) {
            if (!handle.playing()) {
                continue;
            }
            if (music) {
                handle.resume?.();
            } else if (handle.suspend) {
                handle.suspend();
            } else {
                handle.pause?.();
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
        if (!this.soundWorksFlag && !(this.explicitPlaybackGenerationMode && this.inited)) {
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
        if (this.explicitPlaybackGenerationMode) {
            if (this.context !== null && String(this.context.state) !== "closed") {
                this.inited = true;
                this.soundWorksFlag = String(this.context.state) === "running";
            } else {
                this.soundWorksFlag = false;
            }
            return;
        }
        if (this.inited) {
            return;
        }
        const context = this.getAudioContext();
        if (context) {
            this.inited = true;
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
        for (const handle of Array.from(this.activeHandles)) {
            if (!this.musicHandles.has(handle)) {
                handle.stop();
            }
        }
    }

    /** Browser/PWA helper: stops active music and sound effects without clearing decoded buffers. */
    public stopAllPlayback(): void {
        for (const handle of Array.from(this.activeHandles)) {
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

    /** Browser parity helper: returns the active AudioContext; PWA generation mode never creates one lazily. */
    public getAudioContext(): AudioContext | null {
        if (this.context) {
            if (String(this.context.state) !== "closed") {
                return this.context;
            }
            this.context = null;
            this.soundBus = null;
            this.musicBus = null;
            this.soundWorksFlag = false;
        }
        if (this.explicitPlaybackGenerationMode) {
            return null;
        }
        return this.createLegacyPlaybackContext();
    }

    /** Browser parity helper: resumes legacy Web Audio or starts a fresh explicit PWA generation. */
    public async unlock(): Promise<boolean> {
        if (this.explicitPlaybackGenerationMode) {
            return this.beginPlaybackGenerationFromUserGesture();
        }
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
        const resumed = await AudioContextLifecycle.resumeFromUserGesture(context);
        if (!resumed) {
            Log.warn("Unable to unlock Web Audio");
        }
        return resumed;
    }

    /** Browser parity helper: returns the global sound-effect gain bus. */
    public getSoundBus(): GainNode | null {
        if (this.explicitPlaybackGenerationMode) {
            return this.soundBus;
        }
        this.init();
        return this.soundBus;
    }

    /** Browser parity helper: returns the global music gain bus. */
    public getMusicBus(): GainNode | null {
        if (this.explicitPlaybackGenerationMode) {
            return this.musicBus;
        }
        this.init();
        return this.musicBus;
    }

    /** Browser parity helper: loads and decodes an audio buffer. */
    public loadAudioBuffer(ref: string, options: ResourceLoadOptions = {}): Promise<AudioBuffer> {
        const existing = this.buffers.get(ref);
        if (existing) {
            return SoundStore.waitForAudioPromise(existing, options.signal, ref);
        }
        const operation = this.explicitPlaybackGenerationMode ? this.loadAudioBufferOffline(ref, options) : this.loadAudioBufferLegacy(ref, options);
        const promise = operation.catch((error) => {
            if (this.buffers.get(ref) === promise) {
                this.buffers.delete(ref);
            }
            throw error;
        });
        this.buffers.set(ref, promise);
        return SoundStore.waitForAudioPromise(promise, options.signal, ref);
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
        const holdOfflineDecoder = this.explicitPlaybackGenerationMode;
        if (holdOfflineDecoder) {
            this.offlineDecodeBatchDepth++;
        }
        try {
            const settled = await runSettledBatch(uniqueRefs, options.concurrency, async (ref) => {
                await this.preloadAudioBuffer(ref, options);
                loaded++;
                options.onProgress?.({ ref, loaded, total });
            });
            const failure = settled.find((entry): entry is PromiseRejectedResult => entry.status === "rejected");
            if (failure) {
                throw failure.reason;
            }
        } finally {
            if (holdOfflineDecoder) {
                this.offlineDecodeBatchDepth = Math.max(0, this.offlineDecodeBatchDepth - 1);
                this.releaseOfflineDecoderIfIdle();
            }
        }
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
        if (this.explicitPlaybackGenerationMode && String(context.state) !== "running") {
            return null;
        }
        const playbackGeneration = this.playbackGeneration;
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
        const cleanupGraph = (targetSource: AudioBufferSourceNode | null, targetGain: GainNode | null, stopSource: boolean): void => {
            if (targetSource) {
                targetSource.onended = null;
                if (stopSource) {
                    try {
                        targetSource.stop();
                    } catch {
                        // Ignore duplicate stop calls; Web Audio throws when a source is already stopped.
                    }
                }
                try {
                    targetSource.disconnect();
                } catch {
                    // A source can already be disconnected during repeated teardown.
                }
            }
            try {
                targetGain?.disconnect();
            } catch {
                // A gain node can already be disconnected during repeated teardown.
            }
        };
        const handle: AudioPlaybackHandle = {
            sourceId,
            stop: () => {
                stopped = true;
                requestedStop = true;
                const stoppedSource = source;
                const stoppedGain = gain;
                source = null;
                gain = null;
                cleanupGraph(stoppedSource, stoppedGain, true);
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
            .then(async (buffer) => {
                if (stopped) {
                    return;
                }
                if (this.explicitPlaybackGenerationMode) {
                    if (!this.isPlaybackGenerationCurrent(playbackGeneration, context) || String(context.state) !== "running" || !this.soundsEnabled) {
                        handle.stop();
                        return;
                    }
                } else if (!(await AudioContextLifecycle.resume(context)) || stopped || !this.soundsEnabled) {
                    if (!stopped) {
                        handle.stop();
                    }
                    return;
                }
                if (stopped || (this.explicitPlaybackGenerationMode && !this.isPlaybackGenerationCurrent(playbackGeneration, context))) {
                    return;
                }
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
                    cleanupGraph(startedSource, startedGain, false);
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
                const failedSource = source;
                const failedGain = gain;
                source = null;
                gain = null;
                cleanupGraph(failedSource, failedGain, true);
                playing = false;
                this.activeHandles.delete(handle);
                this.musicHandles.delete(handle);
                this.releaseSoundSource(sourceId, handle);
                onEnded?.();
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

    private completePlaybackGenerationStart(generation: number, context: AudioContext): boolean {
        if (!this.isGenerationContext(generation, context) || String(context.state) !== "running") {
            if (this.isGenerationContext(generation, context)) {
                this.invalidateAndRetirePlaybackContext();
            }
            return false;
        }
        this.soundWorksFlag = true;
        for (const handle of Array.from(this.musicHandles)) {
            if (handle.playing()) {
                handle.attachPlaybackGeneration?.();
            }
        }
        return true;
    }

    private isGenerationContext(generation: number, context: AudioContext): boolean {
        return generation === this.playbackGeneration && this.context === context;
    }

    private invalidateAndRetirePlaybackContext(): void {
        this.playbackGeneration++;
        this.retirePlaybackContext();
        this.resetSoundSources();
    }

    private retirePlaybackContext(): void {
        const context = this.context;
        const soundBus = this.soundBus;
        const musicBus = this.musicBus;
        this.context = null;
        this.soundBus = null;
        this.musicBus = null;
        this.soundWorksFlag = false;
        SoundStore.cleanupBus(soundBus);
        SoundStore.cleanupBus(musicBus);
        SoundStore.closeContext(context);
    }

    private createLegacyPlaybackContext(): AudioContext | null {
        const Ctor = globalThis.AudioContext ?? (globalThis as WebAudioGlobal).webkitAudioContext;
        if (!Ctor) {
            return null;
        }
        let context: AudioContext | null = null;
        let soundBus: GainNode | null = null;
        let musicBus: GainNode | null = null;
        try {
            context = new Ctor();
            soundBus = context.createGain();
            musicBus = context.createGain();
            soundBus.gain.value = 1;
            musicBus.gain.value = this.musicVolume;
            soundBus.connect(context.destination);
            musicBus.connect(context.destination);
        } catch {
            SoundStore.cleanupBus(soundBus);
            SoundStore.cleanupBus(musicBus);
            SoundStore.closeContext(context);
            return null;
        }
        this.context = context;
        this.soundBus = soundBus;
        this.musicBus = musicBus;
        return context;
    }

    private loadAudioBufferLegacy(ref: string, options: ResourceLoadOptions): Promise<AudioBuffer> {
        this.init();
        const context = this.getAudioContext();
        if (!context || !this.soundWorksFlag) {
            return Promise.reject(this.audioDecodeUnavailable(ref));
        }
        return (async (): Promise<AudioBuffer> => {
            const bytes = await ResourceLoader.loadResource(ref, options);
            SoundStore.throwIfAborted(options.signal, ref);
            try {
                const buffer = await context.decodeAudioData(bytes);
                SoundStore.throwIfAborted(options.signal, ref);
                return buffer;
            } catch (error) {
                throw this.normalizeAudioLoadError(ref, options.signal, error);
            }
        })();
    }

    private loadAudioBufferOffline(ref: string, options: ResourceLoadOptions): Promise<AudioBuffer> {
        return (async (): Promise<AudioBuffer> => {
            SoundStore.throwIfAborted(options.signal, ref);
            const bytes = await ResourceLoader.loadResource(ref, options);
            SoundStore.throwIfAborted(options.signal, ref);
            const decoder = this.acquireOfflineDecoder(ref);
            try {
                const buffer = await SoundStore.decodeAudioData(decoder, bytes.slice(0));
                SoundStore.throwIfAborted(options.signal, ref);
                return buffer;
            } catch (error) {
                throw this.normalizeAudioLoadError(ref, options.signal, error);
            } finally {
                this.releaseOfflineDecoder();
            }
        })();
    }

    private acquireOfflineDecoder(ref: string): BaseAudioContext {
        if (this.offlineDecoder === null) {
            const Ctor = globalThis.OfflineAudioContext ?? (globalThis as WebAudioGlobal).webkitOfflineAudioContext;
            if (!Ctor) {
                throw this.audioDecodeUnavailable(ref, "OfflineAudioContext is not available");
            }
            try {
                this.offlineDecoder = new Ctor(2, 1, 44100);
            } catch (error) {
                throw this.audioDecodeUnavailable(ref, "OfflineAudioContext could not be created", error);
            }
        }
        this.activeOfflineDecodes++;
        return this.offlineDecoder;
    }

    private releaseOfflineDecoder(): void {
        this.activeOfflineDecodes = Math.max(0, this.activeOfflineDecodes - 1);
        this.releaseOfflineDecoderIfIdle();
    }

    private releaseOfflineDecoderIfIdle(): void {
        if (this.activeOfflineDecodes === 0 && this.offlineDecodeBatchDepth === 0) {
            this.offlineDecoder = null;
        }
    }

    private audioDecodeUnavailable(ref: string, detail = "Web Audio API is not available", cause?: unknown): ResourceLoadException {
        return new ResourceLoadException(`Failed to decode audio ${ref}: ${detail}`, {
            ref,
            url: ResourceLoader.getResource(ref)?.href ?? null,
            kind: "decode",
            phase: "decode",
            cause
        });
    }

    private normalizeAudioLoadError(ref: string, signal: AbortSignal | undefined, error: unknown): ResourceLoadException {
        if (error instanceof ResourceLoadException) {
            return error;
        }
        if (SoundStore.isAbortError(error) || signal?.aborted) {
            return SoundStore.abortException(ref, signal?.reason ?? error);
        }
        return new ResourceLoadException(`Failed to load audio: ${ref}`, {
            ref,
            url: ResourceLoader.getResource(ref)?.href ?? null,
            kind: "decode",
            phase: "decode",
            cause: error
        });
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

    private static decodeAudioData(context: BaseAudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
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

    private static cleanupBus(bus: GainNode | null): void {
        try {
            bus?.disconnect();
        } catch {
            // Repeated/best-effort Web Audio teardown is intentionally harmless.
        }
    }

    private static closeContext(context: AudioContext | null): void {
        if (context === null) {
            return;
        }
        try {
            void context.close().catch(() => undefined);
        } catch {
            // Context teardown is detached from application state and never awaited.
        }
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
}
