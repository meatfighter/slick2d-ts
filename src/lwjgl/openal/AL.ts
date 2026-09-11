import { Music } from "../../slick/Music.js";
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
        const store = SoundStore.get();
        store.init();
        // A partially constructed ordinary Web Audio graph is rolled back by
        // SoundStore and must remain retryable. Explicit-generation mode is a
        // logical OpenAL owner even when the accepted session is deliberately
        // silent and therefore has no hardware context.
        AL.created = store.isUsingExplicitPlaybackGenerations() || store.hasPlaybackGeneration();
    }

    /** Java LWJGL counterpart: AL.destroy(). */
    public static destroy(): void {
        AL.destroyAudio(false);
    }

    /** Browser/PWA helper: tears down logical OpenAL state while preserving decoded audio cache. */
    public static destroyPreservingAudioCache(): void {
        AL.destroyAudio(true);
    }

    private static destroyAudio(preserveCache: boolean): void {
        const failures: unknown[] = [];
        try {
            Music.resetPlaybackState();
        } catch (error) {
            failures.push(error);
        }
        try {
            if (preserveCache) {
                SoundStore.get().destroyPreservingAudioCache();
            } else {
                SoundStore.get().destroy();
            }
        } catch (error) {
            failures.push(error);
        } finally {
            AL.created = false;
        }
        if (failures.length !== 0) {
            throw new AggregateError(failures, "Unable to destroy OpenAL state safely.");
        }
    }

    /** Java LWJGL counterpart: AL.isCreated(). */
    public static isCreated(): boolean {
        return AL.created;
    }
}
