/* ══════════════════════════════════════════════════════════════
   CommunityTriage — Main Application (Bootstrap 5 Rebuild)
   ══════════════════════════════════════════════════════════════ */

const triageCore = typeof window !== 'undefined' ? window.CommunityTriageCore || null : null

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'bi-speedometer2' },
  { id: 'cases', label: 'Cases', icon: 'bi-list-check' },
  { id: 'intake', label: 'Intake', icon: 'bi-plus-circle' },
  { id: 'volunteers', label: 'Volunteers', icon: 'bi-people' },
  { id: 'insights', label: 'Insights', icon: 'bi-bar-chart' },
  { id: 'audit', label: 'Audit', icon: 'bi-shield-check' },
]

const root = document.getElementById('root')
const ROUTES = new Set(navItems.map((item) => item.id))
const STORAGE_KEY = 'communitytriage.clean.v1'
const AUDIT_LIMIT = 40
const ANALYZE_TIMEOUT_MS = 20000
const INCIDENT_CHAR_LIMIT = 4000

const volunteers = [
  { id: 'VOL-11', name: 'Asha Menon', skills: ['Logistics', 'Crowd coordination'], location: 'South District', availability: 'Now', score: 94 },
  { id: 'VOL-18', name: 'Ritvik Sharma', skills: ['Medical support', 'Registration'], location: 'Central Ward', availability: 'Today 2 PM', score: 86 },
  { id: 'VOL-24', name: 'Neha Das', skills: ['Procurement', 'Supply handling'], location: 'Riverside Zone', availability: 'Flexible', score: 91 },
  { id: 'VOL-33', name: 'Imran Khan', skills: ['Field coordination', 'Rapid response'], location: 'North Point', availability: 'Now', score: 88 },
]

const seedReports = [
  { id: 'CT-1042', title: 'Water scarcity near Ward 7', location: 'South District', issueType: 'Water shortage', urgency: 'Critical', score: 96, summary: 'Multiple households report no clean water access for two days.', need: 'Water drive and transport support', status: 'Needs immediate attention', confidence: 96, reason: 'Repeated water shortage signals and same-day delivery need indicate immediate community risk.', source: 'Ward volunteer field note', affectedGroup: 'Local households', assignedVolunteerId: 'VOL-11', duplicateOf: '' },
  { id: 'CT-1043', title: 'Flood relief supply gap', location: 'Riverside Zone', issueType: 'Flood relief', urgency: 'High', score: 88, summary: 'Field volunteers need food packets and dry blankets for displaced families.', need: 'Food packets, blankets, logistics', status: 'Assign next available team', confidence: 90, reason: 'Displacement and relief keywords suggest time-sensitive coordination and procurement support.', source: 'Crowdsourced survey entry', affectedGroup: 'Displaced families', assignedVolunteerId: 'VOL-24', duplicateOf: '' },
  { id: 'CT-1044', title: 'Medication support request', location: 'Central Ward', issueType: 'Medical support', urgency: 'Medium', score: 71, summary: 'A health camp needs volunteer support for patient registration and follow-up.', need: 'Registration helpers and medical runners', status: 'Queue for afternoon shift', confidence: 83, reason: 'The request is operationally important but less acute than disruption or disaster response cases.', source: 'NGO outreach request', affectedGroup: 'Patients and caregivers', assignedVolunteerId: 'VOL-18', duplicateOf: '' },
]

const demoScenarios = {
  water: { incident: 'Families in South District have no clean water after two hand pumps stopped working overnight. Children and elderly residents need immediate delivery support.', location: 'South District', support: 'Water, purification tablets, transport support', source: 'Field note from ward volunteer' },
  flood: { incident: 'Flood water has displaced several families near Riverside Zone. Relief teams need food packets, blankets, and logistics support before evening.', location: 'Riverside Zone', support: 'Food packets, blankets, logistics', source: 'Crowdsourced survey entry' },
  medical: { incident: 'A community health camp in Central Ward needs volunteers for registration, patient flow, and medicine runners for the afternoon shift.', location: 'Central Ward', support: 'Registration helpers, medical runners', source: 'NGO outreach request' },
}

// ── Utilities ──

function sanitize(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}

function titleCase(v) { return String(v).split(' ').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ') }

function formatLocation(value) {
  if (triageCore?.formatLocation) return triageCore.formatLocation(value)
  const n = String(value || '').trim().toLowerCase()
  const aliases = ['south district', 'central ward', 'riverside zone', 'north point', 'east market', 'west end']
  const m = aliases.find(a => n.includes(a))
  return m ? titleCase(m) : titleCase(n || 'Community Zone')
}

function normalizeUrgency(value) {
  if (triageCore?.normalizeUrgency) return triageCore.normalizeUrgency(value)
  const n = String(value || '').trim().toLowerCase()
  if (n === 'critical') return 'Critical'
  if (n === 'high') return 'High'
  return 'Medium'
}

function tokenize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2)
}

function summarizeText(text, limit = 120) {
  const c = String(text || '').trim().replace(/\s+/g, ' ')
  return c.length <= limit ? c : c.slice(0, limit - 1) + '…'
}

function clampNumber(v, min, max, fb) { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fb }

function getPage() {
  const h = String(window.location.hash || '#overview').replace(/^#/, '').toLowerCase()
  return ROUTES.has(h) ? h : 'overview'
}

function go(page) {
  const next = ROUTES.has(page) ? page : 'overview'
  if (window.location.hash !== `#${next}`) { window.location.hash = `#${next}`; return }
  render()
}

function createClientRequestId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? `client-${crypto.randomUUID()}` : `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// ── Persistence ──

function loadSnapshot() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null } catch { return null } }

function saveSnapshot() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      selectedReportId: state.selectedReportId, filters: state.filters, reports: state.reports,
      auditTrail: state.auditTrail, nextReportNumber: state.nextReportNumber, nextAuditNumber: state.nextAuditNumber,
    }))
  } catch {}
  debouncePersistToBackend()
}

let persistTimer = null
function debouncePersistToBackend() { if (persistTimer) clearTimeout(persistTimer); persistTimer = setTimeout(persistToBackend, 2000) }
async function persistToBackend() {
  try { await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selectedReportId: state.selectedReportId, filters: state.filters, reports: state.reports, auditTrail: state.auditTrail, nextReportNumber: state.nextReportNumber, nextAuditNumber: state.nextAuditNumber }) }) } catch {}
}

// ── State ──

function getIssueTemplate(issueType, text) {
  const issue = String(issueType || '').toLowerCase()
  const body = String(text || '').toLowerCase()
  if (issue.includes('water') || body.includes('water') || body.includes('pump')) return { key: 'water', title: 'Urgent water support request', issueType: 'Water shortage', need: 'Water delivery, purification tablets, and transport coordination', urgency: 'Critical' }
  if (issue.includes('flood') || body.includes('flood') || body.includes('blanket')) return { key: 'flood', title: 'Flood response coordination needed', issueType: 'Flood relief', need: 'Food packets, blankets, and transport support', urgency: 'High' }
  if (issue.includes('medical') || issue.includes('health') || body.includes('patient')) return { key: 'medical', title: 'Medical camp assistance required', issueType: 'Medical support', need: 'Registration support, patient flow, and medical runners', urgency: 'High' }
  if (issue.includes('food') || body.includes('ration')) return { key: 'food', title: 'Food assistance needed', issueType: 'Food support', need: 'Meals, dry ration, and distribution help', urgency: 'High' }
  return { key: 'default', title: 'Community support report', issueType: issueType || 'General support', need: 'Field review and volunteer allocation', urgency: 'Medium' }
}

function buildVolunteerFit(report, volunteer) {
  const expected = { water: ['Logistics', 'Crowd coordination'], flood: ['Procurement', 'Supply handling'], medical: ['Medical support', 'Registration'], food: ['Procurement', 'Crowd coordination'], default: ['Field coordination', 'Rapid response'] }[report.templateKey || 'default']
  const matched = volunteer.skills.filter(s => expected.some(e => e.toLowerCase() === s.toLowerCase()))
  const sameLocation = volunteer.location.toLowerCase() === report.location.toLowerCase()
  const speed = volunteer.availability.toLowerCase() === 'now' ? 8 : volunteer.availability.toLowerCase() === 'flexible' ? 4 : 1
  const urgencyBonus = report.urgency === 'Critical' ? 5 : report.urgency === 'High' ? 3 : 0
  const score = Math.min(99, 58 + matched.length * 14 + (sameLocation ? 14 : 0) + speed + urgencyBonus)
  return { score, matched, sameLocation, summary: `${matched.join(', ') || 'general support'} | ${sameLocation ? 'same location' : 'cross-area'} | avail: ${volunteer.availability.toLowerCase()}` }
}

function findBestVolunteer(report) {
  return volunteers.map(v => ({ volunteer: v, fit: buildVolunteerFit(report, v) })).sort((a, b) => b.fit.score - a.fit.score)[0]
}

function normalizeReport(seed) {
  const template = getIssueTemplate(seed.issueType, seed.summary)
  const report = { ...seed, location: formatLocation(seed.location), title: seed.title || template.title, issueType: seed.issueType || template.issueType, urgency: seed.urgency || template.urgency, need: seed.need || template.need, summary: summarizeText(seed.summary || seed.rawText || ''), source: seed.source || 'Submitted through intake form', affectedGroup: seed.affectedGroup || 'Community members', templateKey: template.key, assignedVolunteerId: seed.assignedVolunteerId || '', duplicateOf: seed.duplicateOf || '', manualOverride: seed.manualOverride || null }
  const best = volunteers.find(v => v.id === report.assignedVolunteerId) || findBestVolunteer(report).volunteer
  const fit = buildVolunteerFit(report, best)
  report.match = { ...best, score: fit.score, reason: fit.summary, breakdown: fit }
  report.reviewFlags = []
  if (report.confidence < 85) report.reviewFlags.push({ code: 'low-confidence', label: `Low confidence (${report.confidence}%)` })
  if (report.duplicateOf) report.reviewFlags.push({ code: 'duplicate', label: `Possible duplicate of ${report.duplicateOf}` })
  report.status = report.assignedVolunteerId ? `Assigned to ${best.name}` : report.duplicateOf ? 'Flagged for duplicate review' : report.confidence < 85 ? 'Needs human review' : seed.status || 'Queue for review'
  return report
}

function getDuplicateMatch(candidate) {
  const ranked = state.reports.filter(r => r.id !== candidate.id).map(report => {
    if (triageCore?.calculateDuplicateSignals) { const s = triageCore.calculateDuplicateSignals(candidate, report); return { report, score: s.duplicateScore } }
    const ct = tokenize(`${candidate.title} ${candidate.summary} ${candidate.need} ${candidate.rawText}`)
    const et = tokenize(`${report.title} ${report.summary} ${report.need} ${report.rawText || ''}`)
    const shared = ct.filter(t => et.includes(t))
    const overlap = shared.length / Math.max(ct.length, 1)
    return { report, score: overlap * 0.55 + (report.location === candidate.location ? 0.2 : 0) + (report.issueType.toLowerCase() === candidate.issueType.toLowerCase() ? 0.2 : 0) + (report.source.toLowerCase() === candidate.source.toLowerCase() ? 0.05 : 0) }
  }).sort((a, b) => b.score - a.score)
  const top = ranked[0]
  if (!top) return null
  const threshold = top.report.source === 'Ward volunteer field note' ? 0.78 : 0.82
  return top.score >= threshold ? top : null
}

// Initialize state
const saved = loadSnapshot()
const initialReports = saved?.reports?.length ? saved.reports.map(r => normalizeReport(r)) : seedReports.map(r => normalizeReport(r))

const state = {
  page: getPage(),
  reports: initialReports,
  auditTrail: saved?.auditTrail?.length ? saved.auditTrail : initialReports.map((r, i) => ({ id: `AT-${i + 1}`, type: 'analyze', reportId: r.id, message: `Case ${r.id} entered queue with ${r.urgency.toLowerCase()} urgency.`, timestamp: new Date(Date.now() - (i + 1) * 60000).toISOString(), metadata: {} })),
  filters: saved?.filters || { search: '', urgency: 'All', location: 'All', sort: 'priority' },
  selectedReportId: saved?.selectedReportId || initialReports[0]?.id || null,
  nextReportNumber: saved?.nextReportNumber || 1045,
  nextAuditNumber: saved?.nextAuditNumber || initialReports.length + 1,
  backend: { available: false, geminiConfigured: false, model: null },
  analysisStatus: { kind: 'idle', message: '' },
}

function getSelectedReport() { return state.reports.find(r => r.id === state.selectedReportId) || state.reports[0] || null }

function getFilteredReports() {
  const q = state.filters.search.trim().toLowerCase()
  return [...state.reports].filter(r => {
    const ms = !q || [r.title, r.summary, r.location, r.issueType, r.need, r.source].join(' ').toLowerCase().includes(q)
    const mu = state.filters.urgency === 'All' || r.urgency === state.filters.urgency
    const ml = state.filters.location === 'All' || r.location === state.filters.location
    return ms && mu && ml
  }).sort((a, b) => { if (state.filters.sort === 'confidence') return b.confidence - a.confidence; if (state.filters.sort === 'location') return a.location.localeCompare(b.location); return b.score - a.score })
}

function addAudit(type, reportId, message, metadata = {}) {
  state.auditTrail = [{ id: `AT-${state.nextAuditNumber++}`, type, reportId, message, timestamp: new Date().toISOString(), metadata }, ...state.auditTrail].slice(0, AUDIT_LIMIT)
}

// ── Render: Navbar ──

function urgencyBadgeClass(u) { return u === 'Critical' ? 'badge-critical' : u === 'High' ? 'badge-high' : 'badge-medium' }

function renderStatusPill() {
  if (state.backend.available && state.backend.geminiConfigured) return `<span class="ct-status-pill active"><span class="dot"></span>Gemini</span>`
  if (state.backend.available) return `<span class="ct-status-pill fallback"><span class="dot"></span>Fallback</span>`
  return `<span class="ct-status-pill offline"><span class="dot"></span>Offline</span>`
}

function renderNavbar() {
  return `
  <nav class="navbar navbar-expand-lg ct-navbar sticky-top">
    <div class="container-fluid">
      <a class="navbar-brand" href="#overview">
        <span class="ct-brand-icon">CT</span>
        CommunityTriage
      </a>
      ${renderStatusPill()}
      <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav ms-auto gap-1">
          ${navItems.map(item => `<li class="nav-item"><a class="nav-link ${state.page === item.id ? 'active' : ''}" href="#${item.id}" data-route="${item.id}"><i class="bi ${item.icon} me-1"></i>${item.label}</a></li>`).join('')}
        </ul>
      </div>
    </div>
  </nav>`
}

// ── Render: Overview ──

function renderOverviewPage() {
  const m = { triaged: state.reports.length, urgent: state.reports.filter(r => r.urgency === 'Critical' || r.urgency === 'High').length, volunteers: volunteers.length, review: state.reports.filter(r => r.reviewFlags.length).length }
  const focus = getSelectedReport()
  const recentCases = getFilteredReports().slice(0, 6)
  return `
  <div class="ct-page fade-in">
    <div class="d-flex gap-3 mb-3" style="flex-shrink:0">
      <div class="ct-card ct-card-lift ct-metric flex-fill"><div class="metric-icon"><i class="bi bi-clipboard-data"></i></div><div class="metric-number">${m.triaged}</div><div class="metric-label">Triaged</div></div>
      <div class="ct-card ct-card-lift ct-metric flex-fill"><div class="metric-icon"><i class="bi bi-exclamation-triangle"></i></div><div class="metric-number">${m.urgent}</div><div class="metric-label">Urgent</div></div>
      <div class="ct-card ct-card-lift ct-metric flex-fill"><div class="metric-icon"><i class="bi bi-people"></i></div><div class="metric-number">${m.volunteers}</div><div class="metric-label">Volunteers</div></div>
      <div class="ct-card ct-card-lift ct-metric flex-fill"><div class="metric-icon"><i class="bi bi-flag"></i></div><div class="metric-number">${m.review}</div><div class="metric-label">Review</div></div>
    </div>

    <div class="ct-card d-flex flex-wrap align-items-center justify-content-between gap-2 py-2 px-3 mb-3" style="flex-shrink:0">
      <div>
        <span class="fw-bold small">See the need. Rank the risk. Send the right help.</span>
        <span class="text-secondary small ms-2 d-none d-md-inline">Gemini AI or local fallback for triage.</span>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-primary btn-sm" data-route="intake"><i class="bi bi-plus-circle me-1"></i>Analyze</button>
        <button class="btn btn-outline-light btn-sm" data-route="cases"><i class="bi bi-list-check me-1"></i>Cases</button>
        <button class="btn btn-outline-light btn-sm" id="reset-demo-btn"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset</button>
      </div>
    </div>

    <div class="ct-split">
      <div class="ct-split-col ct-split-main">
        <div class="ct-card ct-scroll-panel p-0">
          <div class="p-3" style="border-bottom:1px solid var(--ct-border);flex-shrink:0">
            <div class="ct-eyebrow mb-0">Recent Cases</div>
          </div>
          <div class="ct-scroll-inner">
            ${recentCases.map(r => `
              <div class="ct-case-item priority-${r.urgency.toLowerCase()}" data-select-report="${sanitize(r.id)}" style="cursor:pointer">
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <span class="fw-600 small">${sanitize(r.title)}</span>
                  <span class="badge ${urgencyBadgeClass(r.urgency)} ms-2 flex-shrink-0">${r.urgency}</span>
                </div>
                <div class="d-flex gap-2 align-items-center">
                  <small class="text-secondary"><i class="bi bi-geo-alt"></i> ${sanitize(r.location)}</small>
                  <small style="color:var(--ct-primary)"><i class="bi bi-bullseye"></i> ${r.score}%</small>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="ct-split-col ct-split-side">
        <div class="ct-card ct-detail-panel">
          <div class="ct-eyebrow">Current Focus</div>
          <h5 class="fw-bold mb-2">${sanitize(focus.title)}</h5>
          <p class="text-secondary small mb-3">${sanitize(focus.summary)}</p>
          <div class="row g-2">
            <div class="col-6"><span class="ct-label d-block">Location</span><span class="ct-value">${sanitize(focus.location)}</span></div>
            <div class="col-6"><span class="ct-label d-block">Urgency</span><span class="badge ${urgencyBadgeClass(focus.urgency)} mt-1">${focus.urgency}</span></div>
            <div class="col-6 mt-2"><span class="ct-label d-block">Priority</span><span class="ct-value" style="color:var(--ct-primary)">${focus.score}%</span></div>
            <div class="col-6 mt-2"><span class="ct-label d-block">Confidence</span><span class="ct-value">${focus.confidence}%</span></div>
          </div>
          <div class="ct-section">
            <span class="ct-label d-block mb-1">Need</span>
            <span class="small">${sanitize(focus.need)}</span>
          </div>
          <div class="ct-section">
            <span class="ct-label d-block mb-1">Status</span>
            <span class="small">${focus.assignedVolunteerId ? sanitize(focus.status) : '<span class="text-secondary">Unassigned — pending review</span>'}</span>
          </div>
          <div class="ct-section">
            <span class="ct-label d-block mb-1">Source</span>
            <span class="small text-secondary">${sanitize(focus.source)}</span>
          </div>
          <div class="ct-section">
            <button class="btn btn-primary btn-sm w-100" data-route="cases"><i class="bi bi-arrow-right me-1"></i>Open in Case Board</button>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

// ── Render: Cases ──

function renderCasesPage() {
  const selected = getSelectedReport()
  const filtered = getFilteredReports()
  const locations = ['All', ...new Set(state.reports.map(r => r.location))]
  const vol = volunteers.find(v => v.id === selected.assignedVolunteerId) || volunteers.find(v => v.id === selected.match?.id) || volunteers[0]

  return `
  <div class="ct-page fade-in">
    <div class="d-flex justify-content-between align-items-center mb-3" style="flex-shrink:0">
      <div><h4 class="ct-section-title mb-0">Case Board</h4><p class="ct-section-desc mb-0">Ranked community reports with AI-powered triage</p></div>
      <button class="btn btn-primary btn-sm" data-route="intake"><i class="bi bi-plus me-1"></i>New report</button>
    </div>
    <div class="ct-split">
      <div class="ct-split-col ct-split-main">
        <div class="ct-card ct-scroll-panel p-0">
          <div class="p-3" style="border-bottom:1px solid var(--ct-border);flex-shrink:0">
            <div class="d-flex gap-2 flex-wrap">
              <input class="form-control form-control-sm" id="case-search" type="search" placeholder="Search..." value="${sanitize(state.filters.search)}" style="max-width:160px" />
              <select class="form-select form-select-sm" id="urgency-filter" style="max-width:110px">${['All', 'Critical', 'High', 'Medium'].map(v => `<option value="${v}" ${state.filters.urgency === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
              <select class="form-select form-select-sm" id="location-filter" style="max-width:140px">${locations.map(v => `<option value="${sanitize(v)}" ${state.filters.location === v ? 'selected' : ''}>${sanitize(v)}</option>`).join('')}</select>
              <select class="form-select form-select-sm" id="sort-filter" style="max-width:110px">${[{v:'priority',l:'Priority'},{v:'confidence',l:'Confidence'},{v:'location',l:'Location'}].map(o => `<option value="${o.v}" ${state.filters.sort === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}</select>
            </div>
          </div>
          <div class="ct-scroll-inner">
            ${filtered.length ? filtered.map(r => `
              <div class="ct-case-item priority-${r.urgency.toLowerCase()} ${r.id === selected.id ? 'selected' : ''}" data-select-report="${sanitize(r.id)}">
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <span class="fw-600 small">${sanitize(r.title)}</span>
                  <span class="badge ${urgencyBadgeClass(r.urgency)} ms-2 flex-shrink-0">${r.urgency}</span>
                </div>
                <p class="text-secondary small mb-1 text-truncate-2" style="font-size:0.8rem">${sanitize(r.summary)}</p>
                <div class="d-flex flex-wrap gap-2 align-items-center">
                  <small class="text-secondary"><i class="bi bi-geo-alt"></i> ${sanitize(r.location)}</small>
                  <small style="color:var(--ct-primary)"><i class="bi bi-bullseye"></i> ${r.score}%</small>
                  <small class="text-secondary">${sanitize(r.id)}</small>
                  ${r.reviewFlags.map(f => `<span class="ct-flag ct-flag-${f.code}">${sanitize(f.label)}</span>`).join('')}
                </div>
              </div>
            `).join('') : '<div class="p-4 text-center text-secondary">No cases match filters</div>'}
          </div>
        </div>
      </div>
      <div class="ct-split-col ct-split-side">
        <div class="ct-card ct-detail-panel">
          <div class="ct-eyebrow">Case Detail</div>
          <h5 class="fw-bold mb-1">${sanitize(selected.title)}</h5>
          <p class="text-secondary small mb-0">${sanitize(selected.summary)}</p>

          <div class="ct-section">
            <div class="row g-2">
              <div class="col-6"><span class="ct-label d-block">Issue</span><span class="ct-value small">${sanitize(selected.issueType)}</span></div>
              <div class="col-6"><span class="ct-label d-block">Location</span><span class="ct-value small">${sanitize(selected.location)}</span></div>
              <div class="col-6 mt-2"><span class="ct-label d-block">Priority</span><span class="ct-value small" style="color:var(--ct-primary)">${selected.score}%</span></div>
              <div class="col-6 mt-2"><span class="ct-label d-block">Confidence</span><span class="ct-value small">${selected.confidence}%</span></div>
            </div>
          </div>

          <div class="ct-section">
            <span class="ct-label d-block mb-1">Need</span>
            <span class="small">${sanitize(selected.need)}</span>
          </div>

          <div class="ct-section">
            <span class="ct-label d-block mb-1">AI Reasoning</span>
            <span class="small text-secondary">${sanitize(selected.reason || '—')}</span>
          </div>

          <div class="ct-section">
            <span class="ct-label d-block mb-1">Source</span>
            <span class="small text-secondary">${sanitize(selected.source)}</span>
          </div>

          <div class="ct-section">
            <span class="ct-label d-block mb-1">Flags</span>
            ${selected.reviewFlags.length ? selected.reviewFlags.map(f => `<span class="ct-flag ct-flag-${f.code} me-1">${sanitize(f.label)}</span>`).join('') : '<span class="ct-flag ct-flag-ok">No flags</span>'}
          </div>

          <div class="ct-section">
            <div class="ct-eyebrow">Override</div>
            <form id="override-form" data-report-id="${sanitize(selected.id)}" class="d-flex gap-2">
              <select class="form-select form-select-sm" name="overrideUrgency" style="max-width:110px">${['Critical','High','Medium'].map(v => `<option value="${v}" ${selected.urgency===v?'selected':''}>${v}</option>`).join('')}</select>
              <input class="form-control form-control-sm" name="overrideScore" type="number" min="0" max="99" value="${selected.score}" style="max-width:70px" />
              <button class="btn btn-outline-light btn-sm" type="submit"><i class="bi bi-check2"></i></button>
            </form>
          </div>

          <div class="ct-section">
            <div class="ct-eyebrow">Assignment</div>
            <select class="form-select form-select-sm mb-2" id="assignment-select" data-report-id="${sanitize(selected.id)}">${volunteers.map(v => `<option value="${sanitize(v.id)}" ${v.id === (selected.assignedVolunteerId || selected.match?.id) ? 'selected' : ''}>${sanitize(v.name)} (${v.score}%)</option>`).join('')}</select>
            <div class="d-flex gap-2">
              <button class="btn btn-primary flex-grow-1" data-assign-selected="${sanitize(selected.id)}"><i class="bi bi-person-check me-1"></i>Assign</button>
              <button class="btn btn-outline-danger btn-sm" data-unassign-report="${sanitize(selected.id)}" ${selected.assignedVolunteerId ? '' : 'disabled'}>Unassign</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

// ── Render: Intake ──

function renderIntakePage() {
  return `
  <div class="ct-page fade-in">
    <div style="flex-shrink:0">
      <h4 class="ct-section-title">Report Intake</h4>
      <p class="ct-section-desc mb-3">Submit a new incident for AI-powered triage. CSV batch import supported.</p>
    </div>
    <div class="ct-split">
      <div class="ct-split-col ct-split-main" style="overflow-y:auto">
        <div class="ct-card d-flex flex-column" style="flex:1;min-height:0">
          <div class="d-flex flex-wrap gap-2 mb-3" style="flex-shrink:0">
            <button class="btn btn-outline-light btn-sm" data-demo-key="water"><i class="bi bi-droplet me-1"></i>Water crisis</button>
            <button class="btn btn-outline-light btn-sm" data-demo-key="flood"><i class="bi bi-cloud-rain me-1"></i>Flood relief</button>
            <button class="btn btn-outline-light btn-sm" data-demo-key="medical"><i class="bi bi-heart-pulse me-1"></i>Medical camp</button>
          </div>
          <form id="report-form" class="d-flex flex-column" style="flex:1;min-height:0">
            <div class="mb-3 d-flex flex-column" style="flex:1;min-height:0">
              <label class="form-label ct-label">Incident report</label>
              <textarea class="form-control" id="incident-field" name="incident" maxlength="${INCIDENT_CHAR_LIMIT}" placeholder="Describe the community need..." style="flex:1;min-height:100px;resize:none"></textarea>
              <div class="form-text text-end small" id="incident-char-count">0/${INCIDENT_CHAR_LIMIT}</div>
            </div>
            <div class="d-flex gap-3 mb-3 flex-wrap" style="flex-shrink:0">
              <div class="flex-fill"><label class="form-label ct-label">Location</label><input class="form-control form-control-sm" name="location" placeholder="South District" /></div>
              <div class="flex-fill"><label class="form-label ct-label">Support needed</label><input class="form-control form-control-sm" name="support" placeholder="Water, food, medical" /></div>
              <div class="flex-fill"><label class="form-label ct-label">Source</label><input class="form-control form-control-sm" name="source" placeholder="Field note, survey" /></div>
            </div>
            <div class="mb-3" style="flex-shrink:0">
              <label class="form-label ct-label">CSV batch import</label>
              <input class="form-control form-control-sm" id="csv-upload" type="file" accept=".csv,text/csv" />
            </div>
            <button type="submit" class="btn btn-primary" id="analyze-button" style="flex-shrink:0">${state.analysisStatus.kind === 'loading' ? '<span class="spinner-border spinner-border-sm me-2"></span>Analyzing...' : '<i class="bi bi-cpu me-1"></i>Analyze report'}</button>
          </form>
          ${state.analysisStatus.message ? `<div class="alert alert-${state.analysisStatus.kind === 'error' ? 'danger' : state.analysisStatus.kind === 'success' ? 'success' : 'info'} mt-3 small py-2" role="alert">${sanitize(state.analysisStatus.message)}</div>` : ''}
        </div>
      </div>
      <div class="ct-split-col ct-split-side" style="overflow-y:auto">
        <div class="ct-card d-flex flex-column" style="flex:1;min-height:0">
          <div class="ct-eyebrow mb-2">How it works</div>

          <div class="ct-pipeline mb-3" style="flex-shrink:0">
            <div class="ct-pipeline-node">
              <i class="bi bi-file-text ct-pipeline-node-icon"></i>
              <span class="ct-pipeline-node-label">Input</span>
            </div>
            <span class="ct-pipeline-arrow">›</span>
            <div class="ct-pipeline-node">
              <i class="bi bi-cpu ct-pipeline-node-icon"></i>
              <span class="ct-pipeline-node-label">AI Parse</span>
            </div>
            <span class="ct-pipeline-arrow">›</span>
            <div class="ct-pipeline-node">
              <i class="bi bi-bullseye ct-pipeline-node-icon"></i>
              <span class="ct-pipeline-node-label">Score</span>
            </div>
            <span class="ct-pipeline-arrow">›</span>
            <div class="ct-pipeline-node">
              <i class="bi bi-person-check ct-pipeline-node-icon"></i>
              <span class="ct-pipeline-node-label">Assign</span>
            </div>
          </div>

          <div style="flex:1;min-height:0">
            <div class="ct-how-step">
              <div class="ct-how-step-num">1</div>
              <div class="ct-how-step-body">
                <span class="ct-how-step-title">Structured extraction via Gemini</span>
                <span class="ct-how-step-desc">Unstructured reports are parsed into issue type, urgency, location, and affected group.</span>
              </div>
            </div>
            <div class="ct-how-step">
              <div class="ct-how-step-num">2</div>
              <div class="ct-how-step-body">
                <span class="ct-how-step-title">Urgency and confidence scoring</span>
                <span class="ct-how-step-desc">Each case receives a priority score (0–99) and a confidence rating based on signal strength.</span>
              </div>
            </div>
            <div class="ct-how-step">
              <div class="ct-how-step-num">3</div>
              <div class="ct-how-step-body">
                <span class="ct-how-step-title">Volunteer matching and assignment</span>
                <span class="ct-how-step-desc">Skills, location, and availability are scored to surface the best-fit volunteer automatically.</span>
              </div>
            </div>
            <div class="ct-how-step">
              <div class="ct-how-step-num">4</div>
              <div class="ct-how-step-body">
                <span class="ct-how-step-title">Local fallback if AI is unavailable</span>
                <span class="ct-how-step-desc">Keyword-based triage runs offline so operations never stop, even without a network.</span>
              </div>
            </div>
          </div>

          <div class="mt-auto pt-3" style="flex-shrink:0">
            <div class="ct-sys-status">
              <div class="ct-sys-status-row">
                <i class="bi ${state.backend.geminiConfigured ? 'bi-check-circle-fill text-success' : 'bi-circle-half text-warning'}"></i>
                <span style="color:var(--ct-text)">${state.backend.geminiConfigured ? 'Gemini AI active' : 'Local fallback mode'}</span>
              </div>
              <div class="ct-sys-status-row">
                <i class="bi bi-shield-check" style="color:var(--ct-primary)"></i>
                <span style="color:var(--ct-text-muted)">Fallback always ready</span>
              </div>
              <div class="ct-sys-status-row">
                <i class="bi bi-lock" style="color:var(--ct-text-dim)"></i>
                <span style="color:var(--ct-text-muted)">Reports stay on your server</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

// ── Render: Volunteers ──

function renderVolunteersPage() {
  const selected = getSelectedReport()
  const ranked = volunteers.map(v => ({ v, fit: buildVolunteerFit(selected, v) })).sort((a, b) => b.fit.score - a.fit.score)
  const topId = ranked[0]?.v.id
  return `
  <div class="ct-page fade-in">
    <div class="d-flex justify-content-between align-items-center mb-2" style="flex-shrink:0">
      <div><h4 class="ct-section-title mb-0">Volunteer Coordination</h4><p class="ct-section-desc mb-0">Match the right person to the right case.</p></div>
      <span class="badge ${urgencyBadgeClass(selected.urgency)}">${sanitize(selected.title)}</span>
    </div>
    <div class="ct-card d-flex align-items-center gap-3 py-2 px-3 mb-3" style="flex-shrink:0;background:var(--ct-primary-dim);border-color:var(--ct-primary-strong)">
      <i class="bi bi-bullseye" style="color:var(--ct-primary);font-size:1rem;flex-shrink:0"></i>
      <div class="d-flex gap-3 flex-wrap small">
        <span><span class="ct-label me-1">Case</span><span style="color:var(--ct-text)">${sanitize(selected.id)}</span></span>
        <span><span class="ct-label me-1">Issue</span><span style="color:var(--ct-text)">${sanitize(selected.issueType)}</span></span>
        <span><span class="ct-label me-1">Location</span><span style="color:var(--ct-text)">${sanitize(selected.location)}</span></span>
        <span><span class="ct-label me-1">Need</span><span style="color:var(--ct-text)">${sanitize(selected.need)}</span></span>
      </div>
    </div>
    <div class="ct-vol-grid">
      ${ranked.map(({ v, fit }) => {
        const isAssigned = selected.assignedVolunteerId === v.id
        const isTop = v.id === topId
        return `
          <div class="ct-card ct-card-lift ${isAssigned ? 'ct-card-active' : isTop ? 'ct-top-match' : ''} d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <strong class="small">${sanitize(v.name)}</strong>
              ${isAssigned ? '<span class="ct-flag ct-flag-ok">Assigned</span>' : isTop ? '<span class="ct-flag ct-flag-ok">Best match</span>' : ''}
            </div>
            <p class="small text-secondary mb-1" style="font-size:0.8rem">${sanitize(v.skills.join(' · '))}</p>
            <small class="text-secondary d-block mb-2"><i class="bi bi-geo-alt me-1"></i>${sanitize(v.location)} · ${sanitize(v.availability)}</small>
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="ct-label">Fit score</span>
              <span class="small fw-bold" style="color:var(--ct-primary)">${fit.score}%</span>
            </div>
            <div class="ct-progress-mini mb-2"><div class="fill" style="width:${fit.score}%"></div></div>
            <small class="text-secondary mb-2" style="font-size:0.72rem;line-height:1.4">${sanitize(fit.summary)}</small>
            <button class="btn ${isAssigned ? 'btn-primary' : 'btn-outline-light'} btn-sm w-100 mt-auto" data-assign-volunteer="${sanitize(selected.id)}" data-volunteer-id="${sanitize(v.id)}">${isAssigned ? '<i class="bi bi-check-circle me-1"></i>Assigned' : 'Assign to case'}</button>
          </div>`
      }).join('')}
    </div>
  </div>`
}

// ── Render: Insights ──

function renderInsightsPage() {
  const byLoc = state.reports.reduce((a, r) => { a[r.location] = (a[r.location] || 0) + 1; return a }, {})
  const byIssue = state.reports.reduce((a, r) => { a[r.issueType] = (a[r.issueType] || 0) + 1; return a }, {})
  const byUrgency = { Critical: 0, High: 0, Medium: 0 }
  state.reports.forEach(r => { byUrgency[r.urgency] = (byUrgency[r.urgency] || 0) + 1 })
  const locItems = Object.entries(byLoc).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const issueItems = Object.entries(byIssue).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const avgConf = Math.round(state.reports.reduce((s, r) => s + r.confidence, 0) / Math.max(state.reports.length, 1))
  const urgentPct = Math.round(state.reports.filter(r => r.urgency === 'Critical' || r.urgency === 'High').length / Math.max(state.reports.length, 1) * 100)
  const peak = Math.max(...locItems.map(([, c]) => c), 1)
  const issuePeak = Math.max(...issueItems.map(([, c]) => c), 1)
  const total = Math.max(state.reports.length, 1)

  function bars(items, p) { return items.map(([label, count]) => `<div class="d-flex align-items-center gap-2 mb-2"><span class="text-secondary small text-end" style="width:110px;flex-shrink:0;font-size:0.8rem">${sanitize(label)}</span><div class="ct-bar-track flex-grow-1"><div class="ct-bar-fill" style="width:${Math.max(8, Math.round(count/p*100))}%"></div></div><span class="small fw-600" style="width:24px;color:var(--ct-primary)">${count}</span></div>`).join('') }

  const urgencyColors = { Critical: 'var(--ct-danger)', High: 'var(--ct-warning)', Medium: '#3B82F6' }
  const urgencyBars = Object.entries(byUrgency).map(([label, count]) => `
    <div class="d-flex align-items-center gap-2 mb-2">
      <span class="text-secondary small text-end" style="width:60px;flex-shrink:0;font-size:0.8rem">${label}</span>
      <div class="ct-bar-track flex-grow-1"><div class="ct-bar-fill" style="width:${Math.max(4, Math.round(count/total*100))}%;background:${urgencyColors[label]}"></div></div>
      <span class="small fw-600" style="width:24px;color:${urgencyColors[label]}">${count}</span>
    </div>`).join('')

  return `
  <div class="ct-page fade-in">
    <div style="flex-shrink:0">
      <h4 class="ct-section-title">Insights</h4>
      <p class="ct-section-desc mb-3">Visual summary of need concentration, issue clusters, and extraction quality.</p>
    </div>
    <div class="d-flex gap-3 mb-3" style="flex-shrink:0">
      <div class="ct-card ct-card-lift ct-metric flex-fill"><div class="metric-icon"><i class="bi bi-geo-alt-fill"></i></div><div class="metric-number" style="font-size:1.25rem">${locItems[0]?.[0] || '-'}</div><div class="metric-label">Top Hotspot</div><span class="ct-trend-up">↑ Active</span></div>
      <div class="ct-card ct-card-lift ct-metric flex-fill"><div class="metric-icon"><i class="bi bi-tag-fill"></i></div><div class="metric-number" style="font-size:1.25rem">${issueItems[0]?.[0] || '-'}</div><div class="metric-label">Top Issue</div><span class="ct-trend-neutral">${issueItems[0]?.[1] || 0} cases</span></div>
      <div class="ct-card ct-card-lift ct-metric flex-fill"><div class="metric-icon"><i class="bi bi-shield-check"></i></div><div class="metric-number">${avgConf}%</div><div class="metric-label">Avg Confidence</div><span class="${avgConf >= 85 ? 'ct-trend-up' : 'ct-trend-neutral'}">${avgConf >= 85 ? '↑ High' : '→ Moderate'}</span></div>
      <div class="ct-card ct-card-lift ct-metric flex-fill"><div class="metric-icon"><i class="bi bi-exclamation-diamond"></i></div><div class="metric-number">${urgentPct}%</div><div class="metric-label">Urgent Share</div><span class="${urgentPct > 50 ? 'ct-trend-up' : 'ct-trend-neutral'}">${urgentPct > 50 ? '↑ High load' : '→ Manageable'}</span></div>
    </div>
    <div class="ct-insight-charts">
      <div class="ct-card d-flex flex-column" style="flex:2">
        <div class="ct-eyebrow">By Location</div>
        ${locItems.length ? bars(locItems, peak) : '<p class="text-secondary small mb-0">No data yet</p>'}
      </div>
      <div class="ct-card d-flex flex-column" style="flex:2">
        <div class="ct-eyebrow">By Issue Type</div>
        ${issueItems.length ? bars(issueItems, issuePeak) : '<p class="text-secondary small mb-0">No data yet</p>'}
      </div>
      <div class="ct-card d-flex flex-column" style="flex:1">
        <div class="ct-eyebrow">By Urgency</div>
        ${urgencyBars}
        <div class="ct-section mt-auto" style="padding-top:0.75rem;margin-top:0.75rem">
          <div class="ct-label mb-1">Flagged for review</div>
          <span class="ct-value" style="font-size:1rem">${state.reports.filter(r => r.reviewFlags.length).length}</span>
          <span class="text-secondary small ms-1">of ${state.reports.length} cases</span>
        </div>
      </div>
    </div>
  </div>`
}

// ── Render: Audit ──

function renderAuditPage() {
  const typeCounts = state.auditTrail.reduce((a, e) => { a[e.type] = (a[e.type] || 0) + 1; return a }, {})
  return `
  <div class="ct-page fade-in">
    <div class="d-flex justify-content-between align-items-center mb-3" style="flex-shrink:0">
      <div><h4 class="ct-section-title mb-0">Audit Trail</h4><p class="ct-section-desc mb-0">Every action stays visible for trust and accountability.</p></div>
      <button class="btn btn-outline-light btn-sm" id="export-audit-btn"><i class="bi bi-download me-1"></i>Export JSON</button>
    </div>
    <div class="d-flex gap-2 mb-3 flex-wrap" style="flex-shrink:0">
      ${Object.entries(typeCounts).map(([type, count]) => `
        <div class="ct-card py-2 px-3 d-flex align-items-center gap-2" style="flex-shrink:0">
          <span class="badge bg-secondary" style="font-size:0.65rem">${sanitize(type)}</span>
          <span class="fw-bold small" style="color:var(--ct-primary)">${count}</span>
          <span class="text-secondary small">event${count !== 1 ? 's' : ''}</span>
        </div>`).join('')}
      ${state.auditTrail.length ? `
        <div class="ct-card py-2 px-3 d-flex align-items-center gap-2" style="flex-shrink:0">
          <i class="bi bi-clock-history" style="color:var(--ct-text-muted)"></i>
          <span class="text-secondary small">Last: ${new Date(state.auditTrail[0].timestamp).toLocaleTimeString()}</span>
        </div>` : ''}
    </div>
    <div class="ct-card ct-scroll-panel p-0">
      <div class="ct-scroll-inner">
      ${state.auditTrail.length ? state.auditTrail.map(e => `
        <div class="ct-case-item" style="cursor:default">
          <div class="d-flex justify-content-between align-items-start mb-1">
            <div><span class="badge bg-secondary me-2" style="font-size:0.65rem">${sanitize(e.type)}</span><span class="small fw-600">${sanitize(e.reportId || '')}</span></div>
            <small class="text-secondary" style="font-size:0.7rem">${new Date(e.timestamp).toLocaleString()}</small>
          </div>
          <p class="small text-secondary mb-0">${sanitize(e.message)}</p>
        </div>
      `).join('') : `
        <div class="d-flex flex-column align-items-center justify-content-center p-5 text-center" style="flex:1">
          <i class="bi bi-shield-check mb-3" style="font-size:2rem;color:var(--ct-text-dim)"></i>
          <p class="text-secondary small mb-1">No audit events yet.</p>
          <p class="text-secondary small mb-0" style="font-size:0.75rem">Actions like analyze, assign, and override will appear here.</p>
        </div>`}
      </div>
    </div>
  </div>`
}

// ── Event Handlers ──

function attachListeners() {
  document.querySelectorAll('[data-route]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); go(el.getAttribute('data-route')) }))
  document.querySelectorAll('[data-select-report]').forEach(el => el.addEventListener('click', () => { state.selectedReportId = el.getAttribute('data-select-report'); render() }))
  document.querySelectorAll('[data-assign-suggested]').forEach(el => el.addEventListener('click', () => { const r = state.reports.find(x => x.id === el.getAttribute('data-assign-suggested')); if (r) { const v = volunteers.find(x => x.id === (r.assignedVolunteerId || r.match?.id)) || findBestVolunteer(r).volunteer; assignVolunteer(r.id, v.id, 'suggested') } }))
  document.querySelectorAll('[data-assign-volunteer]').forEach(el => el.addEventListener('click', () => assignVolunteer(el.getAttribute('data-assign-volunteer'), el.getAttribute('data-volunteer-id'), 'volunteer-page')))
  document.querySelectorAll('[data-assign-selected]').forEach(el => el.addEventListener('click', () => { const sel = document.getElementById('assignment-select'); if (sel?.value) assignVolunteer(el.getAttribute('data-assign-selected'), sel.value, 'manual-picker') }))
  document.querySelectorAll('[data-unassign-report]').forEach(el => el.addEventListener('click', () => unassignVolunteer(el.getAttribute('data-unassign-report'))))
  document.querySelectorAll('[data-demo-key]').forEach(el => el.addEventListener('click', () => { const p = demoScenarios[el.getAttribute('data-demo-key')]; const f = document.getElementById('report-form'); if (p && f) { f.elements.incident.value = p.incident; f.elements.location.value = p.location; f.elements.support.value = p.support; f.elements.source.value = p.source } }))
  document.getElementById('case-search')?.addEventListener('input', e => { state.filters.search = e.target.value; render() })
  document.getElementById('urgency-filter')?.addEventListener('change', e => { state.filters.urgency = e.target.value; render() })
  document.getElementById('location-filter')?.addEventListener('change', e => { state.filters.location = e.target.value; render() })
  document.getElementById('sort-filter')?.addEventListener('change', e => { state.filters.sort = e.target.value; render() })
  document.getElementById('override-form')?.addEventListener('submit', handleOverrideSubmit)
  document.getElementById('report-form')?.addEventListener('submit', handleReportSubmit)
  document.getElementById('incident-field')?.addEventListener('input', e => { const c = document.getElementById('incident-char-count'); if (c) c.textContent = `${e.target.value.length}/${INCIDENT_CHAR_LIMIT}` })
  document.getElementById('csv-upload')?.addEventListener('change', handleCsvImport)
  document.getElementById('reset-demo-btn')?.addEventListener('click', handleResetDemo)
  document.getElementById('export-audit-btn')?.addEventListener('click', handleExportAudit)
}

function assignVolunteer(reportId, volunteerId, source) {
  const report = state.reports.find(r => r.id === reportId)
  const volunteer = volunteers.find(v => v.id === volunteerId)
  if (!report || !volunteer) return
  report.assignedVolunteerId = volunteer.id
  report.status = `Assigned to ${volunteer.name}`
  report.match = { ...volunteer, ...buildVolunteerFit(report, volunteer) }
  addAudit('assign', report.id, `Assigned ${volunteer.name} to ${report.id}.`, { volunteerId: volunteer.id, source })
  state.analysisStatus = { kind: 'success', message: `${volunteer.name} assigned to ${report.id}.` }
  state.selectedReportId = report.id
  saveSnapshot(); render()
}

function unassignVolunteer(reportId) {
  const report = state.reports.find(r => r.id === reportId)
  if (!report) return
  report.assignedVolunteerId = ''
  report.status = 'Needs manual assignment'
  addAudit('unassign', report.id, `Removed assignment from ${report.id}.`)
  state.analysisStatus = { kind: 'idle', message: `Volunteer removed from ${report.id}.` }
  saveSnapshot(); render()
}

function handleOverrideSubmit(e) {
  e.preventDefault()
  const reportId = e.currentTarget.getAttribute('data-report-id')
  const report = state.reports.find(r => r.id === reportId)
  if (!report) return
  const fd = new FormData(e.currentTarget)
  const urgency = String(fd.get('overrideUrgency') || report.urgency)
  const score = clampNumber(fd.get('overrideScore'), 0, 99, report.score)
  report.manualOverride = { previousUrgency: report.urgency, previousScore: report.score, urgency, score, timestamp: new Date().toISOString() }
  report.urgency = urgency; report.score = score; report.status = `Manually set to ${urgency}`
  report.reviewFlags = report.reviewFlags.filter(f => f.code !== 'low-confidence')
  addAudit('override', report.id, `Changed ${report.id} to ${urgency}/${score}%.`)
  state.analysisStatus = { kind: 'success', message: `Override applied to ${report.id}.` }
  saveSnapshot(); render()
}

async function handleReportSubmit(e) {
  e.preventDefault()
  const fd = new FormData(e.currentTarget)
  const incident = String(fd.get('incident') || '').trim()
  const location = String(fd.get('location') || '').trim()
  const support = String(fd.get('support') || '').trim()
  const source = String(fd.get('source') || '').trim()
  if (!incident) { state.analysisStatus = { kind: 'error', message: 'Enter a report before analyzing.' }; render(); return }
  if (incident.length > INCIDENT_CHAR_LIMIT) { state.analysisStatus = { kind: 'error', message: `Report too long. Keep under ${INCIDENT_CHAR_LIMIT} chars.` }; render(); return }

  state.analysisStatus = { kind: 'loading', message: 'Analyzing report...' }; render()

  const fallbackReport = buildLocalReport({ incident, location, support, source })
  const clientRequestId = createClientRequestId()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS)

  try {
    const res = await fetch('/api/analyze-report', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-client-request-id': clientRequestId }, body: JSON.stringify({ incident, locationHint: location, supportHint: support, source }), signal: controller.signal })
    const payload = await res.json().catch(() => ({}))
    const requestId = res.headers.get('x-request-id') || payload.requestId || ''
    if (!res.ok) throw Object.assign(new Error(payload.error || 'Backend unavailable'), { code: payload.code, requestId })
    if (!payload.analysis) throw Object.assign(new Error('Malformed response'), { code: 'MALFORMED', requestId })
    const report = buildBackendReport({ incident, location, support, source, analysis: payload.analysis, model: payload.model })
    insertNewReport(report, 'Gemini analysis completed.', { requestId, clientRequestId, provider: payload.provider || 'Gemini', attempts: payload.attempts })
  } catch (err) {
    insertNewReport(fallbackReport, `${err?.name === 'AbortError' ? 'Timed out.' : err?.message || 'Backend unavailable.'} Local fallback used.`, { clientRequestId, provider: 'Local fallback', fallbackReason: err?.code || 'FALLBACK' })
  } finally { clearTimeout(timeout) }
  e.currentTarget.reset()
}

function buildLocalReport({ incident, location, support, source }) {
  const template = getIssueTemplate('', incident)
  const confidence = Math.min(99, 64 + Math.min(12, tokenize(incident).length % 10) + (template.key === 'water' ? 12 : template.key === 'flood' ? 9 : template.key === 'medical' ? 7 : 4))
  const urgency = template.urgency
  const score = triageCore?.calculateHybridPriorityScore ? triageCore.calculateHybridPriorityScore({ confidence, urgency, fallbackScore: 70 }) : Math.min(99, Math.round(confidence * 0.4 + (urgency === 'Critical' ? 96 : urgency === 'High' ? 84 : 68) * 0.35 + 18))
  const report = normalizeReport({ id: `CT-${state.nextReportNumber++}`, rawText: incident, title: template.title, location: location || 'Community Zone', issueType: template.issueType, urgency, score, summary: incident, need: support || template.need, status: urgency === 'Critical' ? 'Needs immediate attention' : 'Queue for review', confidence, reason: `Local triage: ${template.issueType.toLowerCase()} signals, ${confidence}% confidence.`, source: source || 'Submitted through intake form', affectedGroup: 'Community members', assignedVolunteerId: '', duplicateOf: '', manualOverride: null })
  const dup = getDuplicateMatch(report)
  if (dup) { report.duplicateOf = dup.report.id; report.status = 'Flagged for duplicate review' }
  return report
}

function buildBackendReport({ incident, location, support, source, analysis, model }) {
  const template = getIssueTemplate(analysis.issueType, incident)
  const urgency = normalizeUrgency(analysis.urgency || template.urgency)
  const confidence = clampNumber(analysis.confidence, 0, 100, 78)
  const score = triageCore?.calculateHybridPriorityScore ? triageCore.calculateHybridPriorityScore({ confidence, urgency, fallbackScore: 72 }) : Math.min(99, Math.round(confidence * 0.4 + (urgency === 'Critical' ? 96 : urgency === 'High' ? 84 : 68) * 0.35 + 18))
  const report = normalizeReport({ id: `CT-${state.nextReportNumber++}`, rawText: incident, title: template.title, location: analysis.location || location || 'Community Zone', issueType: String(analysis.issueType || template.issueType).trim(), urgency, score, summary: analysis.summary || incident, need: Array.isArray(analysis.requiredResources) ? analysis.requiredResources.join(', ') : String(analysis.requiredResources || support || template.need), status: urgency === 'Critical' ? 'Needs immediate attention' : 'Queued for review', confidence, reason: String(analysis.justification || 'Gemini structured triage response.').trim(), source: source || 'Submitted through intake form', affectedGroup: String(analysis.affectedGroup || 'Community members').trim(), assignedVolunteerId: '', duplicateOf: '', manualOverride: null, provider: model ? `Gemini (${model})` : 'Gemini' })
  const dup = getDuplicateMatch(report)
  if (dup) { report.duplicateOf = dup.report.id; report.status = 'Flagged for duplicate review' }
  return report
}

function insertNewReport(report, message, metadata = {}) {
  state.reports = [report, ...state.reports]
  state.selectedReportId = report.id
  const vol = volunteers.find(v => v.id === report.match?.id) || volunteers[0]
  report.match = { ...vol, ...buildVolunteerFit(report, vol) }
  addAudit('analyze', report.id, `Analyzed ${report.id} with ${report.confidence}% confidence.`, { provider: report.provider || 'Triager', ...metadata })
  state.analysisStatus = { kind: report.provider?.startsWith('Gemini') ? 'success' : 'fallback', message }
  saveSnapshot(); go('cases')
}

function parseCsvText(csvText) {
  const text = String(csvText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = []; let val = '', row = [], inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { if (inQ && text[i+1] === '"') { val += '"'; i++ } else { inQ = !inQ } continue }
    if (c === ',' && !inQ) { row.push(val.trim()); val = ''; continue }
    if (c === '\n' && !inQ) { row.push(val.trim()); if (row.some(v => v)) rows.push(row); row = []; val = ''; continue }
    val += c
  }
  row.push(val.trim()); if (row.some(v => v)) rows.push(row)
  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.toLowerCase())
  return rows.slice(1).map(values => headers.reduce((obj, h, i) => { obj[h] = values[i] || ''; return obj }, {}))
}

async function handleCsvImport(e) {
  const file = e.target.files?.[0]; if (!file) return
  try {
    const rows = parseCsvText(await file.text())
    if (!rows.length) { state.analysisStatus = { kind: 'error', message: 'CSV needs header + data rows.' }; render(); return }
    let imported = 0
    rows.forEach(row => {
      const incident = row.incident || row.report || row.text || row.description || ''
      if (!incident.trim()) return
      const report = buildLocalReport({ incident, location: row.location || row.area || '', support: row.support || row.need || '', source: row.source || 'CSV import' })
      addAudit('analyze', report.id, `CSV import: ${report.id}`, { source: 'csv-import' })
      imported++
    })
    state.analysisStatus = { kind: 'success', message: `Imported ${imported} report${imported === 1 ? '' : 's'}.` }
    saveSnapshot(); go('cases')
  } catch (err) { state.analysisStatus = { kind: 'error', message: `CSV failed: ${err.message}` }; render() }
  finally { e.target.value = '' }
}

function handleResetDemo() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
  state.reports = seedReports.map(r => normalizeReport(r))
  state.auditTrail = state.reports.map((r, i) => ({ id: `AT-${i+1}`, type: 'analyze', reportId: r.id, message: `Case ${r.id} entered queue.`, timestamp: new Date(Date.now() - (i+1)*60000).toISOString(), metadata: {} }))
  state.selectedReportId = state.reports[0]?.id || null
  state.nextReportNumber = 1045; state.nextAuditNumber = state.reports.length + 1
  state.analysisStatus = { kind: 'success', message: 'Demo reset to initial state.' }
  saveSnapshot(); render()
}

function handleExportAudit() {
  const blob = new Blob([JSON.stringify(state.auditTrail, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = `audit-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url)
}

// ── Main Render ──

function render() {
  state.page = getPage()
  let content
  switch (state.page) {
    case 'cases': content = renderCasesPage(); break
    case 'intake': content = renderIntakePage(); break
    case 'volunteers': content = renderVolunteersPage(); break
    case 'insights': content = renderInsightsPage(); break
    case 'audit': content = renderAuditPage(); break
    default: content = renderOverviewPage()
  }
  root.innerHTML = renderNavbar() + `<main>${content}</main>`
  attachListeners()
  saveSnapshot()
}

// ── Backend Sync ──

async function syncBackendStatus() {
  try {
    const res = await fetch('/api/health'); if (!res.ok) throw new Error()
    const p = await res.json()
    state.backend.available = true; state.backend.geminiConfigured = Boolean(p.geminiConfigured); state.backend.model = p.model || null
  } catch { state.backend.available = false; state.backend.geminiConfigured = false; state.backend.model = null }
}

async function syncStateFromBackend() {
  try {
    const res = await fetch('/api/state'); if (!res.ok) return
    const p = await res.json()
    if (!p.state?.reports?.length) return
    if (!loadSnapshot()?.reports?.length) {
      state.reports = p.state.reports.map(r => normalizeReport(r))
      state.auditTrail = p.state.auditTrail || state.auditTrail
      state.selectedReportId = p.state.selectedReportId || state.selectedReportId
      state.nextReportNumber = p.state.nextReportNumber || state.nextReportNumber
      state.nextAuditNumber = p.state.nextAuditNumber || state.nextAuditNumber
      render()
    }
  } catch {}
}

// ── Boot ──
window.addEventListener('hashchange', render)
render()
syncBackendStatus()
syncStateFromBackend()
setInterval(syncBackendStatus, 60000)
