"use strict";

const prompts = require("../prompts");
const schemas = require("../schemas");
const { runTextAgent } = require("../run-agent");
const { regionDirective } = require("../medical-context");

async function run(ctx) {
  const raw = ctx.artifacts.raw_transcription?.raw_transcription || [];
  const nonMedLines = raw
    .filter((line) => {
      if (line.section === "medication") return false;
      if (line.section === "patient") return String(line.text || "").length > 12;
      return true;
    })
    .map((line) => `${line.section}: ${line.text}`)
    .join("\n");
  const regionLine = regionDirective(
    ctx.artifacts.raw_transcription?.region_hint,
    "clinical_context"
  );

  const { result } = await runTextAgent(ctx, {
    instructions: prompts.clinicalContext,
    promptLines: [
      "Extract abbreviations, allergies, clinical context, and non-medication text from this transcription.",
      "Do not re-emit medication lines.",
      regionLine,
      nonMedLines
        ? `Non-medication transcription lines:\n${nonMedLines}`
        : "(no non-medication lines)"
    ],
    schemaName: "clinical_context",
    schema: schemas.clinicalContext,
    maxTokens: 3500
  });
  return result;
}

module.exports = { id: "clinical_context", label: "Clinical context", critical: false, run };
