"use strict";

const prompts = require("../prompts");
const schemas = require("../schemas");
const { runVisionAgent } = require("../run-agent");

async function run(ctx) {
  const { result } = await runVisionAgent(ctx, {
    instructions: prompts.rawTranscription,
    promptLines: [
      "Transcribe this handwritten prescription line by line. Read literally; use [?] for unknown tokens.",
    ],
    schemaName: "raw_transcription",
    schema: schemas.rawTranscription,
    maxTokens: 10000,
    imageDetail: "high",
  });
  return result;
}

module.exports = {
  id: "raw_transcription",
  label: "Raw transcription",
  critical: true,
  run,
};
