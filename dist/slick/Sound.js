import { copySoundPlaybackSnapshot } from "./SoundPlaybackState.js";
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
    voices = new Set();
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
        const handle = SoundStore.get().playSound(this.ref, pitch, effectiveVolume, false, undefined, undefined, (disposed) => this.releaseVoice(disposed));
        if (!handle) {
            this.active = null;
            return;
        }
        this.voices.add(handle);
        this.active = handle;
    }
    /** Java Slick2D counterpart: Sound.playAt(float, float, float, float, float). */
    playAt(pitch, volume, x, y, z) {
        const effectiveVolume = volume * SoundStore.get().getSoundVolume();
        const handle = SoundStore.get().playSound(this.ref, pitch, effectiveVolume, false, undefined, { x, y, z }, (disposed) => this.releaseVoice(disposed));
        if (!handle) {
            this.active = null;
            return;
        }
        this.voices.add(handle);
        this.active = handle;
    }
    loop(pitch = 1, volume = 1) {
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
    playing() {
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
    stop() {
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
    capturePlaybackState() {
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
    restorePlaybackState(snapshot) {
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
    releaseVoice(handle) {
        this.voices.delete(handle);
        if (this.active === handle) {
            this.active = null;
        }
    }
}
//# sourceMappingURL=Sound.js.map