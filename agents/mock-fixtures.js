"use strict";

const fixtures = {
  image_quality: {
    image_quality: {
      legibility: "medium",
      issues: ["mock mode — no API call"],
      recommended_next_capture: "",
      recommended_preprocessing: "contrast"
    },
    requires_human_review: false,
    review_hint: ""
  },
  raw_transcription: {
    raw_transcription: [
      {
        line_number: 1,
        section: "patient",
        text: "John D, 45M",
        confidence: 0.85
      },
      {
        line_number: 2,
        section: "medication",
        text: "Tab Amoxicillin 500mg 1-0-1 x 5d",
        confidence: 0.8
      }
    ],
    region_hint: {
      style: "indian",
      confidence: 0.7,
      evidence: "Tab prefix; 1-0-1 schedule"
    }
  },
  patient_header: {
    patient: {
      name: "John D",
      age: "45",
      sex: "M",
      weight: "",
      date: "",
      doctor: "Dr. Smith",
      clinic: "Mock Clinic",
      identifiers: []
    }
  },
  medications: {
    medications: [
      {
        line_number: 2,
        raw_text: "Tab Amoxicillin 500mg 1-0-1 x 5d",
        medication_name: "Amoxicillin",
        medication_name_raw: "Amoxicillin",
        medication_name_confidence: 0.82,
        alternatives: [],
        strength: "500 mg",
        dose: "1 tablet",
        form: "Tablet",
        route: "",
        frequency: "1-0-1",
        normalized_frequency: {
          abbreviation: "1-0-1",
          expansion: "morning - noon - night",
          timing: "three times daily"
        },
        duration: "5 days",
        quantity: "",
        refills: "",
        sig: "Take one tablet morning, noon, and night for 5 days",
        timing: "",
        administration_notes: "",
        instructions: "",
        confidence: 0.8,
        safety_flags: [],
        critical_uncertainties: [],
        uncertain_tokens: [],
        requires_verification: false
      }
    ]
  },
  clinical_context: {
    abbreviations: [{ abbreviation: "Tab", likely_expansion: "Tablet", confidence: 0.95 }],
    allergies: [],
    clinical_context: {
      diagnoses: [],
      symptoms: [],
      vitals: [],
      investigations: [],
      advice: [],
      referrals: []
    },
    non_medication_text: [],
    follow_up_instructions: [],
    global_warnings: []
  },
  synthesis: {
    summary:
      "Mock workflow: one medication line (Amoxicillin 500 mg, 1-0-1 for 5 days) with medium image quality."
  }
};

function getMockResult(agentId) {
  return fixtures[agentId] ? JSON.parse(JSON.stringify(fixtures[agentId])) : {};
}

module.exports = { getMockResult };
