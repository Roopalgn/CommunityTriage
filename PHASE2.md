# Phase 2 Roadmap — Reserved Features

Features held back for the Product Vault phase to demonstrate growth between rounds.

## Reserved Features (If Selected for Top 100)

### 1. Multi-Modal Intake (PDF, Image, Voice)
- OCR extraction from scanned field reports using Google Vision AI
- PDF parsing with structured section detection
- Voice-to-text transcription using Google Speech-to-Text for hotline reports
- Automatic language detection and translation for multi-lingual communities

### 2. Geospatial Intelligence Layer
- Map-based hotspot visualization using Google Maps Platform
- Radius-based clustering to detect adjacent community signals
- Heatmap overlays for urgency density across zones
- GPS-tagged field reports with location verification

### 3. Volunteer CRUD and Skill Profiles
- Add, edit, and deactivate volunteers through the UI
- Skill taxonomy with proficiency levels
- Availability calendar with shift scheduling
- Historical assignment performance tracking

### 4. Real-Time Collaboration (WebSocket)
- Live case board updates across multiple coordinators
- Typing indicators and concurrent edit conflict resolution
- Push notifications for new critical cases
- Assignment claim/release locking to prevent double-assignments

### 5. Automated Escalation Rules
- Time-based urgency escalation (e.g., unresolved critical → auto-notify supervisor)
- SLA tracking per case type with countdown timers
- Rule engine for custom triggers (e.g., 3+ duplicate reports → auto-escalate)
- Configurable notification channels (email, SMS, webhook)

### 6. Report Resolution Workflow
- Case lifecycle: Open → In Progress → Resolved → Closed
- Resolution notes with outcome documentation
- Follow-up scheduling for resolved cases
- Satisfaction tracking from affected community members

### 7. Advanced Duplicate and Cluster Detection
- Semantic similarity using Gemini embeddings (not just token overlap)
- Cross-temporal deduplication (detect same issue reported days apart)
- Cluster merging into meta-cases with shared context
- Automatic resolution linking (if parent resolved, children auto-close)

### 8. Trend Analysis Dashboard
- Weekly/monthly trend charts for issue types and locations
- Predictive modeling for recurring crises (seasonal flooding, water stress)
- Comparative analytics across time periods
- Export to PDF/CSV for NGO reporting requirements

### 9. Role-Based Access Control
- Admin, Coordinator, Volunteer, and Observer roles
- Permission matrix for view, edit, assign, override actions
- OAuth 2.0 integration with Google Workspace for NGO teams
- Audit trail shows who performed each action with role context

### 10. Fairness-Aware Volunteer Assignment
- Workload balancing to prevent volunteer burnout
- Fair distribution scoring that considers recent assignments
- Skill development routing (assign to stretch tasks for growth)
- Opt-in/opt-out preferences for sensitive case types

---

## Edge-Giving Features (Competitive Differentiators)

### Already Implemented (Phase 1)
- **Backend persistence** — State survives server restarts via JSON file store
- **Graceful shutdown** — SIGTERM/SIGINT handling for clean Cloud Run deployments
- **Structured logging** — JSON log output for observability and debugging
- **Shared scoring library** — triage-core.js used consistently across frontend and backend
- **Input validation** — All fields length-checked both client and server-side
- **Periodic health monitoring** — Frontend detects backend availability changes in real-time
- **Deferred script loading** — Non-blocking page render with defer attributes
- **Reduced GPU overhead** — Removed backdrop-filter, animated glows, unnecessary compositing layers

### Phase 2 Differentiators
- **Evidence-backed AI** — Gemini extraction accuracy measured against a gold standard
- **Offline-first resilience** — Full functionality without network via rule-based fallback
- **Traceable decisions** — Every AI output links to a request ID, attempt count, and latency
- **Zero-dependency backend** — No supply chain risk, instant cold starts, trivial auditing
- **Evaluation harness** — Reproducible quality metrics anyone can verify with one command

---

## Implementation Priority (Phase 2)

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Volunteer CRUD | Medium | High (judges test this) |
| P0 | Resolution workflow | Medium | High (shows completeness) |
| P1 | Geospatial layer | High | Very High (visual wow) |
| P1 | Real-time WebSocket | High | High (collaboration proof) |
| P2 | Multi-modal intake | High | Very High (technical merit) |
| P2 | Trend dashboard | Medium | Medium (analytics depth) |
| P3 | RBAC | Medium | Medium (production readiness) |
| P3 | Escalation rules | Low | Medium (automation depth) |
| P3 | Fairness balancing | Low | Medium (innovation score) |

## What Not To Build Until Phase 2
- No multi-modal intake before the triage pipeline is proven reliable
- No WebSocket before single-user persistence is solid
- No RBAC before the core workflow is polished for judges
- No geospatial without real location data to demonstrate on
