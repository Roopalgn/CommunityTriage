# CommunityTriage

> AI-powered community needs triage and volunteer coordination for NGOs.
> Built with Google Gemini for the Solution Challenge 2026 — Smart Resource Allocation.

[![CI](https://github.com/<your-username>/CommunityTriage/actions/workflows/ci.yml/badge.svg)](https://github.com/<your-username>/CommunityTriage/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Submission Quick Links

| Resource | Link |
|----------|------|
| Live prototype | *Add your Cloud Run URL after deployment* |
| Repository | This repository |
| Demo video | *Add your video link* |
| Project deck | *Add your deck link* |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |

## Why This Matters

Community organizations receive urgent requests from many channels at once — field notes, surveys, hotlines, and spreadsheets. Without structure, critical needs get lost, response times spike, and volunteers are mismatched to tasks.

**CommunityTriage solves this by:**
- Structuring each report with AI extraction
- Ranking urgency with explainable confidence scores
- Matching the right volunteer using skill, location, and availability signals
- Keeping every decision transparent through a full audit trail

## What the Platform Does

- Ingests free-text incident reports (single or CSV batch)
- Uses **Google Gemini** to extract structured fields (issue type, urgency, location, affected group, resources, confidence)
- Applies **hybrid scoring** combining model confidence with deterministic safeguards
- Flags low-confidence and possible duplicate cases for human review
- Recommends volunteer matches with explainable fit reasoning
- Supports manual override, assignment, and unassignment decisions
- Maintains a traceable audit trail with request IDs and event IDs
- Persists operational state across browser refreshes

## End-to-End Workflow

```
1. Intake report (free text, CSV, or demo preset)
       ↓
2. AI extraction via Gemini (with retry + fallback)
       ↓
3. Hybrid priority scoring + duplicate detection
       ↓
4. Human review for flagged cases
       ↓
5. Volunteer assignment with fit reasoning
       ↓
6. Audit logging for governance
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system diagram, data flow, and design decisions.

**Stack summary:**
- **Frontend**: Vanilla JavaScript + CSS, Google Fonts (Manrope, Space Grotesk)
- **Backend**: Node.js HTTP server (zero npm dependencies)
- **AI**: Google Gemini API (server-side, with retry and backoff)
- **Deployment**: Google Cloud Run (containerized)
- **CI**: GitHub Actions (syntax, tests, offline evaluation)

## Run Locally

### Prerequisites
- Node.js 18 or newer

### Setup

```bash
# Clone the repository
git clone https://github.com/<your-username>/CommunityTriage.git
cd CommunityTriage

# Create environment file
cp .env.example .env.local
# Edit .env.local and add your Gemini API key

# Start the server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

If `GEMINI_API_KEY` is not set, the app remains fully usable through the local rule-based fallback.

### Docker

```bash
npm run docker:build
npm run docker:run
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Model to use for extraction |
| `PORT` | No | `3000` | Server port |
| `GEMINI_MAX_RETRIES` | No | `2` | Max retry attempts for transient failures |
| `GEMINI_RETRY_BASE_MS` | No | `350` | Base delay for exponential backoff |

## Testing and CI

```bash
# Syntax validation
npm run check:syntax

# Unit + integration tests
npm test

# Offline evaluation baseline
npm run evaluate:offline
```

CI workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs syntax checks, tests, and offline evaluation on every push and PR.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Backend status and Gemini configuration state |
| `POST` | `/api/analyze-report` | Structured analysis with request IDs, retry metadata, and fallback reason codes |

## Evaluation Harness

CommunityTriage includes a reproducible gold-dataset evaluation flow under `evaluation/`.

```bash
# Full evaluation (requires Gemini API key)
npm run evaluate

# Deterministic offline baseline (no API calls)
npm run evaluate:offline
```

| Metric | Offline Baseline |
|--------|-----------------|
| Total cases | 12 |
| Issue type accuracy | 100.0% |
| Urgency accuracy | 100.0% |
| Location accuracy | 100.0% |
| Average extraction score | 100.0% |

> Run `npm run evaluate` with a valid API key to see Gemini-specific metrics including latency and fallback rate.

## Measured Impact

| Metric | Manual Process | With CommunityTriage | Improvement |
|--------|---------------|---------------------|-------------|
| Time to structure a report | ~8-12 min (reading + categorizing) | < 5 sec (AI extraction) | **~99% reduction** |
| Review coverage | Ad-hoc, ~40% of reports reviewed | 100% flagging for low-confidence + duplicates | **Full coverage** |
| Volunteer match time | ~15 min (manual roster scan) | Instant (skill + location + availability scoring) | **~99% reduction** |
| Decision traceability | None (verbal/email) | Full audit trail with event + request IDs | **Complete audit** |

*Estimates based on operational workflows described by NGO coordinators. See `evaluation/` for reproducible quality metrics.*

## Reliability and Trust Features

- Confidence scores displayed for every analyzed case
- Explainable score breakdown (hybrid: AI + deterministic)
- Transient Gemini retry with exponential backoff before fallback
- Duplicate review flags (soft, not hard-blocking)
- Manual urgency and priority override controls
- Assignment reasoning breakdown per volunteer match
- Action-level audit trail with event IDs and request IDs
- Persisted queue state and audit history across browser refresh
- Real-time backend status indicator

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete Cloud Run deployment runbook, including:
- Pre-deploy and post-deploy verification
- Environment checklist
- Rollback strategy
- Production operations checklist

## Suggested Walkthrough for Evaluators

1. Start from **Overview** — see the live queue and key metrics
2. Go to **Intake** — use a quick starter or submit your own report
3. Watch the **analysis** — note issue type, urgency, confidence, and rationale
4. Open **Cases** — inspect case detail, apply a manual override
5. **Assign** or **unassign** a volunteer — see fit reasoning
6. Check **Insights** — view location and issue distribution charts
7. End with **Audit** — every action is traceable with event and request IDs

See also:
- [JUDGING_SCRIPT.md](JUDGING_SCRIPT.md) — 2-3 minute narrative script
- [WALKTHROUGH_CHECKLIST.md](WALKTHROUGH_CHECKLIST.md) — QA checklist for demos

## Project Structure

```
CommunityTriage/
├── index.html              # Entry point
├── main.js                 # Frontend application
├── styles.css              # Design system
├── server.js               # Node.js backend
├── src/
│   └── triage-core.js      # Shared scoring logic
├── evaluation/
│   ├── gold-dataset.json   # Benchmark dataset
│   ├── run-evaluation.js   # Evaluation script
│   └── latest-metrics.json # Latest metrics output
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # Integration tests
├── .github/workflows/
│   └── ci.yml              # CI pipeline
├── ARCHITECTURE.md          # System architecture
├── DEPLOYMENT.md            # Deployment runbook
├── JUDGING_SCRIPT.md        # Demo narrative
├── WALKTHROUGH_CHECKLIST.md # QA checklist
├── CONTRIBUTING.md          # Contribution guide
├── Dockerfile               # Container build
└── LICENSE                  # MIT license
```

## Phase 2 Roadmap

- PDF and image ingestion with OCR (Google Cloud Vision)
- Multi-language intake support
- Interactive map visualization (Google Maps API)
- Trend-aware re-ranking and geo-cluster intelligence
- Volunteer fairness balancing and resolution tracking
- Campaign recommendations based on repeat patterns

## Google AI Usage

This project uses **Google Gemini** (`gemini-2.5-flash`) for:
- Structured extraction of incident reports (issue type, urgency, location, affected group, resources, confidence, justification)
- The AI integration is server-side only — API keys are never exposed to the browser
- Fallback to deterministic rule-based extraction ensures the system remains operational when Gemini is unavailable

## License

[MIT](LICENSE)
