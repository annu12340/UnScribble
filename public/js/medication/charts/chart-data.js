/** Pure chart row builders (no DOM / Chart.js). */

export function parseHour(time) {
  if (!time || typeof time !== "string" || !time.includes(":")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours)) return null;
  return hours + (Number.isNaN(minutes) ? 0 : minutes / 60);
}

export function formatHour(hour) {
  const h = ((Math.round(hour) % 24) + 24) % 24;
  const suffix = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${suffix}`;
}

/**
 * Single-dose concentration shape (0–100), rising to the peak then decaying.
 */
function concentrationAt(tau, peak, duration) {
  if (tau <= 0 || tau > duration) return 0;
  if (tau <= peak) return 100 * Math.sin((tau / peak) * (Math.PI / 2));
  const k = Math.log(10) / Math.max(0.1, duration - peak);
  return 100 * Math.exp(-k * (tau - peak));
}

/** Single-dose peak is normalized to 100; the toxic ceiling sits above it (illustrative). */
const TOXIC_LEVEL = 130;

function resolvePk(pk) {
  const duration = Number(pk?.duration_hours) || 0;
  if (duration <= 0) return null;
  const peakRaw = Number(pk?.peak_hours) || duration * 0.25;
  const peak = Math.min(Math.max(peakRaw, 0.1), duration * 0.9);
  const onsetRaw = Number(pk?.onset_hours) || peak * 0.3;
  const onset = Math.min(Math.max(onsetRaw, 0), peak);
  // Drug becomes active when it crosses the minimum effective concentration, i.e. at onset.
  const mec = Number(concentrationAt(onset, peak, duration).toFixed(1));
  return { onset, peak, duration, mec, toxic: TOXIC_LEVEL };
}

/**
 * Single-dose "when it kicks in, peaks, wears off" curve.
 * @returns {{ points: Array<{x:number,y:number}>, markers: Array<{x:number,y:number,label:string}>, mec: number, toxic: number } | null}
 */
export function buildPkCurvePoints(pk) {
  const resolved = resolvePk(pk);
  if (!resolved) return null;
  const { onset, peak, duration, mec, toxic } = resolved;

  const steps = 48;
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (duration / steps) * i;
    points.push({
      x: Number(t.toFixed(2)),
      y: Number(concentrationAt(t, peak, duration).toFixed(1)),
    });
  }

  const markers = [
    { x: onset, y: concentrationAt(onset, peak, duration), label: "Kicks in" },
    { x: peak, y: 100, label: "Peak effect" },
    {
      x: duration,
      y: concentrationAt(duration, peak, duration),
      label: "Wears off",
    },
  ];

  return { points, markers, mec, toxic };
}

/**
 * Steady-state effect across a 24h day: stacks one dose curve per scheduled time.
 * @returns {{ points: Array<{x:number,y:number}>, doseHours: number[], mec: number, toxic: number } | null}
 */
export function buildSteadyStatePoints(pk, schedule) {
  const resolved = resolvePk(pk);
  if (!resolved) return null;

  const times = schedule?.schedule?.times || [];
  const doseHours = times
    .map((slot) => parseHour(slot.time))
    .filter((h) => h != null);
  if (!doseHours.length) return null;

  const { peak, duration, mec, toxic } = resolved;
  const points = [];
  for (let t = 0; t <= 24; t += 0.5) {
    let total = 0;
    for (const dose of doseHours) {
      total += concentrationAt(t - dose, peak, duration);
    }
    points.push({ x: t, y: Number(total.toFixed(1)) });
  }

  return { points, doseHours, mec, toxic };
}

/**
 * Drug-interaction nodes grouped by clinical severity tier.
 * @param {Record<string, unknown>} interactions
 */
export function buildInteractionNodes(interactions = {}, limitPerTier = 4) {
  const tiers = [
    {
      tier: "severe",
      label: "Avoid",
      items: interactions.contraindicated_conditions || [],
    },
    {
      tier: "moderate",
      label: "Caution",
      items: interactions.common_interacting_medications || [],
    },
    {
      tier: "mild",
      label: "Watch",
      items: interactions.food_supplements_to_avoid || [],
    },
  ];

  return tiers.map(({ tier, label, items }) => ({
    tier,
    label,
    total: items.length,
    items: items.slice(0, limitPerTier).map(String),
    overflow: Math.max(0, items.length - limitPerTier),
  }));
}
