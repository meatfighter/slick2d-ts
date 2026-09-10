import { SoundStore } from "./SoundStore.js";

/**
 * Explicit PWA playback-generation facade.
 *
 * Decoded audio belongs to the page lifetime. Physical Web Audio playback belongs
 * to one RUNNING generation and is replaced after every trip through the PWA menu.
 */
export class PwaAudioManager {
    private static readonly instance = new PwaAudioManager();

    public static get(): PwaAudioManager {
        return PwaAudioManager.instance;
    }

    /** Enable decode-only preload and disable lazy playback-context creation. */
    public install(): void {
        SoundStore.get().enableExplicitPlaybackGenerations();
    }

    /** Current playback-generation token. */
    public getGeneration(): number {
        return SoundStore.get().getPlaybackGeneration();
    }

    public hasPlaybackGeneration(): boolean {
        return SoundStore.get().hasPlaybackGeneration();
    }

    /** Create a fresh playback context synchronously from the current user activation. */
    public beginPlaybackGeneration(): Promise<boolean> {
        this.install();
        return SoundStore.get().beginPlaybackGenerationFromUserGesture();
    }

    /** Retire physical playback while keeping decoded assets and logical music state. */
    public endPlaybackGeneration(): void {
        this.install();
        SoundStore.get().endPlaybackGeneration();
    }
}
