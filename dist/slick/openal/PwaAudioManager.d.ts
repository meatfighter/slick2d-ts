/**
 * PWA-specific Web Audio generation owner used by the three browser games.
 *
 * SoundStore's decoded-buffer cache is retained for the page lifetime. This
 * manager replaces only its context-bound playback graph. It also redirects
 * SoundStore audio decoding through OfflineAudioContext so boot preparation does
 * not establish the AudioContext that will later be used for gameplay.
 */
export declare class PwaAudioManager {
    private static readonly instance;
    private installed;
    private decoder;
    private originalLoadAudioBuffer;
    private generation;
    static get(): PwaAudioManager;
    /** Install decode-only preload semantics once, before a PWA starts preparing resources. */
    install(): void;
    /** Current physical playback generation number. */
    getGeneration(): number;
    hasPlaybackGeneration(): boolean;
    /**
     * Create a brand-new playback context from a New Game/Continue activation.
     * Construction and native resume() invocation happen synchronously before the
     * returned Promise can yield, which is the user-activation property validated
     * by the standalone 008 game-shell test.
     *
     * protectFromImmediateContainerDestroy covers Ms. Pac-Man's existing launch
     * ordering: it creates audio immediately before synchronously destroying a
     * retained old container. During that narrow turn soundWorks is false, so the
     * old container's BrowserAudioLifecycle teardown cannot suspend the new context.
     */
    beginPlaybackGeneration(protectFromImmediateContainerDestroy?: boolean): Promise<boolean>;
    /**
     * End gameplay's physical Web Audio generation without clearing decoded
     * AudioBuffers. Music handles are suspended first so their existing Music
     * objects preserve logical position/loop state; SFX are discarded.
     */
    endPlaybackGeneration(): void;
    private loadAudioBuffer;
    private getDecoder;
    private decodeAudioData;
    private retirePhysicalContext;
    private store;
    private throwIfAborted;
    private abortException;
    private waitForAbort;
}
//# sourceMappingURL=PwaAudioManager.d.ts.map
