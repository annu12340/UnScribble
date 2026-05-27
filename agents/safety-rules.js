"use strict";

const HIGH_RISK_ABBREVS = /\b(STAT|SOS|QID|U|IU|MSO4|MgSO4|µg|mcg)\b/i;

function emptyPatient() {
  return {
    name: "",
    age: "",
    sex: "",
    weight: "",
    date: "",
    doctor: "",
    clinic: "",
    identifiers: []
  };
}

function applySafetyRules(input) {
  const result = structuredClone(input);
  const reasons = [];
  const quality = result.image_quality || {};
  const legibility = String(quality.legibility || "").toLowerCase();

  if (legibility === "unusable" || legibility === "low") {
    reasons.push(`Image legibility is ${legibility}.`);
  }

  for (const med of result.medications || []) {
    const nameConf = Number(med.medication_name_confidence ?? 0);
    if (nameConf > 0 && nameConf < 0.75) {
      med.requires_verification = true;
      reasons.push(`Low confidence on medication line ${med.line_number || "?"}.`);
    }
    if (!String(med.strength || "").trim() && !String(med.dose || "").trim()) {
      med.requires_verification = true;
      reasons.push(`Missing strength/dose on line ${med.line_number || "?"}.`);
    }
    if (!String(med.frequency || "").trim()) {
      med.requires_verification = true;
      reasons.push(`Missing frequency on line ${med.line_number || "?"}.`);
    }
    const tokens = med.uncertain_tokens || [];
    if (tokens.length > 0) {
      med.requires_verification = true;
      reasons.push(`Uncertain tokens on line ${med.line_number || "?"}: ${tokens.join(", ")}`);
    }
    const raw = String(med.raw_text || med.medication_name || "");
    if (HIGH_RISK_ABBREVS.test(raw)) {
      const flags = Array.isArray(med.safety_flags) ? med.safety_flags : [];
      if (!flags.includes("high-risk abbreviation")) flags.push("high-risk abbreviation");
      med.safety_flags = flags;
      med.requires_verification = true;
      reasons.push(`High-risk abbreviation on line ${med.line_number || "?"}.`);
    }
  }

  for (const line of result.raw_transcription || []) {
    if (String(line.text || "").includes("[?]")) {
      reasons.push(`Unresolved token on transcription line ${line.line_number}.`);
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  if (uniqueReasons.length > 0) {
    result.requires_human_review = true;
    result.review_reason = uniqueReasons.slice(0, 5).join(" ");
  }

  return result;
}

module.exports = {
  applySafetyRules,
  emptyPatient
};
