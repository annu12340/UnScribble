"use strict";

const { emptyPatient } = require("./safety-rules");

function emptyClinicalContext() {
  return {
    diagnoses: [],
    symptoms: [],
    vitals: [],
    investigations: [],
    advice: [],
    referrals: []
  };
}

function mergeArtifacts(artifacts) {
  const imageQuality = artifacts.image_quality || {};
  const raw = artifacts.raw_transcription || {};
  const patient = artifacts.patient_header || {};
  const meds = artifacts.medications || {};
  const clinical = artifacts.clinical_context || {};
  const synthesis = artifacts.synthesis || {};

  return {
    summary: synthesis.summary || "",
    raw_transcription: raw.raw_transcription || [],
    region_hint: raw.region_hint || { style: "unknown", confidence: 0, evidence: "" },
    patient: patient.patient || emptyPatient(),
    medications: meds.medications || [],
    allergies: clinical.allergies || [],
    clinical_context: clinical.clinical_context || emptyClinicalContext(),
    non_medication_text: clinical.non_medication_text || [],
    abbreviations: clinical.abbreviations || [],
    follow_up_instructions: clinical.follow_up_instructions || [],
    global_warnings: clinical.global_warnings || [],
    image_quality: imageQuality.image_quality || {
      legibility: "medium",
      issues: [],
      recommended_next_capture: "",
      recommended_preprocessing: "original"
    },
    requires_human_review: Boolean(imageQuality.requires_human_review),
    review_reason: imageQuality.review_hint || ""
  };
}

function buildEarlyExit(artifacts) {
  const imageQuality = artifacts.image_quality || {};
  const raw = artifacts.raw_transcription || {};
  return {
    summary:
      "Image quality was too poor for reliable medication extraction. Please recapture the prescription with better lighting and focus.",
    raw_transcription: raw.raw_transcription || [],
    region_hint: raw.region_hint || { style: "unknown", confidence: 0, evidence: "" },
    patient: emptyPatient(),
    medications: [],
    allergies: [],
    clinical_context: emptyClinicalContext(),
    non_medication_text: [],
    abbreviations: [],
    follow_up_instructions: [],
    global_warnings: ["Image legibility unusable for medication extraction."],
    image_quality: imageQuality.image_quality || {
      legibility: "unusable",
      issues: ["unreadable handwriting or image quality"],
      recommended_next_capture: "Retake in bright, even light; fill the frame with the script.",
      recommended_preprocessing: "none"
    },
    requires_human_review: true,
    review_reason:
      imageQuality.review_hint ||
      "Prescription image is not legible enough for automated medication extraction."
  };
}

function synthesisInputFromMerged(merged) {
  return JSON.stringify(
    {
      patient: merged.patient,
      medications: merged.medications,
      allergies: merged.allergies,
      image_quality: merged.image_quality,
      requires_human_review: merged.requires_human_review,
      review_reason: merged.review_reason,
      global_warnings: merged.global_warnings
    },
    null,
    2
  );
}

function buildDeterministicSummary(merged) {
  const sentences = [];
  const header = summaryHeader(merged.patient || {});
  if (header) sentences.push(header);

  const medications = Array.isArray(merged.medications) ? merged.medications : [];
  const bullets = medications.map(formatMedicationBullet).filter(Boolean);
  if (bullets.length) {
    sentences.push("Medications:\n" + bullets.map((b) => `- ${b}`).join("\n"));
  } else {
    sentences.push("No medications were confidently extracted.");
  }

  if (merged.requires_human_review) {
    const reason = merged.review_reason ? ` Reason: ${merged.review_reason}` : "";
    sentences.push(`Human review required before clinical use.${reason}`);
  }

  const warnings = Array.isArray(merged.global_warnings) ? merged.global_warnings : [];
  if (warnings.length) {
    sentences.push("Warnings: " + warnings.join("; "));
  }

  return sentences.join("\n\n");
}

function summaryHeader(patient) {
  const parts = [];
  if (patient.name) parts.push(`Patient ${patient.name}`);
  const demographics = [patient.age, patient.sex].filter(Boolean).join(" / ");
  if (demographics) parts.push(`(${demographics})`);
  if (patient.date) parts.push(`on ${patient.date}`);
  if (patient.doctor) parts.push(`prescribed by ${patient.doctor}`);
  if (!parts.length) return "";
  return parts.join(" ") + ".";
}

function formatMedicationBullet(med) {
  if (!med) return "";
  const name = String(med.medication_name || "").trim();
  if (!name) return "";
  const head = [name, med.strength, med.form]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(" ");
  const timing =
    (med.normalized_frequency && med.normalized_frequency.timing) ||
    med.timing ||
    med.frequency ||
    "";
  const sig = String(med.sig || "").trim();
  const duration = String(med.duration || "").trim();
  const tail = [timing, sig, duration]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(", ");
  return tail ? `${head}: ${tail}` : head;
}

module.exports = {
  mergeArtifacts,
  buildEarlyExit,
  synthesisInputFromMerged,
  buildDeterministicSummary
};
