"use strict";

const prompts = require("../prompts");
const schemas = require("../schemas");
const { runVisionAgent } = require("../run-agent");

async function run(ctx) {
  const raw = ctx.artifacts.raw_transcription?.raw_transcription || [];
  const excerpt = raw
    .filter((line) => line.section === "patient" || line.section === "other")
    .slice(0, 12)
    .map((line) => `Line ${line.line_number}: ${line.text}`)
    .join("\n");

  const { result } = await runVisionAgent(ctx, {
    instructions: prompts.patientHeader,
    promptLines: [
      "Extract patient and prescriber header fields from the image.",
      excerpt ? `Transcription excerpt:\n${excerpt}` : "",
    ],
    schemaName: "patient_header",
    schema: schemas.patientHeader,
    maxTokens: 2000,
    imageDetail: "high",
  });
  return result;
}

module.exports = {
  id: "patient_header",
  label: "Patient header",
  critical: false,
  run,
};
