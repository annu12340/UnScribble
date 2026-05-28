"use strict";

const { isInFormulary } = require("./formulary");

function cloneMed(med) {
  return structuredClone(med);
}

function withFlag(med, flag) {
  const flags = Array.isArray(med.safety_flags) ? med.safety_flags.slice() : [];
  if (!flags.includes(flag)) flags.push(flag);
  med.safety_flags = flags;
}

function withAlternative(med, alt) {
  const alts = Array.isArray(med.alternatives) ? med.alternatives.slice() : [];
  alts.push(alt);
  med.alternatives = alts;
}

function mergeMedicationRuns(first, second) {
  const secondByLine = new Map();
  for (const med of second) {
    if (med && med.line_number != null) secondByLine.set(med.line_number, med);
  }

  const out = [];
  for (const a of first) {
    const b = secondByLine.get(a.line_number);
    if (!b) {
      out.push(cloneMed(a));
      continue;
    }
    secondByLine.delete(a.line_number);

    const aName = String(a.medication_name || "")
      .trim()
      .toLowerCase();
    const bName = String(b.medication_name || "")
      .trim()
      .toLowerCase();
    const aConf = Number(a.medication_name_confidence ?? 0);
    const bConf = Number(b.medication_name_confidence ?? 0);

    if (aName && aName === bName) {
      const merged = cloneMed(a);
      merged.medication_name_confidence = Math.max(aConf, bConf);
      out.push(merged);
      continue;
    }

    const bInFormulary = bName && isInFormulary(bName);
    if (bConf > aConf && bInFormulary) {
      const merged = cloneMed(b);
      withFlag(merged, "second-run override");
      if (aName) {
        withAlternative(merged, {
          text: a.medication_name,
          confidence: aConf,
          reason: "first-pass reading, demoted after re-run"
        });
      }
      out.push(merged);
      continue;
    }

    const merged = cloneMed(a);
    merged.requires_verification = true;
    withFlag(merged, "low-confidence: runs disagree");
    if (bName) {
      withAlternative(merged, {
        text: b.medication_name,
        confidence: bConf,
        reason: "second-pass alternative reading"
      });
    }
    out.push(merged);
  }
  for (const remaining of secondByLine.values()) out.push(cloneMed(remaining));
  return out;
}

module.exports = { mergeMedicationRuns };
