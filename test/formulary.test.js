"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isInFormulary, validateAgainstFormulary } = require("../agents/formulary");

describe("formulary", () => {
  it("isInFormulary matches bundled list", () => {
    assert.equal(isInFormulary("paracetamol"), true);
    assert.equal(isInFormulary("not_a_real_drug_xyz"), false);
  });

  it("validateAgainstFormulary adds unknown flag for unrecognized names", async () => {
    const result = await validateAgainstFormulary({
      medications: [
        {
          medication_name: "not_a_real_drug_xyz",
          medication_name_confidence: 0.9,
          alternatives: []
        }
      ]
    });
    assert.ok(result.medications[0].safety_flags.includes("unknown to formulary"));
  });
});
