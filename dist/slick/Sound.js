import { SoundStore } from "./openal/SoundStore.js";
import { ResourceLoader } from "./util/ResourceLoader.js";
/**
 * Java Slick2D counterpart: org.newdawn.slick.Sound.
 *
 * Short sound effect wrapper with Slick-compatible play/stop methods.
 */
export class Sound {
    ref;
    readyPromise;
    active = null;
    /**
     * Java Slick2D counterpart: Sound constructors.
     *
     * Stores a resource reference and queues browser resource loading when possible.
     */
    constructor(refOrUrlOrInput, ref) {
        if (typeof refOrUrlOrInput === "string") {
            this.ref = refOrUrlOrInput;
            this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
        }
        else if (refOrUrlOrInput instanceof URL) {
            this.ref = refOrUrlOrInput.toString();
            this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
        }
        else {
            this.ref = ref ?? "sound";
            if (refOrUrlOrInput instanceof ArrayBuffer) {
                ResourceLoader.registerResource(this.ref, refOrUrlOrInput);
                this.readyPromise = SoundStore.get().preloadAudioBuffer(this.ref);
            }
            else {
                const registered = refOrUrlOrInput.arrayBuffer().then((bytes) => {
                    ResourceLoader.registerResource(this.ref, bytes);
                });
                this.readyPromise = ResourceLoader.track(registered.then(() => SoundStore.get().loadAudioBuffer(this.ref)).then(() => undefined), this.ref);
                void this.readyPromise.catch(() => undefined);
            }
        }
    }
    /** Browser parity helper: waits for constructor-queued audio decode. */
    ready() {
        return this.readyPromise;
    }
    /** Browser parity helper: Java-style explicit load alias. */
    load() {
        return this.ready();
    }
    play(pitch = 1, volume = 1) {
        const effectiveVolume = volume * SoundStore.get().getSoundVolume();
        const handle = SoundStore.get().playSound(this.ref, pitch, effectiveVolume, false, () => {
            if (this.active === handle) {
                this.active = null;
            }
        });
        if (!handle) {
            this.active = null;
            return;
        }
        this.active = handle;
    }
    /** Java Slick2D counterpart: Sound.playAt(float, float, float, float, float). */
    playAt(pitch, volume, x, y, z) {
        const effectiveVolume = volume * SoundStore.get().getSoundVolume();
        const handle = SoundStore.get().playSound(this.ref, pitch, effectiveVolume, false, () => {
            if (this.active === handle) {
                this.active = null;
            }
        }, { x, y, z });
        if (!handle) {
            this.active = null;
            return;
        }
        this.active = handle;
    }
    loop(pitch = 1, volume = 1) {
        const effectiveVolume = volume * SoundStore.get().getSoundVolume();
        const handle = SoundStore.get().playSound(this.ref, pitch, effectiveVolume, true);
        if (!handle) {
            this.active = null;
            return;
        }
        this.active = handle;
    }
    /** Java Slick2D counterpart: Sound.playing(). */
    playing() {
        if (!this.active?.playing()) {
            this.active = null;
            return false;
        }
        return true;
    }
    /** Java Slick2D counterpart: Sound.stop(). */
    stop() {
        if (this.active) {
            this.active.stop();
            this.active = null;
        }
    }
}
//# sourceMappingURL=Sound.js.map