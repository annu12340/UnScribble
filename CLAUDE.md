# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Related docs:** [README.md](README.md) (human overview) · [AGENTS.md](AGENTS.md) (AI evaluator guide with structured metadata, verification checklist, and scoring rationale)

## Commands

- `npm install` — installs runtime and dev quality tooling dependencies.
- `npm start` (or `npm run dev`) — runs `node server.js`. No build step or bundler.
- `npm test` — `node --test` for unit and focused browser-module tests (47 tests).
- `npm run check` — strict lint, Prettier, unit tests, and Playwright e2e (8 tests).
- `npm run test:coverage` — unit tests with Node coverage (`coverage/lcov.info`).
- `npm run lint:strict` — syntax checks, stale-path structure checks, and ESLint with zero warnings.
- `npm run format:check` — Prettier check for JS/CSS/HTML/MD/JSON/YAML.
- `npm run check` — strict lint, Prettier check, Node tests, and Playwright e2e.
- `npm run test:e2e` — Playwright smoke tests (`npx playwright install chromium` once after install).
- Requires Node >= 18 (uses global `fetch`).
- Server binds to `0.0.0.0:${PORT || 3000}`.
- `WORKFLOW_MOCK=1 npm start` — runs the multi-agent pipeline with fixture outputs (no NVIDIA API calls).

## Configuration

- `.env` is loaded by `loadDotEnv` in `server.js` before agent modules load. Copy `.env.example` → `.env`.
- **Required for live decode:** `NVIDIA_API_KEY`. Without it (and without `WORKFLOW_MOCK=1`), decode endpoints return 500.
- `NVIDIA_API_BASE_URL` defaults to `https://inference-api.nvidia.com/v1`.
- `NVIDIA_MODEL` defaults to `openai/openai/gpt-5.5` in `agents/config.js`.
- Reasoning is intentionally not sent on structured-JSON calls (see `agents/nim-client.js`); the `NVIDIA_REASONING_EFFORT` env var is ignored.
- `WORKFLOW_MOCK=1` — fixture agent outputs from `agents/mock-fixtures.js`.
- `WORKFLOW_AGENT_TIMEOUT_MS` — per-agent timeout (default 90000).
- `NVIDIA_REQUEST_TIMEOUT_MS` — abort timeout for individual NVIDIA fetches (default follows `WORKFLOW_AGENT_TIMEOUT_MS`, 90000).
- `WORKFLOW_SKIP_SYNTHESIS=1` — skip synthesis agent step (summary built in merger).
- `WORKFLOW_CACHE_DISABLE=1` — disable in-memory decode result cache.
- `WORKFLOW_CACHE_TTL_MS` — TTL for cached decode results (default 300000, i.e. 5 minutes).
- `WORKFLOW_LOG=0` — disable workflow/NIM logs to the terminal (on by default).
- `LOG_LEVEL` — `debug`, `info`, `warn`, or `error` (default `info`).

## Architecture

Two-tier app: thin HTTP server (`server.js`) + vanilla frontend (`public/`). Decode logic lives under `agents/`.

```text
server.js          → routes, static files, SSE
agents/
  orchestrator.js  → staged workflow, self-consistency re-run, in-memory cache
  run-agent.js     → shared runVisionAgent / runTextAgent helpers
  nim-client.js    → NVIDIA Responses API (optional temperatureNudge)
  schemas.js       → per-agent JSON schemas
  prompts.js       → per-agent system prompts
  medical-context.js → LASA pairs, region directives, prompt context block
  merger.js        → merge agent artifacts; deterministic summary builder
  safety-rules.js  → deterministic human-review rules
  formulary.js     → dedup, fuzzy match, distance-1 auto-correct
  runners/*.js     → one thin runner per agent (delegates to run-agent.js)
  features/*.js    → protein mechanism and body-effect helpers
public/
  js/core/         → shared browser modules
  js/pages/        → page entrypoints
  js/medication/   → medication schedule, mechanism, and chart modules
  css/             → shared and page styles
data/
  formulary.json
  drug-body-effects.json
```

### Workflow stages (orchestrator.js)

1. **Stage 1** · `image_quality` runs alone. If `legibility === "unusable"`, the workflow short-circuits through `safety_review` and formulary validation.
2. **Stage 1b** · `raw_transcription` (also infers `region_hint: { style, confidence, evidence }`).
3. **Stage 2** · `patient_header` + `medications` + `clinical_context` in parallel. Medications and clinical_context consume `region_hint` to bias abbreviation/schedule expansion.
4. **Stage 2b** · Medications self-consistency re-run if any first-pass row has `medication_name_confidence < 0.7` or uncertainty markers. Skipped when >6 rows qualify. Second pass uses `temperatureNudge` and a focused `lasaBlockFor(firstPassNames)`. `mergeMedicationRuns` decides per-line: agree → max confidence; disagree but second is higher and in formulary → take second; otherwise → keep first, flag `low-confidence: runs disagree`.
5. **Stage 3** · `safety_review` (deterministic).
6. **Stage 4** · `synthesis` (LLM by default; deterministic template via `merger.buildDeterministicSummary` when `WORKFLOW_SKIP_SYNTHESIS=1`).
7. **Post** · `validateAgainstFormulary` dedups by `(name|strength|form)`, then per row: distance-1 unambiguous match → promote into `medication_name` (original preserved in `medication_name_raw`, pushed to `alternatives`); ambiguous → leave name, append fuzzy alternatives; no match → cap confidence and flag.

### Workflow cache

`orchestrator.js` keeps a content-hash LRU (16 entries) keyed on `sha256(imageDataUrl|originalImageDataUrl)`. Disabled in mock mode and when `WORKFLOW_CACHE_DISABLE=1`. Cache hits emit a single `workflow.start` + `workflow.complete` with `workflow.cached = true` and skip per-agent events. Only successful, non-early-exit runs are stored.

### API routes

| Route                              | Purpose                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `GET /api/config`                  | API key status, model, `workflow: true`, `agents[]`, `mock`                |
| `POST /api/decode/stream`          | **Primary** — SSE workflow events, final `workflow.complete` with `result` |
| `POST /api/decode`                 | Batch — same orchestrator, returns JSON + `events[]`                       |
| `GET /data/drug-body-effects.json` | Internal static body-effect data                                           |

### SSE events

- `workflow.start` — `{ workflowId, agents: [{ id, label }] }`
- `agent.start` / `agent.complete` / `agent.error` — progress (no full PHI in stream)
- `workflow.complete` — `{ result, workflow: { steps, totalMs, model } }`
- `workflow.error` — `{ message, agentId? }`

HTTP responses include `X-Request-ID`; decode SSE events and workflow objects include the same request ID for correlation.

### Result contract

`agents/merger.js` produces the object consumed by `public/js/pages/results.js` and `public/js/pages/medication-details.js`: `summary`, `raw_transcription`, `region_hint`, `patient`, `medications[]` (with extended fields including `medication_name_raw`), `allergies`, `clinical_context`, `abbreviations`, `non_medication_text`, `follow_up_instructions`, `global_warnings`, `image_quality` (with `recommended_preprocessing`), `requires_human_review`, `review_reason`.

When changing fields, update **agent schemas** in `agents/schemas.js`, **merger**, **mock-fixtures.js**, and **frontend renderers**. `region_hint`, `medication_name_raw`, and `image_quality.recommended_preprocessing` are all in `required` under strict mode.

### Frontend

- ES modules: page entrypoints in `public/js/pages/` import shared modules from `public/js/core/` and medication modules from `public/js/medication/`; enhancement runs in `public/js/core/image-enhance.worker.js` when available.
- `decodePrescriptionStream()` uses `fetch` + `ReadableStream` on `/api/decode/stream`.
- Loading UI: Rx bottle loader and per-agent list on the upload page.
- Image enhancement on canvas: `original`, `contrast` (CLAHE), `mono` (Sauvola). Non-original modes send `originalImageDataUrl` for vision agents.

## Editing guidance

- Preserve transcription-aid framing in prompts and UI copy (not a clinical decision system).
- Add dependencies only when necessary; formulary already uses `fastest-levenshtein`.
- Critical agents (`raw_transcription`, `medications`) fail the workflow on error; others degrade with empty sections.
- Strict JSON schemas: every new property must be in both `properties` and `required`, and the parent object must keep `additionalProperties: false`.
- `region_hint` is consumed via `regionDirective(hint, audience)` in `medical-context.js` — append the directive to the user text, not the system instructions, so the prompt cache stays warm.
- New agents should go through `runVisionAgent` / `runTextAgent` in `run-agent.js` instead of calling `callResponses` directly — they handle the `buildUserContextBlock` append and stash `ctx.lastNimRequestId` for telemetry.
