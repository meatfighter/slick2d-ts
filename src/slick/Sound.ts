import { copySoundPlaybackSnapshot, type SoundPlaybackSnapshot } from "./SoundPlaybackState.js";
import { type SoundPlaybackHandle, SoundStore } from "./openal/SoundStore.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.Sound.
 *
 * Short sound effect wrapper with Slick-compatible play/stop methods.
 */
export class Sound {
    private readonly ref: string;
    private readonly readyPromise: Promise<void>;
    private active: SoundPlaybackHandle | null = null;
    private readonly voices = new Set<SoundPlaybackHandle>();

    public constructor(ref: string);
    public constructor(url: URL);
    public constructor(input: ArrayBuffer | Blob, ref: string);
    /**
     * Java Slick2D counterpart: Sound constructors.
     *
     * Stores a resource reference and queues browser resource loading when possible.
     */
    public constructor(refOrUrlOrInput: string | URL | ArrayBuffer | Blob, ref?: string) {
        if (typeof refOrUrlOrInput === "string") {
            this.ref = refOrUrlOrInput;
            this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
        } else if (refOrUrlOrInput instanceof URL) {
            this.ref = refOrUrlOrInput.toString();
            this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
        } else {
            this.ref = ref ?? "sound";
            if (refOrUrlOrInput instanceof ArrayBuffer) {
                ResourceLoader.registerResource(this.ref, refOrUrlOrInput);
                this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
            } else {
                const registered = refOrUrlOrInput.arrayBuffer().then((bytes) => {
                    ResourceLoader.registerResource(this.ref, bytes);
                });
                this.readyPromise = ResourceLoader.track(
                    registered.then(() => SoundStore.get().loadAudioBuffer(this.ref)).then(() => undefined),
                    this.ref
                );
                void this.readyPromise.catch(() => undefined);
            }
        }
    }

    /** Browser parity helper: waits for constructor-queued audio decode. */
    public ready(): Promise<void> {
        return this.readyPromise;
    }

    /** Browser parity helper: Java-style explicit load alias. */
    public load(): Promise<void> {
        return this.ready();
    }

    /** Java Slick2D counterpart: Sound.play(). */
    public play(): void;
    /** Java Slick2D counterpart: Sound.play(float, float). */
    public play(pitch: number, volume: number): void;
    public play(pitch: number = 1, volume: number = 1): void {
        const effectiveVolume = volume * SoundStore.get().getSoundVolume();
        const handle = SoundStore.get().playSound(this.ref, pitch, effectiveVolume, false, undefined, undefined, (disposed) => this.releaseVoice(disposed));
        if (!handle) {
            this.active = null;
            return;
        }
        this.voices.add(handle);
        this.active = handle;
    }

    /** Java Slick2D counterpart: Sound.playAt(float, float, float, float, float). */
    public playAt(pitch: number, volume: number, x: number, y: number, z: number): void {
        const effectiveVolume = volume * SoundStore.get().getSoundVolume();
        const handle = SoundStore.get().playSound(this.ref, pitch, effectiveVolume, false, undefined, { x, y, z }, (disposed) => this.releaseVoice(disposed));
        if (!handle) {
            this.active = null;
            return;
        }
        this.voices.add(handle);
        this.active = handle;
    }

    /** Java Slick2D counterpart: Sound.loop(). */
    public loop(): void;
    /** Java Slick2D counterpart: Sound.loop(float, float). */
    public loop(pitch: number, volume: number): void;
    public loop(pitch: number = 1, volume: number = 1): void {
        const effectiveVolume = volume * SoundStore.get().getSoundVolume();
        const handle = SoundStore.get().playSound(this.ref, pitch, effectiveVolume, true, undefined, undefined, (disposed) => this.releaseVoice(disposed));
        if (!handle) {
            this.active = null;
            return;
        }
        this.voices.add(handle);
        this.active = handle;
    }

    /** Java Slick2D counterpart: Sound.playing(). */
    public playing(): boolean {
        if (!this.active?.playing()) {
            if (this.active !== null) {
                this.voices.delete(this.active);
            }
            this.active = null;
            return false;
        }
        return true;
    }

    /** Java Slick2D counterpart: Sound.stop(). Stops only this Sound's latest voice, matching Slick parity. */
    public stop(): void {
        const active = this.active;
        if (active !== null) {
            active.stop();
            if (this.active === active) {
                this.active = null;
            }
            this.voices.delete(active);
        }
    }

    /** Capture every live logical voice without manufacturing or resuming a browser audio context. */
    public capturePlaybackState(): SoundPlaybackSnapshot {
        const voices = Array.from(this.voices).filter((voice) => voice.playing());
        for (const voice of Array.from(this.voices)) {
            if (!voice.playing()) {
                this.voices.delete(voice);
            }
        }
        if (this.active !== null && !this.active.playing()) {
            this.active = null;
        }
        const activeVoiceIndex = this.active === null ? -1 : voices.indexOf(this.active);
        return {
            voices: voices.map((voice) => voice.capturePlaybackState()),
            activeVoiceIndex: activeVoiceIndex < 0 ? null : activeVoiceIndex
        };
    }

    /**
     * Atomically replace this Sound's logical voices from durable state.
     * Physical Web Audio attachment belongs to the accepted playback-generation commit.
     */
    public restorePlaybackState(snapshot: SoundPlaybackSnapshot): void {
        const state = copySoundPlaybackSnapshot(snapshot);
        const restored = SoundStore.get().replaceSoundPlaybacks(this.ref, Array.from(this.voices), state.voices, (disposed) => this.releaseVoice(disposed));
        this.voices.clear();
        for (const voice of restored) {
            if (voice !== null) {
                this.voices.add(voice);
            }
        }
        this.active = state.activeVoiceIndex === null ? null : (restored[state.activeVoiceIndex] ?? null);
    }

    private releaseVoice(handle: SoundPlaybackHandle): void {
        this.voices.delete(handle);
        if (this.active === handle) {
            this.active = null;
        }
    }
}
