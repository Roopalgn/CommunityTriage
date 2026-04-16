# 2-3 Minute Judging Script

Use this script for a single, end-to-end scenario that highlights AI utility, human oversight, and operational trust.

## 0:00 - 0:20 Problem framing

"NGOs receive urgent requests from multiple channels and need fast, explainable triage. CommunityTriage turns raw text into structured action while keeping a human in control."

## 0:20 - 1:00 Intake and AI extraction

1. Open Intake.
2. Use one quick starter or paste a fresh report.
3. Click Analyze.

Narration points:

- report is sent to backend Gemini extraction
- structured output includes issue type, urgency, confidence, and rationale
- transient provider failures use retry first, then explicit fallback

## 1:00 - 1:40 Priority and review workflow

1. Show ranked cases and selected case detail.
2. Highlight confidence, duplicate and low-confidence flags.
3. Apply a manual urgency or score override.

Narration points:

- hybrid score combines model confidence with deterministic safeguards
- review flags route uncertain cases into human validation
- every critical action is logged with request and event IDs

## 1:40 - 2:20 Assignment and governance

1. Assign a volunteer from quick assign or picker.
2. Unassign once to show reversibility.
3. Open audit trail.

Narration points:

- assignment is explainable by skill, location, and availability fit
- override and assignment actions are traceable
- audit log supports governance and post-incident review

## 2:20 - 2:50 Impact and credibility close

"This system reduces triage overhead by structuring requests consistently, improves trust through transparent scoring and review flags, and keeps operations resilient with fallback behavior and measurable quality metrics."

## Submission deck talking points

- Measurable outcomes:
  - extraction quality snapshot from `evaluation/latest-metrics.json`
  - fallback rate and latency tracking
  - case-review and assignment traceability through audit events
- Trust story:
  - confidence visibility
  - duplicate and low-confidence gating
  - human override controls
  - request and event level traceability
