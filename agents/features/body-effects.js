"use strict";

const fs = require("node:fs");
const path = require("node:path");
const log = require("../logger");

/**
 * Maps medications to affected body regions for educational visualization.
 * Not clinical guidance — demo / transcription-aid only.
 */

const DATA_FILE = path.join(__dirname, "..", "..", "data", "drug-body-effects.json");

function medicationLookupKeys(name) {
  const raw = String(name || "")
    .trim()
    .toLowerCase();
  if (!raw) return [];
  const first = raw.split(/\s+/)[0];
  return [...new Set([raw, first].filter(Boolean))];
}

/** @type {Record<string, { regions: string[], organs: string[], summary: string }>} */
const BODY_EFFECTS = loadBodyEffects(DATA_FILE);

const GENERIC_FALLBACK = {
  regions: [],
  organs: [],
  summary:
    "We do not have a body-region map for this medication in our demo database yet. Ask your pharmacist or clinician where it acts.",
  uncertain: true
};

function loadBodyEffects(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const valid = {};
      let skipped = 0;
      for (const [key, value] of Object.entries(parsed)) {
        if (
          value &&
          Array.isArray(value.regions) &&
          Array.isArray(value.organs) &&
          typeof value.summary === "string"
        ) {
          valid[key] = value;
        } else {
          skipped += 1;
        }
      }
      log.info("body-effects", "loaded body-effect data", {
        entries: Object.keys(valid).length,
        skipped
      });
      return valid;
    }
    log.warn("body-effects", "body-effect data must be an object", { filePath });
  } catch (error) {
    log.warn("body-effects", "could not load body-effect data", {
      filePath,
      message: error.message
    });
    // Keep the feature non-critical. The caller gets the generic fallback.
  }
  return {};
}

/**
 * @param {string} medicationName
 * @returns {{ regions: string[], organs: string[], summary: string, matchedDrug?: string, uncertain?: boolean }}
 */
function getBodyEffects(medicationName) {
  const keys = medicationLookupKeys(medicationName);
  for (const key of keys) {
    if (BODY_EFFECTS[key]) {
      return { ...BODY_EFFECTS[key], matchedDrug: key };
    }
  }
  return { ...GENERIC_FALLBACK };
}

module.exports = {
  getBodyEffects,
  medicationLookupKeys
};
