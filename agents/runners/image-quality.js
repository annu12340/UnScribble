"use strict";

const prompts = require("../prompts");
const schemas = require("../schemas");
const { runVisionAgent } = require("../run-agent");

async function run(ctx) {
  const { result } = await runVisionAgent(ctx, {
    instructions: prompts.imageQuality,
    promptLines: ["Assess whether this prescription image is suitable for medication OCR."],
    schemaName: "image_quality_assessment",
    schema: schemas.imageQuality,
    maxTokens: 2000,
    imageDetail: "low"
  });
  return result;
}

module.exports = { id: "image_quality", label: "Image quality", critical: false, run };
