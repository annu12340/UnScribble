"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { applySafetyRules } = require("../agents/safety-rules");

describe("applySafetyRules", () => {
  it("flags low legibility", () => {
    const result = applySafetyRules({
      image_quality: { legibility: "low", issues: [], recommended_next_capture: "" },
      medications: [],
      raw_transcription: []
    });
    assert.equal(result.requires_human_review, true);
    assert.match(result.review_reason, /legibility is low/i);
  });

  it("flags missing dose and frequency", () => {
    const result = applySafetyRules({
      image_quality: { legibility: "high", issues: [], recommended_next_capture: "" },
      medications: [
        {
          line_number: 1,
          medication_name: "aspirin",
          medication_name_confidence: 0.9,
          raw_text: "aspirin"
        }
      ],
      raw_transcription: []
    });
    assert.equal(result.medications[0].requires_verification, true);
    assert.equal(result.requires_human_review, true);
  });

  it("flags unresolved transcription tokens", () => {
    const result = applySafetyRules({
      image_quality: { legibility: "high", issues: [], recommended_next_capture: "" },
      medications: [],
      raw_transcription: [{ line_number: 2, text: "tab [?] daily", section: "medication" }]
    });
    assert.match(result.review_reason, /Unresolved token/i);
  });
});
