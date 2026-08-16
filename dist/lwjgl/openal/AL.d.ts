/**
 * Java LWJGL counterpart: org.lwjgl.openal.AL.
 *
 * Minimal audio lifecycle shim for copied Slick2D container code.
 */
export declare class AL {
    private static created;
    /** Java LWJGL counterpart: AL.create(). */
    static create(): void;
    /** Java LWJGL counterpart: AL.destroy(). */
    static destroy(): void;
    /** Browser/PWA helper: tears down logical OpenAL state while preserving decoded audio cache. */
    static destroyPreservingAudioCache(): void;
    /** Java LWJGL counterpart: AL.isCreated(). */
    static isCreated(): boolean;
}
//# sourceMappingURL=AL.d.ts.map