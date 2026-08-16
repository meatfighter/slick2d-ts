/**
 * Java Slick2D counterpart: org.newdawn.slick.Sound.
 *
 * Short sound effect wrapper with Slick-compatible play/stop methods.
 */
export declare class Sound {
    private readonly ref;
    private readonly readyPromise;
    private active;
    constructor(ref: string);
    constructor(url: URL);
    constructor(input: ArrayBuffer | Blob, ref: string);
    /** Browser parity helper: waits for constructor-queued audio decode. */
    ready(): Promise<void>;
    /** Browser parity helper: Java-style explicit load alias. */
    load(): Promise<void>;
    /** Java Slick2D counterpart: Sound.play(). */
    play(): void;
    /** Java Slick2D counterpart: Sound.play(float, float). */
    play(pitch: number, volume: number): void;
    /** Java Slick2D counterpart: Sound.playAt(float, float, float, float, float). */
    playAt(pitch: number, volume: number, x: number, y: number, z: number): void;
    /** Java Slick2D counterpart: Sound.loop(). */
    loop(): void;
    /** Java Slick2D counterpart: Sound.loop(float, float). */
    loop(pitch: number, volume: number): void;
    /** Java Slick2D counterpart: Sound.playing(). */
    playing(): boolean;
    /** Java Slick2D counterpart: Sound.stop(). */
    stop(): void;
}
//# sourceMappingURL=Sound.d.ts.map