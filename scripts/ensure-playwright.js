"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

if (process.env.SKIP_PLAYWRIGHT_INSTALL === "1") {
  process.exit(0);
}

if (hasRequiredBrowsers()) {
  process.exit(0);
}

console.log("Installing Playwright Chromium for e2e tests…");
const result = spawnSync("npx", ["playwright", "install", "chromium"], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);

function hasRequiredBrowsers() {
  const dryRun = spawnSync(
    "npx",
    ["playwright", "install", "chromium", "--dry-run"],
    {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );

  if (dryRun.status !== 0) return false;

  const output = `${dryRun.stdout || ""}\n${dryRun.stderr || ""}`;
  const installLocations = [
    ...output.matchAll(/Install location:\s+(.+)/g),
  ].map((match) => match[1].trim());

  if (!installLocations.length) return false;
  return installLocations.every((location) => fs.existsSync(location));
}
