/** Animated analog clock that plots a medication's daily dose times against the live time. */

import { parseHour, formatHour } from "./chart-data.js";
import { chartContainer, clearLoadingState } from "./chart-dom.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const SIZE = 240;
const C = SIZE / 2;
const FACE_R = 104;

function svgEl(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/** Point on the dial for a fraction of a full turn (0 = top, clockwise). */
function dialPoint(turn, radius) {
  const angle = turn * Math.PI * 2 - Math.PI / 2;
  return { x: C + Math.cos(angle) * radius, y: C + Math.sin(angle) * radius };
}

function buildFace() {
  const g = svgEl("g", {});

  g.append(
    svgEl("circle", {
      cx: C,
      cy: C,
      r: FACE_R,
      fill: "url(#clockFace)",
      stroke: "rgba(5, 150, 105, 0.35)",
      "stroke-width": 2,
    }),
  );

  for (let minute = 0; minute < 60; minute += 1) {
    const isHour = minute % 5 === 0;
    const outer = dialPoint(minute / 60, FACE_R - 6);
    const inner = dialPoint(minute / 60, FACE_R - (isHour ? 16 : 11));
    g.append(
      svgEl("line", {
        x1: inner.x,
        y1: inner.y,
        x2: outer.x,
        y2: outer.y,
        stroke: isHour ? "#047857" : "rgba(5, 150, 105, 0.3)",
        "stroke-width": isHour ? 2.2 : 1,
        "stroke-linecap": "round",
      }),
    );
  }

  for (let hour = 1; hour <= 12; hour += 1) {
    const p = dialPoint(hour / 12, FACE_R - 30);
    const label = svgEl("text", {
      x: p.x,
      y: p.y,
      class: "clock-hour-number",
      "text-anchor": "middle",
      "dominant-baseline": "central",
    });
    label.textContent = String(hour);
    g.append(label);
  }

  return g;
}

function buildDoseMarkers(doses, nextIndex) {
  const g = svgEl("g", {});
  doses.forEach((dose, index) => {
    // PM doses sit on an outer ring, AM on an inner ring, so 8am/8pm don't overlap.
    const p = dialPoint(
      (dose.hour % 12) / 12,
      dose.pm ? FACE_R - 34 : FACE_R - 54,
    );
    const isNext = index === nextIndex;
    const marker = svgEl("g", {
      class: `clock-dose${isNext ? " clock-dose--next" : ""}`,
    });
    marker.append(
      svgEl("circle", {
        cx: p.x,
        cy: p.y,
        r: 9,
        fill: dose.pm ? "#047857" : "#34d399",
        stroke: "#fff",
        "stroke-width": 2.5,
      }),
    );
    const title = svgEl("title");
    title.textContent = `${dose.label} · ${formatHour(dose.hour)}`;
    marker.append(title);
    g.append(marker);
  });
  return g;
}

function buildHand(className, length, width) {
  return svgEl("line", {
    class: className,
    x1: C,
    y1: C + 14,
    x2: C,
    y2: C - length,
    "stroke-width": width,
    "stroke-linecap": "round",
  });
}

function nextDoseIndex(doses, nowHour) {
  let best = -1;
  let bestGap = Infinity;
  doses.forEach((dose, index) => {
    const gap = (dose.hour - nowHour + 24) % 24;
    if (gap < bestGap) {
      bestGap = gap;
      best = index;
    }
  });
  return best;
}

export function renderScheduleClock(schedule) {
  const container = chartContainer("scheduleClock");
  if (!container) return;

  clearLoadingState("scheduleClock");
  container.classList.add("is-chart-visible");
  container.closest(".med-chart-card")?.classList.add("is-chart-visible");

  if (typeof container._clockCleanup === "function") container._clockCleanup();
  container.querySelector(".graph-empty")?.remove();
  container.querySelector(".schedule-clock")?.remove();

  const times = schedule?.schedule?.times || [];
  const doses = times
    .map((slot) => {
      const hour = parseHour(slot.time);
      if (hour == null) return null;
      return { hour, label: slot.label || formatHour(hour), pm: hour >= 12 };
    })
    .filter(Boolean);

  if (!doses.length) {
    const empty = document.createElement("p");
    empty.className = "graph-empty";
    empty.textContent = "No dose times parsed from this prescription yet.";
    container.append(empty);
    return;
  }

  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;

  const svg = svgEl("svg", {
    class: "schedule-clock",
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    role: "img",
    "aria-label": "Analog clock showing daily dose times",
  });

  const defs = svgEl("defs");
  defs.innerHTML = `
    <radialGradient id="clockFace" cx="38%" cy="32%" r="75%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#ecfdf5"/>
      <stop offset="100%" stop-color="#d1fae5"/>
    </radialGradient>`;
  svg.append(defs);

  svg.append(buildFace());
  svg.append(buildDoseMarkers(doses, nextDoseIndex(doses, nowHour)));

  const hourHand = buildHand("clock-hand clock-hand--hour", 52, 5);
  const minuteHand = buildHand("clock-hand clock-hand--minute", 74, 3.5);
  const secondHand = buildHand("clock-hand clock-hand--second", 82, 1.6);
  svg.append(hourHand, minuteHand, secondHand);
  svg.append(svgEl("circle", { cx: C, cy: C, r: 5, fill: "#065f46" }));

  container.prepend(svg);

  let raf = 0;
  function tick() {
    const date = new Date();
    const seconds = date.getSeconds() + date.getMilliseconds() / 1000;
    const minutes = date.getMinutes() + seconds / 60;
    const hours = (date.getHours() % 12) + minutes / 60;

    secondHand.setAttribute(
      "transform",
      `rotate(${(seconds / 60) * 360} ${C} ${C})`,
    );
    minuteHand.setAttribute(
      "transform",
      `rotate(${(minutes / 60) * 360} ${C} ${C})`,
    );
    hourHand.setAttribute(
      "transform",
      `rotate(${(hours / 12) * 360} ${C} ${C})`,
    );

    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  container._clockCleanup = () => cancelAnimationFrame(raf);
}
