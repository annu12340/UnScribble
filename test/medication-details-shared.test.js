"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.join(
  __dirname,
  "..",
  "public",
  "js",
  "medication",
  "medication-details-shared.js",
);
const moduleUrl = `data:text/javascript;base64,${fs.readFileSync(modulePath).toString("base64")}`;

async function shared() {
  return import(moduleUrl);
}

describe("medication details shared helpers", () => {
  it("builds demo medication with optional name override", async () => {
    const { buildDemoMedication, DEMO_MEDICATION_NAME } = await shared();
    const med = buildDemoMedication(" Lisinopril ");

    assert.equal(med.medication_name, "Lisinopril");
    assert.equal(med.strength, "500 mg");
    assert.equal(buildDemoMedication("").medication_name, DEMO_MEDICATION_NAME);
  });

  it("detects insight payloads", async () => {
    const { hasInsightPayload } = await shared();

    assert.equal(hasInsightPayload({}), false);
    assert.equal(
      hasInsightPayload({ side_effects: { common_side_effects: [] } }),
      true,
    );
  });

  it("formats normalized frequency and confidence", async () => {
    const { formatNormalizedFrequency, confidencePercent } = await shared();

    assert.equal(
      formatNormalizedFrequency({
        abbreviation: "TID",
        expansion: "three times daily",
        timing: "morning, afternoon, night",
      }),
      "TID · three times daily · morning, afternoon, night",
    );
    assert.equal(confidencePercent(0.876), 88);
    assert.equal(confidencePercent(1.5), 100);
  });

  it("collects medication warnings", async () => {
    const { collectMedicationWarnings } = await shared();
    const warnings = collectMedicationWarnings({
      safety_flags: ["high-risk abbreviation"],
      uncertain_tokens: ["dose"],
      requires_verification: true,
    });

    assert.deepEqual(warnings, [
      "high-risk abbreviation",
      "Token to verify: dose",
      "Human verification required for this medication.",
    ]);
  });

  it("resolves demo, stored, and empty load modes", async () => {
    const { resolveMedicationLoad } = await shared();
    const stored = JSON.stringify({
      medication_name: "Amoxicillin",
      confidence: 0.9,
    });

    const demo = resolveMedicationLoad({
      storedData: null,
      forceDemo: true,
      medOverride: "Demo",
    });
    assert.equal(demo.mode, "demo");
    assert.equal(demo.medication.medication_name, "Demo");
    assert.match(demo.demoBannerText, /Demo mode/);

    const fromSession = resolveMedicationLoad({ storedData: stored });
    assert.equal(fromSession.mode, "stored");
    assert.equal(fromSession.medication.medication_name, "Amoxicillin");

    const empty = resolveMedicationLoad({ storedData: null });
    assert.equal(empty.mode, "empty");
    assert.equal(empty.medication, null);
  });

  it("builds insights request body", async () => {
    const { buildInsightsRequestBody } = await shared();
    assert.deepEqual(buildInsightsRequestBody("Ibuprofen", "raw"), {
      medication_name: "Ibuprofen",
      raw_text: "raw",
    });
  });
});
