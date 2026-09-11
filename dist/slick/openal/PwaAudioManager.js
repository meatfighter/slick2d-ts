import { SoundStore } from "./SoundStore.js";
/** The PWA facade owns no separate audio state; SoundStore is the single generation owner. */
export class PwaAudioManager {
    static instance = new PwaAudioManager();
    static get() {
        return PwaAudioManager.instance;
    }
    install() {
        SoundStore.get().enableExplicitPlaybackGenerations();
    }
    getGeneration() {
        return SoundStore.get().getPlaybackGeneration();
    }
    hasPlaybackGeneration() {
        return SoundStore.get().hasPlaybackGeneration();
    }
    /** Pass true for STARTING: construct/resume now, but attach/open output only on commit. */
    beginPlaybackGeneration(deferPlayback = false) {
        this.install();
        return SoundStore.get().beginPlaybackGenerationFromUserGesture(deferPlayback);
    }
    commitPlaybackGeneration(generation) {
        return SoundStore.get().commitPlaybackGeneration(generation);
    }
    endPlaybackGeneration(expectedGeneration) {
        this.install();
        SoundStore.get().endPlaybackGeneration(expectedGeneration);
    }
    setInterruptionHandler(handler) {
        SoundStore.get().setPlaybackInterruptionHandler(handler);
    }
    getDiagnostics() {
        return SoundStore.get().getPlaybackDiagnostics();
    }
}
//# sourceMappingURL=PwaAudioManager.js.map