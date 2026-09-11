import { type PlaybackDiagnostics } from "./SoundStore.js";
/** The PWA facade owns no separate audio state; SoundStore is the single generation owner. */
export declare class PwaAudioManager {
    private static readonly instance;
    static get(): PwaAudioManager;
    install(): void;
    getGeneration(): number;
    hasPlaybackGeneration(): boolean;
    /** Pass true for STARTING: construct/resume now, but attach/open output only on commit. */
    beginPlaybackGeneration(deferPlayback?: boolean): Promise<boolean>;
    commitPlaybackGeneration(generation: number): Promise<boolean>;
    endPlaybackGeneration(expectedGeneration?: number): void;
    setInterruptionHandler(handler: ((reason: string, generation: number) => void) | null): void;
    getDiagnostics(): PlaybackDiagnostics;
}
//# sourceMappingURL=PwaAudioManager.d.ts.map