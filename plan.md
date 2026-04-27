# Solution Plan (Phase 1 Submission Update)

## Chosen Topic
Smart Resource Allocation

## Core Positioning
AI-powered community needs triage and volunteer coordination for NGOs.

The winning story remains:
we gather scattered community signals, use Google AI to structure and interpret them, rank what matters most, keep a human in control for trust, and accelerate the right volunteer action.

## Current Status Snapshot (Push 8 Complete)
Already implemented in the product:
- Gemini-backed extraction through a Node API route
- Safe local fallback when Gemini is unavailable
- Hybrid priority scoring and explainable score breakdown
- Duplicate review flags, low-confidence review flags, and hotspot summaries
- Manual override, assign and unassign actions, match reasoning, and audit trail
- CSV batch intake plus repeatable demo presets

This means the biggest Phase 1 opportunity is no longer feature quantity.
The advantage now comes from reliability, evidence, trust, and submission packaging.

## Major Phase 1 Gaps To Fix For Competitive Advantage

### Gap 1: Reliability under model demand spikes
Current issue:
- Gemini high-demand errors are handled by immediate fallback only.
- No retry and backoff strategy for transient 429 or 503 responses.

Why it matters:
- Judges can hit this during demos and assume instability.

Phase 1 fix:
- Add one short retry path with exponential backoff for transient model failures.
- Distinguish transient provider errors from hard configuration errors.
- Keep fallback, but show clearer status messages in the UI.

Acceptance signal:
- Same report succeeds on retry for transient failures in most cases, and fallback remains explicit when needed.

### Gap 2: No objective quality evaluation layer
Current issue:
- There is no benchmark dataset or scoring harness for extraction quality.
- Confidence is shown, but calibration quality is not measured.

Why it matters:
- Without evidence, AI claims sound like product copy, not engineering proof.

Phase 1 fix:
- Create a small gold dataset of real-looking reports with expected structured fields.
- Add an offline evaluation script for extraction accuracy and urgency agreement.
- Track median latency and fallback rate.

Acceptance signal:
- README includes a compact evaluation table with reproducible commands.

### Gap 3: In-memory only workflow state
Current issue:
- Reports, overrides, assignments, and audit events reset on refresh.

Why it matters:
- This weakens operational realism and trust.

Phase 1 fix:
- Add lightweight persistence for Phase 1.
- Minimum path: JSON file persistence on backend for reports and audit events.
- Better path: a tiny managed store if deployment already supports it.

Acceptance signal:
- Refreshing the app preserves latest queue state and audit timeline.

### Gap 4: Limited observability and governance depth
Current issue:
- Audit trail is strong in UI but not tied to stable backend event IDs or request traces.
- No explicit model outcome telemetry.

Why it matters:
- Judges reward systems that are monitorable and accountable.

Phase 1 fix:
- Add request IDs, event IDs, and action metadata for analyze, duplicate flag, override, assign, and unassign.
- Log provider used, latency bucket, and fallback reason code.

Acceptance signal:
- Every audit action can be traced to a backend event record.

### Gap 5: Submission infrastructure is thin
Current issue:
- No automated tests, no CI workflow, and no deployment config in repo.

Why it matters:
- Competitive submissions show engineering discipline, not only UI polish.

Phase 1 fix:
- Add basic unit tests for scoring, duplicate detection, and normalization logic.
- Add one integration test for analyze endpoint fallback behavior.
- Add a minimal CI workflow for lint and test.
- Add deployment steps and production env checklist.

Acceptance signal:
- A clean CI badge and repeatable deployment instructions in README.

### Gap 6: Accessibility and responsive trust polish is incomplete
Current issue:
- UX is visually strong, but keyboard-first behavior, focus visibility, and small-height edge cases need systematic checks.

Why it matters:
- Accessibility polish is a visible quality differentiator in judging.

Phase 1 fix:
- Run an accessibility pass for keyboard flow, focus states, labels, and semantic landmarks.
- Add short-height and small-width responsive adjustments where clipping can occur.

Acceptance signal:
- Keyboard-only walkthrough is smooth for intake, review, and assignment flow.

### Gap 7: Architecture maintainability risk
Current issue:
- Frontend logic is concentrated in a very large single file.

Why it matters:
- Large monolith files reduce confidence in long-term reliability.

Phase 1 fix:
- Split the frontend into focused modules: data model, scoring, duplicate logic, rendering, and event handlers.
- Keep behavior unchanged while improving maintainability.

Acceptance signal:
- Critical logic is unit-testable in isolated modules.

### Gap 8: Impact story is not yet evidence-backed
Current issue:
- Demo narrative is strong, but impact is not quantified with measurable operational improvements.

Why it matters:
- High-ranked submissions show outcome potential, not just features.

Phase 1 fix:
- Add a simple before and after operations story.
- Track triage cycle-time reduction estimate, review coverage, and assignment turnaround on seeded scenarios.

Acceptance signal:
- Deck and README include 2 to 3 measurable operational claims with method notes.

## Updated Phase 1 Feature Priorities

### Priority A: Reliability + trust hardening
- Transient retry and graceful fallback path
- Persistent queue and audit state
- Traceable event IDs and model telemetry

### Priority B: Evidence + reproducibility
- Gold dataset and evaluation harness
- Baseline metrics for quality, latency, and fallback rate
- Readme docs that match actual measured behavior

### Priority C: Engineering credibility
- Unit and integration tests
- CI workflow
- Deployment-ready configuration and runbook

### Priority D: Product polish for judges
- Accessibility and short-viewport UX hardening
- Tight demo script and decision narrative
- Quantified impact framing

## Push 9 Roadmap (Submission Hardening)

### Push 9A: Reliability and observability
Do:
- add transient retry and backoff for model-demand failures
- classify provider error reasons in backend responses
- add request IDs and event IDs for all key actions
- persist reports and audit events beyond refresh

Now push to repo.

### Push 9B: Evaluation and evidence
Do:
- create a Phase 1 gold dataset for extraction and urgency
- add evaluation script and metrics output
- document quality metrics, fallback rate, and latency in README

Now push to repo.

### Push 9C: Testing, CI, and deployment readiness
Do:
- add unit tests for scoring, duplicate matching, and normalization
- add integration test for analyze endpoint and fallback behavior
- add CI workflow for syntax check plus tests
- add production deploy docs and environment checklist

Now push to repo.

### Push 9D: Demo and submission polish
Do:
- run full desktop and mobile walkthrough in a clean browser
- tighten accessibility and interaction edge cases
- update deck with measurable outcomes and trust story
- finalize a 2 to 3 minute judging script anchored to one end-to-end flow

Now push to repo.

## Phase 1 Deliverables (Updated)
- Live deployed prototype URL
- Public repository with setup, architecture, and evaluation docs
- Passing test and CI checks
- Short demo video with one complete reliable workflow
- Submission deck with measurable impact and trust evidence

## Phase 2 Scope (Only after Phase 1 is locked)
- PDF and image ingestion plus OCR
- richer extraction robustness and calibration
- trend-aware re-ranking and geo-cluster intelligence
- volunteer fairness balancing and resolution tracking
- deeper governance tooling and campaign recommendations

## What Not To Do Before Submission
- Do not add major new scope that weakens reliability work.
- Do not claim impact numbers without a method note.
- Do not postpone deployment and CI to the final day.
- Do not ship unmatched README claims.

## Final Build Order
1. Reliability hardening
2. Persistence and observability
3. Evaluation harness and metrics
4. Tests and CI
5. Accessibility and responsive polish
6. Submission docs, deck, and demo finalization

## Current Repo Status
- The repo is aligned with `origin/main` and the working tree is clean.
- The CI failure shown in the screenshot was caused by quoted glob patterns in `package.json`; that has now been fixed by pointing `test:unit` and `test:integration` at the explicit test files in `tests/unit/` and `tests/integration/`.
- The updated package scripts, README evidence, and evaluation snapshot are already pushed to the remote repository.

## Immediate Next Steps
1. Open GitHub Actions and confirm the latest workflow run passes end to end.
2. Freeze the feature set unless you discover a real bug during the final walkthrough.
3. Record the demo video using one preset report and the new trace/filters flow.
4. Finish the submission deck with the trust story, evaluation table, and deployment proof.
5. Do a final mobile and keyboard pass before the deadline.
