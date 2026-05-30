import { PALETTE, DEFAULT_OPTIONS } from "./chart-constants.js";
import {
  chartLib,
  clearLoadingState,
  destroyChart,
  ensureCanvas,
  showDetail,
  showEmptyState
} from "./chart-dom.js";

function basePlugins(title, legend = true) {
  return {
    legend: legend
      ? {
          position: "bottom",
          labels: {
            font: { size: 11, weight: "600", family: "Manrope, sans-serif" },
            padding: 12,
            usePointStyle: true,
            boxWidth: 8
          },
          onClick(_event, legendItem, legendRef) {
            const chart = legendRef.chart;
            const index = legendItem.index;
            if (typeof chart.toggleDataVisibility === "function") {
              chart.toggleDataVisibility(index);
            }
            chart.update();
          }
        }
      : { display: false },
    title: {
      display: Boolean(title),
      text: title,
      font: { size: 13, weight: "700", family: "Outfit, sans-serif" },
      color: "#065f46",
      padding: { bottom: 10 }
    },
    tooltip: {
      titleFont: { size: 12, weight: "700" },
      bodyFont: { size: 11 },
      padding: 10,
      cornerRadius: 10
    }
  };
}

function attachSegmentClick(chart, canvasId, rows, noteField = "detail") {
  chart.options.onClick = (_event, elements) => {
    if (!elements.length) return;
    const row = rows[elements[0].index];
    if (!row) return;
    showDetail(canvasId, row.label, row.items || [], row[noteField] || row.detail || "");
  };

  chart.options.onHover = (_event, elements) => {
    chart.canvas.style.cursor = elements.length ? "pointer" : "default";
  };
}

function makeChart(Chart, canvasId, config, instances) {
  const canvas = ensureCanvas(canvasId);
  if (!canvas) return null;

  config.options = {
    ...config.options,
    animation: false
  };

  const chart = new Chart(canvas, config);
  instances[canvasId] = chart;
  return chart;
}

export function createRadar(instances, canvasId, rows, title, fill = "rgba(16, 185, 129, 0.24)") {
  const Chart = chartLib();
  if (!Chart) return;

  clearLoadingState(canvasId);
  destroyChart(instances, canvasId);

  const filtered = (rows || []).filter((row) => row.value > 0);
  if (filtered.length < 3) {
    showEmptyState(instances, canvasId, title, `${title}: Not enough dimensions to chart yet.`);
    return;
  }

  const chart = makeChart(
    Chart,
    canvasId,
    {
      type: "radar",
      data: {
        labels: filtered.map((row) => row.label),
        datasets: [
          {
            label: title,
            data: filtered.map((row) => row.value),
            backgroundColor: fill,
            borderColor: "#059669",
            borderWidth: 2,
            pointBackgroundColor: PALETTE.emerald,
            pointRadius: 4,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        ...DEFAULT_OPTIONS,
        scales: {
          r: {
            beginAtZero: true,
            suggestedMax: 100,
            ticks: { stepSize: 20, backdropColor: "transparent", display: false },
            grid: { color: "rgba(5, 150, 105, 0.12)" },
            angleLines: { color: "rgba(5, 150, 105, 0.12)" },
            pointLabels: { font: { size: 10, weight: "600" }, color: "#065f46" }
          }
        },
        plugins: {
          ...basePlugins(title, false),
          tooltip: {
            callbacks: {
              label(context) {
                const row = filtered[context.dataIndex];
                return `${row.label}: ${row.value}% · ${row.detail || ""}`;
              }
            }
          }
        }
      }
    },
    instances
  );

  if (chart) attachSegmentClick(chart, canvasId, filtered);
}

export function createPolarArea(instances, canvasId, rows, title) {
  const Chart = chartLib();
  if (!Chart) return;

  clearLoadingState(canvasId);
  destroyChart(instances, canvasId);

  const filtered = (rows || []).filter((row) => row.value > 0);
  if (!filtered.length) {
    showEmptyState(instances, canvasId, title, `${title}: No signals detected.`);
    return;
  }

  const colors = filtered.map(
    (row, index) => row.color || PALETTE.emerald[index % PALETTE.emerald.length]
  );

  const chart = makeChart(
    Chart,
    canvasId,
    {
      type: "polarArea",
      data: {
        labels: filtered.map((row) => row.label),
        datasets: [
          {
            data: filtered.map((row) => row.value),
            backgroundColor: colors.map((color) => `${color}cc`),
            borderColor: "#ffffff",
            borderWidth: 2
          }
        ]
      },
      options: {
        ...DEFAULT_OPTIONS,
        scales: {
          r: {
            beginAtZero: true,
            grid: { color: "rgba(5, 150, 105, 0.1)" },
            ticks: { stepSize: 1, backdropColor: "transparent" }
          }
        },
        plugins: {
          ...basePlugins(title),
          tooltip: {
            callbacks: {
              label(context) {
                const row = filtered[context.dataIndex];
                return `${row.label}: ${row.value} · ${row.detail || ""}`;
              }
            }
          }
        }
      }
    },
    instances
  );

  if (chart) attachSegmentClick(chart, canvasId, filtered);
}

export function createBubble(instances, canvasId, rows, title) {
  const Chart = chartLib();
  if (!Chart) return;

  clearLoadingState(canvasId);
  destroyChart(instances, canvasId);

  const filtered = (rows || []).filter((row) => row.value > 0);
  if (!filtered.length) {
    showEmptyState(instances, canvasId, title, `${title}: No ingredient signals found.`);
    return;
  }

  const groups = [...new Set(filtered.map((row) => row.group || "Item"))];
  const datasets = groups.map((group, groupIndex) => {
    const color = filtered.find((row) => row.group === group)?.color || PALETTE.emerald[groupIndex];
    return {
      label: group,
      data: filtered
        .filter((row) => row.group === group)
        .map((row, index) => ({
          x: groupIndex + 1,
          y: index + 1,
          r: Math.max(8, Math.min(22, row.value * 10)),
          label: row.label,
          items: row.items
        })),
      backgroundColor: `${color}88`,
      borderColor: color,
      borderWidth: 2
    };
  });

  const chart = makeChart(
    Chart,
    canvasId,
    {
      type: "bubble",
      data: { datasets },
      options: {
        ...DEFAULT_OPTIONS,
        scales: {
          x: {
            min: 0.5,
            max: groups.length + 0.5,
            ticks: {
              callback(value) {
                return groups[Math.round(Number(value)) - 1] || "";
              },
              color: "#065f46",
              font: { weight: "600", size: 10 }
            },
            grid: { display: false }
          },
          y: { display: false, min: 0, max: Math.max(...filtered.map((_, i) => i + 2), 3) },
          r: { display: false }
        },
        plugins: {
          ...basePlugins(title),
          tooltip: {
            callbacks: {
              label(context) {
                const point = context.raw;
                return point.label || context.dataset.label;
              }
            }
          }
        }
      }
    },
    instances
  );

  if (chart) {
    chart.options.onClick = (_event, elements) => {
      if (!elements.length) return;
      const element = elements[0];
      const point = chart.data.datasets[element.datasetIndex].data[element.index];
      showDetail(
        canvasId,
        point.label || chart.data.datasets[element.datasetIndex].label,
        point.items || [point.label]
      );
    };
  }
}

export function createLine(instances, canvasId, rows, title, color = "#059669") {
  const Chart = chartLib();
  if (!Chart) return;

  clearLoadingState(canvasId);
  destroyChart(instances, canvasId);

  const filtered = (rows || []).filter((row) => row.value > 0);
  if (!filtered.length) {
    showEmptyState(instances, canvasId, title, `${title}: No schedule times parsed yet.`);
    return;
  }

  const chart = makeChart(
    Chart,
    canvasId,
    {
      type: "line",
      data: {
        labels: filtered.map((row) => row.label),
        datasets: [
          {
            label: "Dose intensity",
            data: filtered.map(() => 1),
            borderColor: color,
            backgroundColor: `${color}22`,
            fill: true,
            tension: 0.35,
            pointRadius: 6,
            pointHoverRadius: 9,
            pointBackgroundColor: color,
            pointBorderColor: "#fff",
            pointBorderWidth: 2
          }
        ]
      },
      options: {
        ...DEFAULT_OPTIONS,
        plugins: {
          ...basePlugins(title, false),
          tooltip: {
            callbacks: {
              label(context) {
                const row = filtered[context.dataIndex];
                return row.detail || row.label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 1.4,
            display: false,
            grid: { display: false }
          },
          x: {
            grid: { color: "rgba(5, 150, 105, 0.08)" },
            ticks: { color: "#065f46", font: { weight: "600", size: 10 } }
          }
        }
      }
    },
    instances
  );

  if (chart) attachSegmentClick(chart, canvasId, filtered);
}

export function createVerticalBar(instances, canvasId, rows, title, palette = PALETTE.emerald) {
  const Chart = chartLib();
  if (!Chart) return;

  clearLoadingState(canvasId);
  destroyChart(instances, canvasId);

  const filtered = (rows || []).filter((row) => row.value > 0);
  if (!filtered.length) {
    showEmptyState(instances, canvasId, title, `${title}: No data to compare.`);
    return;
  }

  const colors = filtered.map((row, index) => row.color || palette[index % palette.length]);
  const chart = makeChart(
    Chart,
    canvasId,
    {
      type: "bar",
      data: {
        labels: filtered.map((row) => row.label),
        datasets: [
          {
            label: title,
            data: filtered.map((row) => row.value),
            backgroundColor: colors,
            borderRadius: 10,
            borderSkipped: false
          }
        ]
      },
      options: {
        ...DEFAULT_OPTIONS,
        plugins: {
          ...basePlugins("", false),
          tooltip: {
            callbacks: {
              label(context) {
                const row = filtered[context.dataIndex];
                return `${row.label}: ${row.value} · ${row.detail || ""}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: "#065f46" },
            grid: { color: "rgba(5, 150, 105, 0.08)" }
          },
          x: {
            grid: { display: false },
            ticks: { color: "#065f46", font: { weight: "600", size: 10 } }
          }
        }
      }
    },
    instances
  );

  if (chart) attachSegmentClick(chart, canvasId, filtered);
}

export function createGroupedBar(instances, canvasId, datasets, labels, title) {
  const Chart = chartLib();
  if (!Chart) return;

  clearLoadingState(canvasId);
  destroyChart(instances, canvasId);

  const hasValues = datasets.some((dataset) => dataset.data.some((value) => value > 0));
  if (!hasValues) {
    showEmptyState(instances, canvasId, title, `${title}: No side-effect categories charted yet.`);
    return;
  }

  makeChart(
    Chart,
    canvasId,
    {
      type: "bar",
      data: {
        labels,
        datasets: datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: dataset.backgroundColor || PALETTE.amber[index],
          borderRadius: 8,
          borderSkipped: false
        }))
      },
      options: {
        ...DEFAULT_OPTIONS,
        plugins: basePlugins(title),
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: "rgba(5, 150, 105, 0.08)" }
          },
          x: { grid: { display: false } }
        }
      }
    },
    instances
  );
}

export function createDoughnut(instances, canvasId, rows, title) {
  const Chart = chartLib();
  if (!Chart) return;

  clearLoadingState(canvasId);
  destroyChart(instances, canvasId);

  const filtered = (rows || []).filter((row) => row.value > 0);
  if (!filtered.length) {
    showEmptyState(instances, canvasId, title, `${title}: No categories to visualize.`);
    return;
  }

  const colors = filtered.map((row, index) => row.color || PALETTE.sky[index % PALETTE.sky.length]);

  const chart = makeChart(
    Chart,
    canvasId,
    {
      type: "doughnut",
      data: {
        labels: filtered.map((row) => row.label),
        datasets: [
          {
            data: filtered.map((row) => row.value),
            backgroundColor: colors,
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverOffset: 12
          }
        ]
      },
      options: {
        ...DEFAULT_OPTIONS,
        cutout: "62%",
        plugins: {
          ...basePlugins(title),
          tooltip: {
            callbacks: {
              label(context) {
                const row = filtered[context.dataIndex];
                return `${row.label}: ${row.value} · ${row.detail || ""}`;
              }
            }
          }
        }
      }
    },
    instances
  );

  if (chart) attachSegmentClick(chart, canvasId, filtered);
}
