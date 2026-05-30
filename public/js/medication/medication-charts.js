/** Chart.js visualizations for medication detail sections (barrel export). */

export { ALL_CHART_IDS, INSIGHT_CHART_IDS, OVERVIEW_CHART_IDS } from "./charts/chart-constants.js";
export { setChartsLoading, destroyChart } from "./charts/chart-dom.js";
export { renderOverviewCharts } from "./charts/chart-overview.js";
export { renderInsightCharts } from "./charts/chart-insights.js";
export { syncChartReveal } from "./charts/chart-animate.js";

import { ALL_CHART_IDS } from "./charts/chart-constants.js";
import { destroyChart } from "./charts/chart-dom.js";
import { renderOverviewCharts } from "./charts/chart-overview.js";
import { renderInsightCharts } from "./charts/chart-insights.js";

export function renderMedicationCharts(med, schedule, instances) {
  renderOverviewCharts(med, schedule, instances);
  renderInsightCharts(med, instances);
}

export function destroyAllCharts(instances) {
  ALL_CHART_IDS.forEach((id) => destroyChart(instances, id));
}
