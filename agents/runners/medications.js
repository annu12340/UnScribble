"use strict";

const prompts = require("../prompts");
const schemas = require("../schemas");
const { runVisionAgent } = require("../run-agent");
const { regionDirective, lasaBlockFor } = require("../medical-context");

async function run(ctx) {
  const raw = ctx.artifacts.raw_transcription?.raw_transcription || [];
  const medLines = raw
    .filter((line) => line.section === "medication")
    .map((line) => `Line ${line.line_number}: ${line.text}`)
    .join("\n");
  const regionLine = regionDirective(ctx.artifacts.raw_transcription?.region_hint, "medications");

  const rerun = Boolean(ctx.medicationsRerun);
  let focusedLasa = "";
  if (rerun) {
    const firstPassNames = (ctx.artifacts.medications?.medications || [])
      .map((m) => m.medication_name)
      .filter(Boolean);
    focusedLasa = [
      "Second-pass review: low-confidence medications were detected on first pass. Re-read the script carefully, especially for drugs that resemble these LASA pairs:",
      lasaBlockFor(firstPassNames)
    ].join("\n");
  }

  const { result } = await runVisionAgent(ctx, {
    instructions: prompts.medications,
    promptLines: [
      "Structure medication lines from the raw transcription below. Do not add drugs not present in the transcription.",
      regionLine,
      focusedLasa,
      "Raw medication lines:",
      medLines || "(none transcribed)"
    ],
    schemaName: "medications",
    schema: schemas.medications,
    maxTokens: 4500,
    imageDetail: "high"
  });
  return result;
}

module.exports = { id: "medications", label: "Medications", critical: true, run };
