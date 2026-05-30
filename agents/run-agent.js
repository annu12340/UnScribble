"use strict";

const { callResponses, visionContent } = require("./nim-client");
const { buildUserContextBlock, visionImageUrl } = require("./medical-context");

/**
 * @param {object} ctx
 * @param {object} options
 * @param {string} options.instructions
 * @param {string[]} options.promptLines
 * @param {string} options.schemaName
 * @param {object} options.schema
 * @param {number} [options.maxTokens]
 * @param {"low"|"high"} [options.imageDetail]
 * @param {boolean} [options.includeImage]
 * @param {boolean} [options.temperatureNudge]
 */
async function runVisionAgent(ctx, options) {
  const lines = [...(options.promptLines || []), buildUserContextBlock(ctx.body)].filter(Boolean);
  const text = lines.join("\n\n");
  const includeImage = options.includeImage !== false;
  const imageUrl = includeImage ? visionImageUrl(ctx) : "";
  const content = visionContent(text, imageUrl, [], {
    detail: options.imageDetail || "high"
  });
  const { result, requestId } = await callResponses({
    instructions: options.instructions,
    content,
    schemaName: options.schemaName,
    schema: options.schema,
    maxTokens: options.maxTokens,
    temperatureNudge: options.temperatureNudge
  });
  ctx.lastNimRequestId = requestId || "";
  return { result, requestId };
}

/**
 * @param {object} ctx
 * @param {object} options
 * @param {string} options.instructions
 * @param {string[]} options.promptLines
 * @param {string} options.schemaName
 * @param {object} options.schema
 * @param {number} [options.maxTokens]
 */
async function runTextAgent(ctx, options) {
  const lines = [...(options.promptLines || []), buildUserContextBlock(ctx.body)].filter(Boolean);
  const text = lines.join("\n\n");
  const { result, requestId } = await callResponses({
    instructions: options.instructions,
    content: [{ type: "input_text", text }],
    schemaName: options.schemaName,
    schema: options.schema,
    maxTokens: options.maxTokens
  });
  ctx.lastNimRequestId = requestId || "";
  return { result, requestId };
}

module.exports = { runVisionAgent, runTextAgent };
