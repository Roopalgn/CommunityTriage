const triageCore = typeof window !== 'undefined' ? window.CommunityTriageCore || null : null

const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'cases', label: 'Cases' },
  { id: 'intake', label: 'Intake' },
  { id: 'volunteers', label: 'Volunteers' },
  { id: 'insights', label: 'Insights' },
  { id: 'audit', label: 'Audit' },
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

function sanitize(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] || character))
}

function formatLocationSafe(value) {
  if (triageCore?.formatLocation) return triageCore.formatLocation(value)
  return formatLocation(value)
}

function normalizeUrgencySafe(value) {
  if (triageCore?.normalizeUrgency) return triageCore.normalizeUrgency(value)
  return normalizeUrgency(value)
}

function titleCase(value) {
  return String(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function formatLocation(value) {
  const normalized = String(value || '').trim().toLowerCase()
  const aliases = ['south district', 'central ward', 'riverside zone', 'north point', 'east market', 'west end']
  const match = aliases.find((alias) => normalized.includes(alias))
  return match ? titleCase(match) : titleCase(normalized || 'Community Zone')
}

function summarizeText(text, limit = 96) {
  const cleaned = String(text || '').trim().replace(/\s+/g, ' ')
  return cleaned.length <= limit ? cleaned : `${cleaned.slice(0, limit - 1)}...`
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2)
}

function getPage() {
  const hash = String(window.location.hash || '#overview').replace(/^#/, '').toLowerCase()
  return ROUTES.has(hash) ? hash : 'overview'
}

function go(page) {
  const next = ROUTES.has(page) ? page : 'overview'
  if (window.location.hash !== `#${next}`) {
    window.location.hash = `#${next}`
    return
  }
  render()
}

function loadSnapshot() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveSnapshot() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      selectedReportId: state.selectedReportId,
      filters: state.filters,
      reports: state.reports,
      auditTrail: state.auditTrail,
      nextReportNumber: state.nextReportNumber,
      nextAuditNumber: state.nextAuditNumber,
    }))
  } catch (error) {
    if (error?.name === 'QuotaExceededError') {
      console.warn('CommunityTriage local storage quota exceeded. Persistence is disabled until space is freed.')
    }
  }
}

function normalizeUrgency(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'critical') {
    return 'Critical'
  }

  if (normalized === 'high') {
    return 'High'
  }

  return 'Medium'
}

function createClientRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `client-${crypto.randomUUID()}`
  }

  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function getIssueTemplate(issueType, text) {
  const issue = String(issueType || '').toLowerCase()
  const body = String(text || '').toLowerCase()

  if (issue.includes('water') || body.includes('water') || body.includes('pump')) {
    return { key: 'water', title: 'Urgent water support request', issueType: 'Water shortage', need: 'Water delivery, purification tablets, and transport coordination', urgency: 'Critical' }
  }
  if (issue.includes('flood') || body.includes('flood') || body.includes('blanket')) {
    return { key: 'flood', title: 'Flood response coordination needed', issueType: 'Flood relief', need: 'Food packets, blankets, and transport support', urgency: 'High' }
  }
  if (issue.includes('medical') || issue.includes('health') || body.includes('patient')) {
    return { key: 'medical', title: 'Medical camp assistance required', issueType: 'Medical support', need: 'Registration support, patient flow, and medical runners', urgency: 'High' }
  }
  if (issue.includes('food') || body.includes('ration')) {
    return { key: 'food', title: 'Food assistance needed', issueType: 'Food support', need: 'Meals, dry ration, and distribution help', urgency: 'High' }
  }

  return { key: 'default', title: 'Community support report', issueType: issueType || 'General support', need: 'Field review and volunteer allocation', urgency: 'Medium' }
}

function buildVolunteerFit(report, volunteer) {
  const expected = {
    water: ['Logistics', 'Crowd coordination'],
    flood: ['Procurement', 'Supply handling'],
    medical: ['Medical support', 'Registration'],
    food: ['Procurement', 'Crowd coordination'],
    default: ['Field coordination', 'Rapid response'],
  }[report.templateKey || 'default']

  const matched = volunteer.skills.filter((skill) => expected.some((entry) => entry.toLowerCase() === skill.toLowerCase()))
  const sameLocation = volunteer.location.toLowerCase() === report.location.toLowerCase()
  const speed = volunteer.availability.toLowerCase() === 'now' ? 8 : volunteer.availability.toLowerCase() === 'flexible' ? 4 : 1
  const urgencyBonus = report.urgency === 'Critical' ? 5 : report.urgency === 'High' ? 3 : 0
  const score = Math.min(99, 58 + matched.length * 14 + (sameLocation ? 14 : 0) + speed + urgencyBonus)

  return {
    score,
    matched,
    sameLocation,
    summary: `${matched.join(', ') || 'general support'} | ${sameLocation ? 'same-location coverage' : 'cross-area support'} | availability ${volunteer.availability.toLowerCase()}.`,
  }
}

function findBestVolunteer(report) {
  return volunteers
    .map((volunteer) => ({ volunteer, fit: buildVolunteerFit(report, volunteer) }))
    .sort((left, right) => right.fit.score - left.fit.score)[0]
}

function normalizeReport(seed) {
  const template = getIssueTemplate(seed.issueType, seed.summary)
  const report = {
    ...seed,
    location: formatLocation(seed.location),
    title: seed.title || template.title,
    issueType: seed.issueType || template.issueType,
    urgency: seed.urgency || template.urgency,
    need: seed.need || template.need,
    summary: summarizeText(seed.summary || seed.rawText || ''),
    source: seed.source || 'Submitted through intake form',
    affectedGroup: seed.affectedGroup || 'Community members',
    templateKey: template.key,
    assignedVolunteerId: seed.assignedVolunteerId || '',
    duplicateOf: seed.duplicateOf || '',
    manualOverride: seed.manualOverride || null,
  }

  const best = volunteers.find((volunteer) => volunteer.id === report.assignedVolunteerId) || findBestVolunteer(report).volunteer
  const fit = buildVolunteerFit(report, best)
  report.match = { ...best, score: fit.score, reason: fit.summary, breakdown: buildVolunteerFit(report, best) }
  report.reviewFlags = []

  if (report.confidence < 85) {
    report.reviewFlags.push({ code: 'low-confidence', label: `Low confidence (${report.confidence}%)` })
  }
  if (report.duplicateOf) {
    report.reviewFlags.push({ code: 'duplicate', label: `Possible duplicate of ${report.duplicateOf}` })
  }

  report.status = report.assignedVolunteerId
    ? `Assigned to ${best.name}`
    : report.duplicateOf
      ? 'Flagged for duplicate review'
      : report.confidence < 85
        ? 'Needs human review'
        : seed.status || 'Queue for review'

  return report
}

function buildAuditSeed(reports) {
  return reports.map((report, index) => ({
    id: `AT-${index + 1}`,
    type: 'analyze',
    reportId: report.id,
    message: `Case ${report.id} entered the queue with ${report.urgency.toLowerCase()} urgency and ${report.confidence}% confidence.`,
    timestamp: new Date(Date.now() - (index + 1) * 60000).toISOString(),
    metadata: {},
  }))
}

function getStateSnapshot() {
  const snapshot = loadSnapshot()
  if (!snapshot) {
    return null
  }

  return snapshot
}

const saved = getStateSnapshot()
const initialReports = saved?.reports?.length ? saved.reports.map((report) => normalizeReport(report)) : seedReports.map((report) => normalizeReport(report))

const state = {
  page: getPage(),
  reports: initialReports,
  auditTrail: saved?.auditTrail?.length ? saved.auditTrail : buildAuditSeed(initialReports),
  filters: saved?.filters || { search: '', urgency: 'All', location: 'All', sort: 'priority' },
  selectedReportId: saved?.selectedReportId || initialReports[0]?.id || null,
  nextReportNumber: saved?.nextReportNumber || 1045,
  nextAuditNumber: saved?.nextAuditNumber || initialReports.length + 1,
  backend: { available: false, geminiConfigured: false, model: null },
  analysisStatus: { kind: 'idle', message: '' },
}

function getSelectedReport() {
  return state.reports.find((report) => report.id === state.selectedReportId) || state.reports[0] || null
}

function getFilteredReports() {
  const query = state.filters.search.trim().toLowerCase()

  return [...state.reports]
    .filter((report) => {
      const matchesSearch = !query || [report.title, report.summary, report.location, report.issueType, report.need, report.source].join(' ').toLowerCase().includes(query)
      const matchesUrgency = state.filters.urgency === 'All' || report.urgency === state.filters.urgency
      const matchesLocation = state.filters.location === 'All' || report.location === state.filters.location
      return matchesSearch && matchesUrgency && matchesLocation
    })
    .sort((left, right) => {
      if (state.filters.sort === 'confidence') {
        return right.confidence - left.confidence
      }
      if (state.filters.sort === 'location') {
        return left.location.localeCompare(right.location)
      }
      return right.score - left.score
    })
}

function buildAnalytics(reports) {
  const byLocation = reports.reduce((accumulator, report) => {
    accumulator[report.location] = (accumulator[report.location] || 0) + 1
    return accumulator
  }, {})

  const byIssue = reports.reduce((accumulator, report) => {
    accumulator[report.issueType] = (accumulator[report.issueType] || 0) + 1
    return accumulator
  }, {})

  const locationHotspots = Object.entries(byLocation).sort((left, right) => right[1] - left[1]).slice(0, 4)
  const issueHotspots = Object.entries(byIssue).sort((left, right) => right[1] - left[1]).slice(0, 4)
  const topLocation = locationHotspots[0]
  const topIssue = issueHotspots[0]
  const averageConfidence = Math.round(reports.reduce((total, report) => total + report.confidence, 0) / Math.max(reports.length, 1))
  const urgentShare = reports.length ? Math.round((reports.filter((report) => report.urgency === 'Critical' || report.urgency === 'High').length / reports.length) * 100) : 0

  return {
    topLocation: topLocation ? topLocation[0] : 'No location yet',
    topLocationCount: topLocation ? topLocation[1] : 0,
    topIssue: topIssue ? topIssue[0] : 'No issue yet',
    topIssueCount: topIssue ? topIssue[1] : 0,
    averageConfidence,
    urgentShare,
    locationHotspots,
    issueHotspots,
  }
}

function buildMetrics(reports) {
  return {
    triaged: reports.length,
    urgent: reports.filter((report) => report.urgency === 'Critical' || report.urgency === 'High').length,
    activeVolunteers: volunteers.length,
    reviewQueue: reports.filter((report) => report.reviewFlags.length).length,
  }
}

function getDuplicateMatch(candidate) {
  const candidateTokens = tokenize(`${candidate.title} ${candidate.summary} ${candidate.need} ${candidate.rawText}`)
  const ranked = state.reports
    .filter((report) => report.id !== candidate.id)
    .map((report) => {
      const existingTokens = tokenize(`${report.title} ${report.summary} ${report.need} ${report.rawText || ''}`)
      const shared = candidateTokens.filter((token) => existingTokens.includes(token))
      const overlap = shared.length / Math.max(candidateTokens.length, 1)
      const sameLocation = report.location === candidate.location
      const sameIssue = report.issueType.toLowerCase() === candidate.issueType.toLowerCase()
      const sameSource = report.source.toLowerCase() === candidate.source.toLowerCase()
      return { report, score: overlap * 0.55 + (sameLocation ? 0.2 : 0) + (sameIssue ? 0.2 : 0) + (sameSource ? 0.05 : 0) }
    })
    .sort((left, right) => right.score - left.score)

  const top = ranked[0]
  if (!top) {
    return null
  }

  const threshold = top.report.source === 'Ward volunteer field note' ? 0.78 : 0.82
  return top.score >= threshold ? top : null
}

function createAudit(type, reportId, message, metadata = {}) {
  return {
    id: `AT-${state.nextAuditNumber++}`,
    type,
    reportId,
    message,
    timestamp: new Date().toISOString(),
    metadata,
  }
}

function addAudit(type, reportId, message, metadata = {}) {
  state.auditTrail = [createAudit(type, reportId, message, metadata), ...state.auditTrail].slice(0, AUDIT_LIMIT)
}

function renderBackendPill() {
  if (state.backend.available && state.backend.geminiConfigured) {
    return `<span class="status-pill status-pill--active" title="Gemini is configured and active"><span class="status-dot status-dot--active"></span>Gemini active</span>`
  }
  if (state.backend.available) {
    return `<span class="status-pill status-pill--fallback" title="Backend online, Gemini not configured"><span class="status-dot status-dot--fallback"></span>Fallback mode</span>`
  }
  return `<span class="status-pill status-pill--offline" title="Backend not reachable"><span class="status-dot status-dot--offline"></span>Offline</span>`
}

function renderHeader() {
  const focus = getSelectedReport()

  return `
    <header class="topbar reveal">
      <div class="brand-block">
        <div class="brand-mark">CT</div>
        <div>
          <strong>CommunityTriage</strong>
          <p>Fast, explainable triage for urgent community needs.</p>
        </div>
        ${renderBackendPill()}
      </div>

      <nav class="nav-pills" aria-label="Primary">
        ${navItems.map((item) => `<button type="button" class="nav-chip ${state.page === item.id ? 'active' : ''}" data-route="${item.id}" aria-current="${state.page === item.id ? 'page' : 'false'}">${item.label}</button>`).join('')}
      </nav>

      <aside class="focus-card">
        <span>Today in focus</span>
        <strong>${sanitize(focus.title)}</strong>
        <p>${sanitize(focus.reason)}</p>
      </aside>
    </header>
  `
}

function renderOverviewPage() {
  const metrics = buildMetrics(state.reports)
  const analytics = buildAnalytics(state.reports)
  const focus = getSelectedReport()

  return `
    <section class="page">
      <div class="hero-grid">
        <article class="hero-card reveal">
          <span class="eyebrow">Phase 1 live demo</span>
          <h1>See the need. Rank the risk. Send the right help.</h1>
          <p>Bring in a community report, structure it with Gemini or a safe fallback, and give coordinators a clear next step with visible reasoning.</p>
          <div class="hero-actions">
            <button type="button" data-route="intake">Analyze a report</button>
            <button type="button" class="ghost-button" data-route="cases">Open case board</button>
            <button type="button" class="ghost-button" id="reset-demo-btn" title="Reset to seed data for a clean demo">Reset demo</button>
          </div>
          <div class="hero-steps">
            <div><strong>1.</strong><span>Capture the report</span></div>
            <div><strong>2.</strong><span>Score urgency</span></div>
            <div><strong>3.</strong><span>Assign the right volunteer</span></div>
          </div>
        </article>

        <aside class="spotlight-card reveal">
          <span class="eyebrow">Current focus</span>
          <strong>${sanitize(focus.title)}</strong>
          <p>${sanitize(focus.summary)}</p>
          <div class="spotlight-meta">
            <div><span>Location</span><strong>${sanitize(focus.location)}</strong></div>
            <div><span>Urgency</span><strong>${sanitize(focus.urgency)}</strong></div>
            <div><span>Priority</span><strong>${focus.score}%</strong></div>
            <div><span>Confidence</span><strong>${focus.confidence}%</strong></div>
          </div>
        </aside>
      </div>

      <div class="stats-grid">
        <article class="stat-card reveal"><span>Reports triaged</span><strong>${metrics.triaged}</strong><small>Cases currently in the queue.</small></article>
        <article class="stat-card reveal"><span>Urgent cases</span><strong>${metrics.urgent}</strong><small>Critical or high-priority items waiting on response.</small></article>
        <article class="stat-card reveal"><span>Active volunteers</span><strong>${metrics.activeVolunteers}</strong><small>Profiles available for matching.</small></article>
        <article class="stat-card reveal"><span>Review queue</span><strong>${metrics.reviewQueue}</strong><small>Cases needing human review.</small></article>
      </div>

      <div class="feature-grid">
        <article class="feature-card reveal">
          <span class="eyebrow">Intelligence</span>
          <h2>Hotspots and extraction quality</h2>
          <p>Track the concentration of need by location and issue type, while keeping the extraction path transparent for judges.</p>
          <div class="mini-grid">
            <div class="mini-card"><span>Top hotspot</span><strong>${sanitize(analytics.topLocation)}</strong></div>
            <div class="mini-card"><span>Dominant issue</span><strong>${sanitize(analytics.topIssue)}</strong></div>
            <div class="mini-card"><span>Avg confidence</span><strong>${analytics.averageConfidence}%</strong></div>
            <div class="mini-card"><span>Urgent share</span><strong>${analytics.urgentShare}%</strong></div>
          </div>
        </article>

        <article class="feature-card reveal">
          <span class="eyebrow">Trust layer</span>
          <h2>Human-in-the-loop by design</h2>
          <p>Manual overrides, duplicate flags, assignment control, and audit events keep the workflow realistic instead of overly automated.</p>
          <div class="badge-row">
            <span>Manual override</span><span>Review flags</span><span>Assignment reasoning</span><span>Audit trail</span>
          </div>
        </article>
      </div>
    </section>
  `
}

function renderCasesPage() {
  const selected = getSelectedReport()
  const selectedVolunteer = volunteers.find((item) => item.id === selected.assignedVolunteerId) || volunteers.find((item) => item.id === selected.match?.id) || volunteers[0]
  const filteredReports = getFilteredReports()
  const locations = ['All', ...new Set(state.reports.map((report) => report.location))]

  return `
    <section class="page">
      <div class="section-head">
        <div>
          <span class="eyebrow">Case board</span>
          <h1>Ranked community reports</h1>
          <p>Choose a report, inspect the explanation, override the priority if needed, and assign the best available volunteer.</p>
        </div>
        <button type="button" data-route="intake">New report</button>
      </div>

      <div class="cases-layout">
        <article class="panel">
          <div class="filter-bar">
            <input id="case-search" aria-label="Search cases" type="search" value="${sanitize(state.filters.search)}" placeholder="Search reports, locations, or sources" />
            <select id="urgency-filter" aria-label="Filter by urgency">${['All', 'Critical', 'High', 'Medium'].map((value) => `<option value="${value}" ${state.filters.urgency === value ? 'selected' : ''}>${value}</option>`).join('')}</select>
            <select id="location-filter" aria-label="Filter by location">${locations.map((value) => `<option value="${sanitize(value)}" ${state.filters.location === value ? 'selected' : ''}>${sanitize(value)}</option>`).join('')}</select>
            <select id="sort-filter" aria-label="Sort case list">${[
              { value: 'priority', label: 'Sort by priority' },
              { value: 'confidence', label: 'Sort by confidence' },
              { value: 'location', label: 'Sort by location' },
            ].map((option) => `<option value="${option.value}" ${state.filters.sort === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}</select>
          </div>

          <div class="case-list">
            ${filteredReports.length ? filteredReports.map((report) => `
              <article class="case-card ${report.id === selected.id ? 'active' : ''}">
                <div class="case-head">
                  <div>
                    <strong>${sanitize(report.title)}</strong>
                    <small>${sanitize(report.issueType)} · ${sanitize(report.location)}</small>
                  </div>
                  <span>${sanitize(report.urgency)}</span>
                </div>
                <p>${sanitize(report.summary)}</p>
                <div class="case-meta">
                  <span>${sanitize(report.id)}</span>
                  <span>${sanitize(report.source)}</span>
                  <span>${report.score}% priority</span>
                  <span>${report.confidence}% confidence</span>
                </div>
                ${report.reviewFlags.length ? `<div class="flag-row">${report.reviewFlags.map((flag) => `<span class="flag-chip ${sanitize(flag.code)}">${sanitize(flag.label)}</span>`).join('')}</div>` : ''}
                <div class="case-actions">
                  <button type="button" class="ghost-button" data-select-report="${sanitize(report.id)}">View details</button>
                  ${report.assignedVolunteerId ? `<button type="button" class="ghost-button danger" data-unassign-report="${sanitize(report.id)}">Unassign</button>` : `<button type="button" data-assign-suggested="${sanitize(report.id)}">Assign suggested</button>`}
                </div>
              </article>
            `).join('') : '<div class="empty-state">No cases match the current filters. Try clearing search or changing urgency and location filters.</div>'}
          </div>
        </article>

        <aside class="panel detail-panel">
          <div class="panel-head">
            <span class="eyebrow">Case detail</span>
            <h2>Human review and assignment</h2>
          </div>

          <article class="detail-card">
            <div class="detail-topline">
              <div>
                <strong>${sanitize(selected.title)}</strong>
                <p>${sanitize(selected.summary)}</p>
              </div>
              <span>${sanitize(selected.id)}</span>
            </div>

            <div class="detail-grid">
              <div><span>Issue</span><strong>${sanitize(selected.issueType)}</strong></div>
              <div><span>Location</span><strong>${sanitize(selected.location)}</strong></div>
              <div><span>Urgency</span><strong>${sanitize(selected.urgency)}</strong></div>
              <div><span>Priority score</span><strong>${selected.score}%</strong></div>
              <div><span>Confidence</span><strong>${selected.confidence}%</strong></div>
              <div><span>Volunteer</span><strong>${sanitize(selectedVolunteer.name)}</strong></div>
            </div>

            <div class="review-box">
              <span class="eyebrow">Review flags</span>
              <div class="flag-row">${selected.reviewFlags.length ? selected.reviewFlags.map((flag) => `<span class="flag-chip ${sanitize(flag.code)}">${sanitize(flag.label)}</span>`).join('') : '<span class="flag-chip ok">No review flags</span>'}</div>
            </div>

            <form class="override-form" id="override-form" data-report-id="${sanitize(selected.id)}">
              <label>
                <span>Manual urgency override</span>
                <select name="overrideUrgency">${['Critical', 'High', 'Medium'].map((value) => `<option value="${value}" ${selected.urgency === value ? 'selected' : ''}>${value}</option>`).join('')}</select>
              </label>
              <label>
                <span>Manual priority score</span>
                <input name="overrideScore" type="number" min="0" max="99" value="${selected.score}" />
              </label>
              <button type="submit">Apply override</button>
            </form>

            <div class="assignment-panel">
              <label>
                <span class="eyebrow">Assignment picker</span>
                <select id="assignment-select" data-report-id="${sanitize(selected.id)}">${volunteers.map((volunteer) => `<option value="${sanitize(volunteer.id)}" ${volunteer.id === (selected.assignedVolunteerId || selected.match?.id) ? 'selected' : ''}>${sanitize(volunteer.name)} · ${sanitize(volunteer.location)} · ${sanitize(volunteer.availability)}</option>`).join('')}</select>
              </label>
              <div class="assignment-actions">
                <button type="button" data-assign-selected="${sanitize(selected.id)}">Assign selected volunteer</button>
                <button type="button" class="ghost-button danger" data-unassign-report="${sanitize(selected.id)}" ${selected.assignedVolunteerId ? '' : 'disabled'}>Unassign</button>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </section>
  `
}

function renderIntakePage() {
  const latest = getSelectedReport()

  return `
    <section class="page">
      <div class="section-head">
        <div>
          <span class="eyebrow">Report intake</span>
          <h1>Submit a new incident</h1>
          <p>Use free text, a location hint, and support hint to produce a structured triage result. CSV import is supported for batch reports.</p>
        </div>
      </div>

      <div class="intake-layout">
        <article class="panel">
          <div class="preset-row">
            <button type="button" class="ghost-button" data-demo-key="water">Load water crisis</button>
            <button type="button" class="ghost-button" data-demo-key="flood">Load flood relief</button>
            <button type="button" class="ghost-button" data-demo-key="medical">Load medical camp</button>
          </div>

          <form class="intake-form" id="report-form">
            <label>
              <span>Free-text incident report</span>
              <textarea id="incident-field" name="incident" rows="6" maxlength="${INCIDENT_CHAR_LIMIT}" placeholder="Example: Families in South District need clean water immediately. Two hand pumps are broken and volunteers are required for distribution."></textarea>
              <small id="incident-char-count">0/${INCIDENT_CHAR_LIMIT}</small>
            </label>

            <div class="form-grid">
              <label>
                <span>Location hint</span>
                <input name="location" type="text" placeholder="South District" />
              </label>
              <label>
                <span>Expected support</span>
                <input name="support" type="text" placeholder="Water, food, medical, logistics" />
              </label>
            </div>

            <label>
              <span>Source tag</span>
              <input name="source" type="text" placeholder="Field note, survey, hotline, spreadsheet" />
            </label>

            <label>
              <span>Batch CSV import</span>
              <input id="csv-upload" type="file" accept=".csv,text/csv" />
              <small>Columns supported: incident, location, support, source.</small>
            </label>

            <div class="form-actions">
              <button type="submit" id="analyze-button" class="${state.analysisStatus.kind === 'loading' ? 'btn-pulse' : ''}">${state.analysisStatus.kind === 'loading' ? 'Analyzing...' : 'Analyze report'}</button>
              <small id="backend-status-note">${state.backend.geminiConfigured ? 'Gemini analysis is configured. The app will fall back locally if the backend is unavailable.' : 'The app will fall back to the local analyzer if Gemini is not available.'}</small>
            </div>
          </form>

          ${state.analysisStatus.message ? `<div class="status-banner ${state.analysisStatus.kind} banner-enter" role="status" aria-live="polite">${sanitize(state.analysisStatus.message)}</div>` : ''}
        </article>

        <aside class="panel">
          <span class="eyebrow">Latest result</span>
          <article class="result-card">
            <strong>${sanitize(latest.title)}</strong>
            <p>${sanitize(latest.reason)}</p>
            <div class="result-grid">
              <div><strong>Issue type</strong><p>${sanitize(latest.issueType)}</p></div>
              <div><strong>Urgency</strong><p>${sanitize(latest.urgency)}</p></div>
              <div><strong>Confidence</strong><p>${latest.confidence}%</p></div>
              <div><strong>Volunteer</strong><p>${sanitize((volunteers.find((item) => item.id === latest.assignedVolunteerId) || latest.match || { name: 'Not assigned' }).name)}</p></div>
            </div>
          </article>

          <div class="feature-card">
            <span class="eyebrow">Submission copy</span>
            <h2>What judges should see</h2>
            <p>Free text intake, structured extraction, priority scoring, duplicate detection, volunteer reasoning, and an audit trail for trust.</p>
          </div>
        </aside>
      </div>
    </section>
  `
}

function renderVolunteersPage() {
  const selected = getSelectedReport()
  const volunteerCards = volunteers.map((volunteer) => {
    const fit = buildVolunteerFit(selected, volunteer)
    const isAssigned = selected.assignedVolunteerId === volunteer.id

    return `
      <article class="volunteer-card ${isAssigned ? 'active' : ''}">
        <div class="volunteer-head">
          <strong>${sanitize(volunteer.name)}</strong>
          <span>${fit.score}% fit</span>
        </div>
        <p>${sanitize(volunteer.skills.join(' · '))}</p>
        <small>${sanitize(volunteer.location)} · Available ${sanitize(volunteer.availability)}</small>
        <div class="case-actions">
          <button type="button" data-assign-volunteer="${sanitize(selected.id)}" data-volunteer-id="${sanitize(volunteer.id)}">Assign to selected case</button>
        </div>
      </article>
    `
  }).join('')

  const fitCards = volunteers.find((item) => item.id === (selected.assignedVolunteerId || selected.match?.id)) || volunteers[0]

  return `
    <section class="page">
      <div class="section-head">
        <div>
          <span class="eyebrow">Volunteer coordination</span>
          <h1>Match the right person to the right case</h1>
          <p>The roster shows skill overlap, location fit, and timing. Each assignment action updates the selected case.</p>
        </div>
      </div>

      <div class="volunteer-layout">
        <article class="panel">
          <div class="section-head">
            <div>
              <span class="eyebrow">Roster</span>
              <h2>Available volunteers</h2>
            </div>
          </div>
          <div class="volunteer-grid">${volunteerCards}</div>
        </article>

        <aside class="panel detail-panel">
          <div class="panel-head">
            <span class="eyebrow">Selected case</span>
            <h2>${sanitize(selected.title)}</h2>
          </div>
          <article class="detail-card">
            <p>${sanitize(selected.summary)}</p>
            <div class="detail-grid">
              <div><span>Current volunteer</span><strong>${sanitize((volunteers.find((item) => item.id === selected.assignedVolunteerId) || selected.match || { name: 'Not assigned' }).name)}</strong></div>
              <div><span>Score</span><strong>${selected.score}%</strong></div>
              <div><span>Urgency</span><strong>${sanitize(selected.urgency)}</strong></div>
              <div><span>Confidence</span><strong>${selected.confidence}%</strong></div>
            </div>
            <div class="mini-grid">${fitCards.skills.map((skill) => `<div class="mini-card"><strong>${sanitize(skill)}</strong><small>Relevant to the selected case.</small></div>`).join('')}</div>
          </article>
        </aside>
      </div>
    </section>
  `
}

function buildBarChart(items, maxVal) {
  if (!items.length) return '<div class="empty-state">No data yet.</div>'
  const peak = maxVal || Math.max(...items.map(([, v]) => v), 1)
  return items.map(([label, count]) => {
    const pct = Math.max(4, Math.round((count / peak) * 100))
    return `<div class="bar-row"><span class="bar-label">${sanitize(label)}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><span class="bar-value">${count}</span></div>`
  }).join('')
}

function renderInsightsPage() {
  const analytics = buildAnalytics(state.reports)
  const locationBars = buildBarChart(analytics.locationHotspots)
  const issueBars = buildBarChart(analytics.issueHotspots)
  const urgencyBreakdown = [
    ['Critical', state.reports.filter(r => r.urgency === 'Critical').length],
    ['High', state.reports.filter(r => r.urgency === 'High').length],
    ['Medium', state.reports.filter(r => r.urgency === 'Medium').length],
  ].filter(([, c]) => c > 0)
  const urgencyBars = buildBarChart(urgencyBreakdown)

  return `
    <section class="page">
      <div class="section-head">
        <div>
          <span class="eyebrow">Decision intelligence</span>
          <h1>Where the need is concentrating</h1>
          <p>Visual summaries of hot areas, issue clusters, urgency distribution, and extraction quality.</p>
        </div>
      </div>

      <div class="stats-grid">
        <article class="stat-card"><span>Top hotspot</span><strong>${sanitize(analytics.topLocation)}</strong><small>${analytics.topLocationCount} active reports.</small></article>
        <article class="stat-card"><span>Dominant issue</span><strong>${sanitize(analytics.topIssue)}</strong><small>${analytics.topIssueCount} related cases.</small></article>
        <article class="stat-card"><span>Average confidence</span><strong>${analytics.averageConfidence}%</strong><small>Structured extraction quality.</small></article>
        <article class="stat-card"><span>Urgent share</span><strong>${analytics.urgentShare}%</strong><small>Visible high-pressure cases.</small></article>
      </div>

      <div class="feature-grid">
        <article class="feature-card">
          <span class="eyebrow">Location distribution</span>
          <h2>Where need is strongest</h2>
          <div class="chart-container">${locationBars}</div>
        </article>
        <article class="feature-card">
          <span class="eyebrow">Issue distribution</span>
          <h2>What keeps repeating</h2>
          <div class="chart-container">${issueBars}</div>
        </article>
      </div>

      <div class="feature-grid">
        <article class="feature-card">
          <span class="eyebrow">Urgency breakdown</span>
          <h2>Severity distribution</h2>
          <div class="chart-container">${urgencyBars}</div>
        </article>
        <article class="feature-card">
          <span class="eyebrow">Extraction quality</span>
          <h2>Confidence overview</h2>
          <div class="chart-container">
            <div class="confidence-gauge">
              <div class="gauge-ring" style="--gauge-pct:${analytics.averageConfidence}">
                <span class="gauge-value">${analytics.averageConfidence}%</span>
              </div>
              <small>Average extraction confidence across ${state.reports.length} reports.</small>
            </div>
          </div>
        </article>
      </div>
    </section>
  `
}

function renderAuditPage() {
  const trail = state.auditTrail.map((entry) => `
    <article class="audit-card">
      <div class="audit-head">
        <div>
          <span class="eyebrow">${sanitize(entry.type.replace(/-/g, ' '))}</span>
          <strong>${sanitize(entry.reportId || 'General')}</strong>
        </div>
        <small>${sanitize(entry.id)} · ${sanitize(entry.timestamp)}</small>
      </div>
      <p>${sanitize(entry.message)}</p>
      ${entry.metadata?.requestId ? `<small>Request: ${sanitize(entry.metadata.requestId)}${entry.metadata?.clientRequestId ? ` · Client: ${sanitize(entry.metadata.clientRequestId)}` : ''}</small>` : ''}
    </article>
  `).join('')

  return `
    <section class="page">
      <div class="section-head">
        <div>
          <span class="eyebrow">Audit trail</span>
          <h1>Every important action stays visible</h1>
          <p>Analyze, override, assign, and duplicate-flag events are logged so judges can see the workflow is trustworthy.</p>
        </div>
        <button type="button" class="ghost-button" id="export-audit-btn" title="Download audit trail as JSON">Export JSON</button>
      </div>

      <div class="audit-list">
        ${trail || '<div class="empty-state">No audit events yet.</div>'}
      </div>
    </section>
  `
}

function handleResetDemo() {
  try { window.localStorage.removeItem(STORAGE_KEY) } catch {}
  state.reports = seedReports.map((report) => normalizeReport(report))
  state.auditTrail = buildAuditSeed(state.reports)
  state.selectedReportId = state.reports[0]?.id || null
  state.nextReportNumber = 1045
  state.nextAuditNumber = state.reports.length + 1
  state.analysisStatus = { kind: 'success', message: 'Demo reset to initial state.' }
  saveSnapshot()
  render()
}

function handleExportAudit() {
  const blob = new Blob([JSON.stringify(state.auditTrail, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `communitytriage-audit-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function attachListeners() {
  document.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => go(button.getAttribute('data-route') || 'overview')))
  document.querySelectorAll('[data-select-report]').forEach((button) => button.addEventListener('click', () => { state.selectedReportId = button.getAttribute('data-select-report'); go('cases') }))
  document.querySelectorAll('[data-assign-suggested]').forEach((button) => button.addEventListener('click', () => {
    const report = state.reports.find((item) => item.id === button.getAttribute('data-assign-suggested'))
    if (report) {
      const volunteer = volunteers.find((item) => item.id === (report.assignedVolunteerId || report.match?.id)) || findBestVolunteer(report).volunteer
      assignVolunteer(report.id, volunteer.id, 'suggested')
      go('cases')
    }
  }))
  document.querySelectorAll('[data-assign-volunteer]').forEach((button) => button.addEventListener('click', () => assignVolunteer(button.getAttribute('data-assign-volunteer'), button.getAttribute('data-volunteer-id'), 'volunteer-page')))
  document.querySelectorAll('[data-assign-selected]').forEach((button) => button.addEventListener('click', () => {
    const reportId = button.getAttribute('data-assign-selected') || ''
    const assignmentSelect = document.getElementById('assignment-select')
    const volunteerId = assignmentSelect?.value || ''

    if (!volunteerId) {
      state.analysisStatus = { kind: 'error', message: 'Select a volunteer before assigning.' }
      render()
      return
    }

    assignVolunteer(reportId, volunteerId, 'manual-picker')
  }))
  document.querySelectorAll('[data-unassign-report]').forEach((button) => button.addEventListener('click', () => unassignVolunteer(button.getAttribute('data-unassign-report'))))
  document.querySelectorAll('[data-demo-key]').forEach((button) => button.addEventListener('click', () => {
    const preset = demoScenarios[button.getAttribute('data-demo-key')]
    const form = document.getElementById('report-form')
    if (!preset || !form) return
    form.elements.incident.value = preset.incident
    form.elements.location.value = preset.location
    form.elements.support.value = preset.support
    form.elements.source.value = preset.source
  }))
  document.getElementById('case-search')?.addEventListener('input', (event) => { state.filters.search = event.target.value; render() })
  document.getElementById('urgency-filter')?.addEventListener('change', (event) => { state.filters.urgency = event.target.value; render() })
  document.getElementById('location-filter')?.addEventListener('change', (event) => { state.filters.location = event.target.value; render() })
  document.getElementById('sort-filter')?.addEventListener('change', (event) => { state.filters.sort = event.target.value; render() })
  document.getElementById('override-form')?.addEventListener('submit', handleOverrideSubmit)
  document.getElementById('report-form')?.addEventListener('submit', handleReportSubmit)
  document.getElementById('incident-field')?.addEventListener('input', (event) => {
    const value = String(event.target.value || '')
    const counter = document.getElementById('incident-char-count')
    if (!counter) return
    counter.textContent = `${value.length}/${INCIDENT_CHAR_LIMIT}`
    counter.classList.toggle('limit-near', value.length >= INCIDENT_CHAR_LIMIT - 200)
  })
  document.getElementById('csv-upload')?.addEventListener('change', handleCsvImport)
  document.getElementById('reset-demo-btn')?.addEventListener('click', handleResetDemo)
  document.getElementById('export-audit-btn')?.addEventListener('click', handleExportAudit)
}

function assignVolunteer(reportId, volunteerId, source) {
  const report = state.reports.find((item) => item.id === reportId)
  const volunteer = volunteers.find((item) => item.id === volunteerId)
  if (!report || !volunteer) {
    state.analysisStatus = { kind: 'error', message: 'Pick a valid volunteer before assigning.' }
    render()
    return
  }

  report.assignedVolunteerId = volunteer.id
  report.status = `Assigned to ${volunteer.name}`
  report.match = { ...volunteer, ...buildVolunteerFit(report, volunteer) }
  addAudit('assign', report.id, `Assigned ${volunteer.name} to ${report.id}.`, { volunteerId: volunteer.id, volunteerName: volunteer.name, source })
  state.analysisStatus = { kind: 'success', message: `${volunteer.name} assigned to ${report.id}.` }
  state.selectedReportId = report.id
  saveSnapshot()
  render()
}

function unassignVolunteer(reportId) {
  const report = state.reports.find((item) => item.id === reportId)
  if (!report) return
  report.assignedVolunteerId = ''
  report.status = 'Needs manual assignment'
  addAudit('unassign', report.id, `Removed volunteer assignment from ${report.id}.`)
  state.analysisStatus = { kind: 'fallback', message: `Volunteer removed from ${report.id}.` }
  saveSnapshot()
  render()
}

function handleOverrideSubmit(event) {
  event.preventDefault()
  const reportId = event.currentTarget.getAttribute('data-report-id')
  const report = state.reports.find((item) => item.id === reportId)
  if (!report) return

  const formData = new FormData(event.currentTarget)
  const urgency = String(formData.get('overrideUrgency') || report.urgency)
  const score = clampNumber(formData.get('overrideScore'), 0, 99, report.score)

  report.manualOverride = { previousUrgency: report.urgency, previousScore: report.score, urgency, score, timestamp: new Date().toISOString() }
  report.urgency = urgency
  report.score = score
  report.status = `Manually set to ${urgency}`
  report.reviewFlags = report.reviewFlags.filter((flag) => flag.code !== 'low-confidence')
  addAudit('override', report.id, `Changed ${report.id} from ${report.manualOverride.previousUrgency}/${report.manualOverride.previousScore}% to ${urgency}/${score}%.`)
  state.analysisStatus = { kind: 'success', message: `Manual override applied to ${report.id}.` }
  saveSnapshot()
  render()
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, Math.round(numeric)))
}

async function handleReportSubmit(event) {
  event.preventDefault()
  const formData = new FormData(event.currentTarget)
  const incident = String(formData.get('incident') || '').trim()
  const location = String(formData.get('location') || '').trim()
  const support = String(formData.get('support') || '').trim()
  const source = String(formData.get('source') || '').trim()

  if (!incident) {
    state.analysisStatus = { kind: 'error', message: 'Enter a report before analyzing.' }
    render()
    return
  }

  if (incident.length > INCIDENT_CHAR_LIMIT) {
    state.analysisStatus = { kind: 'error', message: `Report text is too long. Keep it under ${INCIDENT_CHAR_LIMIT} characters.` }
    render()
    return
  }

  state.analysisStatus = { kind: 'loading', message: 'Analyzing report...' }
  render()

  const fallbackReport = buildLocalReport({ incident, location, support, source })
  const clientRequestId = createClientRequestId()
  const controller = new AbortController()
  const timeoutHandle = window.setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS)

  try {
    const response = await fetch('/api/analyze-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-request-id': clientRequestId,
      },
      body: JSON.stringify({ incident, locationHint: location, supportHint: support, source }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => ({}))
    const requestId = response.headers.get('x-request-id') || payload.requestId || ''

    if (!response.ok) {
      const backendError = new Error(payload.error || 'Backend analysis unavailable.')
      backendError.code = payload.code || 'BACKEND_ANALYSIS_FAILED'
      backendError.requestId = requestId
      throw backendError
    }

    if (!payload.analysis || typeof payload.analysis !== 'object') {
      const malformedError = new Error('Backend returned malformed analysis data.')
      malformedError.code = 'BACKEND_MALFORMED_ANALYSIS'
      malformedError.requestId = requestId
      throw malformedError
    }

    const report = buildBackendReport({ incident, location, support, source, analysis: payload.analysis || {}, model: payload.model })
    insertNewReport(report, 'Gemini analysis completed.', {
      requestId,
      clientRequestId,
      provider: payload.provider || 'Gemini',
      attempts: payload.attempts,
    })
  } catch (error) {
    const fallbackReason = error?.name === 'AbortError'
      ? 'Request timed out.'
      : error?.message || 'Backend unavailable.'

    insertNewReport(fallbackReport, `${fallbackReason} Local fallback triage used.`, {
      requestId: error?.requestId || '',
      clientRequestId,
      provider: 'Local fallback',
      fallbackReason: error?.code || 'FALLBACK_USED',
    })
  } finally {
    clearTimeout(timeoutHandle)
  }

  event.currentTarget.reset()
}

function parseCsvText(csvText) {
  const text = String(csvText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = []
  let currentValue = ''
  let currentRow = []
  let insideQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        currentValue += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (character === ',' && !insideQuotes) {
      currentRow.push(currentValue.trim())
      currentValue = ''
      continue
    }

    if (character === '\n' && !insideQuotes) {
      currentRow.push(currentValue.trim())
      if (currentRow.some((value) => value !== '')) {
        rows.push(currentRow)
      }
      currentRow = []
      currentValue = ''
      continue
    }

    currentValue += character
  }

  currentRow.push(currentValue.trim())
  if (currentRow.some((value) => value !== '')) {
    rows.push(currentRow)
  }

  if (rows.length < 2) {
    return []
  }

  const headers = rows[0].map((header) => header.toLowerCase())

  return rows.slice(1).map((values) => {
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || ''
      return row
    }, {})
  })
}

async function handleCsvImport(event) {
  const file = event.target.files?.[0]

  if (!file) {
    return
  }

  try {
    const csvText = await file.text()
    const rows = parseCsvText(csvText)

    if (!rows.length) {
      state.analysisStatus = {
        kind: 'error',
        message: 'CSV import needs a header row and at least one data row.',
      }
      render()
      return
    }

    let importedCount = 0
    let duplicateCount = 0

    const reports = rows
      .map((row) => {
        const incident = row.incident || row.report || row.text || row.description || ''

        if (!incident.trim()) {
          return null
        }

        const report = buildLocalReport({
          incident,
          location: row.location || row.area || row.zone || '',
          support: row.support || row.need || row.resources || '',
          source: row.source || row.channel || 'CSV import',
        })

        importedCount += 1

        if (report.duplicateOf) {
          duplicateCount += 1
          addAudit('duplicate-flag', report.id, `CSV row for ${report.id} was flagged against ${report.duplicateOf}.`, {
            matchedReportId: report.duplicateOf,
            source: 'csv-import',
          })
        }

        addAudit('analyze', report.id, `CSV row normalized and scored for ${report.id}.`, {
          source: 'csv-import',
          confidence: report.confidence,
        })

        return report
      })
      .filter(Boolean)

    if (!reports.length) {
      state.analysisStatus = {
        kind: 'error',
        message: 'No usable report rows were found in the CSV file.',
      }
      render()
      return
    }

    state.reports = [...reports.reverse(), ...state.reports]
    state.selectedReportId = reports[reports.length - 1].id
    state.analysisStatus = {
      kind: 'success',
      message: `Imported ${importedCount} CSV report${importedCount === 1 ? '' : 's'}${duplicateCount ? `, with ${duplicateCount} duplicate flag${duplicateCount === 1 ? '' : 's'}` : ''}.`,
    }

    saveSnapshot()
    go('cases')
  } catch (error) {
    state.analysisStatus = {
      kind: 'error',
      message: `CSV import failed: ${error.message}`,
    }
    render()
  } finally {
    event.target.value = ''
  }
}

function buildLocalReport({ incident, location, support, source }) {
  const template = getIssueTemplate('', incident)
  const confidence = Math.min(99, 64 + Math.min(12, tokenize(incident).length % 10) + (template.key === 'water' ? 12 : template.key === 'flood' ? 9 : template.key === 'medical' ? 7 : 4))
  const urgency = template.urgency
  const score = Math.min(99, Math.round(confidence * 0.4 + (urgency === 'Critical' ? 96 : urgency === 'High' ? 84 : 68) * 0.35 + 18))
  const report = normalizeReport({
    id: `CT-${state.nextReportNumber++}`,
    rawText: incident,
    title: template.title,
    location: location || 'Community Zone',
    issueType: template.issueType,
    urgency,
    score,
    summary: incident,
    need: support || template.need,
    status: urgency === 'Critical' ? 'Needs immediate attention' : 'Queue for review',
    confidence,
    reason: `Local triage found ${template.issueType.toLowerCase()} signals and ${confidence}% extraction confidence.`,
    source: source || 'Submitted through intake form',
    affectedGroup: 'Community members',
    assignedVolunteerId: '',
    duplicateOf: '',
    manualOverride: null,
  })

  const duplicate = getDuplicateMatch(report)
  if (duplicate) {
    report.duplicateOf = duplicate.report.id
    report.status = 'Flagged for duplicate review'
    report.reason = `${report.reason} A similar case (${duplicate.report.id}) already exists, so it was flagged for review.`
  }

  return report
}

function buildBackendReport({ incident, location, support, source, analysis, model }) {
  const template = getIssueTemplate(analysis.issueType, incident)
  const urgency = normalizeUrgency(analysis.urgency || template.urgency)
  const confidence = clampNumber(analysis.confidence, 0, 100, 78)
  const score = Math.min(99, Math.round(confidence * 0.4 + (urgency === 'Critical' ? 96 : urgency === 'High' ? 84 : 68) * 0.35 + 18))

  const report = normalizeReport({
    id: `CT-${state.nextReportNumber++}`,
    rawText: incident,
    title: template.title,
    location: analysis.location || location || 'Community Zone',
    issueType: String(analysis.issueType || template.issueType).trim(),
    urgency,
    score,
    summary: analysis.summary || incident,
    need: Array.isArray(analysis.requiredResources) ? analysis.requiredResources.join(', ') : String(analysis.requiredResources || support || template.need),
    status: urgency === 'Critical' ? 'Needs immediate attention' : 'Queued for review',
    confidence,
    reason: String(analysis.justification || 'Gemini returned a structured triage response.').trim(),
    source: source || 'Submitted through intake form',
    affectedGroup: String(analysis.affectedGroup || 'Community members').trim(),
    assignedVolunteerId: '',
    duplicateOf: '',
    manualOverride: null,
    provider: model ? `Gemini (${model})` : 'Gemini',
  })

  const duplicate = getDuplicateMatch(report)
  if (duplicate) {
    report.duplicateOf = duplicate.report.id
    report.status = 'Flagged for duplicate review'
    report.reason = `${report.reason} A similar case (${duplicate.report.id}) already exists, so it was flagged for manual review.`
  }

  return report
}

function insertNewReport(report, message, metadata = {}) {
  state.reports = [report, ...state.reports]
  state.selectedReportId = report.id
  const volunteer = volunteers.find((item) => item.id === report.match.id) || volunteers[0]
  report.match = { ...volunteer, ...buildVolunteerFit(report, volunteer) }
  addAudit('analyze', report.id, `${report.provider || 'Triager'} analyzed ${report.id} with ${report.confidence}% confidence.`, {
    provider: report.provider || 'Triager',
    ...metadata,
  })
  state.analysisStatus = { kind: report.provider?.startsWith('Gemini') ? 'success' : 'fallback', message }
  saveSnapshot()
  go('cases')
}

function updateBackendStatusHint() {
  const statusNode = document.getElementById('backend-status-note')
  if (!statusNode) {
    return
  }

  statusNode.textContent = state.backend.geminiConfigured
    ? 'Gemini analysis is configured. The app will fall back locally if the backend is unavailable.'
    : 'The app will fall back to the local analyzer if Gemini is not available.'
}

async function syncBackendStatus() {
  const previousState = `${state.backend.available}-${state.backend.geminiConfigured}-${state.backend.model || ''}`

  try {
    const response = await fetch('/api/health')
    if (!response.ok) throw new Error('Backend unavailable')
    const payload = await response.json()
    state.backend.available = true
    state.backend.geminiConfigured = Boolean(payload.geminiConfigured)
    state.backend.model = payload.model || null
  } catch {
    state.backend.available = false
    state.backend.geminiConfigured = false
    state.backend.model = null
  }

  saveSnapshot()

  const currentState = `${state.backend.available}-${state.backend.geminiConfigured}-${state.backend.model || ''}`
  if (previousState !== currentState) {
    updateBackendStatusHint()
  }
}

function renderPageContent(page) {
  switch (page) {
    case 'cases': return renderCasesPage()
    case 'intake': return renderIntakePage()
    case 'volunteers': return renderVolunteersPage()
    case 'insights': return renderInsightsPage()
    case 'audit': return renderAuditPage()
    default: return renderOverviewPage()
  }
}

let revealObserver = null

function ensureRevealObserver() {
  if (revealObserver) return revealObserver

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    revealObserver = { observe: () => {}, unobserve: () => {}, disconnect: () => {} }
    return revealObserver
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('in-view')
        revealObserver.unobserve(entry.target)
      })
    },
    { root: null, threshold: 0.12, rootMargin: '40px 0px -10% 0px' },
  )

  return revealObserver
}

function applyScrollReveals() {
  const nodes = Array.from(document.querySelectorAll('.reveal'))
  if (!nodes.length) return

  const observer = ensureRevealObserver()
  nodes.forEach((node) => {
    if (node.classList.contains('in-view')) return
    observer.observe(node)
  })
}

function render() {
  state.page = getPage()
  document.body.dataset.page = state.page

  root.innerHTML = `
    <div class="app-shell">
      ${renderHeader()}
      <main class="content">${renderPageContent(state.page)}</main>
    </div>
  `

  attachListeners()
  applyScrollReveals()
  updateBackendStatusHint()
  saveSnapshot()
}

window.addEventListener('hashchange', render)
render()
syncBackendStatus()
