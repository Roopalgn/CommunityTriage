# CommunityTriage

Explainable NGO operations dashboard that turns scattered community reports into structured needs, prioritizes urgent cases, and matches the right volunteers to the right tasks. Built for fast triage, transparent decision-making, and scalable social impact.

## Run locally

Open `index.html` directly in a browser. The current Push 5 build is intentionally dependency-free so it can be reviewed immediately.

## Current Push 5 scope

- Dashboard shell with navigation
- Seeded community report data
- Seeded volunteer data
- Priority ranking display
- Filters, hotspot analytics, and extraction trace
- Rule-based triage workflow with duplicate flagging
- Volunteer matching with explainable reasoning

## Current workflow

- Report intake form for free-text incident submissions
- Rule-based extraction of issue type, urgency, confidence, and location
- Priority scoring, duplicate detection, and queue metrics
- Volunteer matching with transparent reasoning
- Live re-render of the dashboard after each new report

## Google AI path

- Push 5 keeps the workflow stable with a transparent rule-based engine
- Push 6 upgrades the extraction path to Gemini through a thin backend layer
- The visible UI is already shaped around that future handoff

## Demo flow

1. Open the dashboard and point to the triage summary.
2. Load one of the demo presets from the intake section.
3. Click analyze to show extraction, ranking, and volunteer matching.
4. Use the filters and analytics band to show decision intelligence.
5. Mention the extraction trace to explain how the score was produced.

## Suggested pitch order

- Problem statement and why it matters
- Live demo using a preset report
- Filters, hotspots, and explainability
- Next step: Gemini integration, then OCR, PDF intake, richer routing, and deeper governance
