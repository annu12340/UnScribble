/** Rotatable orthographic 3D globe that plots where a medication is banned or Rx-only. */

import { chartContainer, clearLoadingState } from "./chart-dom.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const DEG = Math.PI / 180;
const SIZE = 320;
const R = 132;
const CX = SIZE / 2;
const CY = SIZE / 2;

const TIER = {
  banned: { color: "#e11d48", label: "Banned" },
  restricted: { color: "#f59e0b", label: "Rx-only" },
};

/** Approximate centroid latitude/longitude for matching country names to the globe. */
const COUNTRY_COORDS = {
  afghanistan: [33, 65],
  algeria: [28, 3],
  argentina: [-34, -64],
  australia: [-25, 133],
  austria: [47.5, 14],
  bangladesh: [24, 90],
  belgium: [50.5, 4.5],
  brazil: [-10, -55],
  canada: [56, -106],
  chile: [-30, -71],
  china: [35, 105],
  colombia: [4, -73],
  denmark: [56, 10],
  egypt: [27, 30],
  finland: [64, 26],
  france: [46, 2],
  germany: [51, 10],
  greece: [39, 22],
  india: [21, 78],
  indonesia: [-2, 118],
  iran: [32, 53],
  iraq: [33, 44],
  ireland: [53, -8],
  israel: [31, 35],
  italy: [42, 13],
  japan: [36, 138],
  kenya: [0, 38],
  malaysia: [3, 102],
  mexico: [23, -102],
  morocco: [32, -6],
  netherlands: [52, 5.5],
  "new zealand": [-42, 173],
  nigeria: [9, 8],
  norway: [62, 10],
  pakistan: [30, 70],
  philippines: [13, 122],
  poland: [52, 20],
  portugal: [39.5, -8],
  russia: [60, 100],
  "saudi arabia": [24, 45],
  singapore: [1.3, 103.8],
  "south africa": [-29, 24],
  "south korea": [36, 128],
  spain: [40, -4],
  sweden: [62, 15],
  switzerland: [47, 8],
  thailand: [15, 101],
  turkey: [39, 35],
  ukraine: [49, 32],
  "united arab emirates": [24, 54],
  "united kingdom": [54, -2],
  "united states": [39, -98],
  vietnam: [16, 108],
};

const ALIASES = {
  usa: "united states",
  us: "united states",
  "u.s.": "united states",
  "u.s.a.": "united states",
  america: "united states",
  uk: "united kingdom",
  "u.k.": "united kingdom",
  "great britain": "united kingdom",
  britain: "united kingdom",
  england: "united kingdom",
  uae: "united arab emirates",
  korea: "south korea",
  "republic of korea": "south korea",
  "russian federation": "russia",
  holland: "netherlands",
};

function normalizeName(raw) {
  let key = String(raw)
    .toLowerCase()
    .replace(/[().]/g, "")
    .replace(/^the\s+/, "")
    .trim();
  if (ALIASES[key]) key = ALIASES[key];
  return COUNTRY_COORDS[key] ? key : null;
}

function project(lat, lon, rotLon, tilt) {
  const lambda = (lon + rotLon) * DEG;
  const phi = lat * DEG;
  const x = Math.cos(phi) * Math.sin(lambda);
  const y0 = Math.sin(phi);
  const z0 = Math.cos(phi) * Math.cos(lambda);
  const t = tilt * DEG;
  const y = y0 * Math.cos(t) - z0 * Math.sin(t);
  const z = y0 * Math.sin(t) + z0 * Math.cos(t);
  return { x: CX + x * R, y: CY - y * R, z };
}

function svgEl(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/** Builds a path string for a great-circle line, splitting where it dips behind the globe. */
function arcPath(coords, rotLon, tilt) {
  let d = "";
  let pen = false;
  for (const [lat, lon] of coords) {
    const p = project(lat, lon, rotLon, tilt);
    if (p.z < 0) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

function graticule() {
  const lines = [];
  for (let lon = -150; lon <= 180; lon += 30) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 4) pts.push([lat, lon]);
    lines.push(pts);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) pts.push([lat, lon]);
    lines.push(pts);
  }
  return lines;
}

function collectCountries(med) {
  const regulatory = med.regulatory_status || {};
  const seen = new Set();
  const points = [];

  const add = (names, tier) => {
    (Array.isArray(names) ? names : []).forEach((raw) => {
      const key = normalizeName(raw);
      if (!key || seen.has(key)) return;
      seen.add(key);
      const [lat, lon] = COUNTRY_COORDS[key];
      points.push({ lat, lon, tier, name: String(raw).trim() });
    });
  };

  add(regulatory.fully_banned_countries, "banned");
  add(regulatory.prescription_only_countries, "restricted");
  return points;
}

export function renderWorldGlobe(med) {
  const container = chartContainer("bannedGlobe");
  if (!container) return;

  clearLoadingState("bannedGlobe");
  container.classList.add("is-chart-visible");
  container.closest(".med-chart-card")?.classList.add("is-chart-visible");

  if (typeof container._globeCleanup === "function") container._globeCleanup();
  container.querySelector(".graph-empty")?.remove();
  container.querySelector(".world-globe-wrap")?.remove();

  const points = collectCountries(med);
  if (!points.length) {
    const empty = document.createElement("p");
    empty.className = "graph-empty";
    empty.textContent =
      "No country-level bans or prescription restrictions on record.";
    container.append(empty);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "world-globe-wrap";

  const svg = svgEl("svg", {
    class: "world-globe",
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    role: "img",
    "aria-label": "Globe showing countries where this medication is restricted",
  });

  const defs = svgEl("defs");
  defs.innerHTML = `
    <radialGradient id="globeOcean" cx="38%" cy="32%" r="75%">
      <stop offset="0%" stop-color="#5eead4"/>
      <stop offset="55%" stop-color="#0ea5e9"/>
      <stop offset="100%" stop-color="#0c4a6e"/>
    </radialGradient>`;
  svg.append(defs);

  svg.append(
    svgEl("circle", {
      cx: CX,
      cy: CY,
      r: R,
      fill: "url(#globeOcean)",
      stroke: "rgba(8, 47, 73, 0.35)",
      "stroke-width": 1.5,
    }),
  );

  const grid = svgEl("g", {
    fill: "none",
    stroke: "rgba(255, 255, 255, 0.28)",
    "stroke-width": 0.8,
  });
  const gridLines = graticule().map((coords) => {
    const path = svgEl("path", {});
    path.dataset.coords = JSON.stringify(coords);
    grid.append(path);
    return path;
  });
  svg.append(grid);

  const markersGroup = svgEl("g", {});
  const markers = points.map((point) => {
    const g = svgEl("g", { class: "globe-marker" });
    const color = TIER[point.tier].color;
    const ring = svgEl("circle", {
      r: 6,
      fill: "none",
      stroke: color,
      "stroke-width": 1.5,
      opacity: 0.55,
    });
    const dot = svgEl("circle", {
      r: 3.4,
      fill: color,
      stroke: "#fff",
      "stroke-width": 1,
    });
    const title = svgEl("title");
    title.textContent = `${point.name} — ${TIER[point.tier].label}`;
    g.append(ring, dot, title);
    markersGroup.append(g);
    return { ...point, g };
  });
  svg.append(markersGroup);

  wrap.append(svg);
  wrap.append(buildLegend(points));
  container.prepend(wrap);

  let rotLon = -20;
  const tilt = -18;
  let dragging = false;
  let lastX = 0;
  let raf = 0;

  function draw() {
    gridLines.forEach((path) => {
      const coords = JSON.parse(path.dataset.coords);
      path.setAttribute("d", arcPath(coords, rotLon, tilt));
    });
    markers.forEach((m) => {
      const p = project(m.lat, m.lon, rotLon, tilt);
      const front = p.z >= 0;
      m.g.setAttribute(
        "transform",
        `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`,
      );
      m.g.setAttribute("opacity", front ? "1" : "0.18");
    });
  }

  function tick() {
    if (!dragging) rotLon += 0.18;
    draw();
    raf = requestAnimationFrame(tick);
  }

  function onDown(event) {
    dragging = true;
    lastX = (event.touches ? event.touches[0].clientX : event.clientX) || 0;
  }
  function onMove(event) {
    if (!dragging) return;
    const x = (event.touches ? event.touches[0].clientX : event.clientX) || 0;
    rotLon += (x - lastX) * 0.45;
    lastX = x;
    draw();
  }
  function onUp() {
    dragging = false;
  }

  svg.addEventListener("mousedown", onDown);
  svg.addEventListener("touchstart", onDown, { passive: true });
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("mouseup", onUp);
  window.addEventListener("touchend", onUp);

  raf = requestAnimationFrame(tick);

  container._globeCleanup = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchend", onUp);
  };
}

function buildLegend(points) {
  const legend = document.createElement("div");
  legend.className = "globe-legend";

  const bannedCount = points.filter((p) => p.tier === "banned").length;
  const restrictedCount = points.length - bannedCount;

  const entries = [];
  if (bannedCount) {
    entries.push(["banned", `Banned · ${bannedCount}`]);
  }
  if (restrictedCount) {
    entries.push(["restricted", `Rx-only · ${restrictedCount}`]);
  }

  entries.forEach(([tier, text]) => {
    const item = document.createElement("span");
    item.className = "globe-legend-item";
    const swatch = document.createElement("span");
    swatch.className = "globe-legend-dot";
    swatch.style.background = TIER[tier].color;
    item.append(swatch, document.createTextNode(text));
    legend.append(item);
  });

  return legend;
}
