// Medication Schedule Parser and Google Calendar Integration

export function parseMedicationSchedule(medications) {
  return medications.map((med) => {
    const schedule = extractSchedule(med);
    return {
      medication: med.medication_name,
      strength: med.strength,
      dose: med.dose,
      frequency: med.frequency,
      timing: med.timing,
      duration: med.duration,
      schedule: schedule,
      rawMed: med
    };
  });
}

function extractSchedule(med) {
  const frequency = (med.frequency || "").toLowerCase();
  const timing = (med.timing || "").toLowerCase();
  const normalized = med.normalized_frequency || {};
  
  const schedule = {
    times: [],
    frequency: frequency,
    description: normalized.expansion || frequency
  };

  // Parse common frequency patterns
  if (frequency.includes("once") || frequency.includes("od") || frequency.includes("qd")) {
    schedule.times = inferTimesFromTiming(timing, 1);
  } else if (frequency.includes("twice") || frequency.includes("bd") || frequency.includes("bid")) {
    schedule.times = inferTimesFromTiming(timing, 2);
  } else if (frequency.includes("thrice") || frequency.includes("tid") || frequency.includes("tds")) {
    schedule.times = inferTimesFromTiming(timing, 3);
  } else if (frequency.includes("four") || frequency.includes("qid") || frequency.includes("qds")) {
    schedule.times = inferTimesFromTiming(timing, 4);
  } else if (frequency.match(/every\s+(\d+)\s+hour/i)) {
    const hours = parseInt(frequency.match(/every\s+(\d+)\s+hour/i)[1]);
    schedule.times = generateHourlySchedule(hours);
  } else if (frequency.includes("hs") || frequency.includes("bedtime")) {
    schedule.times = [{ time: "22:00", label: "Bedtime" }];
  } else if (frequency.includes("prn") || frequency.includes("as needed")) {
    schedule.times = [{ time: null, label: "As needed" }];
  } else {
    // Default to once daily if unclear
    schedule.times = [{ time: "09:00", label: "Morning" }];
  }

  return schedule;
}

function inferTimesFromTiming(timing, count) {
  const times = [];
  
  // Check for specific timing instructions
  if (timing.includes("morning") || timing.includes("breakfast")) {
    times.push({ time: "08:00", label: "Morning (Breakfast)" });
  }
  if (timing.includes("afternoon") || timing.includes("lunch")) {
    times.push({ time: "13:00", label: "Afternoon (Lunch)" });
  }
  if (timing.includes("evening") || timing.includes("dinner")) {
    times.push({ time: "19:00", label: "Evening (Dinner)" });
  }
  if (timing.includes("night") || timing.includes("bedtime")) {
    times.push({ time: "22:00", label: "Night (Bedtime)" });
  }

  // If we have enough times from timing, return them
  if (times.length >= count) {
    return times.slice(0, count);
  }

  // Otherwise, generate default times based on count
  if (count === 1) {
    return [{ time: "09:00", label: "Morning" }];
  } else if (count === 2) {
    return [
      { time: "08:00", label: "Morning" },
      { time: "20:00", label: "Night" }
    ];
  } else if (count === 3) {
    return [
      { time: "08:00", label: "Morning" },
      { time: "14:00", label: "Afternoon" },
      { time: "20:00", label: "Night" }
    ];
  } else if (count === 4) {
    return [
      { time: "08:00", label: "Morning" },
      { time: "12:00", label: "Noon" },
      { time: "16:00", label: "Afternoon" },
      { time: "20:00", label: "Night" }
    ];
  }

  return times;
}

function generateHourlySchedule(hours) {
  const times = [];
  for (let hour = 8; hour < 24; hour += hours) {
    const timeStr = `${String(hour).padStart(2, "0")}:00`;
    times.push({ time: timeStr, label: timeStr });
  }
  return times;
}

export function renderScheduleView(container, medications, escapeHtml) {
  const schedules = parseMedicationSchedule(medications);
  
  if (!schedules.length) {
    container.innerHTML = "<p>No medications to schedule.</p>";
    return;
  }

  const scheduleHtml = schedules.map((sched, index) => {
    const timesHtml = sched.schedule.times
      .map((t) => {
        const timeDisplay = t.time || t.label;
        return `<div class="schedule-time">
          <span class="time-badge">${escapeHtml(timeDisplay)}</span>
          <span class="time-label">${escapeHtml(t.label)}</span>
        </div>`;
      })
      .join("");

    return `
      <div class="schedule-card" data-med-index="${index}">
        <div class="schedule-header">
          <div>
            <div class="schedule-med-name">${escapeHtml(sched.medication)}</div>
            <div class="schedule-details">
              ${escapeHtml(sched.strength)} · ${escapeHtml(sched.dose)} · ${escapeHtml(sched.frequency)}
            </div>
          </div>
          <button class="btn small add-to-calendar-btn" data-med-index="${index}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18M12 14v4m-2-2h4" />
            </svg>
            Add to Calendar
          </button>
        </div>
        <div class="schedule-times">
          ${timesHtml}
        </div>
        ${sched.duration ? `<div class="schedule-duration">Duration: ${escapeHtml(sched.duration)}</div>` : ""}
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <div class="schedule-actions">
      <button class="btn primary" id="addAllToCalendar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        Add All to Google Calendar
      </button>
      <button class="btn ghost" id="exportScheduleICS">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 4v12m0 0l-4-4m4 4 4-4M4 18h16" />
        </svg>
        Export as ICS
      </button>
    </div>
    <div class="schedule-list">
      ${scheduleHtml}
    </div>
  `;

  return schedules;
}

export function initGoogleCalendar() {
  // Load Google API client
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("client:auth2", () => {
        resolve();
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function authenticateGoogleCalendar(clientId, apiKey) {
  await initGoogleCalendar();
  
  await window.gapi.client.init({
    apiKey: apiKey,
    clientId: clientId,
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
    scope: "https://www.googleapis.com/auth/calendar.events"
  });

  const authInstance = window.gapi.auth2.getAuthInstance();
  if (!authInstance.isSignedIn.get()) {
    await authInstance.signIn();
  }

  return authInstance.isSignedIn.get();
}

export async function addMedicationToGoogleCalendar(schedule, startDate, clientId, apiKey) {
  try {
    const isAuthenticated = await authenticateGoogleCalendar(clientId, apiKey);
    if (!isAuthenticated) {
      throw new Error("Failed to authenticate with Google Calendar");
    }

    const duration = parseDuration(schedule.duration);
    const events = [];

    for (const timeSlot of schedule.schedule.times) {
      if (!timeSlot.time) continue; // Skip "as needed" medications

      const event = createCalendarEvent(schedule, timeSlot, startDate, duration);
      const response = await window.gapi.client.calendar.events.insert({
        calendarId: "primary",
        resource: event
      });
      events.push(response.result);
    }

    return events;
  } catch (error) {
    console.error("Error adding to Google Calendar:", error);
    throw error;
  }
}

function createCalendarEvent(schedule, timeSlot, startDate, duration) {
  const [hours, minutes] = timeSlot.time.split(":").map(Number);
  const eventStart = new Date(startDate);
  eventStart.setHours(hours, minutes, 0, 0);

  const eventEnd = new Date(eventStart);
  eventEnd.setMinutes(eventEnd.getMinutes() + 15); // 15-minute reminder window

  const event = {
    summary: `💊 ${schedule.medication}`,
    description: `Medication: ${schedule.medication}\nStrength: ${schedule.strength}\nDose: ${schedule.dose}\nFrequency: ${schedule.frequency}\nTiming: ${timeSlot.label}`,
    start: {
      dateTime: eventStart.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: eventEnd.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 10 },
        { method: "popup", minutes: 0 }
      ]
    },
    colorId: "11" // Red color for medications
  };

  // Add recurrence if duration is specified
  if (duration.days > 1) {
    const until = new Date(startDate);
    until.setDate(until.getDate() + duration.days);
    event.recurrence = [`RRULE:FREQ=DAILY;UNTIL=${formatDateForRRule(until)}`];
  }

  return event;
}

function parseDuration(durationStr) {
  if (!durationStr) return { days: 7 }; // Default 7 days

  const str = durationStr.toLowerCase();
  
  if (str.includes("day")) {
    const match = str.match(/(\d+)\s*day/);
    return { days: match ? parseInt(match[1]) : 7 };
  }
  
  if (str.includes("week")) {
    const match = str.match(/(\d+)\s*week/);
    return { days: match ? parseInt(match[1]) * 7 : 7 };
  }
  
  if (str.includes("month")) {
    const match = str.match(/(\d+)\s*month/);
    return { days: match ? parseInt(match[1]) * 30 : 30 };
  }

  return { days: 7 };
}

function formatDateForRRule(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function exportScheduleAsICS(schedules, startDate) {
  const events = [];
  
  for (const schedule of schedules) {
    const duration = parseDuration(schedule.duration);
    
    for (const timeSlot of schedule.schedule.times) {
      if (!timeSlot.time) continue;
      
      const [hours, minutes] = timeSlot.time.split(":").map(Number);
      const eventStart = new Date(startDate);
      eventStart.setHours(hours, minutes, 0, 0);
      
      const eventEnd = new Date(eventStart);
      eventEnd.setMinutes(eventEnd.getMinutes() + 15);
      
      const until = new Date(startDate);
      until.setDate(until.getDate() + duration.days);
      
      events.push({
        start: eventStart,
        end: eventEnd,
        summary: `💊 ${schedule.medication}`,
        description: `Medication: ${schedule.medication}\\nStrength: ${schedule.strength}\\nDose: ${schedule.dose}\\nFrequency: ${schedule.frequency}\\nTiming: ${timeSlot.label}`,
        rrule: duration.days > 1 ? `FREQ=DAILY;UNTIL=${formatDateForRRule(until)}` : null
      });
    }
  }
  
  const icsContent = generateICS(events);
  downloadICS(icsContent, "medication-schedule.ics");
}

function generateICS(events) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Prescription OCR//Medication Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];
  
  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART:${formatICSDate(event.start)}`);
    lines.push(`DTEND:${formatICSDate(event.end)}`);
    lines.push(`SUMMARY:${event.summary}`);
    lines.push(`DESCRIPTION:${event.description}`);
    lines.push(`UID:${generateUID()}`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    
    if (event.rrule) {
      lines.push(`RRULE:${event.rrule}`);
    }
    
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-PT10M");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:Time to take ${event.summary}`);
    lines.push("END:VALARM");
    
    lines.push("END:VEVENT");
  }
  
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateUID() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@prescription-ocr`;
}

function downloadICS(content, filename) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
