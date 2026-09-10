import { SoundStore, type PlaybackDiagnostics } from "./SoundStore.js";

/** The PWA facade owns no separate audio state; SoundStore is the single generation owner. */
export class PwaAudioManager {
    private static readonly instance = new PwaAudioManager();

    public static get(): PwaAudioManager {
        return PwaAudioManager.instance;
    }

    public install(): void {
        SoundStore.get().enableExplicitPlaybackGenerations();
    }

    public getGeneration(): number {
        return SoundStore.get().getPlaybackGeneration();
    }

    public hasPlaybackGeneration(): boolean {
        return SoundStore.get().hasPlaybackGeneration();
    }

    /** Pass true for STARTING: construct/resume now, but attach/open output only on commit. */
    public beginPlaybackGeneration(deferPlayback = false): Promise<boolean> {
        this.install();
        return SoundStore.get().beginPlaybackGenerationFromUserGesture(deferPlayback);
    }

    public commitPlaybackGeneration(generation: number): Promise<boolean> {
        return SoundStore.get().commitPlaybackGeneration(generation);
    }

    public endPlaybackGeneration(expectedGeneration?: number): void {
        this.install();
        SoundStore.get().endPlaybackGeneration(expectedGeneration);
    }

    public setInterruptionHandler(handler: ((reason: string, generation: number) => void) | null): void {
        SoundStore.get().setPlaybackInterruptionHandler(handler);
    }

    public getDiagnostics(): PlaybackDiagnostics {
        return SoundStore.get().getPlaybackDiagnostics();
    }
}
