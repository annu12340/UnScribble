const revealed = new WeakSet();
let observer = null;
let activeInstances = null;

export const REVEAL_CHART_ANIMATION = {
  duration: 720,
  easing: "easeOutCubic"
};

export const PAUSED_CHART_ANIMATION = false;

function revealChart(container, chart) {
  if (!chart || revealed.has(chart)) return;

  revealed.add(chart);
  chart.options.animation = REVEAL_CHART_ANIMATION;
  chart.update();

  container.classList.add("is-chart-visible");
  const card = container.closest(".med-chart-card");
  if (card) card.classList.add("is-chart-visible");
}

function isInView(container) {
  const rect = container.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < vh * 0.88 && rect.bottom > vh * 0.12;
}

function ensureObserver() {
  if (observer) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const canvasId = entry.target.dataset.chartId;
        const chart = activeInstances?.[canvasId];
        if (chart) revealChart(entry.target, chart);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.22, rootMargin: "0px 0px -6% 0px" }
  );
}

export function syncChartReveal(instances) {
  activeInstances = instances;
  ensureObserver();

  document.querySelectorAll(".section-chart-container[data-chart-id]").forEach((container) => {
    const canvasId = container.dataset.chartId;
    const chart = instances[canvasId];

    container.classList.remove("is-chart-visible");
    container.closest(".med-chart-card")?.classList.remove("is-chart-visible");

    if (!chart) return;

    if (isInView(container)) {
      revealChart(container, chart);
      return;
    }

    observer.observe(container);
  });
}
