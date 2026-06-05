"use strict";

process.env.NVIDIA_API_KEY = "test-key";
process.env.NVIDIA_REQUEST_TIMEOUT_MS = "5";

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");

describe("NIM client timeout", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("aborts stalled outbound fetches", async () => {
    const { callResponses } = require("../agents/nim-client");
    global.fetch = async (_url, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });

    await assert.rejects(
      callResponses({
        instructions: "Return JSON.",
        content: [{ type: "input_text", text: "hello" }],
        schemaName: "timeout_test",
        schema: {
          type: "object",
          properties: { ok: { type: "boolean" } },
          required: ["ok"],
          additionalProperties: false,
        },
        maxTokens: 100,
      }),
      (error) => {
        assert.equal(error.statusCode, 504);
        assert.match(error.message, /timed out/);
        return true;
      },
    );
  });
});
