"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PUBLIC = path.join(__dirname, "..", "public");

function readPage(name) {
  return fs.readFileSync(path.join(PUBLIC, name), "utf8");
}

function assertContains(html, fragments, label) {
  for (const fragment of fragments) {
    assert.ok(html.includes(fragment), `${label} missing: ${fragment}`);
  }
}

describe("page HTML shells", () => {
  it("landing page wires core branding and script", () => {
    const html = readPage("landing.html");
    assertContains(
      html,
      ["UnScribble", "/js/pages/landing.js"],
      "landing.html",
    );
  });

  it("upload page exposes decode workflow DOM hooks", () => {
    const html = readPage("upload.html");
    assertContains(
      html,
      [
        'id="fileInput"',
        'id="processBtn"',
        'id="previewSection"',
        'type="module" src="/js/pages/upload.js"',
      ],
      "upload.html",
    );
  });

  it("results page loads module and result containers", () => {
    const html = readPage("results.html");
    assertContains(
      html,
      [
        'id="resultsContent"',
        'id="summaryText"',
        'type="module" src="/js/pages/results.js"',
      ],
      "results.html",
    );
  });

  it("medication details page includes chart canvases and modules", () => {
    const html = readPage("medication-details.html");
    assertContains(
      html,
      [
        "chart.js",
        'data-chart-id="scheduleClock"',
        'id="pkCurveGraph"',
        'id="medicationDetailsContent"',
        'id="noDataState"',
        'type="module" src="/js/pages/medication-details.js"',
      ],
      "medication-details.html",
    );
  });
});
