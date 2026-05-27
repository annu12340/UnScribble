"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

describe("orchestrator mock workflow", () => {
  before(() => {
    process.env.WORKFLOW_MOCK = "1";
    process.env.WORKFLOW_CACHE_DISABLE = "1";
  });

  it("completes happy path with expected agents", async () => {
    const { runWorkflow } = require("../agents/orchestrator");
    const steps = [];
    const body = {
      imageDataUrl: "data:image/png;base64,iVBORw0KGgo=",
      enhancementMode: "original",
      fileName: "test.png"
    };

    const { result, workflow } = await runWorkflow(body, (event, data) => {
      if (event === "agent.complete") steps.push(data.id);
    });

    assert.ok(result.summary);
    assert.ok(Array.isArray(result.medications));
    assert.ok(steps.includes("image_quality"));
    assert.ok(steps.includes("raw_transcription"));
    assert.ok(steps.includes("patient_header"));
    assert.ok(steps.includes("medications"));
    assert.ok(steps.includes("clinical_context"));
    assert.ok(workflow.totalMs >= 0);
  });

  it("mergeMedicationRuns prefers higher-confidence formulary match", () => {
    const { mergeMedicationRuns } = require("../agents/orchestrator");

    const merged = mergeMedicationRuns(
      [{ line_number: 1, medication_name: "typo", medication_name_confidence: 0.5 }],
      [{ line_number: 1, medication_name: "paracetamol", medication_name_confidence: 0.92 }]
    );
    assert.equal(merged[0].medication_name, "paracetamol");
  });
});
