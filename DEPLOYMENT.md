# Deployment Runbook

This document provides a production-ready deployment path for CommunityTriage and an environment checklist for submission readiness.

## Target platform

Primary recommendation: Google Cloud Run (single containerless Node service, quick to deploy, simple rollback).

## Pre-deploy checklist

- Repository on latest main with passing CI.
- `npm run check:syntax` passes locally.
- `npm test` passes locally.
- `npm run evaluate:offline` runs and produces `evaluation/latest-metrics.json`.
- Gemini API key is available for production environment.

## Required environment variables

- `GEMINI_API_KEY` (required for Gemini extraction)
- `GEMINI_MODEL` (optional, default: `gemini-2.5-flash`)
- `PORT` (provided by Cloud Run automatically)
- `GEMINI_MAX_RETRIES` (optional, default: `2`)
- `GEMINI_RETRY_BASE_MS` (optional, default: `350`)

## Local production smoke test

```powershell
npm start
```

Verify:

- `GET /api/health` returns `ok: true`
- `POST /api/analyze-report` returns structured analysis when API key is configured
- fallback reason codes are returned when Gemini is unavailable

## Cloud Run deployment steps

1. Enable required services in GCP:
   - Cloud Run
   - Artifact Registry
   - Cloud Build

2. Build and deploy from source:

```bash
gcloud run deploy community-triage \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_MODEL=gemini-2.5-flash,GEMINI_MAX_RETRIES=2,GEMINI_RETRY_BASE_MS=350 \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

3. Save the deployed service URL and run post-deploy checks.

## Post-deploy verification checklist

- Health endpoint works:
  - `GET /api/health`
- Analyze endpoint works with Gemini:
  - confirm `provider: Gemini` response path
- Analyze endpoint fallback contract works:
  - confirm `code`, `retryable`, and `fallbackReason` fields on provider failure
- Frontend flow works end-to-end:
  - intake -> analyze -> review -> assign -> audit trail
- Request and event IDs visible in audit trail entries.

## Rollback strategy

- Use Cloud Run revision history.
- Roll back to last healthy revision if:
  - fallback rate spikes unexpectedly
  - latency increases beyond acceptable threshold
  - analysis endpoint error rate degrades user workflow

## Production operations checklist

- Rotate API keys regularly.
- Monitor fallback rate and P95 latency.
- Keep evaluation dataset and metrics snapshots updated for each release.
- Tag release commits used for demos and submissions.
