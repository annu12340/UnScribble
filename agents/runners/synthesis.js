"use strict";

const { buildDeterministicSummary } = require("../merger");

async function run(ctx) {
  const merged = ctx.mergedForSynthesis || {};
  return { summary: buildDeterministicSummary(merged) };
}

module.exports = {
  id: "synthesis",
  label: "Summary",
  critical: false,
  run,
  deterministic: true,
};
