"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const ENTRY_POINTS = ["server.js"];
const SCAN_DIRS = ["agents", "public/js", "scripts", "test"];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectFiles() {
  const files = ENTRY_POINTS.map((file) => path.join(ROOT, file));
  for (const dir of SCAN_DIRS) {
    const fullPath = path.join(ROOT, dir);
    if (fs.existsSync(fullPath)) walk(fullPath, files);
  }
  return [...new Set(files)].sort();
}

let failed = false;
for (const file of collectFiles()) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    failed = true;
    const relative = path.relative(ROOT, file);
    process.stderr.write(`Syntax check failed: ${relative}\n`);
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax check passed (${collectFiles().length} files).`);
