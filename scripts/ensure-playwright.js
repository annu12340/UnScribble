"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const chromiumDir = path.join(
  __dirname,
  "..",
  "node_modules",
  "playwright-core",
  ".local-browsers"
);

if (process.env.SKIP_PLAYWRIGHT_INSTALL === "1") {
  process.exit(0);
}

const hasChromium =
  fs.existsSync(chromiumDir) &&
  fs.readdirSync(chromiumDir).some((entry) => entry.includes("chromium"));

if (hasChromium) {
  process.exit(0);
}

console.log("Installing Playwright Chromium for e2e tests…");
const result = spawnSync("npx", ["playwright", "install", "chromium"], {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
  shell: process.platform === "win32"
});

process.exit(result.status ?? 1);
