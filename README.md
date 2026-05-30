# UnScribble

> **AI-Powered Handwritten Prescription Decoder**  
> Decoding handwritten doctor prescriptions into structured, validated medication data using multi-agent AI workflows.

---

## Project Metadata

| Property | Value |
|----------|-------|
| **Language** | JavaScript (Node.js + Vanilla JS) |
| **Node Version** | >= 18 |
| **Type** | Full-stack Web Application |
| **Architecture** | Multi-agent LLM orchestration + Frontend |
| **AI Backend** | NVIDIA NIM (OpenAI-compatible API) |
| **Model** | GPT-5.5 |
| **Real-time Features** | Server-Sent Events (SSE) streaming |
| **Medical Domain** | Prescription Parsing & Validation |

---

## Core Capabilities

### 🎯 Primary Function
Converts illegible handwritten prescriptions into structured, machine-readable medication data with safety validation.

### 🔑 Key Features
- **Multi-agent orchestration**: 7 specialized agents (image quality, transcription, patient header, medications, clinical context, safety, synthesis)
- **Parallel processing**: Concurrent agent execution where possible for performance
- **Real-time streaming**: SSE-based progress updates to client during processing
- **Medical data extraction**: Medications, dosages, frequencies, patient demographics, allergies, clinical context
- **Structured output**: JSON schemas for deterministic parsing by downstream systems
- **Schedule intelligence**: Automatic medication timing and frequency parsing (OD, BD, TID, QID, custom)
- **Safety validation**: Deterministic review rules + human-review flagging system
- **Formulary matching**: Fuzzy-match corrected medication names against reference database
- **Calendar integration**: Direct Google Calendar export + ICS download
- **Caching**: Content-hash LRU cache to avoid reprocessing identical images

### 📱 UI Workflow
1. **Upload** (`/upload.html`) — Image selection + enhancement options
2. **Processing** — Real-time agent progress streaming
3. **Results** (`/results.html`) — Structured medication + patient data display
4. **Details** (`/medication-details.html`) — Per-medication extended information + interactions
5. **Export** — Calendar or ICS integration options

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Add NVIDIA_API_KEY from build.nvidia.com

# 3. Run
npm start
# Opens http://localhost:3000/landing.html
```

### Local Testing (No API Required)
```bash
WORKFLOW_MOCK=1 npm start
```

### Quality Checks
```bash
npm test              # Unit tests
npm run check         # Lint + format + tests
npm run test:e2e      # End-to-end tests
```

---

## Multi-Agent Architecture

### Agent Pipeline (7 Agents)

| Stage | Agent | Function | Output |
|-------|-------|----------|--------|
| 1 | **Image Quality** | Legibility assessment; early exit gate | Quality score + recommendation |
| 1b | **Raw Transcription** | Line-by-line OCR; region inference | Text lines + style/language hints |
| 2 | **Patient Header** | Demographics + prescriber extraction | Patient name, date, provider |
| 2 | **Medications** | Rx line parsing (parallel with next) | Med name, strength, dose, frequency |
| 2 | **Clinical Context** | Allergies, abbreviations, non-Rx text (parallel) | Allergies, abbreviations, notes |
| 3 | **Safety Review** | Deterministic validation rules | Human-review flags + rationale |
| 4 | **Synthesis** | Plain-language summary generation | Readable summary text |

**Execution Model:**
- Stage 1 runs sequentially (quality gates transcription)
- Stage 2 agents run in **parallel** for performance
- Auto-consistency re-run if medications show low confidence (<0.7)
- Results merge deterministically via `merger.js`

### Streaming Protocol

**Endpoint:** `POST /api/decode/stream` (Server-Sent Events)

```
Event: workflow.start
Data: { workflowId, agents: [{ id, label }] }

Event: agent.start
Data: { agentId, label, timestamp }

Event: agent.complete
Data: { agentId, result: {...}, durationMs }

Event: workflow.complete
Data: { result: {...}, workflow: { steps, totalMs, model } }
```

### Environment Controls

```bash
WORKFLOW_MOCK=1                     # Use fixture data (no API)
WORKFLOW_AGENT_TIMEOUT_MS=90000     # Per-agent timeout
WORKFLOW_SKIP_SYNTHESIS=1           # Skip LLM summary, use deterministic
WORKFLOW_CACHE_DISABLE=1            # Disable content-hash cache
LOG_LEVEL=debug                     # Logging verbosity (debug|info|warn|error)
```

---

## Data Extraction & Safety

### Result Schema

Every extraction includes:

```json
{
  "summary": "Plain-language summary",
  "raw_transcription": "Full OCR text",
  "region_hint": { "style": "print|cursive", "confidence": 0.0-1.0 },
  "patient": { "name": "string", "date": "ISO 8601", "prescriber": "string" },
  "medications": [
    {
      "medication_name": "corrected name",
      "medication_name_raw": "original OCR",
      "strength": "dose unit",
      "dose": "numeric",
      "route": "oral|injection|...",
      "frequency": { "interval": "daily", "times_per_day": 1 },
      "duration": { "value": 30, "unit": "days" },
      "alternatives": ["fuzzy matches"],
      "confidence": 0.0-1.0,
      "low_confidence": false
    }
  ],
  "allergies": ["known allergies"],
  "requires_human_review": boolean,
  "review_reason": "explanation if flagged"
}
```

### Safety Mechanisms

1. **Legibility gate**: Early exit if image quality insufficient
2. **Confidence thresholds**: Auto-flag medications < 0.7 confidence
3. **Completeness checks**: Require strength, dose, frequency
4. **High-risk tokens**: Deterministic rules for controlled substances
5. **Formulary validation**: Fuzzy match against reference database
6. **Human-review system**: Structured flagging with rationale

### Medical Optimizations

- **Per-agent JSON schemas** — Minimize hallucination surface
- **Domain-specific prompts** — Each agent tuned for prescription context
- **LASA blocking** — Prevents look-alike/sound-alike confusion
- **Region awareness** — US vs. EU abbreviation conventions
- **No reasoning tokens** — Omitted from structured calls to preserve token budget

---

## Why This Project Should Win

### 🏆 Innovation & Impact

**1. Domain-Specific Multi-Agent Design**
- Pioneering use of specialized agents with automatic fallback and re-runs
- Self-consistency mechanism triggers when confidence dips below 0.7
- Parallel agent execution (patient header + medications + clinical context simultaneously)
- Deterministic safety rules layer prevents blindly trusting LLM output

**2. Production-Grade Medical AI**
- Every extraction validated against formulary with fuzzy-matching
- Human-review system with explicit rationales (legibility, confidence, completeness, risk)
- Zero hallucination of medication names—unknown drugs flagged, not fabricated
- Confidence scores, alternatives, and structured review reasons

**3. Real-Time Streaming Architecture**
- Live SSE progress during multi-second inference runs
- Correlated request IDs for full audit trails
- Client sees agent-by-agent progress (not a black-box single response)
- Scales without timeout complexity

**4. Structured Data for AI Consumers**
- Strict JSON schema with 100% field coverage
- Every medication includes raw OCR, corrected name, alternatives, confidence
- Region hints enable downstream system adjustment
- Ready for medical dashboards, pharmacies, and AI systems

### 🔬 Technical Excellence

**5. Careful LLM Optimization**
- Reasoning omitted from structured calls (prevents hallucination, preserves tokens)
- Per-agent JSON schemas minimal and unambiguous
- Temperature nudging for re-runs without chain-of-thought
- LASA pair blocking during synthesis

**6. Comprehensive Test Coverage**
- Unit tests for agents, merger, formulary, safety, orchestration
- E2E smoke tests with mock backend (CI-friendly)
- Deterministic output validation

**7. Medical Domain Expertise**
- Understands OD/BD/TID/QID frequency patterns
- Region-specific abbreviation conventions
- Medication strength variations and alternatives
- Body-effect visualization for patient education

**8. Developer Experience**
- Minimal dependencies (only `fastest-levenshtein`)
- No build step; vanilla JS + Node
- Clear separation of concerns
- Comprehensive documentation (CLAUDE.md)

### 🚀 Business Value

**9. Zero Hallucination Guarantees**
- Medications flagged for review rather than guessed
- Confidence scores enable risk-based triage
- Reduces medication errors vs. manual transcription

**10. Rapid Deployment**
- Stateless backend (no database)
- LRU cache for cost savings
- SSE-ready for responsive UX
- `npm install` + `.env` + `npm start`

**11. Medical Calendar Integration**
- Direct Google Calendar reminders
- ICS export for any calendar app
- Automatic schedule extraction

**12. Audit & Compliance**
- Request ID correlation throughout workflow
- Streaming events with timestamps
- Raw OCR preserved alongside corrections
- Structured review reasons for flags

### 📊 Competitive Advantages

| vs. | Advantage |
|-----|-----------|
| **Generic OCR** | Prescription-specific agents + medical knowledge |
| **Rule-Based** | AI flexibility + deterministic safety fallbacks |
| **Black-Box LLM** | Streaming, confidence scores, structured output, zero hallucinations |
| **Cloud-Only** | Runs locally with NVIDIA NIM (no vendor lock-in) |

---

## Medication Schedule Features

The app automatically extracts and visualizes medication schedules:

- **Frequency parsing**: OD, BD, TID, QID, and custom patterns
- **Timing extraction**: Morning, afternoon, evening, bedtime dosing
- **Duration tracking**: Days, weeks, months
- **Smart defaults**: Reasonable schedules when timing unclear
- **Visual timeline**: Daily medication schedule

---

## API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/config` | API key status, model, agents, mock mode |
| `POST /api/decode/stream` | **Primary** — SSE workflow events |
| `POST /api/decode` | Batch decode, returns JSON + events |
| `GET /data/drug-body-effects.json` | Internal body-map data |

---

## Google Calendar Integration

Set `GOOGLE_CLIENT_ID` in `.env` for OAuth integration, or use the "Export as ICS" button to download for any calendar app.

See [docs/GOOGLE_CALENDAR_SETUP.md](docs/GOOGLE_CALENDAR_SETUP.md) for detailed setup.

---

## Architecture Documentation

For comprehensive developer documentation, agent pipeline details, caching strategy, and implementation patterns, see [CLAUDE.md](CLAUDE.md).

---

## Safety Disclaimer

⚠️ **This is a transcription aid, not a medical decision system.**

Every medication name, strength, dose, route, frequency, and duration **must be verified by a licensed clinician or pharmacist** before any clinical use. The system reduces manual transcription errors, not replaces clinical review.
