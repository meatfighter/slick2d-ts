import { AudioPlaybackHandle, SoundStore } from "./openal/SoundStore.js";
import { ResourceLoader } from "./util/ResourceLoader.js";

/**
 * Java Slick2D counterpart: org.newdawn.slick.Sound.
 *
 * Short sound effect wrapper with Slick-compatible play/stop methods.
 */
export class Sound {
    private readonly ref: string;
    private readonly readyPromise: Promise<void>;
    private active: AudioPlaybackHandle[] = [];

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
                this.readyPromise = ResourceLoader.track(registered
                    .then(() => SoundStore.get().loadAudioBuffer(this.ref))
                    .then(() => undefined));
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
        if (!SoundStore.get().soundsOn()) {
            return;
        }
        const handle = SoundStore.get().playSound(this.ref, pitch, volume, false, () => {
            this.active = this.active.filter((item) => item !== handle);
        });
        if (!handle) {
            return;
        }
        this.active.push(handle);
    }

    /** Java Slick2D counterpart: Sound.playAt(float, float, float, float, float). */
    public playAt(pitch: number, volume: number, _x: number, _y: number, _z: number): void {
        this.play(pitch, volume);
    }

    /** Java Slick2D counterpart: Sound.loop(). */
    public loop(): void;
    /** Java Slick2D counterpart: Sound.loop(float, float). */
    public loop(pitch: number, volume: number): void;
    public loop(pitch: number = 1, volume: number = 1): void {
        const handle = SoundStore.get().playSound(this.ref, pitch, volume, true);
        if (!handle) {
            return;
        }
        this.active.push(handle);
    }

    /** Java Slick2D counterpart: Sound.playing(). */
    public playing(): boolean {
        this.active = this.active.filter((handle) => handle.playing());
        return this.active.length > 0;
    }

    /** Java Slick2D counterpart: Sound.stop(). */
    public stop(): void {
        for (const handle of this.active) {
            handle.stop();
        }
        this.active = [];
    }
}
