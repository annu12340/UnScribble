"use strict";

process.env.WORKFLOW_MOCK = "1";
process.env.WORKFLOW_CACHE_DISABLE = "1";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createAppServer } = require("../server");

function dispatch(app, { method = "GET", url = "/", headers = {}, body = "" } = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = { host: "localhost", ...headers };
    req.destroy = () => req.emit("close");

    const chunks = [];
    const res = {
      statusCode: 200,
      headers: {},
      setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
      },
      getHeader(name) {
        return this.headers[name.toLowerCase()];
      },
      writeHead(statusCode, responseHeaders = {}) {
        this.statusCode = statusCode;
        for (const [name, value] of Object.entries(responseHeaders)) {
          this.setHeader(name, value);
        }
      },
      write(chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      },
      end(chunk) {
        if (chunk) this.write(chunk);
        resolve({
          statusCode: this.statusCode,
          headers: this.headers,
          body: Buffer.concat(chunks).toString("utf8")
        });
      },
      on() {
        return this;
      },
      once() {
        return this;
      },
      emit() {
        return true;
      }
    };

    app.emit("request", req, res);
    queueMicrotask(() => {
      try {
        if (body) req.emit("data", Buffer.from(body));
        req.emit("end");
      } catch (error) {
        reject(error);
      }
    });
  });
}

describe("HTTP reliability", () => {
  it("preserves inbound request IDs on API responses", async () => {
    const app = createAppServer();
    const res = await dispatch(app, {
      url: "/api/config",
      headers: { "x-request-id": "request-test-123" }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["x-request-id"], "request-test-123");
  });

  it("rejects malformed JSON and missing medication names", async () => {
    const app = createAppServer();
    const malformed = await dispatch(app, {
      method: "POST",
      url: "/api/protein-mechanism",
      body: "{not json"
    });
    assert.equal(malformed.statusCode, 400);
    assert.match(JSON.parse(malformed.body).error, /valid JSON/);

    const missingMedication = await dispatch(app, {
      method: "POST",
      url: "/api/protein-mechanism",
      body: JSON.stringify({ medication: "" })
    });
    assert.equal(missingMedication.statusCode, 400);
    assert.match(JSON.parse(missingMedication.body).error, /Medication name is required/);
  });

  it("rejects invalid decode image payloads before workflow execution", async () => {
    const app = createAppServer();
    const res = await dispatch(app, {
      method: "POST",
      url: "/api/decode",
      body: JSON.stringify({ imageDataUrl: "not-a-data-url" })
    });

    assert.equal(res.statusCode, 400);
    assert.match(JSON.parse(res.body).error, /Upload a PNG/);
  });

  it("threads request IDs through batch decode payloads and events", async () => {
    const app = createAppServer();
    const res = await dispatch(app, {
      method: "POST",
      url: "/api/decode",
      headers: { "x-request-id": "batch-request-123" },
      body: JSON.stringify({
        imageDataUrl: "data:image/png;base64,iVBORw0KGgo=",
        enhancementMode: "original",
        fileName: "mock.png"
      })
    });

    assert.equal(res.statusCode, 200);
    const payload = JSON.parse(res.body);
    assert.equal(payload.requestId, "batch-request-123");
    assert.equal(payload.workflow.requestId, "batch-request-123");
    assert.ok(payload.events.every((item) => item.data.requestId === "batch-request-123"));
  });
});
