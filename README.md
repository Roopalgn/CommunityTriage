# CommunityTriage

CommunityTriage is an AI-assisted operations dashboard for NGOs that turns unstructured community reports into prioritized, explainable action plans.

## Why this matters

Community organizations often receive urgent requests from many channels at once: field notes, forms, hotlines, and spreadsheets. Teams need a fast way to:

- structure each report clearly
- rank urgency with confidence
- assign the right volunteer quickly
- keep decisions transparent for accountability

CommunityTriage is designed for exactly this workflow.

## What the platform does

- Ingests free-text incident reports
- Uses Google Gemini to extract structured fields
- Applies hybrid scoring (model confidence plus deterministic safeguards)
- Flags low-confidence and possible duplicate cases for review
- Recommends volunteer matches using skill, location, and availability signals
- Supports manual override and assignment decisions
- Maintains an audit trail of key operational actions
- Supports batch intake through CSV upload

## End-to-end workflow

1. Intake report
2. AI extraction and normalization
3. Priority scoring and ranking
4. Human review for flagged cases
5. Volunteer assignment or reassignment
6. Audit logging for governance and traceability

## Architecture

- Frontend: single-page dashboard built with vanilla JavaScript and CSS
- Backend: lightweight Node.js HTTP server
- AI integration: Google Gemini via server-side API call
- Fallback mode: local rule-based extraction when Gemini is unavailable

## Reliability and trust features

- Confidence scores displayed in the case view
- Explainable score breakdown for each analyzed case
- Transient Gemini retry with backoff before fallback
- Duplicate review flags instead of hard-blocking
- Manual urgency and priority override controls
- Assignment reasoning breakdown per case
- Action-level audit trail for analyze, override, and assignment events
- Request IDs and event IDs for action traceability
- Persisted queue state and audit history across browser refresh

## Run locally

1. Install Node.js 18 or newer.
2. Create a local environment file.
3. Add your Gemini API key.
4. Start the server.

```powershell
cd "C:\Users\roopa\OneDrive\Desktop\Solutions Challenge\CommunityTriage"
Copy-Item .env.example .env.local
npm start
```

Open http://localhost:3000 in your browser.

If GEMINI_API_KEY is not set, the app remains usable through the local fallback analysis path.

## Environment variables

- GEMINI_API_KEY: required for Gemini analysis
- GEMINI_MODEL: optional, defaults to gemini-2.5-flash
- PORT: optional, defaults to 3000

## API endpoints

- GET /api/health
	Returns backend status and Gemini configuration state.

- POST /api/analyze-report
	Accepts incident text and optional hints, returns structured analysis with request IDs, retry metadata, and provider reason codes when errors occur.

## Evaluation harness

CommunityTriage includes a reproducible gold-dataset evaluation flow under `evaluation/`.

- Gold dataset: `evaluation/gold-dataset.json`
- Evaluation script: `evaluation/run-evaluation.js`
- Latest output: `evaluation/latest-metrics.json`

Run evaluation:

```powershell
npm run evaluate
```

Run deterministic local baseline (no model calls):

```powershell
npm run evaluate:offline
```

Current metrics snapshot (`gemini-2.5-flash`, `phase1-gold-v1`):
Values can vary run-to-run depending on model demand and fallback usage.

| Metric | Value |
| --- | --- |
| Total cases | 12 |
| Gemini cases | 4 |
| Fallback cases | 8 |
| Fallback rate | 66.7% |
| Issue type accuracy | 91.7% |
| Urgency accuracy | 91.7% |
| Location accuracy | 100.0% |
| Average extraction score | 94.5% |
| Average latency | 3084 ms |
| P95 latency | 5410 ms |

## Suggested walkthrough for evaluators

1. Start from Overview and explain the live queue.
2. Use a quick starter in Intake or submit your own report.
3. Run analysis and highlight issue type, urgency, confidence, and rationale.
4. Open case detail, apply a manual override, then assign or unassign a volunteer.
5. Show duplicate or low-confidence flags and explain review flow.
6. End with the audit trail to demonstrate decision transparency.

## Current scope and next steps

Current scope focuses on high-trust triage and volunteer coordination for Phase 1 submission.

Planned next steps include:

- CI and automated tests for scoring, duplicate logic, and API behavior
- stronger deployment hardening and production observability
- richer governance telemetry for review workflows
- expanded ingestion paths such as OCR and document uploads
