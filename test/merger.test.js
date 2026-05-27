"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { mergeArtifacts, buildDeterministicSummary } = require("../agents/merger");

describe("merger", () => {
  it("mergeArtifacts combines agent outputs", () => {
    const merged = mergeArtifacts({
      image_quality: { image_quality: { legibility: "high", issues: [], recommended_next_capture: "" } },
      raw_transcription: { raw_transcription: [{ line_number: 1, text: "Tab X", section: "medication" }] },
      patient_header: { patient: { name: "Jane Doe" } },
      medications: { medications: [{ medication_name: "X", line_number: 1 }] },
      clinical_context: { allergies: [], clinical_context: { diagnoses: ["fever"] } }
    });
    assert.equal(merged.patient.name, "Jane Doe");
    assert.equal(merged.medications.length, 1);
    assert.deepEqual(merged.clinical_context.diagnoses, ["fever"]);
  });

  it("buildDeterministicSummary includes medications", () => {
    const summary = buildDeterministicSummary({
      patient: { name: "Jane" },
      medications: [{ medication_name: "aspirin", strength: "75mg" }],
      requires_human_review: false,
      global_warnings: []
    });
    assert.match(summary, /Jane/);
    assert.match(summary, /aspirin/i);
  });
});
