"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SCAN_DIRS = ["agents", "public", "scripts", "test"];
const SCAN_FILES = ["README.md", "CLAUDE.md", "package.json", "render.yaml", "server.js"];
const STALE_PATTERNS = [
  "agents/agents",
  "public/app.js",
  "public/render-result.js",
  "render-result.js",
  "public/styles.css",
  "public/landing.css",
  "test-gcal",
  "medication-mechanism.html",
  "/public/decode-client.js",
  "/public/upload.js",
  "/public/landing.js",
  "/public/results.js",
  "/public/medication-details.js",
  "/public/medication-schedule.js",
  "/public/protein-viewer.js",
  "/public/image-enhance.js",
  'src="/decode-client.js"',
  'src="/upload.js"',
  'type="module" src="/medication-details.js"'
];

function isTextFile(filePath) {
  return /\.(c?js|mjs|json|md|html|css|yaml|yml)$/i.test(filePath);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && isTextFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = [];
for (const file of SCAN_FILES) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) files.push(fullPath);
}
for (const dir of SCAN_DIRS) {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) walk(fullPath, files);
}

const failures = [];
for (const file of [...new Set(files)]) {
  if (file === __filename) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of STALE_PATTERNS) {
    if (text.includes(pattern)) {
      failures.push(`${path.relative(ROOT, file)} references stale path: ${pattern}`);
    }
  }
}

if (failures.length) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exit(1);
}

console.log("Structure check passed.");
