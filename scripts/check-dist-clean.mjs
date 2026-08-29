#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", "dist"], {
    encoding: "utf8"
}).trim();

if (status.length > 0) {
    console.error("The committed dist tree does not match the current source build:");
    console.error(status);
    console.error("");
    console.error("Run npm run build, review the generated dist changes, and commit them.");
    process.exitCode = 1;
}
