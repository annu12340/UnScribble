export const PALETTE = {
  emerald: ["#10b981", "#059669", "#047857", "#065f46", "#34d399", "#6ee7b7"],
  amber: ["#f59e0b", "#d97706", "#b45309"],
  rose: ["#f43f5e", "#e11d48", "#be123c"],
  sky: ["#0ea5e9", "#0284c7", "#0369a1"],
  violet: ["#8b5cf6", "#7c3aed", "#6d28d9"]
};

export const DEFAULT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: "nearest", intersect: true }
};

export const OVERVIEW_CHART_IDS = ["dosageScheduleGraph", "medProfileGraph"];
export const INSIGHT_CHART_IDS = [
  "regulatoryGraph",
  "ingredientGraph",
  "interactionGraph",
  "sideEffectsGraph",
  "marketStatusGraph"
];
export const ALL_CHART_IDS = [...OVERVIEW_CHART_IDS, ...INSIGHT_CHART_IDS];
