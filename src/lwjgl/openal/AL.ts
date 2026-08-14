import { SoundStore } from "../../slick/openal/SoundStore.js";

/**
 * Java LWJGL counterpart: org.lwjgl.openal.AL.
 *
 * Minimal audio lifecycle shim for copied Slick2D container code.
 */
export class AL {
    private static created = false;

    /** Java LWJGL counterpart: AL.create(). */
    public static create(): void {
        AL.created = true;
        SoundStore.get().init();
    }

    /** Java LWJGL counterpart: AL.destroy(). */
    public static destroy(): void {
        SoundStore.get().destroy();
        AL.created = false;
    }

    /** Browser/PWA helper: tears down logical OpenAL state while preserving decoded audio cache. */
    public static destroyPreservingAudioCache(): void {
        SoundStore.get().destroyPreservingAudioCache();
        AL.created = false;
    }

    /** Java LWJGL counterpart: AL.isCreated(). */
    public static isCreated(): boolean {
        return AL.created;
    }
}
