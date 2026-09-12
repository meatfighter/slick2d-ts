import { type ResourceLoadOptions } from "../util/ResourceLoader.js";
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
export interface AudioPlaybackHandle {
    readonly sourceId?: number;
    stop(): void;
    pause?(): void;
    suspend?(): void;
    resume?(): void;
    detachPlaybackGeneration?(): void;
    attachPlaybackGeneration?(): void | Promise<void>;
    playing(): boolean;
    getGain?(): number;
}
export type PlaybackDiagnostics = Readonly<{
    generation: number;
    ownedContext: boolean;
    committed: boolean;
    silent: boolean;
    effects: number;
    musicHandles: number;
    decodedBuffers: number;
    contextsCreated: number;
    contextsRetired: number;
    closesSettled: number;
}>;
/** Page-lifetime assets/preferences plus one explicitly owned playback generation. */
export declare class SoundStore {
    private static readonly instance;
    private deferredLoading;
    private inited;
    private soundWorksFlag;
    private musicEnabled;
    private soundsEnabled;
    private musicVolume;
    private soundVolume;
    private maxSources;
    private context;
    private soundBus;
    private musicBus;
    private outputGate;
    private contextStateListener;
    private buffers;
    private decodedBuffers;
    private audioLoads;
    private decoderPool;
    private activeHandles;
    private musicHandles;
    private soundSources;
    private explicitPlaybackGenerationMode;
    private playbackGeneration;
    private playbackRetirementFailure;
    private playbackCommitted;
    private logicalPlaybackActive;
    private interruptionHandler;
    private contextsCreated;
    private contextsRetired;
    private closesSettled;
    static get(): SoundStore;
    enableExplicitPlaybackGenerations(): void;
    isUsingExplicitPlaybackGenerations(): boolean;
    getPlaybackGeneration(): number;
    hasPlaybackGeneration(): boolean;
    isPlaybackGenerationCurrent(generation: number, context?: AudioContext | null): boolean;
    isPlaybackCommitted(): boolean;
    isLogicalPlaybackActive(): boolean;
    isSilentPlaybackActive(): boolean;
    setPlaybackInterruptionHandler(handler: ((reason: string, generation: number) => void) | null): void;
    reportPlaybackInterruption(reason: string): void;
    /** Constructor and native resume execute before returning to the activation handler. */
    beginPlaybackGenerationFromUserGesture(deferPlayback?: boolean): Promise<boolean>;
    /** Accept a prepared generation, attach logical music, and then open its output gate. */
    commitPlaybackGeneration(generation: number): Promise<boolean>;
    /** Conditional retirement cannot tear down a replacement generation. */
    endPlaybackGeneration(expectedGeneration?: number): void;
    private detachMusic;
    clear(): void;
    destroy(): void;
    destroyPreservingAudioCache(): void;
    disable(): void;
    setDeferredLoading(deferred: boolean): void;
    isDeferredLoading(): boolean;
    setMusicOn(music: boolean): void;
    isMusicOn(): boolean;
    setMusicVolume(volume: number): void;
    getMusicVolume(): number;
    setSoundVolume(volume: number): void;
    getSoundVolume(): number;
    setSoundsOn(sounds: boolean): void;
    soundsOn(): boolean;
    musicOn(): boolean;
    soundWorks(): boolean;
    init(): void;
    isMusicPlaying(): boolean;
    stopSoundEffect(id: number): void;
    stopSoundEffects(): void;
    stopAllPlayback(): void;
    resetPlaybackState(): void;
    clearDecodedBuffers(): void;
    getDecodedAudioBuffer(ref: string): AudioBuffer | null;
    getSourceCount(): number;
    setMaxSources(max: number): void;
    getAudioContext(): AudioContext | null;
    /** Explicit activation only. Ordinary playback never resumes an old context implicitly. */
    unlock(): Promise<boolean>;
    getSoundBus(): GainNode | null;
    getMusicBus(): GainNode | null;
    loadAudioBuffer(ref: string, options?: ResourceLoadOptions): Promise<AudioBuffer>;
    preloadAudioBuffer(ref: string, options?: ResourceLoadOptions): Promise<void>;
    preloadAudioBuffers(refs: Iterable<string>, onProgress?: (progress: AudioPreloadProgress) => void): Promise<void>;
    preloadAudioBuffers(refs: Iterable<string>, options?: AudioPreloadOptions): Promise<void>;
    playSound(ref: string, pitch: number, volume: number, loop: boolean, onEnded?: () => void, position?: AudioPosition): AudioPlaybackHandle | null;
    track(handle: AudioPlaybackHandle): void;
    untrack(handle: AudioPlaybackHandle): void;
    /** Internal SFX owner hook; source slots are released only by their current handle. */
    releaseEffect(handle: AudioPlaybackHandle): void;
    getPlaybackDiagnostics(): PlaybackDiagnostics;
    private ensureLogicalInitialization;
    private retirePlaybackContext;
    private closeContext;
    private createOrdinaryContainerContext;
    private loadAudioBufferForOrdinaryContainer;
    private loadAudioBufferOffline;
    private acquireOfflineDecoder;
    private static releaseDecoderIfIdle;
    private audioDecodeUnavailable;
    private resetSoundSources;
    private findFreeSoundSource;
    static disconnect(node: AudioNode | null): void;
    private static waitForAudioPromise;
    private static decodeAudioData;
    private static throwIfAborted;
    private static abortException;
    private discardUnusablePlayback;
}
export {};
//# sourceMappingURL=SoundStore.d.ts.map