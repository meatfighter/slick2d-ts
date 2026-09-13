# Releasing

This file contains the reproducible repository-local release procedure for `slick2d-ts`.

## Prerequisites

Use a Node.js version supported by [package.json](package.json) and Git. Install dependencies from the lockfile:

```sh
npm ci
```

Release from one reviewed commit with a clean working tree. Local qualification is the primary gate; GitHub Actions is optional and is not required for release.

## Build and commit generated `dist`

`dist/` is committed and is the package consumed by the game repositories. After a source change:

```sh
npm run build
git status --short
git diff -- dist
```

Review the generated output, then commit the source and generated `dist` together. Do not edit generated files by hand. `npm run check:dist` intentionally fails when the committed distribution does not match the source.

## Qualify the exact generated-output commit

Run qualification only after the generated `dist` changes are committed and the working tree is clean:

```sh
git status --short
npm run qualify
```

`npm run qualify` runs formatting, lint, type checks, behavioral tests, the committed-distribution check, real-browser verification, and final clean-tree verification.

For browser-facing changes, also exercise the affected behavior in the consuming games. Engine qualification establishes the library behavior; it does not establish compatibility with every game integration.

## Archive

Archive an already-qualified `dist` outside the repository:

```sh
node scripts/archive-release.mjs dist /absolute/path/outside/repository/release-artifacts
```

Use a new output directory for each archive. Preserve and verify the generated release metadata/checksums after transfer. Keep the previous known-good engine artifact/SHA available for rollback.

## Consumer pins and tag

The game repositories consume `slick2d-ts` through immutable commit archives. After qualifying the engine commit:

1. record its full SHA;
2. update each intended consumer's `package.json` and `package-lock.json` to that SHA;
3. qualify each consuming game independently;
4. create an annotated engine tag only on the exact qualified commit when the release is ready.

Never move an existing release tag. Creating a build, archive, or tag does not deploy or repin a game automatically.
