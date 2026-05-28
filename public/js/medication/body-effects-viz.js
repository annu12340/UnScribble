/**
 * Educational 3D body map — Spline human scan (CodePen: rashedulhridoy/RwzWoGE).
 * Region legend syncs with drug-body-effects.json; the scan is the visual centerpiece.
 */

const REGION_LABELS = {
  head: "Head",
  neck: "Neck / thyroid",
  chest: "Chest",
  abdomen: "Abdomen",
  kidneys: "Kidneys",
  limbs: "Arms & legs"
};

const REGION_KEYS = ["head", "neck", "chest", "abdomen", "kidneys", "limbs"];

const VIEWER_INSTANCE_KEY = "__bodySplineViewer";

/** @see https://codepen.io/rashedulhridoy/pen/RwzWoGE */
const SPLINE_SCENE_URL = "https://prod.spline.design/0eI7JO23zWEe8FiA/scene.splinecode";

/** @type {Promise<typeof import("@splinetool/runtime").Application> | null} */
let runtimePromise = null;

function loadSplineRuntime() {
  if (!runtimePromise) {
    runtimePromise = import("https://esm.sh/@splinetool/runtime@1.9.105").then(
      (mod) => mod.Application
    );
  }
  return runtimePromise;
}

/**
 * @param {HTMLElement} mapEl
 * @param {{ regions?: string[], organs?: string[], summary?: string, uncertain?: boolean }} bodyEffects
 */
export function renderBodyMap(mapEl, bodyEffects) {
  if (!mapEl) return;

  const active = new Set(bodyEffects?.regions || []);

  if (mapEl[VIEWER_INSTANCE_KEY]) {
    mapEl[VIEWER_INSTANCE_KEY].dispose();
    mapEl[VIEWER_INSTANCE_KEY] = null;
  }

  mapEl.innerHTML = `
    <div class="body-map-stage body-map-stage--spline">
      <div class="body-spline-container">
        <canvas class="body-spline-canvas" aria-hidden="true"></canvas>
        <p class="body-effects-loading body-spline-loading">Loading 3D scan…</p>
      </div>
      <p class="body-map-hint" aria-hidden="true">Drag to rotate · scroll to zoom</p>
    </div>
    <ul class="body-map-legend" role="list">
      ${REGION_KEYS.map(
        (id) =>
          `<li class="body-map-legend-item" data-region="${id}" tabindex="0" role="button" aria-pressed="${active.has(id)}">
            <span class="body-map-dot"></span>
            <span class="body-map-legend-label">${REGION_LABELS[id]}</span>
          </li>`
      ).join("")}
    </ul>
  `;

  const canvasEl = mapEl.querySelector(".body-spline-canvas");
  if (!canvasEl) return;

  const viewer = new SplineBodyViewer(canvasEl, mapEl);
  mapEl[VIEWER_INSTANCE_KEY] = viewer;
  wireLegend(mapEl, active);
}

/**
 * @param {HTMLElement} mapEl
 * @param {Set<string>} activeRegions
 */
function wireLegend(mapEl, activeRegions) {
  const items = mapEl.querySelectorAll(".body-map-legend-item");
  items.forEach((item) => {
    const region = item.getAttribute("data-region");
    item.classList.toggle("is-active", activeRegions.has(region));
    item.setAttribute("aria-pressed", String(activeRegions.has(region)));

    const activate = () => {
      const wasFocus = item.classList.contains("is-focus");
      items.forEach((el) => el.classList.remove("is-focus"));
      if (!wasFocus) item.classList.add("is-focus");
    };

    item.addEventListener("click", activate);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });
  });
}

class SplineBodyViewer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} rootEl
   */
  constructor(canvas, rootEl) {
    this.canvas = canvas;
    this.rootEl = rootEl;
    this.app = null;
    this.disposed = false;
    this.loadingEl = rootEl.querySelector(".body-spline-loading");
    this.init();
  }

  async init() {
    try {
      const Application = await loadSplineRuntime();
      if (this.disposed) return;

      this.app = new Application(this.canvas);
      await this.app.load(SPLINE_SCENE_URL);

      if (this.disposed) {
        this.app.dispose();
        return;
      }

      this.canvas.classList.add("is-ready");
      if (this.loadingEl) this.loadingEl.hidden = true;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && this.app.stop) {
        this.app.stop();
      }
    } catch (error) {
      console.error("SplineBodyViewer failed:", error);
      if (this.loadingEl) {
        this.loadingEl.textContent = "Could not load 3D body model.";
      }
    }
  }

  dispose() {
    this.disposed = true;
    if (this.app) {
      this.app.dispose();
      this.app = null;
    }
  }
}

/**
 * @param {HTMLElement} organsEl
 * @param {HTMLElement} summaryEl
 * @param {{ organs?: string[], summary?: string, uncertain?: boolean }} bodyEffects
 */
export function renderBodyEffectsText(organsEl, summaryEl, bodyEffects) {
  if (summaryEl) {
    summaryEl.textContent = bodyEffects?.summary || "";
    summaryEl.classList.toggle("is-uncertain", Boolean(bodyEffects?.uncertain));
  }

  if (!organsEl) return;

  const organs = bodyEffects?.organs || [];
  if (!organs.length) {
    organsEl.innerHTML = "";
    return;
  }

  organsEl.innerHTML = organs
    .map((name) => `<li class="body-effects-organ">${escapeHtml(name)}</li>`)
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
