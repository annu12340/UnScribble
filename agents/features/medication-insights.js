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
    summary: "No regulatory information available for this medication.",
  },
  ingredient_analysis: {
    active_ingredient: "",
    equivalent_brands: [],
    combination_drugs: [],
    duplicate_ingredient_warnings: [],
  },
  drug_interactions: {
    common_interacting_medications: [],
    food_supplements_to_avoid: [],
    contraindicated_conditions: [],
  },
  patient_safety_flags: {
    pregnancy_lactation_category: "",
    renal_hepatic_dosing_guidance: "",
    age_based_precautions: "",
    allergy_risk_summary: "",
  },
  side_effects: {
    common_side_effects: [],
    serious_adverse_events: [],
    monitoring_notes: "",
  },
  administration: {
    administration_guidance: "",
    storage_instructions: "",
    missed_dose_guidance: "",
    food_instruction: "",
  },
  pharmacokinetics: {
    onset_hours: 0,
    peak_hours: 0,
    duration_hours: 0,
  },
  market_status: {
    recent_recalls: [],
    country_restrictions: [],
    withdrawal_history: [],
  },
};

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

function normalizeResult(result) {
  if (!result || typeof result !== "object") return DEFAULT_RESULT;

  return {
    regulatory_status: {
      fully_banned_countries: Array.isArray(
        result.regulatory_status?.fully_banned_countries,
      )
        ? result.regulatory_status.fully_banned_countries
        : [],
      prescription_only_countries: Array.isArray(
        result.regulatory_status?.prescription_only_countries,
      )
        ? result.regulatory_status.prescription_only_countries
        : [],
      restricted_age_groups: Array.isArray(
        result.regulatory_status?.restricted_age_groups,
      )
        ? result.regulatory_status.restricted_age_groups
        : [],
      black_box_warnings: Array.isArray(
        result.regulatory_status?.black_box_warnings,
      )
        ? result.regulatory_status.black_box_warnings
        : [],
      withdrawn_formulations: Array.isArray(
        result.regulatory_status?.withdrawn_formulations,
      )
        ? result.regulatory_status.withdrawn_formulations
        : [],
      recent_regulatory_alerts: Array.isArray(
        result.regulatory_status?.recent_regulatory_alerts,
      )
        ? result.regulatory_status.recent_regulatory_alerts
        : [],
      summary:
        typeof result.regulatory_status?.summary === "string"
          ? result.regulatory_status.summary
          : DEFAULT_RESULT.regulatory_status.summary,
    },
    ingredient_analysis: {
      active_ingredient:
        typeof result.ingredient_analysis?.active_ingredient === "string"
          ? result.ingredient_analysis.active_ingredient
          : "",
      equivalent_brands: Array.isArray(
        result.ingredient_analysis?.equivalent_brands,
      )
        ? result.ingredient_analysis.equivalent_brands
        : [],
      combination_drugs: Array.isArray(
        result.ingredient_analysis?.combination_drugs,
      )
        ? result.ingredient_analysis.combination_drugs
        : [],
      duplicate_ingredient_warnings: Array.isArray(
        result.ingredient_analysis?.duplicate_ingredient_warnings,
      )
        ? result.ingredient_analysis.duplicate_ingredient_warnings
        : [],
    },
    drug_interactions: {
      common_interacting_medications: Array.isArray(
        result.drug_interactions?.common_interacting_medications,
      )
        ? result.drug_interactions.common_interacting_medications
        : [],
      food_supplements_to_avoid: Array.isArray(
        result.drug_interactions?.food_supplements_to_avoid,
      )
        ? result.drug_interactions.food_supplements_to_avoid
        : [],
      contraindicated_conditions: Array.isArray(
        result.drug_interactions?.contraindicated_conditions,
      )
        ? result.drug_interactions.contraindicated_conditions
        : [],
    },
    patient_safety_flags: {
      pregnancy_lactation_category:
        typeof result.patient_safety_flags?.pregnancy_lactation_category ===
        "string"
          ? result.patient_safety_flags.pregnancy_lactation_category
          : "",
      renal_hepatic_dosing_guidance:
        typeof result.patient_safety_flags?.renal_hepatic_dosing_guidance ===
        "string"
          ? result.patient_safety_flags.renal_hepatic_dosing_guidance
          : "",
      age_based_precautions:
        typeof result.patient_safety_flags?.age_based_precautions === "string"
          ? result.patient_safety_flags.age_based_precautions
          : "",
      allergy_risk_summary:
        typeof result.patient_safety_flags?.allergy_risk_summary === "string"
          ? result.patient_safety_flags.allergy_risk_summary
          : "",
    },
    side_effects: {
      common_side_effects: Array.isArray(
        result.side_effects?.common_side_effects,
      )
        ? result.side_effects.common_side_effects
        : [],
      serious_adverse_events: Array.isArray(
        result.side_effects?.serious_adverse_events,
      )
        ? result.side_effects.serious_adverse_events
        : [],
      monitoring_notes:
        typeof result.side_effects?.monitoring_notes === "string"
          ? result.side_effects.monitoring_notes
          : "",
    },
    administration: {
      administration_guidance:
        typeof result.administration?.administration_guidance === "string"
          ? result.administration.administration_guidance
          : "",
      storage_instructions:
        typeof result.administration?.storage_instructions === "string"
          ? result.administration.storage_instructions
          : "",
      missed_dose_guidance:
        typeof result.administration?.missed_dose_guidance === "string"
          ? result.administration.missed_dose_guidance
          : "",
      food_instruction:
        typeof result.administration?.food_instruction === "string"
          ? result.administration.food_instruction
          : "",
    },
    pharmacokinetics: {
      onset_hours: toNumber(result.pharmacokinetics?.onset_hours),
      peak_hours: toNumber(result.pharmacokinetics?.peak_hours),
      duration_hours: toNumber(result.pharmacokinetics?.duration_hours),
    },
    market_status: {
      recent_recalls: Array.isArray(result.market_status?.recent_recalls)
        ? result.market_status.recent_recalls
        : [],
      country_restrictions: Array.isArray(
        result.market_status?.country_restrictions,
      )
        ? result.market_status.country_restrictions
        : [],
      withdrawal_history: Array.isArray(
        result.market_status?.withdrawal_history,
      )
        ? result.market_status.withdrawal_history
        : [],
    },
  };
}

function getMockMedicationInsights(medicationName) {
  const key = String(medicationName || "")
    .trim()
    .toLowerCase();
  if (key.includes("amoxicillin")) {
    return {
      regulatory_status: {
        summary:
          "Amoxicillin is generally prescription-only in most countries and has a limited liver toxicity warning in rare cases.",
        fully_banned_countries: [],
        prescription_only_countries: [
          "United States",
          "United Kingdom",
          "India",
        ],
        restricted_age_groups: ["Under 1 month"],
        black_box_warnings: ["Banned because of liver toxicity"],
        withdrawn_formulations: [
          "Amoxicillin oral suspension 400 mg/5 mL (discontinued in some markets)",
        ],
        recent_regulatory_alerts: ["Restricted during pregnancy"],
      },
      ingredient_analysis: {
        active_ingredient: "Amoxicillin",
        equivalent_brands: ["Moxatag", "Trimox"],
        combination_drugs: ["Amoxicillin/Clavulanate"],
        duplicate_ingredient_warnings: [
          "Contains penicillin-class antibiotic; avoid duplicate penicillin agents.",
        ],
      },
      drug_interactions: {
        common_interacting_medications: [
          "Methotrexate",
          "Warfarin",
          "Oral contraceptives",
        ],
        food_supplements_to_avoid: [
          "High-dose vitamin C",
          "Alcohol",
          "Probiotics (may alter absorption)",
        ],
        contraindicated_conditions: [
          "Mononucleosis",
          "Severe renal impairment",
          "Penicillin allergy",
        ],
      },
      patient_safety_flags: {
        pregnancy_lactation_category: "Category B (use only if clearly needed)",
        renal_hepatic_dosing_guidance:
          "Reduce dose in severe renal impairment; monitor kidney function.",
        age_based_precautions:
          "Use caution in neonates and infants under 1 month due to immature renal clearance.",
        allergy_risk_summary:
          "Patients with penicillin allergy may experience rash, swelling, or anaphylaxis.",
      },
      side_effects: {
        common_side_effects: ["Nausea", "Diarrhea", "Rash"],
        serious_adverse_events: [
          "Severe allergic reaction",
          "Clostridioides difficile infection",
          "Liver injury",
        ],
        monitoring_notes:
          "Monitor for fever, persistent diarrhea, jaundice, or difficulty breathing.",
      },
      administration: {
        administration_guidance:
          "Take with or without food, ideally evenly spaced throughout the day.",
        storage_instructions:
          "Store at room temperature away from moisture and heat.",
        missed_dose_guidance:
          "If you miss a dose, take it as soon as possible unless it is near the next dose; do not double dose.",
        food_instruction: "either",
      },
      pharmacokinetics: {
        onset_hours: 0.5,
        peak_hours: 1.5,
        duration_hours: 8,
      },
      market_status: {
        recent_recalls: [
          "Recall of select lots due to particulate contamination",
        ],
        country_restrictions: [
          "Prescription-only in most markets",
          "Restricted during pregnancy in some regions",
        ],
        withdrawal_history: [
          "Some older oral suspension formulations were withdrawn after post-market stability concerns.",
        ],
      },
    };
  }

  return {
    regulatory_status: {
      ...DEFAULT_RESULT.regulatory_status,
      summary: `Regulatory and ingredient metadata is not available for ${medicationName || "this medication"}.`,
    },
    ingredient_analysis: {
      active_ingredient: medicationName || "",
      equivalent_brands: [],
      combination_drugs: [],
      duplicate_ingredient_warnings: [],
    },
    drug_interactions: DEFAULT_RESULT.drug_interactions,
    patient_safety_flags: DEFAULT_RESULT.patient_safety_flags,
    side_effects: DEFAULT_RESULT.side_effects,
    administration: DEFAULT_RESULT.administration,
    market_status: DEFAULT_RESULT.market_status,
  };
}

async function getMedicationInsights(medicationName, rawText) {
  const normalizedMedication = String(medicationName || "").trim();
  const contentText = [
    `Medication: ${normalizedMedication || "Unknown"}`,
    rawText
      ? `Prescription text: ${rawText}`
      : "Prescription text: not provided",
    "Return a JSON object with top-level keys: regulatory_status, ingredient_analysis, drug_interactions, patient_safety_flags, side_effects, administration, pharmacokinetics, and market_status.",
  ].join("\n");

  if (config.mock || !config.apiKey) {
    log.info("medication-insights", "using mock insights", {
      medication: normalizedMedication,
    });
    return normalizeResult(getMockMedicationInsights(normalizedMedication));
  }

  const instructions = `You are a regulatory and pharmaceutical intelligence assistant. For the drug named '${normalizedMedication}', provide:

1) regulatory_status: fully_banned_countries, prescription_only_countries, restricted_age_groups, black_box_warnings, withdrawn_formulations, recent_regulatory_alerts, and a concise summary.
2) ingredient_analysis: active_ingredient, equivalent_brands, combination_drugs, duplicate_ingredient_warnings.
3) drug_interactions: common_interacting_medications, food_supplements_to_avoid, contraindicated_conditions.
4) patient_safety_flags: pregnancy_lactation_category, renal_hepatic_dosing_guidance, age_based_precautions, allergy_risk_summary.
5) side_effects: common_side_effects, serious_adverse_events, monitoring_notes.
6) administration: administration_guidance, storage_instructions, missed_dose_guidance, and food_instruction (one of: "with food", "without food", "either").
7) pharmacokinetics: onset_hours, peak_hours, duration_hours (approximate numeric hours for a single oral dose — when the effect begins, peaks, and wears off).
8) market_status: recent_recalls, country_restrictions, withdrawal_history.

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
          prescription_only_countries: {
            type: "array",
            items: { type: "string" },
          },
          restricted_age_groups: { type: "array", items: { type: "string" } },
          black_box_warnings: { type: "array", items: { type: "string" } },
          withdrawn_formulations: { type: "array", items: { type: "string" } },
          recent_regulatory_alerts: {
            type: "array",
            items: { type: "string" },
          },
          summary: { type: "string" },
        },
        required: [
          "fully_banned_countries",
          "prescription_only_countries",
          "restricted_age_groups",
          "black_box_warnings",
          "withdrawn_formulations",
          "recent_regulatory_alerts",
          "summary",
        ],
      },
      ingredient_analysis: {
        type: "object",
        additionalProperties: false,
        properties: {
          active_ingredient: { type: "string" },
          equivalent_brands: { type: "array", items: { type: "string" } },
          combination_drugs: { type: "array", items: { type: "string" } },
          duplicate_ingredient_warnings: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "active_ingredient",
          "equivalent_brands",
          "combination_drugs",
          "duplicate_ingredient_warnings",
        ],
      },
      drug_interactions: {
        type: "object",
        additionalProperties: false,
        properties: {
          common_interacting_medications: {
            type: "array",
            items: { type: "string" },
          },
          food_supplements_to_avoid: {
            type: "array",
            items: { type: "string" },
          },
          contraindicated_conditions: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "common_interacting_medications",
          "food_supplements_to_avoid",
          "contraindicated_conditions",
        ],
      },
      patient_safety_flags: {
        type: "object",
        additionalProperties: false,
        properties: {
          pregnancy_lactation_category: { type: "string" },
          renal_hepatic_dosing_guidance: { type: "string" },
          age_based_precautions: { type: "string" },
          allergy_risk_summary: { type: "string" },
        },
        required: [
          "pregnancy_lactation_category",
          "renal_hepatic_dosing_guidance",
          "age_based_precautions",
          "allergy_risk_summary",
        ],
      },
      side_effects: {
        type: "object",
        additionalProperties: false,
        properties: {
          common_side_effects: { type: "array", items: { type: "string" } },
          serious_adverse_events: { type: "array", items: { type: "string" } },
          monitoring_notes: { type: "string" },
        },
        required: [
          "common_side_effects",
          "serious_adverse_events",
          "monitoring_notes",
        ],
      },
      administration: {
        type: "object",
        additionalProperties: false,
        properties: {
          administration_guidance: { type: "string" },
          storage_instructions: { type: "string" },
          missed_dose_guidance: { type: "string" },
          food_instruction: { type: "string" },
        },
        required: [
          "administration_guidance",
          "storage_instructions",
          "missed_dose_guidance",
          "food_instruction",
        ],
      },
      pharmacokinetics: {
        type: "object",
        additionalProperties: false,
        properties: {
          onset_hours: { type: "number" },
          peak_hours: { type: "number" },
          duration_hours: { type: "number" },
        },
        required: ["onset_hours", "peak_hours", "duration_hours"],
      },
      market_status: {
        type: "object",
        additionalProperties: false,
        properties: {
          recent_recalls: { type: "array", items: { type: "string" } },
          country_restrictions: { type: "array", items: { type: "string" } },
          withdrawal_history: { type: "array", items: { type: "string" } },
        },
        required: [
          "recent_recalls",
          "country_restrictions",
          "withdrawal_history",
        ],
      },
    },
    required: [
      "regulatory_status",
      "ingredient_analysis",
      "drug_interactions",
      "patient_safety_flags",
      "side_effects",
      "administration",
      "pharmacokinetics",
      "market_status",
    ],
  };

  log.info("medication-insights", "calling NIM", {
    medication: normalizedMedication,
  });
  const { result } = await callResponses({
    instructions,
    content,
    schemaName: "medication_insights",
    schema,
    maxTokens: 1200,
  });

  return normalizeResult(result);
}

module.exports = {
  getMedicationInsights,
};
