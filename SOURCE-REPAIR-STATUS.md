# Engine source-repair checkpoint

Date: 2026-09-11

Status: **source changes with focused regression coverage; not a qualified engine package**.

Baseline: `d1f4a385740bfced044439100a63ef855be9b722` on `dev/pwa-audit-cutover-20260910`.

## Implemented in this checkpoint

- Apply the engine portion of the source-repair kit: exception-safe, failure-latching teardown in `SoundStore` and `AppGameContainer`; remove the obsolete persistent-context `AudioContextLifecycle` and `BrowserAudioLifecycle` source modules. Their root exports were already absent at the baseline.
- Ensure failed music detachment cannot skip other handles, output disconnection, or native close. Unsafe retirement remains observable on repeated cleanup and prevents new output or successful silent-clock commitment.
- Block the ordinary-container audio initialization path after unsafe retirement as well as explicit PWA playback startup.
- Keep the container's shared owner blocked after unsafe teardown. Continue attempting independent cleanup steps, rather than mistaking a second no-op destruction call for success.
- Deliver the original startup/frame error and cleanup failure to the shell instead of losing error notification when destruction throws.
- Make failed graphics-loss cleanup terminal rather than allowing the partially cleaned container to resume.
- Ensure `AL.destroy()` and its cache-preserving variant attempt hardware retirement even when logical Music reset throws.
- Add `test/retirement-source.test.mjs` with 33 passing focused checks, including actual `PlaybackSession` -> `PwaAudioManager` -> `SoundStore` wiring.

The changes address engine-side F08 retirement/error handling, F13 graphics-loss failure handling, and the authorized F02 legacy-source removal. This is not a claim that every cross-repository audit finding is closed.

## Validation actually performed

Original source files were reconstructed from the immutable baseline and checked against their Git blob hashes before editing. The resulting published source/test blobs match the bytes exercised locally.

Command:

```sh
node --test test/retirement-source.test.mjs
```

Result: **33 passed, 0 failed, 0 skipped** on Node 22.16.0 with the locally available TypeScript 5.8.3 transpiler.

The tests load whole production source modules with explicit browser, renderer, resource-loader, and base-container doubles. They do not substitute copied implementations of the playback transaction, facade, or sound store. They are nevertheless **not** full-project type checking, emitted-package integration, browser testing, or game qualification.

## Still required before using this revision as a game dependency

1. Migrate the older recovery/retirement tests and browser harnesses to the fresh-context contract. This checkpoint does not change the existing test files that still refer to the removed legacy modules or expect earlier cleanup semantics. Do not restore obsolete recovery code merely to satisfy those old expectations, and do not discard applicable behavioral coverage.
2. Reconcile the engine manifest/lockfile with npm. The baseline manifest says 1.6.0, while the lockfile still has 1.5.6 metadata and the accidental package named `package-lock.json`. No integrity hashes or generated lock entries were hand-authored here.
3. Install the intended locked toolchain; run formatting, lint, full type checking, all applicable tests, and browser checks.
4. Regenerate and commit all of `dist`, then run the distribution-cleanliness and clean-checkout qualification checks.
5. Only then pin each game to the exact pushed commit containing that matching distribution, regenerate its lockfile with npm, and qualify the games.

Native Git/npm network access failed DNS resolution in the execution environment. Authenticated GitHub connector source reads and writes worked independently. The failed native route did not prevent publishing this source checkpoint, but the complete locked-toolchain build and qualification were not run.

**Do not install this source-only commit as though its committed `dist` contains these changes.** `dist`, package metadata, dependency pins, games, Java projects, server, workflow definitions, and deployments were not changed by this checkpoint. No GitHub Actions were dispatched.

## Repair-kit interaction

The engine source transformations from the previous repair ZIP are incorporated here, together with additional regression fixes. Do not apply that engine patch a second time over this checkpoint: its old baseline hashes should no longer match. The three game repair bundles are separate and were not applied by this engine-only update.
