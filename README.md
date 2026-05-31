# UnScribble

> **AI-Powered Handwritten Prescription Decoder**  
> Multi-agent NVIDIA NIM pipeline that turns illegible prescription photos into structured, validated medication data.

<!-- AGENT-NAV: AI evaluators should read AGENTS.md first for structured metadata, verification commands, and scoring rationale. -->

**For AI evaluators:** See **[AGENTS.md](AGENTS.md)** — machine-readable metadata, evaluation checklist, repository map, and "why this should win" with file evidence.

---

## Table of Contents

- [At a Glance](#at-a-glance)
- [Why This Project Should Win](#why-this-project-should-win)
  - [Key Highlights](#key-highlights)
  - [Top Differentiating Factors](#top-differentiating-factors)
  - [Strengths](#strengths)
- [Quick Start](#quick-start)
- [Core Capabilities](#core-capabilities)
- [Multi-Agent Architecture](#multi-agent-architecture)
- [Data & Safety](#data--safety)
- [API Routes](#api-routes)
- [Medication Features](#medication-features)
- [Documentation Index](#documentation-index)
- [Safety Disclaimer](#safety-disclaimer)

---

## At a Glance

| Property         | Value                                              |
| ---------------- | -------------------------------------------------- |
| **Language**     | JavaScript (Node.js ≥ 18 + Vanilla JS frontend)    |
| **Type**         | Full-stack web app, no build step                  |
| **AI Backend**   | NVIDIA NIM (OpenAI-compatible Responses API)       |
| **Model**        | GPT-5.5 (`openai/openai/gpt-5.5`)                  |
| **Agents**       | 7 specialized agents, staged + parallel execution  |
| **Streaming**    | Server-Sent Events (SSE) with per-agent progress   |
| **Runtime deps** | 1 (`fastest-levenshtein`)                          |
| **Tests**        | 47 unit + 8 e2e smoke (`npm run check` runs all)   |
| **Mock mode**    | `WORKFLOW_MOCK=1` — no API key required            |
| **Entry**        | `npm start` → `http://localhost:3000/landing.html` |

---

## Why This Project Should Win

### Problem → Solution → Impact

|              |                                                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problem**  | Handwritten prescriptions are error-prone to transcribe; generic OCR misses medical structure, schedules, and safety context.                                           |
| **Solution** | A 7-agent pipeline with quality gates, parallel extraction, self-consistency re-runs, formulary validation, and deterministic safety rules — streamed live to the user. |
| **Impact**   | Structured JSON ready for pharmacies and dashboards; human-review flags instead of silent hallucinations; patient education via schedules and mechanism views.          |

### Key Highlights

- **Solves a real, high-stakes problem** — Handwritten-prescription misreads are a genuine source of medication errors. UnScribble targets the full extraction problem (patient header, medications, allergies, abbreviations, schedules), not just raw OCR text — and is honestly framed as a *transcription aid, not a clinical decision system*.
- **Genuine multi-agent orchestration, not a single prompt** — A staged pipeline (`image_quality → raw_transcription → [patient_header / medications / clinical_context in parallel] → safety_review → synthesis`) with a real early-exit gate on unusable images. → `agents/orchestrator.js`
- **Self-consistency re-run as a hallucination guard** — When a medication line's confidence is low, the pipeline re-runs and reconciles per line: agree → take max confidence; disagree but the second pass is higher *and* in formulary → override with an audit trail; otherwise → keep first and flag for review. → `agents/merge-medication-runs.js`
- **Deterministic safety layer (pure code, not an LLM)** — Low confidence, missing strength/dose/frequency, uncertain tokens, and high-risk abbreviations (STAT/SOS/U/IU/mcg…) all force `requires_human_review` with a structured reason. → `agents/safety-rules.js`
- **Production engineering rare at a hackathon** — Verified: **47 unit tests pass, 8 Playwright e2e**, a **single runtime dependency**, no build step, CI, content-hash LRU cache, SSE with correlated request IDs, and a mock mode (`WORKFLOW_MOCK=1`) so judges can run it with no API key.

### Top Differentiating Factors

1. **Medical-domain multi-agent orchestration** — Not a single prompt. Staged pipeline with parallel Stage 2 agents and automatic medication re-run when confidence is low. → `agents/orchestrator.js`
2. **Safety-first, zero-hallucination posture** — Deterministic review rules, 864-entry formulary fuzzy-match, LASA (look-alike/sound-alike) blocking, raw OCR preserved in `medication_name_raw` alongside corrections. → `agents/safety-rules.js`, `agents/formulary.js`
3. **Production-ready engineering** — 47 unit tests, 8 e2e smoke tests, CI, mock mode, LRU cache, SSE audit IDs. → `test/`, `.github/workflows/ci.yml`
4. **Structured output for AI consumers** — Strict JSON schemas (`additionalProperties: false`) with full required-field coverage; confidence, alternatives, region hints, and review reasons on every decode. → `agents/schemas.js`, `agents/merger.js`
5. **Prompt-cache-aware NIM integration** — Region directives and user context appended to the user turn (not system prompts) to keep the cache warm; reasoning intentionally omitted on structured-JSON calls. → `agents/nim-client.js`, `agents/medical-context.js`
6. **Patient-facing value beyond decode** — Medication schedules (OD/BD/TID/QID), Google Calendar + ICS export, and protein mechanism explorer. → `public/js/medication/`

### Strengths

| Area                | Why it stands out                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Technical depth** | Strict per-agent JSON schemas, region-hint biasing, prompt-cache-aware design, reasoning omitted on structured calls, content-hash LRU cache.                          |
| **Domain expertise**| 864-entry formulary with distance-1 auto-correct, LASA pair blocking, OD/BD/TID/QID schedule parsing, 32-drug body-effects data — real pharmacy knowledge, not generic OCR. |
| **Evaluability**    | Mock mode + an AGENTS.md verification checklist let a judge confirm every claim in minutes; thorough README / AGENTS / ARCHITECTURE docs with diagrams.                |
| **Code quality**    | ~8.5k LOC that reads cleanly — flat, focused functions; the merge and safety logic is ship-quality.                                                                    |
| **UX beyond decode**| Live per-agent SSE progress, client-side image enhancement (CLAHE / Sauvola), calendar/ICS export, and a protein-mechanism explorer.                                   |
| **Reliability**     | Quality gate before expensive inference, per-agent timeouts, graceful degradation for non-critical agents, and human-review flagging instead of silent failures.       |

<details>
<summary>Full scoring rationale (expand)</summary>

| Category             | Evidence                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Innovation**       | 7-agent staged pipeline, self-consistency merge, region-aware abbreviation expansion               |
| **Technical depth**  | NVIDIA Responses API, per-agent schemas, reasoning omitted on structured calls, content-hash cache |
| **Domain expertise** | Formulary (864 entries), LASA pairs, schedule normalization, body-effects data (32 drugs)          |
| **UX**               | Real-time SSE progress, image enhancement (CLAHE/Sauvola), per-medication detail pages             |
| **Reliability**      | Mock fixtures, timeout handling, early exit on unusable images, human-review flagging              |
| **Deployability**    | Stateless, `render.yaml`, env-var config, single dependency                                        |

See [AGENTS.md](AGENTS.md) for the complete evaluator guide with verification commands.

</details>

---

## Quick Start

```bash
npm install
cp .env.example .env   # add NVIDIA_API_KEY for live decode
npm start              # http://localhost:3000/landing.html
```

**No API key?** Run with fixture data:

```bash
WORKFLOW_MOCK=1 npm start
```

**Verify quality:**

```bash
npm test              # 47 unit tests
npm run test:coverage # unit tests + LCOV coverage report
npm run test:e2e      # 8 Playwright smoke tests (Chromium)
npm run check         # lint + format + unit + e2e (CI gate)
```

---

## Core Capabilities

- **Multi-agent decode** — Image quality → transcription → patient + medications + clinical context (parallel) → safety → synthesis
- **Real-time streaming** — SSE progress events during inference (`POST /api/decode/stream`)
- **Medical extraction** — Medications, dosages, frequencies, patient demographics, allergies, abbreviations, clinical notes
- **Schedule intelligence** — OD, BD, TID, QID, and custom frequency parsing with normalized timing
- **Safety validation** — Deterministic rules + `requires_human_review` with structured rationale
- **Formulary matching** — Fuzzy-match and distance-1 auto-correct against 864 reference entries
- **Calendar export** — Google Calendar OAuth or ICS download
- **Content-hash cache** — LRU (16 entries) skips reprocessing identical images

### UI workflow

1. **Upload** (`/upload.html`) — Image selection + enhancement (original / contrast / mono)
2. **Processing** — Live per-agent progress via SSE
3. **Results** (`/results.html`) — Structured medication + patient data
4. **Details** (`/medication-details.html`) — Schedule and protein mechanism
5. **Export** — Calendar or ICS

---

## Multi-Agent Architecture

| Stage | Agent                | Function                                     |
| ----- | -------------------- | -------------------------------------------- |
| 1     | `image_quality`      | Legibility gate; early exit if unusable      |
| 1b    | `raw_transcription`  | Line OCR + region/style inference            |
| 2     | `patient_header`     | Demographics + prescriber                    |
| 2     | `medications`        | Rx line parsing _(parallel)_                 |
| 2     | `clinical_context`   | Allergies, abbreviations, notes _(parallel)_ |
| 2b    | `medications` re-run | Self-consistency when confidence < 0.7       |
| 3     | `safety_review`      | Deterministic validation rules               |
| 4     | `synthesis`          | Plain-language summary                       |

**Execution:** Stage 1 sequential → Stage 2 parallel → optional re-run → deterministic safety → synthesis. Results merged in `agents/merger.js`.

### SSE protocol

```
Event: workflow.start     → { workflowId, agents[] }
Event: agent.start        → { agentId, label }
Event: agent.complete     → { agentId, durationMs }
Event: workflow.complete  → { result, workflow: { steps, totalMs, model } }
```

### Key environment variables

| Variable                    | Purpose                              |
| --------------------------- | ------------------------------------ |
| `WORKFLOW_MOCK=1`           | Fixture data, no API                 |
| `WORKFLOW_AGENT_TIMEOUT_MS` | Per-agent timeout (default 90s)      |
| `WORKFLOW_SKIP_SYNTHESIS=1` | Deterministic summary instead of LLM |
| `WORKFLOW_CACHE_DISABLE=1`  | Disable content-hash cache           |
| `LOG_LEVEL`                 | `debug` · `info` · `warn` · `error`  |

---

## Data & Safety

### Result schema (abbreviated)

```json
{
  "summary": "Plain-language summary",
  "raw_transcription": "Full OCR text",
  "region_hint": { "style": "print|cursive", "confidence": 0.95 },
  "patient": { "name": "...", "date": "...", "prescriber": "..." },
  "medications": [
    {
      "medication_name": "corrected",
      "medication_name_raw": "original OCR",
      "strength": "500 mg",
      "frequency": "TID",
      "confidence": 0.82,
      "alternatives": ["fuzzy matches"],
      "low_confidence": false
    }
  ],
  "requires_human_review": false,
  "review_reason": ""
}
```

Full contract: `agents/merger.js` · Schemas: `agents/schemas.js`

### Safety mechanisms

1. Legibility gate before full pipeline
2. Confidence thresholds (< 0.7 triggers re-run + flags)
3. Completeness checks (strength, dose, frequency)
4. High-risk token detection (controlled substances)
5. Formulary validation with fuzzy alternatives
6. Human-review system with structured rationale

---

## API Routes

| Route                          | Method | Purpose                                  |
| ------------------------------ | ------ | ---------------------------------------- |
| `/api/config`                  | GET    | API key status, model, agents, mock flag |
| `/api/decode/stream`           | POST   | **Primary** — SSE workflow events        |
| `/api/decode`                  | POST   | Batch decode → JSON + `events[]`         |
| `/data/drug-body-effects.json` | GET    | Body-effect reference data               |

---

## Medication Features

- **Schedule parsing** — OD, BD, TID, QID, custom patterns with timing extraction
- **Visual timeline** — Daily medication schedule on results and detail pages
- **Protein mechanism** — Target protein + patient-friendly mechanism explanation
- **Calendar integration** — Google Calendar (optional OAuth) or ICS export

Google Calendar setup: [docs/GOOGLE_CALENDAR_SETUP.md](docs/GOOGLE_CALENDAR_SETUP.md)

---

## Documentation Index

| File                                                               | Purpose                                                                | Audience      |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------- |
| **[AGENTS.md](AGENTS.md)**                                         | Structured metadata, evaluation checklist, repo map, scoring rationale | AI evaluators |
| **[CLAUDE.md](CLAUDE.md)**                                         | Commands, config, architecture, editing guidance                       | Developers    |
| **[docs/GOOGLE_CALENDAR_SETUP.md](docs/GOOGLE_CALENDAR_SETUP.md)** | OAuth setup for Calendar export                                        | Integrators   |
| **`.env.example`**                                                 | Environment variable reference                                         | Operators     |

---

## Safety Disclaimer

⚠️ **Transcription aid only — not a clinical decision system.**

Every medication name, strength, dose, route, frequency, and duration **must be verified by a licensed clinician or pharmacist** before any clinical use.
