"use strict";

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

describe("feature data fallbacks", () => {
  before(() => {
    process.env.WORKFLOW_MOCK = "1";
  });

  it("loads body-effect data and returns generic fallback for unknown drugs", () => {
    const { getBodyEffects } = require("../agents/features/body-effects");

    const known = getBodyEffects("Amoxicillin 500 mg");
    assert.equal(known.matchedDrug, "amoxicillin");
    assert.ok(known.regions.length > 0);

    const unknown = getBodyEffects("not_a_real_drug_xyz");
    assert.equal(unknown.uncertain, true);
    assert.deepEqual(unknown.regions, []);
  });

  it("returns mechanism fallback paths without calling external APIs in mock mode", async () => {
    const { predictProteinMechanism } = require("../agents/features/protein-mechanism");

    const known = await predictProteinMechanism("ibuprofen");
    assert.equal(known.hasProteinData, true);
    assert.equal(known.targetProtein, "COX-2");
    assert.equal(known.proteinStructure.pdbData, "MOCK_PDB_DATA");

    const unknown = await predictProteinMechanism("not_a_real_drug_xyz");
    assert.equal(unknown.hasProteinData, false);
    assert.match(unknown.message, /not available/i);
    assert.equal(unknown.bodyEffects.uncertain, true);
  });
});
