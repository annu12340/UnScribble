import { PALETTE } from "./chart-constants.js";
import { countRows, ingredientBubbleRows } from "./chart-data.js";
import { chartLib } from "./chart-dom.js";
import { createBubble, createPolarArea, createRadar, createVerticalBar } from "./chart-factory.js";

export function renderInsightCharts(med, instances) {
  if (!chartLib()) {
    console.warn("Chart.js is not loaded — charts skipped.");
    return;
  }

  const regulatory = med.regulatory_status || {};
  const ingredient = med.ingredient_analysis || {};
  const interactions = med.drug_interactions || {};
  const sideEffects = med.side_effects || {};
  const market = med.market_status || {};

  const regulatoryLists = {
    fullyBannedCountries: regulatory.fully_banned_countries || [],
    prescriptionOnlyCountries: regulatory.prescription_only_countries || [],
    restrictedAgeGroups: regulatory.restricted_age_groups || [],
    blackBoxWarnings: regulatory.black_box_warnings || [],
    withdrawnFormulations: regulatory.withdrawn_formulations || [],
    regulatoryAlerts: regulatory.recent_regulatory_alerts || []
  };

  createPolarArea(
    instances,
    "regulatoryGraph",
    countRows([
      ["Fully banned", regulatoryLists.fullyBannedCountries, PALETTE.rose[0]],
      ["Rx-only markets", regulatoryLists.prescriptionOnlyCountries, PALETTE.emerald[0]],
      ["Age restrictions", regulatoryLists.restrictedAgeGroups, PALETTE.amber[0]],
      ["Black-box warnings", regulatoryLists.blackBoxWarnings, PALETTE.rose[1]],
      ["Withdrawn forms", regulatoryLists.withdrawnFormulations, PALETTE.violet[0]],
      ["Recent alerts", regulatoryLists.regulatoryAlerts, PALETTE.sky[0]]
    ]),
    "Regulatory footprint"
  );

  const equivalentBrands = ingredient.equivalent_brands || med.equivalent_brands || [];
  const combinationDrugs = ingredient.combination_drugs || med.combination_drugs || [];
  const duplicateWarnings =
    ingredient.duplicate_ingredient_warnings || med.duplicate_ingredient_warnings || [];

  createBubble(
    instances,
    "ingredientGraph",
    ingredientBubbleRows(equivalentBrands, combinationDrugs, duplicateWarnings),
    "Ingredient landscape"
  );

  const interactingMeds = interactions.common_interacting_medications || [];
  const foodSupplements = interactions.food_supplements_to_avoid || [];
  const contraindications = interactions.contraindicated_conditions || [];

  createRadar(
    instances,
    "interactionGraph",
    countRows([
      ["Drug interactions", interactingMeds, PALETTE.sky[0]],
      ["Food / supplements", foodSupplements, PALETTE.amber[0]],
      ["Contraindications", contraindications, PALETTE.rose[0]]
    ]),
    "Interaction profile",
    "rgba(14, 165, 233, 0.22)"
  );

  const commonSideEffects = sideEffects.common_side_effects || [];
  const seriousAdverseEvents = sideEffects.serious_adverse_events || [];

  createPolarArea(
    instances,
    "sideEffectsGraph",
    countRows([
      ["Common effects", commonSideEffects, PALETTE.amber[0]],
      ["Serious events", seriousAdverseEvents, PALETTE.rose[0]]
    ]),
    "Side-effect spectrum"
  );

  createVerticalBar(
    instances,
    "marketStatusGraph",
    countRows([
      ["Recalls", market.recent_recalls || [], PALETTE.rose[0]],
      ["Restrictions", market.country_restrictions || [], PALETTE.amber[0]],
      ["Withdrawals", market.withdrawal_history || [], PALETTE.violet[0]]
    ]),
    "Market activity",
    PALETTE.violet
  );
}
