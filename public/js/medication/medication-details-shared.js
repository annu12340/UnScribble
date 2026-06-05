/**
 * @typedef {object} NormalizedFrequency
 * @property {string} [abbreviation]
 * @property {string} [expansion]
 * @property {string} [timing]
 */

/**
 * @typedef {object} MedicationRecord
 * @property {string} [medication_name]
 * @property {number} [confidence]
 * @property {NormalizedFrequency} [normalized_frequency]
 * @property {string} [frequency]
 * @property {object} [regulatory_status]
 * @property {object} [ingredient_analysis]
 * @property {object} [drug_interactions]
 * @property {object} [side_effects]
 * @property {object} [market_status]
 * @property {boolean} [_insightsLoaded]
 * @property {boolean} [_insightsLoading]
 */

/** @type {string} */
export const DEMO_MEDICATION_NAME = "Amoxicillin";

/** @type {MedicationRecord} */
export const DEMO_MEDICATION = {
  medication_name: DEMO_MEDICATION_NAME,
  strength: "500 mg",
  form: "Capsule",
  dose: "1 capsule",
  frequency: "Three times daily",
  duration: "7 days",
  route: "Oral",
  quantity: "21",
  refills: "0",
  timing: "With or without food",
  confidence: 0.88,
  sig: "Take 1 capsule by mouth three times daily for 7 days",
  administration_notes: "Complete the full course even if you feel better.",
  raw_text: "Amox 500mg cap i tab po tds x7d",
  safety_flags: [],
  alternatives: [],
};

/**
 * @param {string} [overrideName]
 * @returns {MedicationRecord}
 */
export function buildDemoMedication(overrideName) {
  const name =
    String(overrideName || DEMO_MEDICATION_NAME).trim() || DEMO_MEDICATION_NAME;
  return { ...DEMO_MEDICATION, medication_name: name };
}

/**
 * @param {MedicationRecord | null | undefined} med
 * @returns {boolean}
 */
export function hasInsightPayload(med) {
  return Boolean(
    med?.regulatory_status ||
    med?.ingredient_analysis ||
    med?.drug_interactions ||
    med?.side_effects ||
    med?.market_status,
  );
}

/**
 * @param {NormalizedFrequency | null | undefined} frequency
 * @returns {string}
 */
export function formatNormalizedFrequency(frequency) {
  if (!frequency || typeof frequency !== "object") return "";
  return [frequency.abbreviation, frequency.expansion, frequency.timing]
    .filter(Boolean)
    .join(" · ");
}

/**
 * @param {number | string | null | undefined} confidence
 * @returns {number}
 */
export function confidencePercent(confidence) {
  return Math.max(0, Math.min(100, Math.round(Number(confidence || 0) * 100)));
}

/**
 * @param {MedicationRecord} med
 * @returns {string[]}
 */
export function collectMedicationWarnings(med) {
  if (!med) return [];
  return (med.safety_flags || [])
    .concat(
      (med.critical_uncertainties || []).map((item) => `Uncertain: ${item}`),
    )
    .concat(
      (med.uncertain_tokens || []).map((item) => `Token to verify: ${item}`),
    )
    .concat(
      med.requires_verification
        ? ["Human verification required for this medication."]
        : [],
    );
}

/**
 * @param {string | null | undefined} storedData
 * @returns {{ medication: MedicationRecord | null, error: Error | null }}
 */
export function parseStoredMedication(storedData) {
  if (!storedData) {
    return { medication: null, error: null };
  }
  try {
    const medication = JSON.parse(storedData);
    if (!medication || typeof medication !== "object") {
      return {
        medication: null,
        error: new Error("Invalid medication payload"),
      };
    }
    return { medication, error: null };
  } catch (error) {
    return { medication: null, error };
  }
}

/**
 * @param {object} options
 * @param {string | null | undefined} options.storedData
 * @param {boolean} [options.forceDemo]
 * @param {string | null | undefined} [options.medOverride]
 * @returns {{
 *   mode: "demo" | "stored" | "empty";
 *   medication: MedicationRecord | null;
 *   error: Error | null;
 *   demoBannerText?: string;
 * }}
 */
export function resolveMedicationLoad({
  storedData,
  forceDemo = false,
  medOverride = null,
}) {
  if (forceDemo) {
    const medication = buildDemoMedication(medOverride);
    return {
      mode: "demo",
      medication,
      error: null,
      demoBannerText: `Demo mode — showing hardcoded data for "${medication.medication_name}". Remove ?demo=1 to use results from session.`,
    };
  }

  const parsed = parseStoredMedication(storedData);
  if (parsed.error) {
    return { mode: "empty", medication: null, error: parsed.error };
  }
  if (!parsed.medication) {
    return { mode: "empty", medication: null, error: null };
  }
  return { mode: "stored", medication: parsed.medication, error: null };
}

/**
 * @param {string} medicationName
 * @param {string} [rawText]
 * @returns {{ medication_name: string, raw_text: string }}
 */
export function buildInsightsRequestBody(medicationName, rawText = "") {
  return {
    medication_name: medicationName,
    raw_text: rawText,
  };
}
