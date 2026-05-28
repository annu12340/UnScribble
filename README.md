# UnScribble

A web app for decoding handwritten doctor prescriptions using a **multi-agent workflow** on **NVIDIA NIM** (OpenAI-compatible Responses API), with live SSE progress and prescription-specific structured extraction.

## Features

- **Two-page workflow**: Upload page for image processing, results page for detailed analysis
- **Medication schedule extraction**: Automatically parses medication timing and frequency
- **Google Calendar integration**: Add medication reminders directly to your calendar
- **ICS export**: Download schedule for any calendar app
- **Multi-agent OCR**: Specialized agents for quality, transcription, medications, and safety
- **Real-time progress**: Live SSE streaming shows agent workflow status

## Run

1. Copy `.env.example` to `.env`.
2. Set `NVIDIA_API_KEY` from [build.nvidia.com](https://build.nvidia.com) → API Keys.
3. Install dependencies and start:

```bash
npm install
npm start
```

Open `http://localhost:3000` (redirects to `/landing.html`).

### Workflow

1. **Upload page** (`/upload.html`): Upload prescription image, choose enhancement mode, process
2. **Results page** (`/results.html`): View extracted medications, patient info, and medication schedule
3. **Medication details** (`/medication-details.html`): View detailed information for individual medications
4. **Calendar integration**: Click "Add to Google Calendar" to set medication reminders

### Google Calendar Setup

To enable calendar integration:

- Set `GOOGLE_CLIENT_ID` in your `.env` file
- See [docs/GOOGLE_CALENDAR_SETUP.md](docs/GOOGLE_CALENDAR_SETUP.md) for a step-by-step guide to obtaining the OAuth Client ID

**Quick alternative**: Use "Export as ICS" button to download and import into any calendar app without API setup.

### Local UI testing (no API)

```bash
WORKFLOW_MOCK=1 npm start
```

### Tests

```bash
npm test
npm run check
npm run test:e2e
```

`npm run check` runs syntax checks, stale-path structure checks, ESLint, Prettier format checks, and the Node test suite. `npm run test:e2e` runs Playwright smoke tests against a mock local server; run `npx playwright install chromium` once after installing dependencies.

## Multi-agent workflow

Decoding runs through specialized agents orchestrated in stages:

| Agent             | Role                                    |
| ----------------- | --------------------------------------- |
| Image quality     | Legibility gate; early exit if unusable |
| Raw transcription | Line-by-line OCR                        |
| Patient header    | Demographics and prescriber             |
| Medications       | Rx lines, doses, alternatives           |
| Clinical context  | Abbrevs, allergies, non-Rx text         |
| Safety review     | Deterministic review rules              |
| Summary           | Plain-language summary                  |

Stage 1 assesses image quality first, then transcribes if legible. Stage 2 runs patient header, medications, and clinical context in parallel. Progress streams to the browser via `POST /api/decode/stream` (Server-Sent Events). Batch decode without streaming: `POST /api/decode`. Static internal body-map data is served at `GET /data/drug-body-effects.json`.

## Medication Schedule Features

The app automatically extracts medication schedules from prescription data:

- **Frequency parsing**: Recognizes OD, BD, TID, QID, and custom frequencies
- **Timing extraction**: Identifies morning, afternoon, evening, bedtime dosing
- **Duration tracking**: Parses treatment duration (days, weeks, months)
- **Smart defaults**: Generates reasonable schedules when timing is unclear
- **Visual timeline**: Shows when to take each medication throughout the day

## Model

- **Base URL:** `https://inference-api.nvidia.com/v1` (`NVIDIA_API_BASE_URL`)
- **Model:** `openai/openai/gpt-5.5` (`NVIDIA_MODEL`)
- **Request timeout:** `90000ms` by default (`NVIDIA_REQUEST_TIMEOUT_MS`; falls back to `WORKFLOW_AGENT_TIMEOUT_MS`)
- Reasoning is intentionally omitted from structured-JSON calls — it competes with `max_output_tokens` and tends to truncate the JSON body.

## Medical tuning

- Per-agent prompts and small JSON schemas reduce hallucination surface
- Formulary fuzzy-match (`data/formulary.json`) after extraction
- Safety rules force human review for low confidence, missing fields, poor legibility, and high-risk tokens

## Safety

This app is a transcription aid, not a medical decision system. Every medication name, strength, dose, route, frequency, and duration must be verified by a licensed clinician or pharmacist before use.
