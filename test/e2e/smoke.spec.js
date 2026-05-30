"use strict";

const { test, expect } = require("@playwright/test");

const PNG_1X1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const sampleMedication = {
  medication_name: "Amoxicillin",
  medication_name_confidence: 0.82,
  strength: "500 mg",
  dose: "1 tablet",
  form: "Tablet",
  route: "Oral",
  frequency: "TID",
  normalized_frequency: {
    abbreviation: "TID",
    expansion: "three times daily",
    timing: "morning, afternoon, night"
  },
  duration: "5 days",
  quantity: "",
  refills: "",
  sig: "Take one tablet three times daily for 5 days",
  timing: "With food",
  administration_notes: "Complete the course",
  raw_text: "Tab Amoxicillin 500mg TID x 5d",
  confidence: 0.82,
  safety_flags: [],
  alternatives: [],
  critical_uncertainties: [],
  uncertain_tokens: [],
  requires_verification: false
};

const sampleResultPayload = {
  decodedAt: "2026-01-01T12:00:00.000Z",
  model: "mock",
  result: {
    summary: "Mock prescription with one amoxicillin medication.",
    requires_human_review: false,
    review_reason: "",
    raw_transcription: [
      {
        line_number: 1,
        section: "medication",
        text: "Tab Amoxicillin 500mg TID x 5d"
      }
    ],
    medications: [sampleMedication],
    abbreviations: [{ abbreviation: "Tab", likely_expansion: "Tablet", confidence: 0.95 }]
  }
};

test("landing page loads core assets", async ({ page }) => {
  await page.goto("/landing.html");

  await expect(page).toHaveTitle(/UnScribble/);
  await expect(page.getByText("UnScribble").first()).toBeVisible();
});

test("upload page renders preview controls", async ({ page }) => {
  await page.goto("/upload.html");
  await page.locator("#fileInput").setInputFiles({
    name: "prescription.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_1X1, "base64")
  });

  await expect(page.locator("#previewSection")).toBeVisible();
  await page.locator(".segmented label", { hasText: "Contrast" }).click();
  await expect(page.locator("input[name='enhance'][value='contrast']")).toBeChecked();
});

test("upload page loads sample thumbnails", async ({ page }) => {
  await page.goto("/upload.html");
  await expect(page.locator("#sampleSection")).toBeVisible();
  const sampleButton = page.locator('.sample-thumb[data-name="sample4.jpeg"]');
  await expect(sampleButton).toBeVisible();
  await sampleButton.click();
  await expect(page.locator("#previewSection")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#fileName")).toHaveText("sample4.jpeg");
  await expect(sampleButton).toHaveClass(/is-selected/);
});

test("mock decode reaches results", async ({ page }) => {
  await page.goto("/upload.html");
  await page.locator("#fileInput").setInputFiles({
    name: "prescription.png",
    mimeType: "image/png",
    buffer: Buffer.from(PNG_1X1, "base64")
  });

  await page.locator("#processBtn").click();
  await page.waitForURL("**/results.html", { timeout: 15_000 });
  await expect(page.locator("#summaryText")).toContainText(/Mock workflow|medication/i);
  await expect(page.locator("#medicationsTableBody")).toContainText("Amoxicillin");
});

test("results page renders seeded prescription data", async ({ page }) => {
  await page.addInitScript((payload) => {
    window.sessionStorage.setItem("prescriptionResult", JSON.stringify(payload));
  }, sampleResultPayload);

  await page.goto("/results.html");
  await expect(page.locator("#resultsContent")).toBeVisible();
  await expect(page.locator("#summaryText")).toContainText("Mock prescription");
  await expect(page.locator("#medicationsTableBody")).toContainText("Amoxicillin");
});

test("medication details render schedule and mechanism fallback", async ({ page }) => {
  await page.route("**/api/protein-mechanism", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        medication: "Amoxicillin",
        hasProteinData: false,
        message: "Protein target data not available for this medication"
      })
    });
  });
  await page.addInitScript((medication) => {
    window.sessionStorage.setItem("selectedMedication", JSON.stringify(medication));
  }, sampleMedication);

  await page.goto("/medication-details.html");
  await expect(page.locator("#medicationDetailsContent")).toBeVisible();
  await expect(page.locator("#medScheduleTimes")).toContainText(/Morning|Afternoon|Night/);
  await expect(page.locator("#mechanismSidebar")).toBeVisible();
  await expect(page.locator("#mechanismTargetProtein")).toContainText(/not available/i);
});

test("medication details do not auto-enter demo mode", async ({ page }) => {
  await page.goto("/medication-details.html");

  await expect(page.locator("#noDataState")).toBeVisible();
  await expect(page.locator("#medicationDetailsContent")).toBeHidden();
});

test("medication details render overview chart shells", async ({ page }) => {
  await page.addInitScript((medication) => {
    window.sessionStorage.setItem("selectedMedication", JSON.stringify(medication));
  }, sampleMedication);

  await page.goto("/medication-details.html");
  await expect(page.locator("#medicationDetailsContent")).toBeVisible();
  await expect(page.locator("#dosageScheduleGraph")).toBeVisible();
  await expect(page.locator("#medProfileGraph")).toBeVisible();
  await expect(
    page.locator(".section-chart-container[data-chart-id='regulatoryGraph']")
  ).toBeVisible();
});
