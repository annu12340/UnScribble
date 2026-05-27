"use strict";

const fs = require("node:fs");
const config = require("./config");

const { distance: levenshteinDistance } = loadLevenshtein();
const FORMULARY = loadFormulary(config.formularyPath);

function loadLevenshtein() {
  try {
    return require("fastest-levenshtein");
  } catch {
    return { distance: levenshteinFallback };
  }
}

function levenshteinFallback(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function loadFormulary(filePath) {
  const empty = { set: new Set(), byLength: {} };
  try {
    console.log(`Loading formulary from: ${filePath}`);
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(parsed)) {
      console.error("Formulary file is not an array");
      return empty;
    }
    const set = new Set();
    const byLength = {};
    for (const item of parsed) {
      const term = String(item || "").trim().toLowerCase();
      if (!term) continue;
      set.add(term);
      const length = term.length;
      if (!byLength[length]) byLength[length] = [];
      byLength[length].push(term);
    }
    console.log(`Loaded ${set.size} formulary entries`);
    return { set, byLength };
  } catch (error) {
    console.error(`Failed to load formulary: ${error.message}`);
    return empty;
  }
}

function fuzzyMatch(query, candidates, maxDistance) {
  const matches = [];
  const queryLen = query.length;
  const minLen = Math.max(1, queryLen - 2);
  const maxLen = queryLen + 2;

  if (Array.isArray(candidates)) {
    for (const term of candidates) {
      if (term.length < minLen || term.length > maxLen) continue;
      const d = levenshteinDistance(query, term);
      if (d <= maxDistance) matches.push({ term, distance: d });
    }
  } else if (candidates && typeof candidates === "object") {
    for (let length = minLen; length <= maxLen; length++) {
      const bucket = candidates[length];
      if (!bucket) continue;
      for (const term of bucket) {
        const d = levenshteinDistance(query, term);
        if (d <= maxDistance) matches.push({ term, distance: d });
      }
    }
  }
  matches.sort((a, b) => a.distance - b.distance);
  return matches.slice(0, 5);
}

function dedupMedications(medications) {
  const byKey = new Map();
  for (const med of medications) {
    const key = [
      String(med.medication_name || "").trim().toLowerCase(),
      String(med.strength || "").trim().toLowerCase(),
      String(med.form || "").trim().toLowerCase()
    ].join("|");
    if (!key.replaceAll("|", "")) {
      byKey.set(Symbol(), med);
      continue;
    }
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, med);
      continue;
    }
    const a = Number(existing.medication_name_confidence ?? 0);
    const b = Number(med.medication_name_confidence ?? 0);
    const winner = b > a ? med : existing;
    const loser = b > a ? existing : med;
    winner.safety_flags = unionStrings(winner.safety_flags, loser.safety_flags);
    winner.uncertain_tokens = unionStrings(winner.uncertain_tokens, loser.uncertain_tokens);
    winner.critical_uncertainties = unionStrings(
      winner.critical_uncertainties,
      loser.critical_uncertainties
    );
    winner.alternatives = unionAlternatives(winner.alternatives, loser.alternatives);
    byKey.set(key, winner);
  }
  return Array.from(byKey.values());
}

function unionStrings(a, b) {
  const out = [];
  const seen = new Set();
  for (const list of [a, b]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const key = String(item).trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function unionAlternatives(a, b) {
  const out = [];
  const seen = new Set();
  for (const list of [a, b]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const key = String(item?.text || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

async function validateAgainstFormulary(result) {
  if (!result || !Array.isArray(result.medications)) return result;

  result.medications = dedupMedications(result.medications);

  for (const med of result.medications) {
    const name = String(med.medication_name || "").trim();
    if (!name) continue;
    const lowered = name.toLowerCase();
    if (FORMULARY.set.has(lowered)) continue;

    const matches = fuzzyMatch(lowered, FORMULARY.byLength, 3).slice(0, 3);

    if (matches.length > 0) {
      const existing = Array.isArray(med.alternatives) ? med.alternatives : [];
      const seen = new Set(existing.map((alt) => String(alt.text || "").toLowerCase()));

      const top = matches[0];
      const runnerUp = matches[1];
      const unambiguous = top.distance === 1 && (!runnerUp || runnerUp.distance >= 3);
      if (unambiguous) {
        if (!med.medication_name_raw) med.medication_name_raw = name;
        if (!seen.has(lowered)) {
          existing.push({
            text: name,
            confidence: Number(med.medication_name_confidence ?? 0.7),
            reason: "model spelling, replaced by formulary"
          });
          seen.add(lowered);
        }
        med.medication_name = top.term;
        med.medication_name_confidence = Math.min(
          Number(med.medication_name_confidence ?? 0.85),
          0.85
        );
        const flags = Array.isArray(med.safety_flags) ? med.safety_flags : [];
        if (!flags.includes("spelling auto-corrected from formulary")) {
          flags.push("spelling auto-corrected from formulary");
        }
        med.safety_flags = flags;
        seen.add(top.term);
      }

      for (const match of matches) {
        if (seen.has(match.term)) continue;
        existing.push({
          text: match.term,
          confidence: Math.max(0, 1 - match.distance / 5),
          reason: "formulary fuzzy match"
        });
        seen.add(match.term);
      }
      med.alternatives = existing;
      if (!unambiguous) {
        med.medication_name_confidence = Math.min(
          Number(med.medication_name_confidence ?? 0.5),
          0.7
        );
      }
    } else {
      med.medication_name_confidence = Math.min(Number(med.medication_name_confidence ?? 0.4), 0.4);
      const flags = Array.isArray(med.safety_flags) ? med.safety_flags : [];
      if (!flags.includes("unknown to formulary")) flags.push("unknown to formulary");
      med.safety_flags = flags;
    }
  }
  return result;
}

function isInFormulary(name) {
  const lowered = String(name || "").trim().toLowerCase();
  if (!lowered) return false;
  return FORMULARY.set.has(lowered);
}

module.exports = {
  validateAgainstFormulary,
  isInFormulary,
  formularySize: FORMULARY.set.size
};
