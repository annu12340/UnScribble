/**
 * @typedef {import("./medication-details-shared.js").MedicationRecord} MedicationRecord
 */

/** Renders extended medication insight sections (regulatory, ingredients, etc.). */

/**
 * @param {MedicationRecord} med
 * @param {Record<string, HTMLElement | null>} els
 * @param {(el: HTMLElement | null, values: unknown[], emptyText: string) => void} renderTagList
 */
export function renderInsightSections(med, els, renderTagList) {
  const regulatory = med.regulatory_status || {};
  const regulatoryLists = {
    fullyBannedCountries: regulatory.fully_banned_countries || [],
    prescriptionOnlyCountries: regulatory.prescription_only_countries || [],
    restrictedAgeGroups: regulatory.restricted_age_groups || [],
    blackBoxWarnings: regulatory.black_box_warnings || [],
    withdrawnFormulations: regulatory.withdrawn_formulations || [],
    regulatoryAlerts: regulatory.recent_regulatory_alerts || []
  };

  const hasRegulatoryInfo = Object.values(regulatoryLists).some((list) => list.length > 0);
  if (els.medRegulatorySummary) {
    els.medRegulatorySummary.textContent =
      regulatory.summary ||
      (hasRegulatoryInfo
        ? "Regulatory information is available below."
        : "No regulatory notes are available for this medication.");
  }
  renderTagList(
    els.medFullyBannedCountries,
    regulatoryLists.fullyBannedCountries,
    "No countries listed."
  );
  renderTagList(
    els.medPrescriptionOnlyCountries,
    regulatoryLists.prescriptionOnlyCountries,
    "No countries listed."
  );
  renderTagList(
    els.medRestrictedAgeGroups,
    regulatoryLists.restrictedAgeGroups,
    "No age restrictions identified."
  );
  renderTagList(
    els.medBlackBoxWarnings,
    regulatoryLists.blackBoxWarnings,
    "No black-box warnings identified."
  );
  renderTagList(
    els.medWithdrawnFormulations,
    regulatoryLists.withdrawnFormulations,
    "No withdrawn formulations listed."
  );
  renderTagList(
    els.medRegulatoryAlerts,
    regulatoryLists.regulatoryAlerts,
    "No recent alerts listed."
  );

  const ingredientData = med.ingredient_analysis || {};
  const activeIngredient =
    med.active_ingredient || ingredientData.active_ingredient || med.medication_name || "—";
  const equivalentBrands = med.equivalent_brands || ingredientData.equivalent_brands || [];
  const combinationDrugs = med.combination_drugs || ingredientData.combination_drugs || [];
  const duplicateWarnings =
    med.duplicate_ingredient_warnings || ingredientData.duplicate_ingredient_warnings || [];

  if (els.medActiveIngredient) els.medActiveIngredient.textContent = activeIngredient;
  renderTagList(els.medEquivalentBrands, equivalentBrands, "None identified.");
  renderTagList(els.medCombinationDrugs, combinationDrugs, "None identified.");
  renderTagList(
    els.medDuplicateIngredientWarnings,
    duplicateWarnings,
    "No duplicate ingredient warnings."
  );

  const interactions = med.drug_interactions || {};
  const interactingMeds = Array.isArray(interactions.common_interacting_medications)
    ? interactions.common_interacting_medications
    : [];
  const foodSupplements = Array.isArray(interactions.food_supplements_to_avoid)
    ? interactions.food_supplements_to_avoid
    : [];
  const contraindications = Array.isArray(interactions.contraindicated_conditions)
    ? interactions.contraindicated_conditions
    : [];

  renderTagList(
    els.medCommonInteractingMedications,
    interactingMeds,
    "No interacting medications identified."
  );
  renderTagList(
    els.medFoodSupplementAvoidance,
    foodSupplements,
    "No foods or supplements identified."
  );
  renderTagList(
    els.medContraindicatedConditions,
    contraindications,
    "No contraindicated conditions identified."
  );

  const safetyFlags = med.patient_safety_flags || {};
  if (els.medPregnancyLactationCategory) {
    els.medPregnancyLactationCategory.textContent = safetyFlags.pregnancy_lactation_category || "—";
  }
  if (els.medRenalHepaticDosingGuidance) {
    els.medRenalHepaticDosingGuidance.textContent =
      safetyFlags.renal_hepatic_dosing_guidance || "—";
  }
  if (els.medAgePrecautions) {
    els.medAgePrecautions.textContent = safetyFlags.age_based_precautions || "—";
  }
  if (els.medAllergyRiskSummary) {
    els.medAllergyRiskSummary.textContent = safetyFlags.allergy_risk_summary || "—";
  }

  const sideEffects = med.side_effects || {};
  const commonSideEffects = Array.isArray(sideEffects.common_side_effects)
    ? sideEffects.common_side_effects
    : [];
  const seriousAdverseEvents = Array.isArray(sideEffects.serious_adverse_events)
    ? sideEffects.serious_adverse_events
    : [];

  renderTagList(els.medCommonSideEffects, commonSideEffects, "No common side effects identified.");
  renderTagList(
    els.medSeriousAdverseEvents,
    seriousAdverseEvents,
    "No serious adverse events identified."
  );
  if (els.medMonitoringNotes) {
    els.medMonitoringNotes.textContent = sideEffects.monitoring_notes || "—";
  }

  const administration = med.administration || {};
  if (els.medStorageInstructions) {
    els.medStorageInstructions.textContent = administration.storage_instructions || "—";
  }
  if (els.medMissedDoseGuidance) {
    els.medMissedDoseGuidance.textContent = administration.missed_dose_guidance || "—";
  }

  const marketStatus = med.market_status || {};
  const recentRecalls = Array.isArray(marketStatus.recent_recalls)
    ? marketStatus.recent_recalls
    : [];
  const countryRestrictions = Array.isArray(marketStatus.country_restrictions)
    ? marketStatus.country_restrictions
    : [];
  const withdrawalHistory = Array.isArray(marketStatus.withdrawal_history)
    ? marketStatus.withdrawal_history
    : [];

  renderTagList(els.medRecentRecalls, recentRecalls, "No recent recalls identified.");
  renderTagList(
    els.medCountryRestrictions,
    countryRestrictions,
    "No country restrictions identified."
  );
  renderTagList(els.medWithdrawalHistory, withdrawalHistory, "No withdrawal history identified.");
}
