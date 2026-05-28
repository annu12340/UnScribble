"use strict";

const { defineConfig, devices } = require("@playwright/test");

const PORT = Number(process.env.E2E_PORT || 3210);

module.exports = defineConfig({
  testDir: "./test/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure"
  },
  webServer: {
    command: `WORKFLOW_MOCK=1 PORT=${PORT} npm start`,
    url: `http://127.0.0.1:${PORT}/landing.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list"
});
