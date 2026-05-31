import { buildPkCurvePoints, buildSteadyStatePoints } from "./chart-data.js";
import { chartLib } from "./chart-dom.js";
import { createValueLine } from "./chart-factory.js";
import { renderInteractionDiagram } from "./interaction-diagram.js";
import { renderWorldGlobe } from "./world-globe.js";

export function renderInsightCharts(med, schedule, instances) {
  if (!chartLib()) {
    console.warn("Chart.js is not loaded — charts skipped.");
    return;
  }

  const pk = med.pharmacokinetics || {};

  createValueLine(
    instances,
    "pkCurveGraph",
    buildPkCurvePoints(pk),
    "Single dose effect",
    {
      color: "#0ea5e9",
      xUnit: "elapsed",
      xMax: pk.duration_hours || undefined,
      yMax: 110,
    },
  );

  createValueLine(
    instances,
    "doseEffectGraph",
    buildSteadyStatePoints(pk, schedule),
    "Effect across the day",
    {
      color: "#8b5cf6",
      xUnit: "clock",
      xMax: 24,
    },
  );

  renderInteractionDiagram(med, med.medication_name || "");
  renderWorldGlobe(med);
}
