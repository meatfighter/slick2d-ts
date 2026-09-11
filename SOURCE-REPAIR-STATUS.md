# Engine source-repair checkpoint

Date: 2026-09-11

Status: **source/test cutover candidate; not yet a qualified engine package**.

Development branch: `dev/pwa-audit-cutover-20260910`.

The original source-repair baseline was `d1f4a385740bfced044439100a63ef855be9b722`. Subsequent commits extend that repair and supersede the old engine ZIP. Do not apply the ZIP over the current branch.

## Implemented in the current source candidate

- Fresh playback generations are owned by `PlaybackSession`; PWA activation no longer depends on persistent-context recovery.
- The predecessor-retirement cancellation window is revision-fenced. An external `cancel()` invalidates a `begin()` even while that `begin()` is synchronously retiring its predecessor before publishing its own active record.
- Failed music detachment cannot skip other handles, output disconnection, or native close. Unsafe retirement remains observable on repeated cleanup and prevents new output or successful silent-clock commitment.
- The ordinary-container audio initialization path is also blocked after unsafe retirement; terminal failure cannot be bypassed by switching startup APIs.
- Container teardown attempts independent cleanup steps, preserves the original failure, and keeps shared ownership blocked after unsafe destruction.
- Failed graphics-loss cleanup is terminal rather than allowing a partially cleaned container to resume.
- `AL.destroy()` and its cache-preserving variant attempt hardware retirement even when logical Music reset throws.
- Logical Music snapshots, silent logical transport, and Song progression live in the engine rather than a game-specific recovery layer.
- `src/slick/openal/AudioContextLifecycle.ts` and `BrowserAudioLifecycle.ts` remain deleted, and `src/index.ts` exports the fresh playback/session APIs instead.

## Regression coverage added or retained

The development line includes focused coverage for:

- playback transaction begin/prepare/commit/cancel ownership;
- cancellation during predecessor retirement;
- synchronous reentry during native playback construction;
- bounded silent fallback and stale completion suppression;
- retirement failure latching and independent cleanup;
- logical Music transport and Song sequencing;
- resource/audio hardening that remains valid under the fresh-generation design.

Three obsolete suites were removed rather than restoring the deleted architecture:

- `test/audio-context-lifecycle.test.mjs`;
- `test/browser-audio-lifecycle.test.mjs`;
- `test/browser-audio-recovery.test.mjs`.

Those files tested the removed persistent-context/recovery model, including foreground recovery behavior that is now explicitly forbidden. Generic audio hardening coverage remains.

`test/no-legacy-audio-lifecycle.test.mjs` now prevents the deleted lifecycle modules from reappearing in source, public exports, or a freshly generated `dist`.

`test/package-metadata-consistency.test.mjs` requires `package.json` and `package-lock.json` to describe the same package version and rejects the accidental dependency literally named `package-lock.json`.

## Packaging state — intentionally unfinished until a local npm build

The source manifest currently declares `1.6.0`, but the committed lockfile still contains `1.5.6` root metadata and the accidental `package-lock.json` dependency. The committed `dist` is also stale: it still contains generated `AudioContextLifecycle`/`BrowserAudioLifecycle` files and does not yet represent the current source tree.

That mismatch must be repaired by the normal local toolchain, not by hand-editing generated files or npm integrity data:

1. run `npm install --package-lock-only --ignore-scripts` and review the lockfile diff;
2. run `npm ci`;
3. run formatting, lint, typecheck and the full test suite;
4. let the TypeScript build clean and regenerate the complete `dist` tree;
5. run browser verification;
6. inspect and commit the npm-generated lockfile plus the complete generated `dist` changes;
7. on that clean exact commit, run `npm run qualify` and package inspection;
8. push that qualified development commit and use its full 40-character SHA as the game dependency.

The new legacy-module guardrail is expected to pass after the clean build because the build removes stale output before TypeScript emission. The metadata-consistency test is expected to pass only after npm has reconciled the lockfile.

## Client handoff

The three games must not be repinned to this source-only checkpoint. After the locally built engine commit passes qualification and is pushed, install the same immutable codeload archive in every game with npm so both `package.json` and `package-lock.json` are generated from the real engine commit.

No tag, npm publication, main-branch merge, GitHub Actions run, staging deployment, production deployment, or server change is implied by this checkpoint.

## Environment note

Native Git/npm network access from the assistant execution container could not resolve GitHub/npm hosts. Authenticated GitHub connector reads and writes work independently, but they cannot substitute for the user's locked local npm/TypeScript build. Therefore no full package build or qualification result is claimed here.
