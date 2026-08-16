# Slick2D-TS Music Resume Dependent Project Handoff

Date: 2026-08-14

Audience: AIs updating projects that depend on `slick2d-ts`.

## Summary

`slick2d-ts` repaired looped `Music` resume behavior for Web Audio.

Before this engine fix, a looped track suspended through `GameContainer.setMusicOn(false)` / `SoundStore.setMusicOn(false)` could resume from the beginning or from the buffer end after the track had already played past one full loop. The root cause was that the browser implementation recreated `AudioBufferSourceNode` instances and clamped accumulated elapsed positions to `buffer.duration` instead of wrapping looped positions with modulo duration.

The fix belongs in `slick2d-ts`, not in each game.

## Engine Change

Updated file:

```text
src/slick/Music.ts
```

Behavior after the fix:

- Looped music offsets are normalized as `max(0, offset) % buffer.duration` when duration is finite and positive.
- Non-looped music offsets continue to clamp to `buffer.duration`.
- Global music-off suspension preserves `Music.playing()` and logical current-music state.
- Music pause/resume and global music-off/music-on resume from the preserved musical position.
- Pending async starts now use the latest stored `Music.setPosition(...)` value instead of the original closed-over `play()` / `loop()` offset.

Tests were added in:

```text
test/sound-store-parity.test.mjs
```

They verify:

- Looped global music resume wraps elapsed positions inside the buffer.
- Non-looped global music resume clamps elapsed positions.
- A `setPosition(...)` call made before async audio start finishes is honored by the eventual `source.start(...)`.

## What Dependent Projects Should Do

1. Update the dependency to a `slick2d-ts` build that includes this repair.
2. Rebuild the dependent project.
3. Smoke-test any browser lifecycle suspension, pause/unpause, save/restore, or menu-return path that toggles `GameContainer.setMusicOn(...)`.
4. If the project added a local workaround that captures and reapplies looped music position around `setMusicOn(false)` / `setMusicOn(true)`, review whether it can be removed after validation.

## Caution

Do not replace this with volume-only muting in dependent projects. Java Slick2D's `setMusicOn(false)` pauses the active music source and `setMusicOn(true)` restarts it, so the browser parity behavior is suspension with preserved position, not just setting gain to zero.

Also preserve this contract:

```text
Music.playing() remains true while music is globally suspended.
```

Several Java-style song sequencers use `!music.playing()` to decide when an intro has finished or when a loop should start. Reporting `false` during global suspension can make those sequencers restart or advance songs incorrectly.

## Suggested Dependent-Project Validation

Run the project's normal checks, then manually test:

1. Start gameplay with looped music.
2. Let the music run past at least one full loop.
3. Trigger the project's browser lifecycle suspension path, such as hiding the tab or switching focus if the project supports that.
4. Return focus and confirm the music resumes at the same musical position.
5. Pause and unpause in-game if the game uses `setMusicOn(false)` for pause.
6. Confirm the music resumes from the paused position and the song does not restart.
