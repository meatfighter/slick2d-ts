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

const STATE_KEYS = ["transport", "looped", "playbackRate", "positionSeconds", "volume", "fade"] as const;
const FADE_KEYS = ["durationMs", "elapsedMs", "startVolume", "endVolume", "stopAfterFade"] as const;

function recordWithKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const names = Object.keys(value);
    return names.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function finite(value: unknown, min: number, max = Number.MAX_VALUE): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

/** Validate untrusted save data before it can change the current music transport. */
export function isMusicPlaybackSnapshot(value: unknown): value is MusicPlaybackSnapshot {
    if (!recordWithKeys(value, STATE_KEYS)) {
        return false;
    }
    if (
        !["stopped", "playing", "paused", "ended-pending"].includes(String(value.transport)) ||
        typeof value.transport !== "string" ||
        typeof value.looped !== "boolean" ||
        !finite(value.playbackRate, 0.25, 4) ||
        !finite(value.positionSeconds, 0) ||
        !finite(value.volume, 0, 1)
    ) {
        return false;
    }
    const fade = value.fade;
    return (
        fade === null ||
        (recordWithKeys(fade, FADE_KEYS) &&
            finite(fade.durationMs, Number.MIN_VALUE) &&
            finite(fade.elapsedMs, 0, fade.durationMs) &&
            finite(fade.startVolume, 0, 1) &&
            finite(fade.endVolume, 0, 1) &&
            typeof fade.stopAfterFade === "boolean")
    );
}

/** Return a detached value; callers cannot mutate live fade state through a snapshot. */
export function copyMusicPlaybackSnapshot(value: MusicPlaybackSnapshot): MusicPlaybackSnapshot {
    if (!isMusicPlaybackSnapshot(value)) {
        throw new TypeError("Invalid music playback snapshot");
    }
    return { ...value, fade: value.fade === null ? null : { ...value.fade } };
}
