/**
 * Body-region panel — renders from local JSON (no server restart required).
 */

import { renderBodyMap, renderBodyEffectsText } from "./body-effects-viz.js";

const GENERIC_FALLBACK = {
  regions: [],
  organs: [],
  summary:
    "We do not have a body-region map for this medication in our demo database yet. Ask your pharmacist or clinician where it acts.",
  uncertain: true
};

/** @type {Record<string, { regions: string[], organs: string[], summary: string }> | null} */
let bodyEffectsDb = null;

function medicationLookupKeys(name) {
  const raw = String(name || "")
    .trim()
    .toLowerCase();
  if (!raw) return [];
  const first = raw.split(/\s+/)[0];
  return [...new Set([raw, first].filter(Boolean))];
}

async function loadBodyEffectsDb() {
  if (bodyEffectsDb) return bodyEffectsDb;
  try {
    const response = await fetch("/data/drug-body-effects.json", { cache: "no-store" });
    if (response.ok) {
      bodyEffectsDb = await response.json();
      return bodyEffectsDb;
    }
  } catch (error) {
    console.warn("Could not load body effects data", error);
  }
  bodyEffectsDb = {};
  return bodyEffectsDb;
}

/**
 * @param {string} medicationName
 * @param {Record<string, unknown>} db
 */
function lookupBodyEffects(medicationName, db) {
  const keys = medicationLookupKeys(medicationName);
  for (const key of keys) {
    if (db[key]) {
      return { ...db[key], matchedDrug: key, uncertain: false };
    }
  }
  return { ...GENERIC_FALLBACK };
}

/**
 * Render body map immediately (sync path after JSON is cached).
 * @param {string} medicationName
 * @param {{ panel?: HTMLElement, map?: HTMLElement, organs?: HTMLElement, summary?: HTMLElement }} els
 */
export function renderBodyEffectsForMedication(medicationName, els) {
  if (!els?.panel) return;

  const apply = (data) => {
    els.panel.hidden = false;
    renderBodyMap(els.map, data);
    renderBodyEffectsText(els.organs, els.summary, data);
  };

  if (bodyEffectsDb) {
    apply(lookupBodyEffects(medicationName, bodyEffectsDb));
    return;
  }

  els.panel.hidden = false;
  if (els.summary) els.summary.textContent = "Loading body map…";
  if (els.map) {
    els.map.innerHTML = '<p class="body-effects-loading">Loading body diagram…</p>';
  }

  loadBodyEffectsDb().then((db) => {
    apply(lookupBodyEffects(medicationName, db));
  });
}

export function bodyEffectsPanelElements() {
  return {
    panel: document.querySelector("#bodyEffectsPanel"),
    map: document.querySelector("#bodyEffectsMap"),
    organs: document.querySelector("#bodyEffectsOrgans"),
    summary: document.querySelector("#bodyEffectsSummary")
  };
}
