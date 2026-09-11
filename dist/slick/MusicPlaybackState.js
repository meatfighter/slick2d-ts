const STATE_KEYS = ["transport", "looped", "playbackRate", "positionSeconds", "volume", "fade"];
const FADE_KEYS = ["durationMs", "elapsedMs", "startVolume", "endVolume", "stopAfterFade"];
function recordWithKeys(value, keys) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const names = Object.keys(value);
    return names.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
function finite(value, min, max = Number.MAX_VALUE) {
    return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
/** Validate untrusted save data before it can change the current music transport. */
export function isMusicPlaybackSnapshot(value) {
    if (!recordWithKeys(value, STATE_KEYS)) {
        return false;
    }
    if (!["stopped", "playing", "paused", "ended-pending"].includes(String(value.transport)) ||
        typeof value.transport !== "string" ||
        typeof value.looped !== "boolean" ||
        !finite(value.playbackRate, 0.25, 4) ||
        !finite(value.positionSeconds, 0) ||
        !finite(value.volume, 0, 1)) {
        return false;
    }
    const fade = value.fade;
    return (fade === null ||
        (recordWithKeys(fade, FADE_KEYS) &&
            finite(fade.durationMs, Number.MIN_VALUE) &&
            finite(fade.elapsedMs, 0, fade.durationMs) &&
            finite(fade.startVolume, 0, 1) &&
            finite(fade.endVolume, 0, 1) &&
            typeof fade.stopAfterFade === "boolean"));
}
/** Return a detached value; callers cannot mutate live fade state through a snapshot. */
export function copyMusicPlaybackSnapshot(value) {
    if (!isMusicPlaybackSnapshot(value)) {
        throw new TypeError("Invalid music playback snapshot");
    }
    return { ...value, fade: value.fade === null ? null : { ...value.fade } };
}
//# sourceMappingURL=MusicPlaybackState.js.map