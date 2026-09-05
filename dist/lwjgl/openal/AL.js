import { Music } from "../../slick/Music.js";
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
        SoundStore.get().init();
        AL.created = true;
    }
    /** Java LWJGL counterpart: AL.destroy(). */
    static destroy() {
        try {
            Music.resetPlaybackState();
            SoundStore.get().destroy();
        }
        finally {
            AL.created = false;
        }
    }
    /** Browser/PWA helper: tears down logical OpenAL state while preserving decoded audio cache. */
    static destroyPreservingAudioCache() {
        try {
            Music.resetPlaybackState();
            SoundStore.get().destroyPreservingAudioCache();
        }
        finally {
            AL.created = false;
        }
    }
    /** Java LWJGL counterpart: AL.isCreated(). */
    static isCreated() {
        return AL.created;
    }
}
//# sourceMappingURL=AL.js.map