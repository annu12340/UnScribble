"use strict";

const { applySafetyRules } = require("../safety-rules");

async function run(ctx) {
  return applySafetyRules(ctx.mergedForSynthesis);
}

module.exports = {
  id: "safety_review",
  label: "Safety review",
  critical: false,
  run,
  deterministic: true,
};
