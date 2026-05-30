"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const modulePath = path.join(
  __dirname,
  "..",
  "public",
  "js",
  "medication",
  "charts",
  "chart-data.js"
);
const moduleUrl = pathToFileURL(modulePath).href;

async function chartData() {
  return import(moduleUrl);
}

describe("medication chart data helpers", () => {
  it("countRows maps list lengths to chart values", async () => {
    const { countRows } = await chartData();
    const rows = countRows([["Recalls", ["a", "b"], "#f00"]]);
    assert.equal(rows[0].value, 2);
    assert.equal(rows[0].label, "Recalls");
  });

  it("buildProfileRows includes confidence and safety dimensions", async () => {
    const { buildProfileRows } = await chartData();
    const rows = buildProfileRows({
      confidence: 0.82,
      regulatory_status: { prescription_only_countries: ["US"] },
      drug_interactions: { contraindicated_conditions: ["asthma"] },
      side_effects: { common_side_effects: ["nausea"] },
      patient_safety_flags: { allergy_risk_summary: "Penicillin class" },
      market_status: { recent_recalls: [] }
    });

    assert.equal(rows.length, 6);
    assert.equal(rows[0].label, "Decode confidence");
    assert.equal(rows[0].value, 82);
  });

  it("buildScheduleRows parses dose times", async () => {
    const { buildScheduleRows } = await chartData();
    const rows = buildScheduleRows({
      schedule: {
        times: [
          { time: "08:00", label: "Morning" },
          { time: "20:00", label: "Night" }
        ]
      }
    });

    assert.equal(rows.length, 2);
    assert.equal(rows[0].value, 8);
    assert.match(rows[1].detail, /20:00/);
  });

  it("ingredientBubbleRows groups brands and warnings", async () => {
    const { ingredientBubbleRows } = await chartData();
    const rows = ingredientBubbleRows(["Brand A"], [], ["dup"]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].group, "Brands");
    assert.equal(rows[1].group, "Warnings");
  });
});
