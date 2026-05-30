export function chartLib() {
  if (typeof window !== "undefined" && window.Chart) return window.Chart;
  return null;
}

export function chartContainer(canvasId) {
  const canvas = document.getElementById(canvasId);
  return (
    canvas?.closest(".section-chart-container") ||
    document.querySelector(`.section-chart-container[data-chart-id="${canvasId}"]`) ||
    null
  );
}

export function ensureCanvas(canvasId) {
  let canvas = document.getElementById(canvasId);
  const container = chartContainer(canvasId);
  if (!container) return canvas;

  container.querySelector(".graph-empty")?.remove();

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = canvasId;
    container.prepend(canvas);
  }

  canvas.hidden = false;
  return canvas;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function destroyChart(instances, chartId) {
  if (instances[chartId]) {
    instances[chartId].destroy();
    delete instances[chartId];
  }
}

export function showEmptyState(instances, canvasId, title, message) {
  destroyChart(instances, canvasId);
  clearLoadingState(canvasId);

  const container = chartContainer(canvasId);
  if (!container) return;

  const canvas = document.getElementById(canvasId);
  if (canvas) canvas.hidden = true;

  let empty = container.querySelector(".graph-empty");
  if (!empty) {
    empty = document.createElement("p");
    empty.className = "graph-empty";
    container.append(empty);
  }
  empty.hidden = false;
  empty.textContent = message || `${title}: No data available yet.`;
}

function detailEl(canvasId) {
  const container = chartContainer(canvasId);
  if (!container) return null;

  let detail = container.querySelector(".chart-detail-panel");
  if (!detail) {
    detail = document.createElement("div");
    detail.className = "chart-detail-panel";
    detail.setAttribute("role", "status");
    detail.setAttribute("aria-live", "polite");
    detail.textContent = "Hover or click a segment to explore details.";
    container.append(detail);
  }
  return detail;
}

export function showDetail(canvasId, title, items, note = "") {
  const panel = detailEl(canvasId);
  if (!panel) return;

  if (!items?.length) {
    panel.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(note || "No items in this category.")}</span>`;
    return;
  }

  const list = items.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("");
  panel.innerHTML = `<strong>${escapeHtml(title)}</strong><ul class="chart-detail-list">${list}</ul>`;
}

export function setChartsLoading(chartIds) {
  chartIds.forEach((id) => showLoadingState(id));
}

export function showLoadingState(canvasId) {
  const container = chartContainer(canvasId);
  if (!container || container.querySelector(".chart-loading")) return;

  container.dataset.loading = "true";
  const loading = document.createElement("div");
  loading.className = "chart-loading";
  loading.innerHTML =
    '<span class="chart-loading-ring" aria-hidden="true"></span><span>Loading chart data…</span>';
  container.append(loading);
}

export function clearLoadingState(canvasId) {
  const container = chartContainer(canvasId);
  if (!container) return;
  delete container.dataset.loading;
  container.querySelector(".chart-loading")?.remove();
}
