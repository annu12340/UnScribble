"use strict";

const config = require("../config");
const { callResponses, visionContent } = require("../nim-client");
const log = require("../logger");

// Drug target protein database (simplified example)
const DRUG_TARGETS = {
  "lisinopril": { protein: "ACE", sequence: "MKLKHLVPAS..." },
  "atorvastatin": { protein: "HMG-CoA reductase", sequence: "MGSSHHHHHH..." },
  "metformin": { protein: "AMPK", sequence: "MADEEKLPPG..." },
  "omeprazole": { protein: "H+/K+ ATPase", sequence: "MGDKKKKKKK..." },
  // Add more drug-protein mappings
};

/**
 * For a given medication, predict the 3D structure of its target protein
 * and provide mechanism of action explanation
 */
async function predictProteinMechanism(medicationName) {
  const drugKey = medicationName.toLowerCase().trim();
  const target = DRUG_TARGETS[drugKey];
  
  if (!target) {
    log.info("protein-mechanism", "no target protein found", { medication: medicationName });
    return {
      medication: medicationName,
      hasProteinData: false,
      message: "Protein target data not available for this medication"
    };
  }

  try {
    // Call NVIDIA ESMFold NIM to predict protein structure
    const proteinStructure = await predictProteinStructure(target.sequence);
    
    // Get mechanism explanation
    const mechanism = await explainMechanism(medicationName, target.protein);
    
    return {
      medication: medicationName,
      hasProteinData: true,
      targetProtein: target.protein,
      proteinStructure: proteinStructure,
      mechanism: mechanism,
      visualizationReady: true
    };
  } catch (error) {
    log.error("protein-mechanism", "prediction failed", {
      medication: medicationName,
      error: error.message
    });
    return {
      medication: medicationName,
      hasProteinData: false,
      error: error.message
    };
  }
}

/**
 * Call ESMFold NIM to predict protein structure from amino acid sequence
 */
async function predictProteinStructure(sequence) {
  // This would call the actual ESMFold NIM endpoint
  // For now, returning mock structure
  
  log.info("protein-mechanism", "calling ESMFold", { 
    sequenceLength: sequence.length 
  });
  
  // In production, this would be:
  // const response = await fetch(`${config.baseUrl}/esmfold`, {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${config.apiKey}`,
  //     "Content-Type": "application/json"
  //   },
  //   body: JSON.stringify({ sequence })
  // });
  
  return {
    pdbData: "MOCK_PDB_DATA", // Would contain actual PDB format structure
    confidence: 0.92,
    format: "pdb"
  };
}

/**
 * Generate explanation of how the drug interacts with the protein
 */
async function explainMechanism(medication, targetProtein) {
  // Use mock data if no API key or in mock mode
  if (config.mock || !config.apiKey) {
    log.info("protein-mechanism", "using mock mechanism explanation", { medication });
    return getMockMechanism(medication, targetProtein);
  }
  
  const instructions = `You are a pharmacology expert. Explain in simple terms how ${medication} works by interacting with ${targetProtein}. Keep it under 100 words and accessible to patients.`;
  
  const content = visionContent(
    `Explain the mechanism of action for ${medication} targeting ${targetProtein}.`,
    null
  );
  
  const schema = {
    type: "object",
    properties: {
      mechanism: {
        type: "string",
        description: "Simple explanation of drug mechanism"
      },
      bindingSite: {
        type: "string",
        description: "Where the drug binds on the protein"
      },
      effect: {
        type: "string",
        description: "What happens when drug binds"
      }
    },
    required: ["mechanism", "bindingSite", "effect"],
    additionalProperties: false
  };
  
  const { result } = await callResponses({
    instructions,
    content,
    schemaName: "mechanism_explanation",
    schema,
    maxTokens: 1000
  });
  
  return result;
}

/**
 * Mock mechanism explanations for demo purposes
 */
function getMockMechanism(medication, targetProtein) {
  const mechanisms = {
    "lisinopril": {
      mechanism: "Lisinopril blocks the ACE enzyme, which normally converts angiotensin I to angiotensin II. By preventing this conversion, blood vessels relax and widen, reducing blood pressure and making it easier for the heart to pump blood.",
      bindingSite: "Active site of the ACE enzyme, specifically the zinc-binding pocket",
      effect: "Blood vessels dilate, blood pressure decreases, and cardiac workload is reduced"
    },
    "atorvastatin": {
      mechanism: "Atorvastatin inhibits HMG-CoA reductase, the enzyme responsible for cholesterol production in the liver. By blocking this enzyme, the liver produces less cholesterol and removes more LDL cholesterol from the blood.",
      bindingSite: "Active site of HMG-CoA reductase enzyme",
      effect: "Cholesterol production decreases, LDL levels drop, and cardiovascular risk is reduced"
    },
    "metformin": {
      mechanism: "Metformin activates AMPK enzyme, which regulates cellular energy. This reduces glucose production in the liver and increases insulin sensitivity in muscles, helping cells absorb glucose from the bloodstream more effectively.",
      bindingSite: "Allosteric binding site on AMPK enzyme",
      effect: "Blood glucose levels decrease, insulin sensitivity improves, and cellular energy metabolism is optimized"
    },
    "omeprazole": {
      mechanism: "Omeprazole irreversibly blocks the H+/K+ ATPase pump in stomach cells. This pump is responsible for secreting acid into the stomach. By blocking it, acid production is significantly reduced.",
      bindingSite: "Cysteine residues on the H+/K+ ATPase pump",
      effect: "Stomach acid production decreases, allowing ulcers to heal and reducing heartburn symptoms"
    }
  };
  
  const key = medication.toLowerCase();
  return mechanisms[key] || {
    mechanism: `${medication} interacts with ${targetProtein} to produce its therapeutic effect. The drug binds to specific sites on the protein, modulating its activity.`,
    bindingSite: `Active or allosteric site on ${targetProtein}`,
    effect: "Therapeutic effect through protein modulation"
  };
}

module.exports = {
  id: "protein_mechanism",
  label: "Protein Mechanism",
  predictProteinMechanism
};
