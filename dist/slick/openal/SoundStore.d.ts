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
    private buffers;
    private activeHandles;
    private musicHandles;
    private soundSources;
    /** Java Slick2D counterpart: SoundStore.get(). */
    static get(): SoundStore;
    /** Java Slick2D counterpart: SoundStore.clear(). */
    clear(): void;
    /** Browser parity helper: resets the Web Audio/OpenAL lifecycle for AL.destroy(). */
    destroy(): void;
    /** Browser/PWA helper: resets playback and flags while preserving decoded buffers and the AudioContext. */
    destroyPreservingAudioCache(): void;
    /** Java Slick2D counterpart: SoundStore.disable(). */
    disable(): void;
    /** Java Slick2D counterpart: SoundStore.setDeferredLoading(boolean). */
    setDeferredLoading(deferred: boolean): void;
    /** Java Slick2D counterpart: SoundStore.isDeferredLoading(). */
    isDeferredLoading(): boolean;
    /** Java Slick2D counterpart: SoundStore.setMusicOn(boolean). */
    setMusicOn(music: boolean): void;
    /** Java Slick2D counterpart: SoundStore.isMusicOn(). */
    isMusicOn(): boolean;
    /** Java Slick2D counterpart: SoundStore.setMusicVolume(float). */
    setMusicVolume(volume: number): void;
    /** Java Slick2D counterpart: SoundStore.getMusicVolume(). */
    getMusicVolume(): number;
    /** Java Slick2D counterpart: SoundStore.setSoundVolume(float). */
    setSoundVolume(volume: number): void;
    /** Java Slick2D counterpart: SoundStore.getSoundVolume(). */
    getSoundVolume(): number;
    /** Java Slick2D counterpart: SoundStore.setSoundsOn(boolean). */
    setSoundsOn(sounds: boolean): void;
    /** Java Slick2D counterpart: SoundStore.soundsOn(). */
    soundsOn(): boolean;
    /** Java Slick2D counterpart: SoundStore.musicOn(). */
    musicOn(): boolean;
    /** Java Slick2D counterpart: SoundStore.soundWorks(). */
    soundWorks(): boolean;
    /** Java Slick2D counterpart: SoundStore.init(). */
    init(): void;
    /** Java Slick2D counterpart: SoundStore.poll(int). */
    poll(_delta: number): void;
    /** Java Slick2D counterpart: SoundStore.isMusicPlaying(). */
    isMusicPlaying(): boolean;
    /** Java Slick2D counterpart: SoundStore.stopSoundEffect(int). */
    stopSoundEffect(id: number): void;
    /** Browser/PWA helper: stops active sound effects without clearing music or decoded buffers. */
    stopSoundEffects(): void;
    /** Browser/PWA helper: stops active music and sound effects without clearing decoded buffers. */
    stopAllPlayback(): void;
    /** Browser/PWA helper: clears playback bookkeeping without clearing decoded buffers. */
    resetPlaybackState(): void;
    /** Browser/PWA helper: clears decoded Web Audio buffers without changing the AudioContext. */
    clearDecodedBuffers(): void;
    /** Java Slick2D counterpart: SoundStore.getSourceCount(). */
    getSourceCount(): number;
    /** Java Slick2D counterpart: SoundStore.setMaxSources(int). */
    setMaxSources(max: number): void;
    /** Browser parity helper: returns the lazily-created AudioContext. */
    getAudioContext(): AudioContext | null;
    /** Browser parity helper: resumes Web Audio from a user gesture before gameplay playback. */
    unlock(): Promise<boolean>;
    /** Browser parity helper: returns the global sound-effect gain bus. */
    getSoundBus(): GainNode | null;
    /** Browser parity helper: returns the global music gain bus. */
    getMusicBus(): GainNode | null;
    /** Browser parity helper: loads and decodes an audio buffer through Web Audio. */
    loadAudioBuffer(ref: string, options?: ResourceLoadOptions): Promise<AudioBuffer>;
    /** Browser parity helper: queues audio decode work into ResourceLoader.waitForAll(). */
    preloadAudioBuffer(ref: string, options?: ResourceLoadOptions): Promise<void>;
    preloadAudioBuffers(refs: Iterable<string>, onProgress?: (progress: AudioPreloadProgress) => void): Promise<void>;
    preloadAudioBuffers(refs: Iterable<string>, options?: AudioPreloadOptions): Promise<void>;
    private static waitForAudioPromise;
    private static throwIfAborted;
    private static abortException;
    private static isAbortError;
    /** Browser parity helper: plays a decoded sound effect through Web Audio. */
    playSound(ref: string, pitch: number, volume: number, loop: boolean, onEnded?: () => void, position?: AudioPosition): AudioPlaybackHandle | null;
    /** Browser parity helper: tracks an externally-created Web Audio handle. */
    track(handle: AudioPlaybackHandle): void;
    /** Browser parity helper: stops tracking an externally-created Web Audio handle. */
    untrack(handle: AudioPlaybackHandle): void;
    private resetSoundSources;
    private findFreeSoundSource;
    private releaseSoundSource;
    private connectPositionedSource;
}
export {};
//# sourceMappingURL=SoundStore.d.ts.map