"use strict";

const rawTranscriptionItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    line_number: { type: "integer" },
    section: {
      type: "string",
      enum: ["medication", "patient", "diagnosis", "advice", "follow_up", "other"]
    },
    text: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["line_number", "section", "text", "confidence"]
};

const imageQualitySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    legibility: { type: "string", enum: ["high", "medium", "low", "unusable"] },
    issues: { type: "array", items: { type: "string" } },
    recommended_next_capture: { type: "string" },
    recommended_preprocessing: {
      type: "string",
      enum: ["original", "contrast", "mono", "none"]
    }
  },
  required: ["legibility", "issues", "recommended_next_capture", "recommended_preprocessing"]
};

const normalizedFrequencySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    abbreviation: { type: "string" },
    expansion: { type: "string" },
    timing: { type: "string" }
  },
  required: ["abbreviation", "expansion", "timing"]
};

const medicationItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    line_number: { type: "integer" },
    raw_text: { type: "string" },
    medication_name: { type: "string" },
    medication_name_raw: { type: "string" },
    medication_name_confidence: { type: "number", minimum: 0, maximum: 1 },
    alternatives: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reason: { type: "string" }
        },
        required: ["text", "confidence", "reason"]
      }
    },
    strength: { type: "string" },
    dose: { type: "string" },
    form: { type: "string" },
    route: { type: "string" },
    frequency: { type: "string" },
    normalized_frequency: normalizedFrequencySchema,
    duration: { type: "string" },
    quantity: { type: "string" },
    refills: { type: "string" },
    sig: { type: "string" },
    timing: { type: "string" },
    administration_notes: { type: "string" },
    instructions: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    safety_flags: { type: "array", items: { type: "string" } },
    critical_uncertainties: { type: "array", items: { type: "string" } },
    uncertain_tokens: { type: "array", items: { type: "string" } },
    requires_verification: { type: "boolean" }
  },
  required: [
    "line_number",
    "raw_text",
    "medication_name",
    "medication_name_raw",
    "medication_name_confidence",
    "alternatives",
    "strength",
    "dose",
    "form",
    "route",
    "frequency",
    "normalized_frequency",
    "duration",
    "quantity",
    "refills",
    "sig",
    "timing",
    "administration_notes",
    "instructions",
    "confidence",
    "safety_flags",
    "critical_uncertainties",
    "uncertain_tokens",
    "requires_verification"
  ]
};

const patientSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    age: { type: "string" },
    sex: { type: "string" },
    weight: { type: "string" },
    date: { type: "string" },
    doctor: { type: "string" },
    clinic: { type: "string" },
    identifiers: { type: "array", items: { type: "string" } }
  },
  required: ["name", "age", "sex", "weight", "date", "doctor", "clinic", "identifiers"]
};

module.exports = {
  imageQuality: {
    type: "object",
    additionalProperties: false,
    properties: {
      image_quality: imageQualitySchema,
      requires_human_review: { type: "boolean" },
      review_hint: { type: "string" }
    },
    required: ["image_quality", "requires_human_review", "review_hint"]
  },
  rawTranscription: {
    type: "object",
    additionalProperties: false,
    properties: {
      raw_transcription: { type: "array", items: rawTranscriptionItemSchema },
      region_hint: {
        type: "object",
        additionalProperties: false,
        properties: {
          style: {
            type: "string",
            enum: ["indian", "western", "mixed", "unknown"]
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          evidence: { type: "string" }
        },
        required: ["style", "confidence", "evidence"]
      }
    },
    required: ["raw_transcription", "region_hint"]
  },
  patientHeader: {
    type: "object",
    additionalProperties: false,
    properties: {
      patient: patientSchema
    },
    required: ["patient"]
  },
  medications: {
    type: "object",
    additionalProperties: false,
    properties: {
      medications: { type: "array", items: medicationItemSchema }
    },
    required: ["medications"]
  },
  clinicalContext: {
    type: "object",
    additionalProperties: false,
    properties: {
      abbreviations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            abbreviation: { type: "string" },
            likely_expansion: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          },
          required: ["abbreviation", "likely_expansion", "confidence"]
        }
      },
      allergies: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            substance: { type: "string" },
            reaction: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          },
          required: ["substance", "reaction", "confidence"]
        }
      },
      clinical_context: {
        type: "object",
        additionalProperties: false,
        properties: {
          diagnoses: { type: "array", items: { type: "string" } },
          symptoms: { type: "array", items: { type: "string" } },
          vitals: { type: "array", items: { type: "string" } },
          investigations: { type: "array", items: { type: "string" } },
          advice: { type: "array", items: { type: "string" } },
          referrals: { type: "array", items: { type: "string" } }
        },
        required: ["diagnoses", "symptoms", "vitals", "investigations", "advice", "referrals"]
      },
      non_medication_text: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            text: { type: "string" },
            confidence: { type: "number", minimum: 0, maximum: 1 }
          },
          required: ["label", "text", "confidence"]
        }
      },
      follow_up_instructions: { type: "array", items: { type: "string" } },
      global_warnings: { type: "array", items: { type: "string" } }
    },
    required: [
      "abbreviations",
      "allergies",
      "clinical_context",
      "non_medication_text",
      "follow_up_instructions",
      "global_warnings"
    ]
  },
  synthesis: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" }
    },
    required: ["summary"]
  }
};
