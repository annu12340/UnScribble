# New Features: Two-Page Flow & Calendar Integration

## Overview

The Prescription OCR app has been enhanced with a two-page workflow and medication schedule management with Google Calendar integration.

## What's New

### 1. Two-Page Workflow

**Upload Page** (`/upload.html`)
- Clean, focused interface for uploading prescription images
- Image enhancement options (Original, Contrast, Mono)
- Real-time preview of selected image
- Live progress tracking during OCR processing
- Automatic redirect to results page upon completion

**Results Page** (`/results.html`)
- Comprehensive view of extracted prescription data
- Patient information display
- Detailed medication breakdown
- Medication schedule with timing
- Google Calendar integration
- Export options (JSON, ICS)

### 2. Medication Schedule Parser

Automatically extracts and displays medication schedules:

- **Frequency Recognition**: OD, BD, TID, QID, PRN, custom patterns
- **Timing Extraction**: Morning, afternoon, evening, bedtime
- **Duration Parsing**: Days, weeks, months
- **Smart Defaults**: Generates reasonable schedules when unclear
- **Visual Display**: Shows each medication with its timing throughout the day

### 3. Google Calendar Integration

**Features:**
- Add individual medications to Google Calendar
- Add all medications at once
- Recurring events based on duration
- Customizable start date
- 10-minute and 0-minute reminders
- Medication emoji (💊) for easy identification

**Setup Required:**
- Google Cloud Project
- Calendar API enabled
- OAuth 2.0 Client ID
- API Key

See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for detailed setup instructions.

### 4. ICS Export (No Setup Required)

**Alternative to Google Calendar:**
- Click "Export as ICS" button
- Download `.ics` file
- Import into any calendar app:
  - Google Calendar
  - Outlook
  - Apple Calendar
  - Any iCal-compatible app

No API credentials needed!

## File Structure

### New Files

```
public/
├── upload.html          # Upload page UI
├── upload.js            # Upload page logic
├── results.html         # Results page UI
├── results.js           # Results page logic
├── medication-schedule.js  # Schedule parsing & calendar integration
└── index.html           # Redirects to upload.html

GOOGLE_CALENDAR_SETUP.md  # Setup guide
FEATURES.md               # This file
```

### Modified Files

```
public/
├── app.js               # Added schedule imports
├── render-result.js     # Added schedule rendering
├── styles.css           # Added new page styles
└── decode-client.js     # Fixed SSE null destructuring bug

server.js                # Added root redirect to /upload.html
README.md                # Updated documentation
```

## Usage Flow

1. **Upload**: User visits `/upload.html` and uploads prescription image
2. **Process**: Multi-agent workflow extracts data with live progress
3. **Results**: Automatic redirect to `/results.html` with extracted data
4. **Schedule**: View medication schedule with timing
5. **Calendar**: 
   - Option A: Add to Google Calendar (requires setup)
   - Option B: Export as ICS (no setup)

## Technical Details

### Session Storage

Results are stored in `sessionStorage` for navigation between pages:
```javascript
sessionStorage.setItem("prescriptionResult", JSON.stringify(resultData));
```

### Local Storage

Google Calendar credentials are saved in `localStorage`:
```javascript
localStorage.setItem("googleClientId", clientId);
localStorage.setItem("googleApiKey", apiKey);
```

### Schedule Parsing Logic

The medication schedule parser (`medication-schedule.js`) handles:

1. **Frequency patterns**: Regex matching for common abbreviations
2. **Timing inference**: Extracts meal times and time-of-day from text
3. **Default generation**: Creates sensible schedules when data is unclear
4. **Duration calculation**: Converts text durations to day counts

### Google Calendar API

Uses Google's JavaScript client library:
- `gapi.client.calendar.events.insert()` for creating events
- OAuth 2.0 for authentication
- Recurring events via RRULE
- Custom reminders and colors

### ICS Generation

Standard iCalendar format:
- VEVENT blocks for each medication time
- VALARM for reminders
- RRULE for recurring events
- RFC 5545 compliant

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires `sessionStorage` and `localStorage`
- Google Calendar requires `gapi` library
- ICS export uses Blob API

## Security Considerations

- API credentials stored in browser only (localStorage)
- No server-side credential storage
- Credentials never sent to backend
- Users should use environment variables in production
- OAuth consent screen required for Google Calendar

## Future Enhancements

Potential improvements:
- Backend credential management
- Multiple calendar provider support (Outlook, Apple)
- SMS/Email reminders
- Medication interaction warnings
- Refill reminders
- Dosage tracking
