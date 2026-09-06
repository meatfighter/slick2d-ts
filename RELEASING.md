# Release qualification and retention

Release from a clean checkout of one reviewed commit. Preserve existing Git history.
Run `npm run qualify` against that exact commit before pushing or tagging it. Local
qualification is the normal gate; GitHub Actions Verify is manual-only and optional
as a second Linux environment.

Archive an already verified build on a host with Node.js, Git, and tar:

```sh
node scripts/archive-release.mjs dist /absolute/path/outside/repository/release-artifacts
```

Use a new empty output directory for each archive. The command refuses a dirty
checkout or an existing same-commit archive. Verify `SHA256SUMS` after transferring
an archive, and verify the contained files against `RELEASE.json` after extracting.
Rebuilds can have new timestamps: the archive hash identifies the exact deployed
bytes, while the commit identifies their source. Retain the last known good archive
for rollback instead of rebuilding it during an incident.

A manually run Verify workflow provides an independent Linux check and retains its
qualified artifact for 90 days. It is optional and does not replace local qualification.

After all required checks pass, create an annotated release tag on that exact
commit and push the tag. Choose a unique version tag matching the release; never
move an existing tag. Record the tag, commit, archive hash, qualification run, and
actual deployment time together. Creating an archive or tag does not deploy it.
Do not change repository visibility as part of the build.

For production game compatibility, qualify the exact engine pin in each consuming game before release.
