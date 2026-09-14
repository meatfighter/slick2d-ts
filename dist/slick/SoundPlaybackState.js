const SOUND_STATE_KEYS = ["voices", "activeVoiceIndex"];
const SOUND_VOICE_KEYS = ["looped", "playbackRate", "positionSeconds", "gain", "spatialPosition"];
const SOUND_POSITION_KEYS = ["x", "y", "z"];
const MAX_SOUND_VOICES = 4096;
const MAX_SOUND_POSITION_SECONDS = Number.MAX_VALUE;
const MAX_SOUND_GAIN = Number.MAX_VALUE;
const MAX_SOUND_SPATIAL_COORDINATE = Number.MAX_VALUE;
function recordWithKeys(value, keys) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const names = Object.keys(value);
    return names.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
function finite(value, minimum, maximum) {
    return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}
function isSoundSpatialPositionSnapshot(value) {
    return (recordWithKeys(value, SOUND_POSITION_KEYS) &&
        finite(value.x, -MAX_SOUND_SPATIAL_COORDINATE, MAX_SOUND_SPATIAL_COORDINATE) &&
        finite(value.y, -MAX_SOUND_SPATIAL_COORDINATE, MAX_SOUND_SPATIAL_COORDINATE) &&
        finite(value.z, -MAX_SOUND_SPATIAL_COORDINATE, MAX_SOUND_SPATIAL_COORDINATE));
}
export function isSoundVoicePlaybackSnapshot(value) {
    if (!recordWithKeys(value, SOUND_VOICE_KEYS)) {
        return false;
    }
    return (typeof value.looped === "boolean" &&
        finite(value.playbackRate, 0.25, 4) &&
        finite(value.positionSeconds, 0, MAX_SOUND_POSITION_SECONDS) &&
        finite(value.gain, 0, MAX_SOUND_GAIN) &&
        (value.spatialPosition === null || isSoundSpatialPositionSnapshot(value.spatialPosition)));
}
/** Validate untrusted save data before it can change logical sound-effect voices. */
export function isSoundPlaybackSnapshot(value) {
    if (!recordWithKeys(value, SOUND_STATE_KEYS) || !Array.isArray(value.voices) || value.voices.length > MAX_SOUND_VOICES) {
        return false;
    }
    if (!value.voices.every(isSoundVoicePlaybackSnapshot)) {
        return false;
    }
    const activeVoiceIndex = value.activeVoiceIndex;
    return (activeVoiceIndex === null ||
        (typeof activeVoiceIndex === "number" && Number.isInteger(activeVoiceIndex) && activeVoiceIndex >= 0 && activeVoiceIndex < value.voices.length));
}
/** Return a detached value; callers cannot mutate live transport state through a snapshot. */
export function copySoundPlaybackSnapshot(value) {
    if (!isSoundPlaybackSnapshot(value)) {
        throw new TypeError("Invalid sound playback snapshot");
    }
    return {
        voices: value.voices.map((voice) => ({
            ...voice,
            spatialPosition: voice.spatialPosition === null ? null : { ...voice.spatialPosition }
        })),
        activeVoiceIndex: value.activeVoiceIndex
    };
}
//# sourceMappingURL=SoundPlaybackState.js.map