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
        SoundStore.get().clear();
        AL.created = false;
    }

    /** Java LWJGL counterpart: AL.isCreated(). */
    public static isCreated(): boolean {
        return AL.created;
    }
}
