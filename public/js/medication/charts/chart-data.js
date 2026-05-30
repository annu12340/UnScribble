/** Pure chart row builders (no DOM / Chart.js). */

import { PALETTE } from "./chart-constants.js";

/**
 * @param {Array<[string, unknown[], string]>} entries
 */
export function countRows(entries) {
  return entries.map(([label, items, color]) => ({
    label,
    value: items.length,
    items,
    color,
    detail: items.slice(0, 3).join(" · ")
  }));
}

export function scoreBucket(count, max = 6) {
  if (!count) return 8;
  return Math.min(100, Math.round((count / max) * 100));
}

export function textScore(text) {
  return text && String(text).trim() && String(text).trim() !== "—" ? 88 : 12;
}

/**
 * @param {Record<string, unknown>} med
 */
export function buildProfileRows(med) {
  const regulatory = med.regulatory_status || {};
  const interactions = med.drug_interactions || {};
  const sideEffects = med.side_effects || {};
  const safety = med.patient_safety_flags || {};
  const market = med.market_status || {};

  const regCount =
    (regulatory.prescription_only_countries?.length || 0) +
    (regulatory.black_box_warnings?.length || 0) +
    (regulatory.recent_regulatory_alerts?.length || 0);
  const interactionCount =
    (interactions.common_interacting_medications?.length || 0) +
    (interactions.contraindicated_conditions?.length || 0);
  const sideEffectCount =
    (sideEffects.common_side_effects?.length || 0) +
    (sideEffects.serious_adverse_events?.length || 0);

  return [
    {
      label: "Decode confidence",
      value: Math.round(Number(med.confidence || 0) * 100) || 12,
      detail: "Prescription extraction confidence"
    },
    {
      label: "Regulatory depth",
      value: scoreBucket(regCount),
      detail: regulatory.summary || "Regulatory footprint"
    },
    {
      label: "Interaction map",
      value: scoreBucket(interactionCount),
      detail: "Known drug and food interactions"
    },
    {
      label: "Side-effect catalog",
      value: scoreBucket(sideEffectCount),
      detail: sideEffects.monitoring_notes || "Reported effects"
    },
    {
      label: "Safety guidance",
      value: Math.round(
        (textScore(safety.pregnancy_lactation_category) +
          textScore(safety.allergy_risk_summary) +
          textScore(safety.age_based_precautions)) /
          3
      ),
      detail: "Patient safety flags"
    },
    {
      label: "Market signals",
      value: scoreBucket(
        (market.recent_recalls?.length || 0) + (market.country_restrictions?.length || 0)
      ),
      detail: "Recalls and market restrictions"
    }
  ];
}

export function parseHour(time) {
  if (!time || typeof time !== "string" || !time.includes(":")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours)) return null;
  return hours + (Number.isNaN(minutes) ? 0 : minutes / 60);
}

/**
 * @param {{ schedule?: { times?: Array<{ time?: string, label?: string }> } }} [schedule]
 */
export function buildScheduleRows(schedule) {
  const times = schedule?.schedule?.times || [];
  if (!times.length) return null;

  return times.map((slot, index) => {
    const hour = parseHour(slot.time);
    const label = slot.label || slot.time || `Dose ${index + 1}`;
    return {
      label,
      value: hour != null ? hour : index + 1,
      detail: slot.time ? `Scheduled around ${slot.time}` : label,
      items: [label]
    };
  });
}

export function ingredientBubbleRows(equivalentBrands, combinationDrugs, duplicateWarnings) {
  return [
    ...equivalentBrands.map((item) => ({
      label: String(item),
      value: 1.6,
      group: "Brands",
      color: PALETTE.emerald[1],
      items: [String(item)]
    })),
    ...combinationDrugs.map((item) => ({
      label: String(item),
      value: 1.8,
      group: "Combos",
      color: PALETTE.violet[1],
      items: [String(item)]
    })),
    ...duplicateWarnings.map((item) => ({
      label: String(item),
      value: 2,
      group: "Warnings",
      color: PALETTE.amber[1],
      items: [String(item)]
    }))
  ];
}
