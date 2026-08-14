# Slick2D-ts PWA Audio Warmup Handoff

Date: 2026-08-14

Engine project changed: `C:\js-projects\slick2d-ts`

## Summary

`slick2d-ts` now exposes browser/PWA helpers for audio warmup and preserved audio teardown. Java-style defaults remain unchanged: ordinary `AppGameContainer.destroy()` and `AL.destroy()` still stop playback, clear decoded audio buffers, close the `AudioContext`, and reset audio init flags.

Dependent PWA projects can now opt into:

- bulk audio fetch/decode before entering gameplay;
- preserving decoded Web Audio buffers across menu/game/container teardown in the same page session;
- stopping all playback without clearing decoded audio.

## New Public APIs

```ts
export type AudioPreloadProgress = {
    ref: string;
    loaded: number;
    total: number;
};

SoundStore.get().preloadAudioBuffers(
    refs: Iterable<string>,
    onProgress?: (progress: AudioPreloadProgress) => void
): Promise<void>;

SoundStore.get().stopAllPlayback(): void;
SoundStore.get().resetPlaybackState(): void;
SoundStore.get().clearDecodedBuffers(): void;
SoundStore.get().destroyPreservingAudioCache(): void;

AL.destroyPreservingAudioCache(): void;

appContainer.setPreserveAudioCacheOnDestroy(preserve: boolean): void;
appContainer.isPreservingAudioCacheOnDestroy(): boolean;
```

## Behavior Details

- `preloadAudioBuffers(...)` deduplicates refs, calls existing `preloadAudioBuffer(ref)` for each unique ref, reports completion progress, and reuses existing decoded or in-flight audio buffer promises.
- Audio warmup remains tied into `ResourceLoader.track(...)`, so `ResourceLoader.waitForAll()` still observes decode work.
- `stopAllPlayback()` stops active music and sound effects, clears active handle/source bookkeeping, and does not clear decoded buffers or close the `AudioContext`.
- `clearDecodedBuffers()` clears only the decoded Web Audio buffer cache.
- `destroyPreservingAudioCache()` stops playback and resets Java-visible audio init/on flags, but keeps decoded buffers, the usable `AudioContext`, audio buses, and stored volume values.
- `AL.destroyPreservingAudioCache()` marks `AL.isCreated()` false while preserving the reusable browser audio cache.
- `AppGameContainer.setPreserveAudioCacheOnDestroy(true)` makes that container use the preserved audio teardown path from `destroy()`.

## Suggested Dependent PWA Use

After showing the launcher/menu, preload raw resources and then warm audio refs:

```ts
await ResourceLoader.preloadResources(RESOURCE_REFS, onResourceProgress);

const audioRefs = RESOURCE_REFS.filter((ref) =>
    ref.endsWith(".ogg") || ref.endsWith(".wav")
);
await SoundStore.get().preloadAudioBuffers(audioRefs, onAudioProgress);
```

On Start/Continue, call the audio unlock from the user gesture path before waiting on long async work:

```ts
void SoundStore.get().unlock();
await backgroundPreparationPromise;

const appContainer = new AppGameContainer(game, width, height, false);
appContainer.setPreserveAudioCacheOnDestroy(true);
await appContainer.start();
```

When returning to the menu, `container.destroy()` will stop active playback but keep decoded audio alive if `setPreserveAudioCacheOnDestroy(true)` was set.

## Important Gotcha

If a PWA warms audio before a container exists, avoid calling plain `AL.destroy()` in the menu/start cleanup path unless you intentionally want to discard the warmed decoded audio and close the `AudioContext`.

Use one of these approaches:

- do not call `AL.destroy()` when no game container has been started and the menu wants to preserve warmed audio;
- or call `AL.destroyPreservingAudioCache()` for browser menu cleanup that should stop playback/reset flags but keep decoded audio;
- or rely on `appContainer.setPreserveAudioCacheOnDestroy(true)` once a container exists.

## What Not To Change

- Do not change Java-style `Sound` or `Music` constructor call sites just to warm audio. The constructors already reuse the same `SoundStore` decoded buffer cache.
- Do not change Slick sound-effect volume semantics. `Sound.play(...)` and `SoundStore.playSound(...)` still apply the Java-style double sound-volume multiplication. PWA master sliders that want linear master volume should keep their existing square-root compensation for sound effects.
- Do not make preserved audio teardown the default unless the dependent project explicitly wants higher memory use in exchange for faster menu/game restarts.
- Do not add game-specific resource manifests or menu behavior to `slick2d-ts`.

## Validation Performed In Slick2D-ts

The engine tests cover:

- bulk audio warmup deduplication and progress;
- warmup failure reporting through tracked resource errors;
- reuse of cached decoded buffers;
- `stopAllPlayback()` preserving decoded buffers;
- default `AL.destroy()` clearing decoded buffers and closing the context;
- preserved AL/container destroy keeping decoded buffers and the reusable context;
- container routing to default or preserved audio teardown based on `setPreserveAudioCacheOnDestroy(...)`.

