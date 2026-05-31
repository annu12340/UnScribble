import { DEFAULT_OPTIONS } from "./chart-constants.js";
import { formatHour } from "./chart-data.js";
import {
  chartLib,
  clearLoadingState,
  destroyChart,
  ensureCanvas,
  showEmptyState,
} from "./chart-dom.js";

function baseTitle(title) {
  return {
    display: Boolean(title),
    text: title,
    font: { size: 13, weight: "700", family: "Outfit, sans-serif" },
    color: "#065f46",
    padding: { bottom: 10 },
  };
}

function baseTooltip(extra = {}) {
  return {
    titleFont: { size: 12, weight: "700" },
    bodyFont: { size: 11 },
    padding: 10,
    cornerRadius: 10,
    ...extra,
  };
}

function makeChart(Chart, canvasId, config, instances) {
  const canvas = ensureCanvas(canvasId);
  if (!canvas) return null;

  config.options = { ...config.options, animation: false };
  const chart = new Chart(canvas, config);
  instances[canvasId] = chart;
  return chart;
}

function refLine(label, value, spanEnd, dash, color) {
  return {
    label,
    data: [
      { x: 0, y: value },
      { x: spanEnd, y: value },
    ],
    borderColor: color,
    borderDash: dash,
    borderWidth: 1.5,
    pointRadius: 0,
    pointHoverRadius: 0,
    fill: false,
    tension: 0,
  };
}

function clockTicks() {
  return {
    stepSize: 6,
    callback: (value) => formatHour(value),
    color: "#065f46",
    font: { weight: "600", size: 10 },
  };
}

/**
 * Smooth concentration/effect curve over time.
 * @param {{ points: Array<{x:number,y:number}>, markers?: Array<{x:number,y:number,label:string}> }} data
 */
export function createValueLine(
  instances,
  canvasId,
  data,
  title,
  options = {},
) {
  const Chart = chartLib();
  if (!Chart) return;

  clearLoadingState(canvasId);
  destroyChart(instances, canvasId);

  if (!data || !data.points || !data.points.length) {
    showEmptyState(
      instances,
      canvasId,
      title,
      `${title}: timing data not available for this drug.`,
    );
    return;
  }

  const { color = "#0ea5e9", xUnit = "elapsed", yMax } = options;
  const ticks =
    xUnit === "clock"
      ? clockTicks()
      : {
          callback: (value) => `${value}h`,
          color: "#065f46",
          font: { weight: "600", size: 10 },
        };

  const datasets = [
    {
      label: title,
      data: data.points,
      borderColor: color,
      backgroundColor: `${color}22`,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2.5,
    },
  ];

  if (data.markers && data.markers.length) {
    datasets.push({
      label: "Key points",
      data: data.markers,
      showLine: false,
      pointRadius: 6,
      pointHoverRadius: 9,
      pointBackgroundColor: "#e11d48",
      pointBorderColor: "#fff",
      pointBorderWidth: 2,
    });
  }

  const spanEnd = options.xMax ?? data.points[data.points.length - 1].x;
  const hasThresholds = data.mec != null && data.toxic != null;
  if (hasThresholds) {
    datasets.push(
      refLine("Min. effective", data.mec, spanEnd, [4, 4], "#059669"),
    );
    datasets.push(
      refLine("Toxic level", data.toxic, spanEnd, [6, 6], "#e11d48"),
    );
  }

  const computedMax = hasThresholds
    ? Math.ceil(
        (Math.max(...data.points.map((p) => p.y), data.toxic) + 12) / 10,
      ) * 10
    : yMax;

  makeChart(
    Chart,
    canvasId,
    {
      type: "line",
      data: { datasets },
      options: {
        ...DEFAULT_OPTIONS,
        scales: {
          x: {
            type: "linear",
            min: 0,
            max: options.xMax,
            ticks,
            grid: { color: "rgba(5, 150, 105, 0.08)" },
          },
          y: {
            beginAtZero: true,
            max: computedMax,
            ticks: { display: false },
            grid: { color: "rgba(5, 150, 105, 0.08)" },
          },
        },
        plugins: {
          legend: hasThresholds
            ? {
                display: true,
                position: "bottom",
                labels: {
                  filter: (item) => item.text && item.text !== "Key points",
                  boxWidth: 24,
                  font: { size: 10, weight: "600" },
                  color: "#065f46",
                },
              }
            : { display: false },
          title: baseTitle(title),
          tooltip: baseTooltip({
            callbacks: {
              label(context) {
                const point = context.raw;
                if (point.label) return point.label;
                return `${context.parsed.y}% at ${xUnit === "clock" ? formatHour(point.x) : `${point.x}h`}`;
              },
            },
          }),
        },
      },
    },
    instances,
  );
}
