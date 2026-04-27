# Architecture Overview

CommunityTriage follows a lightweight, zero-dependency architecture designed for reliability and auditability in NGO operations.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Frontend)                          │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Intake   │  │  Cases   │  │Volunteers│  │  Audit   │           │
│  │   Page    │  │   Board  │  │  Roster  │  │  Trail   │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │              │              │                 │
│  ┌────▼──────────────▼──────────────▼──────────────▼─────┐         │
│  │        State Manager (localStorage + backend sync)     │         │
│  │  reports · filters · audit events · assignments        │         │
│  └────────────────────────┬──────────────────────────────┘         │
│                           │                                         │
│  ┌────────────────────────▼──────────────────────────────┐         │
│  │           Triage Core (shared scoring logic)           │         │
│  │  priority scoring · duplicate detection · volunteer fit│         │
│  └───────────────────────────────────────────────────────┘         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ POST /api/analyze-report
                               │ GET  /api/health
                               │ GET  /api/state
                               │ PUT  /api/state
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Node.js Backend (server.js)                     │
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐         │
│  │  Rate Limiter  │  │  Request ID   │  │  Static File   │         │
│  │  (per-client)  │  │  Generator    │  │  Server        │         │
│  └───────┬───────┘  └───────┬───────┘  └────────────────┘         │
│          │                  │                                       │
│  ┌───────▼──────────────────▼───────────────────────────────┐     │
│  │              Gemini Analysis Pipeline                      │     │
│  │                                                            │     │
│  │  1. Validate & sanitize input (all fields length-checked)  │     │
│  │  2. Build structured prompt                                │     │
│  │  3. Call Gemini API with timeout                           │     │
│  │  4. Retry with exponential backoff (429, 503, 504)         │     │
│  │  5. Parse & normalize JSON response                        │     │
│  │  6. Return structured analysis with request metadata       │     │
│  │                                                            │     │
│  │  On failure → return error codes for frontend fallback     │     │
│  └──────────────────────────┬───────────────────────────────┘     │
│                             │                                       │
│  ┌──────────────────────────▼───────────────────────────────┐     │
│  │              Persistence Layer (data/state.json)           │     │
│  │  reports · audit trail · filters · assignment state        │     │
│  │  Graceful shutdown · Structured JSON logging               │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Google Gemini API (generativelanguage.googleapis.com)  │
│                                                                     │
│  Model: gemini-2.5-flash                                           │
│  Output: JSON with issueType, urgency, confidence, justification   │
│  Config: temperature 0.2, responseMimeType application/json         │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Report Intake
- User enters free-text incident report with optional location, support, and source hints
- CSV batch import is also supported for bulk intake

### 2. AI Extraction
- Report text is sent to the backend via `POST /api/analyze-report`
- Backend sends a structured prompt to Google Gemini
- Gemini extracts: issue type, location, affected group, required resources, urgency, confidence, summary, and justification
- On transient failure (429/503/504): automatic retry with exponential backoff
- On hard failure: frontend receives error codes and uses local rule-based fallback

### 3. Hybrid Priority Scoring
- Final score = `(confidence × 0.4) + (urgencyScore × 0.35) + (fallbackScore × 0.25)`
- Combines AI confidence with deterministic safeguards
- Score breakdown is fully explainable in the UI

### 4. Human Review
- Low-confidence cases (< 85%) are flagged for human review
- Duplicate detection uses token overlap + location + issue + source signals
- Manual override allows coordinators to adjust urgency and priority

### 5. Volunteer Matching
- Scoring formula: `base(58) + skillFit(14/skill) + locationMatch(14) + availabilityBonus(1-8) + urgencyBonus(0-5)`
- Match reasoning is visible for every assignment decision
- Assignment and unassignment are fully reversible

### 6. Audit Trail
- Every analyze, override, assign, and unassign action is logged
- Each event includes: event ID, request ID, timestamp, metadata
- Audit state persists across browser refreshes via localStorage

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Zero npm dependencies | Reduces attack surface, simplifies deployment, faster cold starts on Cloud Run |
| Dual persistence (localStorage + server JSON) | Frontend works offline via localStorage; backend persists state across refreshes and deploys |
| Hybrid scoring model | Pure AI scores are unreliable under rate limits; deterministic fallback ensures consistency |
| Server-side Gemini calls only | API key never exposed to the browser; all AI calls go through the backend |
| Explicit fallback codes | Frontend can distinguish transient vs. hard failures and inform the user precisely |
| Shared triage-core library | Scoring, normalization, and duplicate logic reused consistently across frontend and backend |
| Graceful shutdown | SIGTERM/SIGINT handlers ensure clean Cloud Run container lifecycle |
| Structured JSON logging | Machine-readable logs for observability; level-tagged for filtering |
| Input validation on all fields | Length limits enforced both client-side and server-side to prevent abuse |

## Technology Stack

- **Frontend**: Vanilla JavaScript, CSS custom properties, Google Fonts (Manrope, Space Grotesk)
- **Backend**: Node.js (zero dependencies, built-in `http`, `fs`, `crypto` modules)
- **AI**: Google Gemini API via REST (`generativelanguage.googleapis.com`)
- **Deployment**: Google Cloud Run (containerized Node.js)
- **CI**: GitHub Actions (syntax check, unit tests, integration tests, offline evaluation)
