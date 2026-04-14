# CommunityTriage

Explainable NGO operations dashboard that turns scattered community reports into structured needs, prioritizes urgent cases, and matches the right volunteers to the right tasks. Push 7 keeps the Gemini backend from Push 6 and adds softer duplicate handling, CSV intake, hotspot summaries, and a visible hybrid scoring breakdown.

## Run locally

1. Install Node.js.
2. Create a local environment file from `.env.example`.
3. Add your Gemini API key to `.env.local`.
4. Start the app:

```powershell
cd "C:\Users\roopa\OneDrive\Desktop\Solutions Challenge\CommunityTriage"
Copy-Item .env.example .env.local
npm start
```

The app will run at `http://localhost:3000`.

If `GEMINI_API_KEY` is missing, the UI still works and clearly falls back to the local rule-based analyzer.

## Current Push 7 scope

- Dashboard shell with navigation
- Seeded community report data
- Seeded volunteer data
- Priority ranking display
- Filters, hotspot analytics, and extraction trace
- Gemini-backed triage through a Node API route
- Rule-based fallback with softer duplicate review
- CSV batch intake for community reports
- Hybrid priority score breakdown for the latest case
- Volunteer matching with explainable reasoning

## Current workflow

- Report intake form for free-text incident submissions
- Backend analysis route at `/api/analyze-report`
- Gemini extraction of issue type, urgency, confidence, affected group, summary, and justification
- Priority scoring with Gemini plus deterministic signals
- Duplicate review warnings that flag cases instead of hard-blocking them
- CSV upload for batch intake using local normalization
- Hotspot summaries for location and issue clusters
- Volunteer matching with transparent reasoning
- Loading, success, and fallback states in the dashboard
- Live re-render of the dashboard after each new report

## Google AI path

- The backend reads `GEMINI_API_KEY` from `.env.local`, `.env`, or the shell environment
- Requests are sent to Google's `generateContent` endpoint using `gemini-2.5-flash` by default
- The backend returns structured JSON for the dashboard to merge into the triage workflow
- If Gemini is unavailable, the frontend explicitly falls back to the local rule-based path

## Demo flow

1. Open the dashboard and point to the triage summary.
2. Load one of the demo presets from the intake section.
3. Click analyze to show Gemini extraction, ranking, and volunteer matching.
4. Use the hotspot summaries and analytics band to show decision intelligence.
5. Mention the extraction trace, provider label, and score breakdown to explain how the rank was produced.

## Suggested pitch order

- Problem statement and why it matters
- Live demo using a preset report
- Gemini-backed triage plus fallback reliability
- Filters, hotspots, duplicate review, and explainability
- CSV intake and hybrid scoring as proof of operational depth
- Next steps: manual review actions, assignment workflow, then OCR, PDF intake, richer routing, and deeper governance
