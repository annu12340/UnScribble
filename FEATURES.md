# Prescription OCR Features

## Quick Overview

Two-page workflow for prescription image upload → OCR processing → medication schedule with calendar integration.

---

## Key Features

### Upload Page (`/upload.html`)
- Upload prescription images
- Image enhancement (Original/Contrast/Mono)
- Live OCR progress tracking
- Auto-redirect to results

### Results Page (`/results.html`)
- Patient information
- Medication details & schedule
- Calendar integration
- Export options (JSON/ICS)

### Medication Schedule Parser
Extracts timing from prescriptions:
- **Frequency**: OD, BD, TID, QID, PRN
- **Timing**: Morning, afternoon, evening, bedtime
- **Duration**: Days, weeks, months
- **Smart defaults** when data is unclear

### Calendar Integration

**Option 1: Google Calendar** (requires setup)
- Add medications individually or all at once
- Recurring events with reminders
- See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md)

**Option 2: ICS Export** (no setup needed)
- Download `.ics` file
- Import to any calendar app
- Works with Google/Outlook/Apple Calendar

---

## Files Changed

### New Files
```
public/upload.html              # Upload interface
public/upload.js                # Upload logic
public/results.html             # Results interface
public/results.js               # Results logic
public/medication-schedule.js   # Schedule parser & calendar
GOOGLE_CALENDAR_SETUP.md        # Setup guide
```

### Modified Files
```
public/app.js           # Schedule imports
public/render-result.js # Schedule rendering
public/styles.css       # New page styles
server.js               # Root redirect
```

---

## User Flow

1. Visit `/upload.html` → Upload prescription image
2. Watch live OCR progress
3. Auto-redirect to `/results.html`
4. View medication schedule
5. Add to calendar (Google or ICS export)

---

## Technical Notes

### Data Storage
- **Session**: Results stored in `sessionStorage` for page navigation
- **Local**: Google credentials in `localStorage` (browser only)

### Schedule Parsing
- Regex patterns for frequency (OD, BD, TID, etc.)
- Timing inference from text
- Duration conversion to day counts
- Smart defaults for unclear data

### Calendar APIs
- **Google**: OAuth 2.0 + `gapi.client.calendar`
- **ICS**: RFC 5545 compliant iCalendar format

---

## Security

- Credentials stored in browser only (not server)
- OAuth consent required for Google Calendar
- Use environment variables in production

---

## Future Ideas

- Backend credential management
- Multiple calendar providers (Outlook, Apple)
- SMS/Email reminders
- Medication interaction warnings
- Refill reminders
