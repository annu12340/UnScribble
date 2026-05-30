"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.join(__dirname, "..", "public", "js", "core", "upload-workflow.js");
const moduleUrl = `data:text/javascript;base64,${fs.readFileSync(modulePath).toString("base64")}`;

async function uploadWorkflow() {
  return import(moduleUrl);
}

describe("upload workflow helpers", () => {
  it("shortens model ids to the last path segment", async () => {
    const { shortModelName } = await uploadWorkflow();
    assert.equal(shortModelName("openai/openai/gpt-5.5"), "gpt-5.5");
    assert.equal(shortModelName(""), "model");
  });

  it("validates image mime types", async () => {
    const { isImageMimeType } = await uploadWorkflow();
    assert.equal(isImageMimeType("image/png"), true);
    assert.equal(isImageMimeType("application/pdf"), false);
  });

  it("computes workflow progress safely", async () => {
    const { workflowProgressPercent } = await uploadWorkflow();
    assert.equal(workflowProgressPercent(3, 7), 43);
    assert.equal(workflowProgressPercent(2, 0), 200);
  });

  it("formats workflow errors with agent labels", async () => {
    const { formatWorkflowError } = await uploadWorkflow();
    const agents = [{ id: "medications", label: "Medications" }];
    const message = formatWorkflowError(
      "medications",
      { message: "timeout", detail: "upstream stalled" },
      agents
    );

    assert.match(message, /Medications: timeout/);
    assert.match(message, /upstream stalled/);
  });

  it("picks deterministic medical jokes by index", async () => {
    const { pickMedicalJoke, MEDICAL_JOKES } = await uploadWorkflow();
    assert.equal(pickMedicalJoke(0), MEDICAL_JOKES[0]);
    assert.equal(pickMedicalJoke(MEDICAL_JOKES.length), MEDICAL_JOKES[0]);
  });
});
