# CommunityTriage

> AI-powered community needs triage and volunteer coordination for NGOs.  
> Built with Google Gemini for the Solution Challenge 2026 — **Smart Resource Allocation**.

[![CI](https://github.com/Roopalgn/CommunityTriage/actions/workflows/ci.yml/badge.svg)](https://github.com/Roopalgn/CommunityTriage/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Submission Links

| Resource | Link |
|----------|------|
| Live prototype | https://community-triage-1044726114281.us-central1.run.app |
| Repository | https://github.com/Roopalgn/CommunityTriage |
| Demo video | *Add before submission* |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |

## The Problem

NGOs and community coordinators receive urgent requests from field notes, surveys, and hotlines simultaneously. Without structure, critical needs get buried, response times spike, and volunteers are mismatched to tasks. Manual triage takes 8–12 minutes per report and leaves no audit trail.

## What CommunityTriage Does

- Ingests free-text incident reports (single entry or CSV batch)
- Uses **Google Gemini** (`gemini-2.5-flash`) to extract structured fields: issue type, urgency, location, affected group, required resources, confidence score, and justification
- Applies **hybrid priority scoring** combining AI confidence with deterministic safeguards
- Flags low-confidence and duplicate cases for human review
- Matches the best-fit volunteer using skill, location, and availability signals with explainable reasoning
- Logs every action (analyze, override, assign, unassign) in a traceable audit trail
- Falls back to local rule-based triage when Gemini is unavailable — operations never stop

## Measured Impact

| Metric | Manual | With CommunityTriage | Improvement |
|--------|--------|---------------------|-------------|
| Report structuring time | 8–12 min | < 5 sec | ~99% reduction |
| Review coverage | ~40% ad-hoc | 100% flagged | Full coverage |
| Volunteer match time | ~15 min | Instant | ~99% reduction |
| Decision traceability | None | Full audit trail | Complete |

## Evaluation Metrics (Offline Baseline)

| Metric | Score |
|--------|-------|
| Issue type accuracy | 100% |
| Urgency accuracy | 100% |
| Location accuracy | 100% |
| Average extraction score | 100% |

Run `npm run evaluate:offline` to reproduce. Run `npm run evaluate` with a Gemini API key for live metrics.

## Quick Start

```bash
git clone https://github.com/Roopalgn/CommunityTriage.git
cd CommunityTriage
cp .env.example .env.local
# Add your GEMINI_API_KEY to .env.local
npm start
# Open http://localhost:3000
```

Without a Gemini API key the app runs fully via local fallback.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS + CSS, Bootstrap 5, Bootstrap Icons |
| Backend | Node.js (zero npm dependencies) |
| AI | Google Gemini API (`gemini-2.5-flash`) |
| Deployment | Google Cloud Run |
| CI | GitHub Actions |

## Demo CSV Files

The `demo-csv/` folder contains ready-to-import batch scenarios:

| File | Scenario |
|------|---------|
| `demo-import.csv` | Mixed community needs (5 reports) |
| `demo-csv/food-water-crisis.csv` | Food and water shortage reports |
| `demo-csv/medical-camps.csv` | Health camp and medical support |
| `demo-csv/flood-relief.csv` | Flood displacement and relief |
| `demo-csv/education-support.csv` | Education and learning support |

Import any file from the **Intake** page using the CSV upload field.

## Suggested Evaluator Walkthrough

1. **Overview** — live queue, key metrics, current focus case
2. **Intake** — use a quick starter or paste a custom report → click Analyze
3. **Cases** — inspect ranked results, confidence score, AI reasoning, apply an override
4. **Volunteers** — see fit scores and reasoning, assign a volunteer
5. **Insights** — location and issue distribution charts
6. **Audit** — every action traced with event and request IDs

Full script: [JUDGING_SCRIPT.md](JUDGING_SCRIPT.md)

## Project Structure

```
CommunityTriage/
├── index.html              # Entry point
├── main.js                 # Frontend application
├── styles.css              # Design system
├── server.js               # Node.js backend
├── src/triage-core.js      # Shared scoring and normalization logic
├── demo-csv/               # Ready-to-import batch CSV scenarios
├── evaluation/             # Gold dataset, evaluation script, metrics
├── tests/                  # Unit and integration tests
├── .github/workflows/      # CI pipeline
├── ARCHITECTURE.md         # System design and data flow
├── DEPLOYMENT.md           # Cloud Run deployment runbook
├── PHASE2.md               # Phase 2 roadmap (reserved features)
└── JUDGING_SCRIPT.md       # 2–3 minute demo narrative
```

## Google AI Usage

This project uses **Google Gemini** (`gemini-2.5-flash`) server-side for structured extraction of incident reports. The API key is never exposed to the browser. Transient failures use exponential backoff before falling back to local rule-based triage.

## License

[MIT](LICENSE)
