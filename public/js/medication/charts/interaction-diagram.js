/** SVG radial severity hub for drug interactions (no Chart.js — there is no native network chart). */

import { buildInteractionNodes } from "./chart-data.js";
import { chartContainer, clearLoadingState } from "./chart-dom.js";

const TIER_COLOR = {
  severe: "#e11d48",
  moderate: "#f59e0b",
  mild: "#0ea5e9",
};

const SVG_NS = "http://www.w3.org/2000/svg";

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

function truncate(text, max = 18) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function text(attrs, content) {
  const node = el("text", attrs);
  node.textContent = content;
  return node;
}

export function renderInteractionDiagram(med, drugName) {
  const container = chartContainer("interactionDiagram");
  if (!container) return;

  clearLoadingState("interactionDiagram");
  container.classList.add("is-chart-visible");
  container.closest(".med-chart-card")?.classList.add("is-chart-visible");
  container.querySelector("canvas")?.remove();
  container.querySelector(".graph-empty")?.remove();
  container.querySelector(".interaction-diagram")?.remove();

  const nodes = buildInteractionNodes(med.drug_interactions || {});
  const totalItems = nodes.reduce((sum, node) => sum + node.total, 0);

  if (!totalItems) {
    const empty = document.createElement("p");
    empty.className = "graph-empty";
    empty.textContent =
      "No interacting medications, foods, or conditions identified.";
    container.append(empty);
    return;
  }

  const width = 340;
  const height = 280;
  const cx = width / 2;
  const cy = height / 2;
  const svg = el("svg", {
    class: "interaction-diagram",
    viewBox: `0 0 ${width} ${height}`,
    role: "img",
    "aria-label": "Interaction severity diagram",
  });

  const active = nodes.filter((node) => node.total > 0);
  const angleStep = (Math.PI * 2) / active.length;
  const orbit = 92;

  active.forEach((node, index) => {
    const angle = -Math.PI / 2 + angleStep * index;
    const nx = cx + Math.cos(angle) * orbit;
    const ny = cy + Math.sin(angle) * orbit;
    const color = TIER_COLOR[node.tier];
    const radius = Math.min(40, 22 + node.total * 4);

    const edge = el("line", {
      x1: cx,
      y1: cy,
      x2: nx,
      y2: ny,
      stroke: color,
      "stroke-width":
        node.tier === "severe" ? 4 : node.tier === "moderate" ? 2.6 : 1.6,
      "stroke-opacity": 0.5,
    });
    svg.append(edge);

    const bubble = el("circle", {
      cx: nx,
      cy: ny,
      r: radius,
      fill: `${color}22`,
      stroke: color,
      "stroke-width": 2,
    });
    bubble.append(makeTitle(node));
    svg.append(bubble);

    svg.append(
      text(
        {
          x: nx,
          y: ny - 2,
          "text-anchor": "middle",
          class: "interaction-node-count",
          fill: color,
        },
        String(node.total),
      ),
    );
    svg.append(
      text(
        {
          x: nx,
          y: ny + 13,
          "text-anchor": "middle",
          class: "interaction-node-label",
        },
        node.label,
      ),
    );
  });

  const hub = el("circle", {
    cx,
    cy,
    r: 34,
    fill: "#059669",
    stroke: "#fff",
    "stroke-width": 3,
  });
  svg.append(hub);
  svg.append(
    text(
      {
        x: cx,
        y: cy + 4,
        "text-anchor": "middle",
        class: "interaction-hub-label",
      },
      truncate(drugName || "This drug", 12),
    ),
  );

  container.prepend(svg);
}

function makeTitle(node) {
  const title = el("title");
  const lines = node.items.length ? node.items.join(", ") : "None listed";
  const overflow = node.overflow ? ` (+${node.overflow} more)` : "";
  title.append(document.createTextNode(`${node.label}: ${lines}${overflow}`));
  return title;
}
