import { SoundStore } from "../../slick/openal/SoundStore.js";
/**
 * Java LWJGL counterpart: org.lwjgl.openal.AL.
 *
 * Minimal audio lifecycle shim for copied Slick2D container code.
 */
export class AL {
    static created = false;
    /** Java LWJGL counterpart: AL.create(). */
    static create() {
        AL.created = true;
        SoundStore.get().init();
    }
    /** Java LWJGL counterpart: AL.destroy(). */
    static destroy() {
        SoundStore.get().destroy();
        AL.created = false;
    }
    /** Browser/PWA helper: tears down logical OpenAL state while preserving decoded audio cache. */
    static destroyPreservingAudioCache() {
        SoundStore.get().destroyPreservingAudioCache();
        AL.created = false;
    }
    /** Java LWJGL counterpart: AL.isCreated(). */
    static isCreated() {
        return AL.created;
    }
}
//# sourceMappingURL=AL.js.map