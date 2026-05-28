"use strict";

const path = require("node:path");

module.exports = {
  apiKey: process.env.NVIDIA_API_KEY || process.env.OPENAI_API_KEY || "",
  baseUrl: (process.env.NVIDIA_API_BASE_URL || "https://inference-api.nvidia.com/v1").replace(
    /\/$/,
    ""
  ),
  model: process.env.NVIDIA_MODEL || "openai/openai/gpt-5.5",
  agentTimeoutMs: Number(process.env.WORKFLOW_AGENT_TIMEOUT_MS || 90000),
  nimRequestTimeoutMs: Number(
    process.env.NVIDIA_REQUEST_TIMEOUT_MS || process.env.WORKFLOW_AGENT_TIMEOUT_MS || 90000
  ),
  mock: process.env.WORKFLOW_MOCK === "1",
  skipSynthesis: process.env.WORKFLOW_SKIP_SYNTHESIS === "1",
  formularyPath: path.join(__dirname, "..", "data", "formulary.json")
};
