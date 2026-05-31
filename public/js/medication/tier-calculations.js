/**
 * Pure calculation functions for the 3-tier medication details layout.
 */

/**
 * Parse a duration string like "5 days", "2 weeks", "1 month" into total days.
 * @param {string} durationStr
 * @returns {number|null}
 */
function parseDurationToDays(durationStr) {
  if (!durationStr || typeof durationStr !== "string") return null;

  const lower = durationStr.toLowerCase().trim();
  const match = lower.match(/^(\d+)\s*(day|days|week|weeks|month|months)$/i);
  if (!match) return null;

  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("day")) return num;
  if (unit.startsWith("week")) return num * 7;
  if (unit.startsWith("month")) return num * 30;
  return null;
}

/**
 * Calculate progress through a medication course.
 * @param {string} durationStr - e.g., "5 days", "2 weeks"
 * @param {Date} [startDate] - Course start date. Defaults to today minus 2 days for demo.
 * @returns {{ currentDay: number, totalDays: number, percentComplete: number, percentRemaining: number } | null}
 */
export function calculateProgress(durationStr, startDate = null) {
  const totalDays = parseDurationToDays(durationStr);
  if (!totalDays || totalDays <= 0) return null;

  // Default start date: 2 days ago for demo purposes
  const start = startDate || new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  const currentDay = Math.max(1, Math.min(diffDays + 1, totalDays));
  const percentComplete = Math.round((currentDay / totalDays) * 100);
  const percentRemaining = 100 - percentComplete;

  return {
    currentDay,
    totalDays,
    percentComplete,
    percentRemaining,
  };
}

/**
 * Parse a time string like "8:00 AM" into { hours24, minutes }.
 * @param {string} timeStr
 * @returns {{ hours24: number, minutes: number } | null}
 */
function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;

  // Match "8:00 AM", "2:30 PM", "14:00", etc.
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return { hours24: hours, minutes };
  }

  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return {
      hours24: parseInt(match24[1], 10),
      minutes: parseInt(match24[2], 10),
    };
  }

  return null;
}

/**
 * Format a countdown in hours and minutes.
 * @param {number} diffMinutes
 * @returns {string}
 */
function formatCountdown(diffMinutes) {
  if (diffMinutes <= 0) return "now";
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours === 0) return `in ${mins}m`;
  if (mins === 0) return `in ${hours}h`;
  return `in ${hours}h ${mins}m`;
}

/**
 * Calculate the next dose from a list of schedule times.
 * @param {Array<{ time?: string, label?: string }>} times
 * @returns {{ time: string, label: string, countdown: string, isToday: boolean } | null}
 */
export function calculateNextDose(times) {
  if (!Array.isArray(times) || times.length === 0) return null;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let nextDose = null;
  let minDiff = Infinity;

  for (const t of times) {
    const timeStr = t.time || t.label;
    const parsed = parseTimeString(timeStr);
    if (!parsed) continue;

    const doseMinutes = parsed.hours24 * 60 + parsed.minutes;
    let diff = doseMinutes - nowMinutes;

    // If dose is in the future today
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      nextDose = {
        time: timeStr,
        label: t.label || timeStr,
        countdown: formatCountdown(diff),
        isToday: true,
      };
    }
  }

  // If no future dose today, return first dose tomorrow
  if (!nextDose && times.length > 0) {
    const firstTime = times[0];
    const timeStr = firstTime.time || firstTime.label;
    return {
      time: timeStr,
      label: firstTime.label || timeStr,
      countdown: "tomorrow",
      isToday: false,
    };
  }

  return nextDose;
}

/**
 * Categorize schedule times into completed, current, or upcoming.
 * @param {Array<{ time?: string, label?: string }>} times
 * @returns {Array<{ time: string, label: string, status: 'completed' | 'current' | 'upcoming' }>}
 */
export function categorizeScheduleBlocks(times) {
  if (!Array.isArray(times) || times.length === 0) return [];

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Find the current/next dose index
  let currentIndex = -1;
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const timeStr = t.time || t.label;
    const parsed = parseTimeString(timeStr);
    if (!parsed) continue;

    const doseMinutes = parsed.hours24 * 60 + parsed.minutes;
    // Current dose: within 30 minutes before to 30 minutes after
    if (nowMinutes >= doseMinutes - 30 && nowMinutes <= doseMinutes + 30) {
      currentIndex = i;
      break;
    }
    // First upcoming dose
    if (doseMinutes > nowMinutes && currentIndex === -1) {
      currentIndex = i;
      break;
    }
  }

  // If all doses are in the past, mark none as current
  if (currentIndex === -1) {
    currentIndex = times.length; // All completed
  }

  return times.map((t, i) => {
    const timeStr = t.time || t.label;
    let status;
    if (i < currentIndex) {
      status = "completed";
    } else if (i === currentIndex) {
      status = "current";
    } else {
      status = "upcoming";
    }
    return {
      time: timeStr,
      label: t.label || timeStr,
      status,
    };
  });
}

// Keywords that indicate severity levels for side effects
const EMERGENCY_KEYWORDS = [
  "severe allergic",
  "anaphylaxis",
  "difficulty breathing",
  "swelling of face",
  "throat closing",
  "seizure",
  "severe rash",
  "stevens-johnson",
  "heart attack",
  "stroke",
  "liver failure",
  "kidney failure",
  "severe bleeding",
  "blood in urine",
  "blood in stool",
  "sudden vision",
  "chest pain",
  "irregular heartbeat",
];

const CONTACT_DOCTOR_KEYWORDS = [
  "persistent",
  "worsening",
  "severe",
  "unusual",
  "prolonged",
  "jaundice",
  "dark urine",
  "fever",
  "rash",
  "muscle pain",
  "weakness",
  "numbness",
  "confusion",
  "mood changes",
  "depression",
  "anxiety",
  "swelling",
  "bruising",
];

/**
 * Categorize side effects by severity.
 * @param {string[]} sideEffects - List of side effect strings
 * @returns {{ common: string[], contact: string[], emergency: string[] }}
 */
export function categorizeSideEffects(sideEffects) {
  const result = {
    common: [],
    contact: [],
    emergency: [],
  };

  if (!Array.isArray(sideEffects)) return result;

  for (const effect of sideEffects) {
    if (typeof effect !== "string") continue;
    const lower = effect.toLowerCase();

    // Check emergency keywords first
    const isEmergency = EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
    if (isEmergency) {
      result.emergency.push(effect);
      continue;
    }

    // Check contact doctor keywords
    const isContact = CONTACT_DOCTOR_KEYWORDS.some((kw) => lower.includes(kw));
    if (isContact) {
      result.contact.push(effect);
      continue;
    }

    // Default to common
    result.common.push(effect);
  }

  return result;
}
