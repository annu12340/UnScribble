"use strict";

const { execSync } = require("node:child_process");

const port = String(process.env.E2E_PORT || 3210);

if (process.platform === "win32") {
  process.exit(0);
}

let pids = "";
try {
  pids = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim();
} catch {
  process.exit(0);
}

for (const pid of pids.split(/\s+/).filter(Boolean)) {
  try {
    process.kill(Number(pid), "SIGKILL");
  } catch {
    // Process already exited.
  }
}
