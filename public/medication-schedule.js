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
  console.log('[Google Calendar] Initializing Google Calendar API...');
  
  // Load Google API client
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      console.log('[Google Calendar] Google API already loaded');
      resolve();
      return;
    }

    console.log('[Google Calendar] Loading Google API script...');
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      console.log('[Google Calendar] Google API script loaded successfully');
      window.gapi.load("client:auth2", () => {
        console.log('[Google Calendar] Google API client and auth2 loaded');
        resolve();
      });
    };
    script.onerror = (error) => {
      console.error('[Google Calendar] Failed to load Google API script:', error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

export async function authenticateGoogleCalendar(clientId, apiKey) {
  console.log('[Google Calendar] Starting authentication process...');
  console.log('[Google Calendar] Client ID:', clientId ? `${clientId.substring(0, 20)}...` : 'NOT PROVIDED');
  console.log('[Google Calendar] API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT PROVIDED');
  
  await initGoogleCalendar();
  
  console.log('[Google Calendar] Initializing Google API client...');
  try {
    await window.gapi.client.init({
      apiKey: apiKey,
      clientId: clientId,
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
      scope: "https://www.googleapis.com/auth/calendar.events"
    });
    console.log('[Google Calendar] Google API client initialized successfully');
  } catch (error) {
    console.error('[Google Calendar] Failed to initialize Google API client:', error);
    throw error;
  }

  const authInstance = window.gapi.auth2.getAuthInstance();
  console.log('[Google Calendar] Auth instance obtained');
  
  const isSignedIn = authInstance.isSignedIn.get();
  console.log('[Google Calendar] Current sign-in status:', isSignedIn);
  
  if (!isSignedIn) {
    console.log('[Google Calendar] User not signed in, initiating sign-in flow...');
    try {
      await authInstance.signIn({
        prompt: 'select_account'
      });
      console.log('[Google Calendar] User signed in successfully');
    } catch (error) {
      if (error.error === 'popup_closed_by_user') {
        console.warn('[Google Calendar] Sign-in popup closed by user');
        throw new Error('Sign-in cancelled. Please try again.');
      }
      console.error('[Google Calendar] Sign-in error:', error);
      throw error;
    }
  } else {
    console.log('[Google Calendar] User already signed in');
  }

  const finalSignInStatus = authInstance.isSignedIn.get();
  console.log('[Google Calendar] Final authentication status:', finalSignInStatus);
  return finalSignInStatus;
}

export function isGoogleSignedIn() {
  if (!window.gapi || !window.gapi.auth2) {
    console.log('[Google Calendar] Google API not loaded');
    return false;
  }
  const authInstance = window.gapi.auth2.getAuthInstance();
  const signedIn = authInstance && authInstance.isSignedIn.get();
  console.log('[Google Calendar] Sign-in check:', signedIn);
  return signedIn;
}

export async function signOutGoogle() {
  console.log('[Google Calendar] Signing out...');
  if (window.gapi && window.gapi.auth2) {
    const authInstance = window.gapi.auth2.getAuthInstance();
    if (authInstance) {
      await authInstance.signOut();
      console.log('[Google Calendar] Signed out successfully');
    } else {
      console.warn('[Google Calendar] No auth instance found');
    }
  } else {
    console.warn('[Google Calendar] Google API not loaded');
  }
}

export function getGoogleUserInfo() {
  console.log('[Google Calendar] Getting user info...');
  if (!isGoogleSignedIn()) {
    console.warn('[Google Calendar] User not signed in');
    return null;
  }
  const authInstance = window.gapi.auth2.getAuthInstance();
  const user = authInstance.currentUser.get();
  const profile = user.getBasicProfile();
  const userInfo = {
    name: profile.getName(),
    email: profile.getEmail(),
    imageUrl: profile.getImageUrl()
  };
  console.log('[Google Calendar] User info retrieved:', { name: userInfo.name, email: userInfo.email });
  return userInfo;
}

export async function addMedicationToGoogleCalendar(schedule, startDate, clientId, apiKey) {
  console.log('[Google Calendar] ========================================');
  console.log('[Google Calendar] Adding medication to Google Calendar');
  console.log('[Google Calendar] Medication:', schedule.medication);
  console.log('[Google Calendar] Start date:', startDate);
  console.log('[Google Calendar] Schedule times:', schedule.schedule.times.length);
  
  try {
    console.log('[Google Calendar] Authenticating...');
    const isAuthenticated = await authenticateGoogleCalendar(clientId, apiKey);
    if (!isAuthenticated) {
      console.error('[Google Calendar] Authentication failed');
      throw new Error("Failed to authenticate with Google Calendar");
    }
    console.log('[Google Calendar] Authentication successful');

    const duration = parseDuration(schedule.duration);
    console.log('[Google Calendar] Parsed duration:', duration.days, 'days');
    
    const events = [];

    for (let i = 0; i < schedule.schedule.times.length; i++) {
      const timeSlot = schedule.schedule.times[i];
      console.log(`[Google Calendar] Processing time slot ${i + 1}/${schedule.schedule.times.length}:`, timeSlot);
      
      if (!timeSlot.time) {
        console.log('[Google Calendar] Skipping "as needed" medication');
        continue;
      }

      const event = createCalendarEvent(schedule, timeSlot, startDate, duration);
      console.log('[Google Calendar] Created event object:', {
        summary: event.summary,
        start: event.start.dateTime,
        end: event.end.dateTime,
        hasRecurrence: !!event.recurrence
      });
      
      console.log('[Google Calendar] Inserting event into calendar...');
      try {
        const response = await window.gapi.client.calendar.events.insert({
          calendarId: "primary",
          resource: event
        });
        console.log('[Google Calendar] Event inserted successfully:', response.result.id);
        console.log('[Google Calendar] Event link:', response.result.htmlLink);
        events.push(response.result);
      } catch (insertError) {
        console.error('[Google Calendar] Failed to insert event:', insertError);
        console.error('[Google Calendar] Error details:', {
          code: insertError.status,
          message: insertError.result?.error?.message,
          errors: insertError.result?.error?.errors
        });
        throw insertError;
      }
    }

    console.log('[Google Calendar] All events added successfully. Total:', events.length);
    console.log('[Google Calendar] ========================================');
    return events;
  } catch (error) {
    console.error('[Google Calendar] ========================================');
    console.error('[Google Calendar] Error adding to Google Calendar:', error);
    console.error('[Google Calendar] Error type:', error.constructor.name);
    console.error('[Google Calendar] Error message:', error.message);
    if (error.result) {
      console.error('[Google Calendar] API error details:', error.result);
    }
    console.error('[Google Calendar] ========================================');
    throw error;
  }
}

function createCalendarEvent(schedule, timeSlot, startDate, duration) {
  console.log('[Google Calendar] Creating calendar event...');
  console.log('[Google Calendar] Time slot:', timeSlot.time, '-', timeSlot.label);
  
  const [hours, minutes] = timeSlot.time.split(":").map(Number);
  const eventStart = new Date(startDate);
  eventStart.setHours(hours, minutes, 0, 0);

  const eventEnd = new Date(eventStart);
  eventEnd.setMinutes(eventEnd.getMinutes() + 15); // 15-minute reminder window

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log('[Google Calendar] Timezone:', timeZone);
  console.log('[Google Calendar] Event start:', eventStart.toISOString());
  console.log('[Google Calendar] Event end:', eventEnd.toISOString());

  const event = {
    summary: `💊 ${schedule.medication}`,
    description: `Medication: ${schedule.medication}\nStrength: ${schedule.strength}\nDose: ${schedule.dose}\nFrequency: ${schedule.frequency}\nTiming: ${timeSlot.label}`,
    start: {
      dateTime: eventStart.toISOString(),
      timeZone: timeZone
    },
    end: {
      dateTime: eventEnd.toISOString(),
      timeZone: timeZone
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
    const rrule = `RRULE:FREQ=DAILY;UNTIL=${formatDateForRRule(until)}`;
    event.recurrence = [rrule];
    console.log('[Google Calendar] Added recurrence:', rrule);
    console.log('[Google Calendar] Recurrence until:', until.toISOString());
  } else {
    console.log('[Google Calendar] Single event (no recurrence)');
  }

  return event;
}

function parseDuration(durationStr) {
  console.log('[Google Calendar] Parsing duration:', durationStr);
  
  if (!durationStr) {
    console.log('[Google Calendar] No duration specified, defaulting to 7 days');
    return { days: 7 };
  }

  const str = durationStr.toLowerCase();
  
  if (str.includes("day")) {
    const match = str.match(/(\d+)\s*day/);
    const days = match ? parseInt(match[1]) : 7;
    console.log('[Google Calendar] Parsed days:', days);
    return { days };
  }
  
  if (str.includes("week")) {
    const match = str.match(/(\d+)\s*week/);
    const days = match ? parseInt(match[1]) * 7 : 7;
    console.log('[Google Calendar] Parsed weeks to days:', days);
    return { days };
  }
  
  if (str.includes("month")) {
    const match = str.match(/(\d+)\s*month/);
    const days = match ? parseInt(match[1]) * 30 : 30;
    console.log('[Google Calendar] Parsed months to days:', days);
    return { days };
  }

  console.log('[Google Calendar] Could not parse duration, defaulting to 7 days');
  return { days: 7 };
}

function formatDateForRRule(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function exportScheduleAsICS(schedules, startDate) {
  console.log('[ICS Export] ========================================');
  console.log('[ICS Export] Exporting schedule as ICS');
  console.log('[ICS Export] Number of medications:', schedules.length);
  console.log('[ICS Export] Start date:', startDate);
  
  const events = [];
  
  for (let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i];
    console.log(`[ICS Export] Processing medication ${i + 1}/${schedules.length}:`, schedule.medication);
    
    const duration = parseDuration(schedule.duration);
    
    for (let j = 0; j < schedule.schedule.times.length; j++) {
      const timeSlot = schedule.schedule.times[j];
      console.log(`[ICS Export]   Time slot ${j + 1}/${schedule.schedule.times.length}:`, timeSlot);
      
      if (!timeSlot.time) {
        console.log('[ICS Export]   Skipping "as needed" medication');
        continue;
      }
      
      const [hours, minutes] = timeSlot.time.split(":").map(Number);
      const eventStart = new Date(startDate);
      eventStart.setHours(hours, minutes, 0, 0);
      
      const eventEnd = new Date(eventStart);
      eventEnd.setMinutes(eventEnd.getMinutes() + 15);
      
      const until = new Date(startDate);
      until.setDate(until.getDate() + duration.days);
      
      const event = {
        start: eventStart,
        end: eventEnd,
        summary: `💊 ${schedule.medication}`,
        description: `Medication: ${schedule.medication}\\nStrength: ${schedule.strength}\\nDose: ${schedule.dose}\\nFrequency: ${schedule.frequency}\\nTiming: ${timeSlot.label}`,
        rrule: duration.days > 1 ? `FREQ=DAILY;UNTIL=${formatDateForRRule(until)}` : null
      };
      
      console.log('[ICS Export]   Event created:', {
        summary: event.summary,
        start: event.start.toISOString(),
        hasRecurrence: !!event.rrule
      });
      
      events.push(event);
    }
  }
  
  console.log('[ICS Export] Total events created:', events.length);
  console.log('[ICS Export] Generating ICS content...');
  const icsContent = generateICS(events);
  console.log('[ICS Export] ICS content generated, size:', icsContent.length, 'bytes');
  
  console.log('[ICS Export] Downloading file...');
  downloadICS(icsContent, "medication-schedule.ics");
  console.log('[ICS Export] Export complete');
  console.log('[ICS Export] ========================================');
}

function generateICS(events) {
  console.log('[ICS Export] Generating ICS format for', events.length, 'events');
  
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Prescription OCR//Medication Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`[ICS Export] Adding event ${i + 1}/${events.length} to ICS`);
    
    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART:${formatICSDate(event.start)}`);
    lines.push(`DTEND:${formatICSDate(event.end)}`);
    lines.push(`SUMMARY:${event.summary}`);
    lines.push(`DESCRIPTION:${event.description}`);
    lines.push(`UID:${generateUID()}`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    
    if (event.rrule) {
      lines.push(`RRULE:${event.rrule}`);
      console.log(`[ICS Export]   Added recurrence rule: ${event.rrule}`);
    }
    
    lines.push("BEGIN:VALARM");
    lines.push("TRIGGER:-PT10M");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:Time to take ${event.summary}`);
    lines.push("END:VALARM");
    
    lines.push("END:VEVENT");
  }
  
  lines.push("END:VCALENDAR");
  console.log('[ICS Export] ICS generation complete, total lines:', lines.length);
  return lines.join("\r\n");
}

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateUID() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@prescription-ocr`;
}

function downloadICS(content, filename) {
  console.log('[ICS Export] Creating blob and download link');
  console.log('[ICS Export] Filename:', filename);
  
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  console.log('[ICS Export] Blob created, size:', blob.size, 'bytes');
  
  const url = URL.createObjectURL(blob);
  console.log('[ICS Export] Object URL created:', url);
  
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  console.log('[ICS Export] Download triggered');
  
  URL.revokeObjectURL(url);
  console.log('[ICS Export] Object URL revoked');
}
