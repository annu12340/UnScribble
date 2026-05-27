# Prescription OCR

A web app for decoding handwritten doctor prescriptions using a **multi-agent workflow** on **NVIDIA NIM** (OpenAI-compatible Responses API), with live SSE progress and prescription-specific structured extraction.

## Run

1. Copy `.env copy.example` to `.env`.
2. Set `NVIDIA_API_KEY` from [build.nvidia.com](https://build.nvidia.com) → API Keys.
3. Install dependencies and start:

```bash
npm install
npm start
```

Open `http://localhost:3000`.

### Local UI testing (no API)

```bash
WORKFLOW_MOCK=1 npm start
```

### Tests

```bash
npm test
```

## Multi-agent workflow

Decoding runs through specialized agents orchestrated in stages:

| Agent | Role |
|-------|------|
| Image quality | Legibility gate; early exit if unusable |
| Raw transcription | Line-by-line OCR |
| Patient header | Demographics and prescriber |
| Medications | Rx lines, doses, alternatives |
| Clinical context | Abbrevs, allergies, non-Rx text |
| Safety review | Deterministic review rules |
| Summary | Plain-language summary |

Stage 1 assesses image quality first, then transcribes if legible. Stage 2 runs patient header, medications, and clinical context in parallel. Progress streams to the browser via `POST /api/decode/stream` (Server-Sent Events). Batch decode without streaming: `POST /api/decode`.

## Model

- **Base URL:** `https://inference-api.nvidia.com/v1` (`NVIDIA_API_BASE_URL`)
- **Model:** `openai/openai/gpt-5.5` (`NVIDIA_MODEL`)
- Reasoning is intentionally omitted from structured-JSON calls — it competes with `max_output_tokens` and tends to truncate the JSON body.

## Medical tuning

- Per-agent prompts and small JSON schemas reduce hallucination surface
- Formulary fuzzy-match (`data/formulary.json`) after extraction
- Safety rules force human review for low confidence, missing fields, poor legibility, and high-risk tokens

## Safety

This app is a transcription aid, not a medical decision system. Every medication name, strength, dose, route, frequency, and duration must be verified by a licensed clinician or pharmacist before use.
