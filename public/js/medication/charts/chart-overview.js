import { buildProfileRows, buildScheduleRows } from "./chart-data.js";
import { chartLib } from "./chart-dom.js";
import { createLine, createRadar } from "./chart-factory.js";

export function renderOverviewCharts(med, schedule, instances) {
  if (!chartLib()) return;

  createLine(
    instances,
    "dosageScheduleGraph",
    buildScheduleRows(schedule) || [],
    "Daily dosing rhythm"
  );

  createRadar(
    instances,
    "medProfileGraph",
    buildProfileRows(med),
    "Medication intelligence profile"
  );
}
