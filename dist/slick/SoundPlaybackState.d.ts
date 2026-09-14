/** Logical sound-effect state. No browser objects or playback-generation identifiers are persisted. */
export type SoundSpatialPositionSnapshot = Readonly<{
    x: number;
    y: number;
    z: number;
}>;
export type SoundVoicePlaybackSnapshot = Readonly<{
    looped: boolean;
    playbackRate: number;
    positionSeconds: number;
    gain: number;
    spatialPosition: SoundSpatialPositionSnapshot | null;
}>;
export type SoundPlaybackSnapshot = Readonly<{
    voices: readonly SoundVoicePlaybackSnapshot[];
    activeVoiceIndex: number | null;
}>;
export declare function isSoundVoicePlaybackSnapshot(value: unknown): value is SoundVoicePlaybackSnapshot;
/** Validate untrusted save data before it can change logical sound-effect voices. */
export declare function isSoundPlaybackSnapshot(value: unknown): value is SoundPlaybackSnapshot;
/** Return a detached value; callers cannot mutate live transport state through a snapshot. */
export declare function copySoundPlaybackSnapshot(value: SoundPlaybackSnapshot): SoundPlaybackSnapshot;
//# sourceMappingURL=SoundPlaybackState.d.ts.map