"use strict";

const config = require("../config");
const { callResponses, visionContent } = require("../nim-client");
const log = require("../logger");

const DEFAULT_RESULT = {
  regulatory_status: {
    fully_banned_countries: [],
    prescription_only_countries: [],
    restricted_age_groups: [],
    black_box_warnings: [],
    withdrawn_formulations: [],
    recent_regulatory_alerts: [],
    summary: "No regulatory information available for this medication."
  },
  ingredient_analysis: {
    active_ingredient: "",
    equivalent_brands: [],
    combination_drugs: [],
    duplicate_ingredient_warnings: []
  }
};

function normalizeResult(result) {
  if (!result || typeof result !== "object") return DEFAULT_RESULT;

  return {
    regulatory_status: {
      fully_banned_countries: Array.isArray(result.regulatory_status?.fully_banned_countries)
        ? result.regulatory_status.fully_banned_countries
        : [],
      prescription_only_countries: Array.isArray(result.regulatory_status?.prescription_only_countries)
        ? result.regulatory_status.prescription_only_countries
        : [],
      restricted_age_groups: Array.isArray(result.regulatory_status?.restricted_age_groups)
        ? result.regulatory_status.restricted_age_groups
        : [],
      black_box_warnings: Array.isArray(result.regulatory_status?.black_box_warnings)
        ? result.regulatory_status.black_box_warnings
        : [],
      withdrawn_formulations: Array.isArray(result.regulatory_status?.withdrawn_formulations)
        ? result.regulatory_status.withdrawn_formulations
        : [],
      recent_regulatory_alerts: Array.isArray(result.regulatory_status?.recent_regulatory_alerts)
        ? result.regulatory_status.recent_regulatory_alerts
        : [],
      summary: typeof result.regulatory_status?.summary === "string"
        ? result.regulatory_status.summary
        : DEFAULT_RESULT.regulatory_status.summary
    },
    ingredient_analysis: {
      active_ingredient: typeof result.ingredient_analysis?.active_ingredient === "string"
        ? result.ingredient_analysis.active_ingredient
        : "",
      equivalent_brands: Array.isArray(result.ingredient_analysis?.equivalent_brands)
        ? result.ingredient_analysis.equivalent_brands
        : [],
      combination_drugs: Array.isArray(result.ingredient_analysis?.combination_drugs)
        ? result.ingredient_analysis.combination_drugs
        : [],
      duplicate_ingredient_warnings: Array.isArray(result.ingredient_analysis?.duplicate_ingredient_warnings)
        ? result.ingredient_analysis.duplicate_ingredient_warnings
        : []
    }
  };
}

function getMockMedicationInsights(medicationName) {
  const key = String(medicationName || "").trim().toLowerCase();
  if (key.includes("amoxicillin")) {
    return {
      regulatory_status: {
        summary: "Amoxicillin is generally prescription-only in most countries and has a limited liver toxicity warning in rare cases.",
        fully_banned_countries: [],
        prescription_only_countries: ["United States", "United Kingdom", "India"],
        restricted_age_groups: ["Under 1 month"],
        black_box_warnings: ["Banned because of liver toxicity"],
        withdrawn_formulations: [],
        recent_regulatory_alerts: ["Restricted during pregnancy"]
      },
      ingredient_analysis: {
        active_ingredient: "Amoxicillin",
        equivalent_brands: ["Moxatag", "Trimox"],
        combination_drugs: ["Amoxicillin/Clavulanate"],
        duplicate_ingredient_warnings: ["Contains penicillin-class antibiotic; avoid duplicate penicillin agents."]
      }
    };
  }

  return {
    regulatory_status: {
      ...DEFAULT_RESULT.regulatory_status,
      summary: `Regulatory and ingredient metadata is not available for ${medicationName || "this medication"}.`
    },
    ingredient_analysis: {
      active_ingredient: medicationName || "",
      equivalent_brands: [],
      combination_drugs: [],
      duplicate_ingredient_warnings: []
    }
  };
}

async function getMedicationInsights(medicationName, rawText) {
  const normalizedMedication = String(medicationName || "").trim();
  const contentText = [
    `Medication: ${normalizedMedication || "Unknown"}`,
    rawText ? `Prescription text: ${rawText}` : "Prescription text: not provided",
    "Return a JSON object with two top-level keys: regulatory_status and ingredient_analysis."
  ].join("\n");

  if (config.mock || !config.apiKey) {
    log.info("medication-insights", "using mock insights", { medication: normalizedMedication });
    return normalizeResult(getMockMedicationInsights(normalizedMedication));
  }

  const instructions = `You are a regulatory and pharmaceutical intelligence assistant. For the drug named '${normalizedMedication}', provide:

1) regulatory_status: fully_banned_countries, prescription_only_countries, restricted_age_groups, black_box_warnings, withdrawn_formulations, recent_regulatory_alerts, and a concise summary.
2) ingredient_analysis: active_ingredient, equivalent_brands, combination_drugs, duplicate_ingredient_warnings.

Return only valid JSON that matches the requested schema. If information is not known, return empty arrays or an empty string rather than omitting fields.`;

  const content = visionContent(contentText, null);
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      regulatory_status: {
        type: "object",
        additionalProperties: false,
        properties: {
          fully_banned_countries: { type: "array", items: { type: "string" } },
          prescription_only_countries: { type: "array", items: { type: "string" } },
          restricted_age_groups: { type: "array", items: { type: "string" } },
          black_box_warnings: { type: "array", items: { type: "string" } },
          withdrawn_formulations: { type: "array", items: { type: "string" } },
          recent_regulatory_alerts: { type: "array", items: { type: "string" } },
          summary: { type: "string" }
        },
        required: [
          "fully_banned_countries",
          "prescription_only_countries",
          "restricted_age_groups",
          "black_box_warnings",
          "withdrawn_formulations",
          "recent_regulatory_alerts",
          "summary"
        ]
      },
      ingredient_analysis: {
        type: "object",
        additionalProperties: false,
        properties: {
          active_ingredient: { type: "string" },
          equivalent_brands: { type: "array", items: { type: "string" } },
          combination_drugs: { type: "array", items: { type: "string" } },
          duplicate_ingredient_warnings: { type: "array", items: { type: "string" } }
        },
        required: [
          "active_ingredient",
          "equivalent_brands",
          "combination_drugs",
          "duplicate_ingredient_warnings"
        ]
      }
    },
    required: ["regulatory_status", "ingredient_analysis"]
  };

  log.info("medication-insights", "calling NIM", { medication: normalizedMedication });
  const { result } = await callResponses({
    instructions,
    content,
    schemaName: "medication_insights",
    schema,
    maxTokens: 1200
  });

  return normalizeResult(result);
}

module.exports = {
  getMedicationInsights
};
