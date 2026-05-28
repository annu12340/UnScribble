"use strict";

const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.join(__dirname, "..", "public", "js", "core", "decode-client.js");
const moduleUrl = `data:text/javascript;base64,${fs.readFileSync(modulePath).toString("base64")}`;

async function decodeClient() {
  return import(moduleUrl);
}

describe("decode client SSE handling", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("parses named SSE events with JSON payloads", async () => {
    const { parseSseChunk } = await decodeClient();
    const parsed = parseSseChunk('event: agent.complete\ndata: {"id":"medications"}');

    assert.deepEqual(parsed, {
      event: "agent.complete",
      payload: { id: "medications" }
    });
  });

  it("consumes streamed chunks across packet boundaries", async () => {
    const { consumeSseStream } = await decodeClient();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('event: workflow.start\ndata: {"workflowId":"a"}\n'));
        controller.enqueue(encoder.encode('\nevent: workflow.complete\ndata: {"ok":true}\n\n'));
        controller.close();
      }
    });
    const events = [];

    await consumeSseStream(new Response(stream), (event) => events.push(event));

    assert.deepEqual(events, [
      { event: "workflow.start", payload: { workflowId: "a" } },
      { event: "workflow.complete", payload: { ok: true } }
    ]);
  });

  it("surfaces JSON error details from failed decode responses", async () => {
    const { decodePrescriptionStream } = await decodeClient();
    global.fetch = async () =>
      new Response(JSON.stringify({ detail: "NVIDIA_API_KEY is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });

    await assert.rejects(
      decodePrescriptionStream("/api/decode/stream", {}, () => {}),
      /NVIDIA_API_KEY is not configured/
    );
  });
});
