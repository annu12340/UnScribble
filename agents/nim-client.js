"use strict";

const config = require("./config");
const log = require("./logger");

function extractOutputText(payload) {
  if (typeof payload.output_text === "string") {
    return stripCodeFences(payload.output_text);
  }

  const parts = [];
  for (const item of payload.output || []) {
    if (item.type && item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type && content.type !== "output_text") continue;
      if (typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }
  return stripCodeFences(parts.join("\n").trim());
}

function stripCodeFences(text) {
  const trimmed = String(text || "").trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function buildRequestBody({
  instructions,
  content,
  schemaName,
  schema,
  maxTokens = 4000
}) {
  const requestBody = {
    model: config.model,
    store: false,
    input: [{ role: "user", content }],
    instructions,
    max_output_tokens: maxTokens,
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema
      }
    }
  };
  // Reasoning is omitted for strict json_schema calls — it can consume max_output_tokens
  // before the message block with structured JSON is emitted.
  return requestBody;
}

async function callResponses({
  instructions,
  content,
  schemaName,
  schema,
  maxTokens
}) {
  if (!config.apiKey) {
    const error = new Error("NVIDIA_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  let effectiveMax = maxTokens;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const parsed = await callResponsesOnce({
      instructions,
      content,
      schemaName,
      schema,
      maxTokens: effectiveMax,
      attempt
    });

    if (parsed.ok) {
      return { result: parsed.result, requestId: parsed.requestId };
    }

    if (!parsed.retryable || attempt === 2) {
      const error = new Error(parsed.errorMessage);
      error.statusCode = parsed.statusCode;
      error.detail = parsed.detail;
      error.rawText = parsed.rawText;
      throw error;
    }

    effectiveMax = Math.min(16000, Math.max(effectiveMax * 2, effectiveMax + 2000));
    log.warn("nim", "retrying after empty/incomplete structured output", {
      schema: schemaName,
      attempt: attempt + 1,
      maxTokens: effectiveMax,
      reason: parsed.incompleteReason
    });
  }

  const unreachable = new Error("NVIDIA NIM request failed after retries");
  unreachable.statusCode = 502;
  throw unreachable;
}

async function callResponsesOnce({
  instructions,
  content,
  schemaName,
  schema,
  maxTokens,
  attempt
}) {
  const requestBody = buildRequestBody({
    instructions,
    content,
    schemaName,
    schema,
    maxTokens
  });
  const started = Date.now();
  const controller = new AbortController();
  const timeoutMs = Math.max(
    1000,
    Number(config.nimRequestTimeoutMs || config.agentTimeoutMs || 90000)
  );
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  log.info("nim", "request", {
    schema: schemaName,
    model: config.model,
    maxTokens,
    attempt,
    images: content.filter((part) => part.type === "input_image").length
  });
  let apiResponse;
  try {
    apiResponse = await fetch(`${config.baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
  } catch (error) {
    clearTimeout(timeout);
    const durationMs = Date.now() - started;
    if (controller.signal.aborted) {
      log.error("nim", "request timed out", {
        schema: schemaName,
        durationMs,
        timeoutMs
      });
      return {
        ok: false,
        retryable: false,
        statusCode: 504,
        errorMessage: "NVIDIA NIM request timed out",
        detail: `No response after ${timeoutMs}ms`
      };
    }
    log.error("nim", "request failed before response", {
      schema: schemaName,
      durationMs,
      message: error.message
    });
    return {
      ok: false,
      retryable: false,
      statusCode: 502,
      errorMessage: "NVIDIA NIM request failed",
      detail: error.message
    };
  }

  let responseText;
  try {
    responseText = await apiResponse.text();
  } catch (error) {
    const durationMs = Date.now() - started;
    if (controller.signal.aborted) {
      log.error("nim", "response body timed out", {
        schema: schemaName,
        durationMs,
        timeoutMs
      });
      return {
        ok: false,
        retryable: false,
        statusCode: 504,
        errorMessage: "NVIDIA NIM response timed out",
        detail: `No complete response after ${timeoutMs}ms`
      };
    }
    return {
      ok: false,
      retryable: false,
      statusCode: 502,
      errorMessage: "NVIDIA NIM response failed",
      detail: error.message
    };
  } finally {
    clearTimeout(timeout);
  }
  let apiPayload;
  try {
    apiPayload = JSON.parse(responseText);
  } catch {
    apiPayload = { raw: responseText };
  }

  const requestId = apiResponse.headers.get("x-request-id") || apiPayload.id || "";
  const durationMs = Date.now() - started;

  if (!apiResponse.ok) {
    log.error("nim", "request failed", {
      schema: schemaName,
      status: apiResponse.status,
      requestId,
      durationMs,
      detail: apiPayload.error?.message || responseText.slice(0, 200)
    });
    return {
      ok: false,
      retryable: false,
      statusCode: apiResponse.status,
      errorMessage: "NVIDIA NIM request failed",
      detail: apiPayload.error?.message || responseText
    };
  }

  const incompleteReason = apiPayload.incomplete_details?.reason || null;
  const isIncomplete = apiPayload.status === "incomplete" || Boolean(incompleteReason);
  const outputText = extractOutputText(apiPayload);

  if (!outputText.trim()) {
    return {
      ok: false,
      retryable: true,
      statusCode: 502,
      errorMessage: isIncomplete
        ? `Model response incomplete (${incompleteReason || "unknown"}): no JSON output returned`
        : "Model returned no JSON message content",
      detail: incompleteReason || "empty output",
      incompleteReason
    };
  }

  try {
    log.info("nim", "response ok", { schema: schemaName, requestId, durationMs, attempt });
    return { ok: true, result: JSON.parse(outputText), requestId };
  } catch (parseError) {
    log.error("nim", "json parse failed", {
      schema: schemaName,
      requestId,
      durationMs,
      snippet: outputText.slice(0, 200)
    });
    return {
      ok: false,
      retryable: isIncomplete,
      statusCode: 502,
      errorMessage: "Model returned unparseable JSON",
      detail: parseError.message,
      rawText: outputText,
      incompleteReason
    };
  }
}

function visionContent(text, imageDataUrl, extraImages = [], options = {}) {
  const detail = options.detail === "low" ? "low" : "high";
  const content = [{ type: "input_text", text }];
  if (imageDataUrl) {
    content.push({ type: "input_image", image_url: imageDataUrl, detail });
  }
  for (const url of extraImages) {
    if (url) {
      content.push({ type: "input_image", image_url: url, detail });
    }
  }
  return content;
}

module.exports = {
  callResponses,
  visionContent
};
