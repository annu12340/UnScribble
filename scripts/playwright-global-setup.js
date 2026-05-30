"use strict";

const { execSync } = require("node:child_process");

function killPort(port) {
  if (process.platform === "win32") return;

  let pids;
  try {
    pids = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim();
  } catch {
    return;
  }

  for (const pid of pids.split(/\s+/).filter(Boolean)) {
    try {
      process.kill(Number(pid), "SIGKILL");
    } catch {
      // Process already exited.
    }
  }
}

module.exports = async function globalSetup() {
  killPort(String(process.env.E2E_PORT || 3210));
  await new Promise((resolve) => setTimeout(resolve, 250));
};
