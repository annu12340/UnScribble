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
  "chart-data.js",
);
const moduleUrl = pathToFileURL(modulePath).href;

async function chartData() {
  return import(moduleUrl);
}

const PK = { onset_hours: 0.5, peak_hours: 1.5, duration_hours: 8 };

describe("medication chart data helpers", () => {
  it("parseHour converts HH:MM to fractional hours", async () => {
    const { parseHour } = await chartData();
    assert.equal(parseHour("08:30"), 8.5);
    assert.equal(parseHour(null), null);
    assert.equal(parseHour("as needed"), null);
  });

  it("buildPkCurvePoints rises to a peak then decays", async () => {
    const { buildPkCurvePoints } = await chartData();
    const curve = buildPkCurvePoints(PK);
    assert.ok(curve.points.length > 10);
    const max = Math.max(...curve.points.map((p) => p.y));
    assert.ok(max >= 99 && max <= 100);
    assert.equal(curve.markers.length, 3);
    assert.equal(curve.markers[1].label, "Peak effect");
    assert.equal(buildPkCurvePoints({ duration_hours: 0 }), null);
  });

  it("buildPkCurvePoints derives MEC from the onset and a toxic ceiling", async () => {
    const { buildPkCurvePoints } = await chartData();
    const curve = buildPkCurvePoints(PK);
    // The "Kicks in" marker sits on the MEC line by construction.
    assert.ok(Math.abs(curve.mec - curve.markers[0].y) < 0.1);
    assert.ok(curve.toxic > 100);
  });

  it("buildSteadyStatePoints stacks one curve per dose across 24h", async () => {
    const { buildSteadyStatePoints } = await chartData();
    const result = buildSteadyStatePoints(PK, {
      schedule: { times: [{ time: "08:00" }, { time: "20:00" }] },
    });
    assert.equal(result.doseHours.length, 2);
    assert.equal(result.points[0].x, 0);
    assert.equal(result.points[result.points.length - 1].x, 24);
    assert.equal(buildSteadyStatePoints(PK, { schedule: { times: [] } }), null);
  });

  it("buildInteractionNodes groups items into severity tiers", async () => {
    const { buildInteractionNodes } = await chartData();
    const nodes = buildInteractionNodes({
      contraindicated_conditions: ["asthma", "renal failure"],
      common_interacting_medications: ["warfarin"],
      food_supplements_to_avoid: [],
    });
    assert.equal(nodes.length, 3);
    assert.equal(nodes[0].tier, "severe");
    assert.equal(nodes[0].total, 2);
    assert.equal(nodes[2].total, 0);
  });
});
