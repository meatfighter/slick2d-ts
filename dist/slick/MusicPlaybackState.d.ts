/** Logical music state. No browser objects or playback-generation identifiers are persisted. */
export type MusicTransportState = "stopped" | "playing" | "paused" | "ended-pending";
export type MusicFadeSnapshot = Readonly<{
    durationMs: number;
    elapsedMs: number;
    startVolume: number;
    endVolume: number;
    stopAfterFade: boolean;
}>;
export type MusicPlaybackSnapshot = Readonly<{
    transport: MusicTransportState;
    looped: boolean;
    playbackRate: number;
    positionSeconds: number;
    volume: number;
    fade: MusicFadeSnapshot | null;
}>;
/** Validate untrusted save data before it can change the current music transport. */
export declare function isMusicPlaybackSnapshot(value: unknown): value is MusicPlaybackSnapshot;
/** Return a detached value; callers cannot mutate live fade state through a snapshot. */
export declare function copyMusicPlaybackSnapshot(value: MusicPlaybackSnapshot): MusicPlaybackSnapshot;
//# sourceMappingURL=MusicPlaybackState.d.ts.map