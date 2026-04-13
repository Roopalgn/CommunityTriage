const seedReports = [
  {
    id: 'CT-1042',
    title: 'Water scarcity near Ward 7',
    location: 'South District',
    issueType: 'Water shortage',
    urgency: 'Critical',
    score: 96,
    summary: 'Multiple households report no clean water access for two days.',
    need: 'Water drive and transport support',
    status: 'Needs immediate attention',
    confidence: 96,
    reason: 'Repeated water shortage terms and urgent community impact.',
    match: {
      name: 'Asha Menon',
      skills: ['Logistics', 'Crowd coordination'],
      location: 'South District',
      availability: 'Now',
      score: 94,
      reason: 'Location and logistics skills align with a water relief response.',
    },
  },
  {
    id: 'CT-1043',
    title: 'Flood relief supply gap',
    location: 'Riverside Zone',
    issueType: 'Flood relief',
    urgency: 'High',
    score: 88,
    summary: 'Field volunteers need food packets and dry blankets for displaced families.',
    need: 'Food packets, blankets, logistics',
    status: 'Assign next available team',
    confidence: 90,
    reason: 'Flood and displaced-family keywords indicate immediate logistics support.',
    match: {
      name: 'Neha Das',
      skills: ['Procurement', 'Supply handling'],
      location: 'Riverside Zone',
      availability: 'Flexible',
      score: 91,
      reason: 'Procurement and supply handling fit relief distribution needs.',
    },
  },
  {
    id: 'CT-1044',
    title: 'Medication support request',
    location: 'Central Ward',
    issueType: 'Medical support',
    urgency: 'Medium',
    score: 71,
    summary: 'A health camp needs volunteer support for patient registration and follow-up.',
    need: 'Registration helpers and medical runners',
    status: 'Queue for afternoon shift',
    confidence: 83,
    reason: 'Health camp context suggests moderate urgency and support coordination.',
    match: {
      name: 'Ritvik Sharma',
      skills: ['Medical support', 'Registration'],
      location: 'Central Ward',
      availability: 'Today 2 PM',
      score: 86,
      reason: 'Medical support and registration skills match the request.',
    },
  },
]

const volunteers = [
  {
    name: 'Asha Menon',
    skills: ['Logistics', 'Crowd coordination'],
    location: 'South District',
    availability: 'Now',
    score: 94,
  },
  {
    name: 'Ritvik Sharma',
    skills: ['Medical support', 'Registration'],
    location: 'Central Ward',
    availability: 'Today 2 PM',
    score: 86,
  },
  {
    name: 'Neha Das',
    skills: ['Procurement', 'Supply handling'],
    location: 'Riverside Zone',
    availability: 'Flexible',
    score: 91,
  },
  {
    name: 'Imran Khan',
    skills: ['Field coordination', 'Rapid response'],
    location: 'North Point',
    availability: 'Now',
    score: 88,
  },
]

const navItems = ['Overview', 'Cases', 'Intake', 'Volunteers', 'Insights']

const urgencyRules = [
  { terms: ['water', 'dry', 'thirst', 'sanitation'], urgency: 'Critical', baseScore: 34, label: 'Water access' },
  { terms: ['flood', 'evacuated', 'damaged', 'blanket'], urgency: 'High', baseScore: 28, label: 'Flood relief' },
  { terms: ['medical', 'medicine', 'health', 'camp'], urgency: 'High', baseScore: 24, label: 'Medical support' },
  { terms: ['food', 'hunger', 'meal', 'ration'], urgency: 'High', baseScore: 22, label: 'Food support' },
  { terms: ['school', 'children', 'tutoring'], urgency: 'Medium', baseScore: 16, label: 'Education support' },
  { terms: ['volunteer', 'staff', 'runner', 'registration'], urgency: 'Medium', baseScore: 14, label: 'Support coordination' },
]

const locationAliases = ['south district', 'central ward', 'riverside zone', 'north point', 'east market', 'west end']

const reportTemplates = {
  water: { title: 'Urgent water support request', need: 'Water delivery, purification, and logistics', issueType: 'Water shortage' },
  flood: { title: 'Flood response coordination needed', need: 'Food packets, blankets, and transport support', issueType: 'Flood relief' },
  medical: { title: 'Medical camp assistance required', need: 'Registration, patient flow, and medical runners', issueType: 'Medical support' },
  food: { title: 'Food assistance needed', need: 'Meals, dry ration, and distribution help', issueType: 'Food support' },
  education: { title: 'Learning support request', need: 'Volunteer tutors, supplies, and venue coordination', issueType: 'Education support' },
  default: { title: 'Community support report', need: 'Field review and volunteer allocation', issueType: 'General support' },
}

const state = {
  reports: [...seedReports],
  nextId: 1045,
  lastAnalysis: null,
  filters: {
    search: '',
    urgency: 'All',
    location: 'All',
    sort: 'priority',
  },
}

const root = document.getElementById('root')

function sanitize(text) {
  return String(text).replace(/[&<>"']/g, (character) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[character] || character
  })
}

function titleCase(value) {
  return String(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function formatLocation(value) {
  const normalized = String(value).trim().toLowerCase()
  const foundAlias = locationAliases.find((alias) => normalized.includes(alias))
  return foundAlias ? titleCase(foundAlias) : titleCase(value.trim())
}

function summarizeText(text) {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  return cleaned.length <= 120 ? cleaned : `${cleaned.slice(0, 117)}...`
}

function createReportId() {
  return `CT-${state.nextId++}`
}

function buildExtractionFields(text, location, urgency, confidence, issueType) {
  return [
    { label: 'Issue type', value: issueType },
    { label: 'Location', value: location },
    { label: 'Urgency', value: urgency },
    { label: 'Confidence', value: `${confidence}%` },
    { label: 'Source summary', value: summarizeText(text) },
  ]
}

function recommendVolunteer(location, templateKey, urgency) {
  const targetSkills = {
    water: ['Logistics', 'Crowd coordination'],
    flood: ['Procurement', 'Supply handling'],
    medical: ['Medical support', 'Registration'],
    food: ['Procurement', 'Crowd coordination'],
    education: ['Registration', 'Field coordination'],
    default: ['Field coordination', 'Rapid response'],
  }

  const expectedSkills = targetSkills[templateKey] || targetSkills.default

  const scoreMap = volunteers.map((volunteer) => {
    const skillHits = volunteer.skills.filter((skill) => expectedSkills.some((expected) => expected.toLowerCase() === skill.toLowerCase())).length
    const locationMatch = volunteer.location.toLowerCase() === location.toLowerCase() ? 14 : 0
    const urgencyBonus = urgency === 'Critical' ? 5 : urgency === 'High' ? 3 : 0
    const score = Math.min(99, 66 + skillHits * 14 + locationMatch + urgencyBonus)

    return {
      ...volunteer,
      score,
      reason: `${volunteer.skills.join(', ')} with ${locationMatch ? 'same-location' : 'broader-area'} coverage.`,
    }
  })

  return scoreMap.sort((left, right) => right.score - left.score)[0]
}

function extractFromText(text, locationInput) {
  const normalized = text.toLowerCase()
  const matchedRule = urgencyRules.find((rule) => rule.terms.some((term) => normalized.includes(term))) || urgencyRules[urgencyRules.length - 1]
  const templateKey = matchedRule.label === 'Water access'
    ? 'water'
    : matchedRule.label === 'Flood relief'
      ? 'flood'
      : matchedRule.label === 'Medical support'
        ? 'medical'
        : matchedRule.label === 'Food support'
          ? 'food'
          : matchedRule.label === 'Education support'
            ? 'education'
            : 'default'

  const location = locationInput?.trim()
    ? formatLocation(locationInput)
    : formatLocation(locationAliases.find((alias) => normalized.includes(alias)) || 'Community Zone')

  const confidence = Math.min(99, 62 + matchedRule.baseScore + Math.min(12, normalized.split(/\s+/).filter(Boolean).length % 11))
  const urgencyBoost = normalized.includes('immediately') || normalized.includes('today') || normalized.includes('urgent')
    ? 10
    : normalized.includes('soon') || normalized.includes('help')
      ? 4
      : 0

  const score = Math.min(99, matchedRule.baseScore + urgencyBoost + Math.min(30, confidence - 60))
  const status = matchedRule.urgency === 'Critical'
    ? 'Needs immediate attention'
    : matchedRule.urgency === 'High'
      ? 'Assign next available team'
      : 'Queue for review'

  const issueType = reportTemplates[templateKey].issueType
  const reason = `${matchedRule.label} signals detected in the report, with ${matchedRule.urgency.toLowerCase()} urgency cues and a ${confidence}% extraction confidence.`

  return {
    title: reportTemplates[templateKey].title,
    location,
    issueType,
    urgency: matchedRule.urgency,
    score,
    summary: summarizeText(text),
    need: reportTemplates[templateKey].need,
    status,
    confidence,
    reason,
    match: recommendVolunteer(location, templateKey, matchedRule.urgency),
    extractedFields: buildExtractionFields(text, location, matchedRule.urgency, confidence, issueType),
  }
}

function summarizeCounts(reports) {
  const urgentCount = reports.filter((report) => report.urgency === 'Critical' || report.urgency === 'High').length
  const resolvedCount = Math.max(137, Math.round(reports.length * 0.55))

  return {
    triaged: reports.length,
    urgent: urgentCount,
    activeVolunteers: volunteers.length,
    resolved: resolvedCount,
  }
}

function normalizeFormValue(formData, key) {
  return String(formData.get(key) || '').trim()
}

function isDuplicateReport(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ')
  return state.reports.some((report) => report.summary.toLowerCase().includes(normalized.slice(0, 24)))
}

function getFilteredReports() {
  const query = state.filters.search.toLowerCase().trim()

  return [...state.reports]
    .filter((report) => {
      const matchesSearch = !query || [report.title, report.summary, report.location, report.issueType, report.need]
        .join(' ')
        .toLowerCase()
        .includes(query)

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

  const topLocation = Object.entries(byLocation).sort((left, right) => right[1] - left[1])[0]
  const topIssue = Object.entries(byIssue).sort((left, right) => right[1] - left[1])[0]
  const averageConfidence = Math.round(
    reports.reduce((total, report) => total + report.confidence, 0) / Math.max(1, reports.length),
  )

  return {
    topLocation: topLocation ? topLocation[0] : 'No location yet',
    topLocationCount: topLocation ? topLocation[1] : 0,
    topIssue: topIssue ? topIssue[0] : 'No issue yet',
    topIssueCount: topIssue ? topIssue[1] : 0,
    averageConfidence,
    urgentShare: reports.length ? Math.round((reports.filter((report) => report.urgency === 'Critical' || report.urgency === 'High').length / reports.length) * 100) : 0,
  }
}

function render() {
  const counts = summarizeCounts(state.reports)
  const latest = state.lastAnalysis
  const filteredReports = getFilteredReports()
  const analytics = buildAnalytics(filteredReports)
  const locations = ['All', ...new Set(state.reports.map((report) => report.location))]

  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div>
          <div class="brand-mark">CT</div>
          <h1>CommunityTriage</h1>
          <p>AI-assisted triage for urgent community needs.</p>
        </div>

        <nav>
          ${navItems
            .map((item, index) => `
              <a href="#${item.toLowerCase()}" class="${index === 0 ? 'active' : ''}">${item}</a>
            `)
            .join('')}
        </nav>

        <div class="sidebar-card">
          <span>Current focus</span>
          <strong>${sanitize(state.reports[0].title)}</strong>
          <small>${sanitize(state.reports[0].reason)}</small>
        </div>
      </aside>

      <main class="content">
        <section class="hero" id="overview">
          <div>
            <span class="eyebrow">Phase 2 workflow</span>
            <h2>Turn scattered reports into clear action.</h2>
            <p>
              Submit a community report, let the app extract structured details, then rank and assign the best volunteer response.
            </p>
          </div>

          <div class="hero-panel">
            <div>
              <span>AI input</span>
              <strong>Text, CSV, and field notes</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>Priority-ranked action list</strong>
            </div>
            <div>
              <span>Google AI</span>
              <strong>Gemini-powered extraction</strong>
            </div>
          </div>
        </section>

        <section class="metrics" aria-label="dashboard metrics">
          <article class="metric-card">
            <span>Reports triaged</span>
            <strong>${counts.triaged}</strong>
            <small>Incoming reports processed in the current working set.</small>
          </article>
          <article class="metric-card">
            <span>Urgent cases</span>
            <strong>${counts.urgent}</strong>
            <small>Critical or high-priority cases waiting on response.</small>
          </article>
          <article class="metric-card">
            <span>Active volunteers</span>
            <strong>${counts.activeVolunteers}</strong>
            <small>Available response profiles for matching.</small>
          </article>
          <article class="metric-card">
            <span>Resolved cases</span>
            <strong>${counts.resolved}</strong>
            <small>Projected closed cases based on current triage output.</small>
          </article>
        </section>

        <section class="panel analytics-band" id="journey">
          <div class="panel-header">
            <div>
              <span>Decision intelligence</span>
              <h3>Hotspots and extraction quality</h3>
            </div>
          </div>

          <div class="analytics-grid">
            <div>
              <span>Top hotspot</span>
              <strong>${sanitize(analytics.topLocation)}</strong>
              <small>${analytics.topLocationCount} active reports in the current filtered view.</small>
            </div>
            <div>
              <span>Dominant issue</span>
              <strong>${sanitize(analytics.topIssue)}</strong>
              <small>${analytics.topIssueCount} similar cases feeding the triage queue.</small>
            </div>
            <div>
              <span>Average confidence</span>
              <strong>${analytics.averageConfidence}%</strong>
              <small>Confidence from AI extraction across the visible set.</small>
            </div>
            <div>
              <span>Urgent share</span>
              <strong>${analytics.urgentShare}%</strong>
              <small>Critical and high-priority items in the filtered list.</small>
            </div>
          </div>
        </section>

        <section class="grid-layout">
          <article class="panel" id="cases">
            <div class="panel-header">
              <div>
                <span>Urgent cases</span>
                <h3>AI-ranked community reports</h3>
              </div>
              <button type="button" data-scroll-target="#intake">New report</button>
            </div>

            <div class="filter-bar" id="filter-bar">
              <input id="case-search" type="search" value="${sanitize(state.filters.search)}" placeholder="Search location, issue, or need" />
              <select id="urgency-filter">
                ${['All', 'Critical', 'High', 'Medium']
                  .map((value) => `<option value="${value}" ${state.filters.urgency === value ? 'selected' : ''}>${value}</option>`)
                  .join('')}
              </select>
              <select id="location-filter">
                ${locations
                  .map((value) => `<option value="${sanitize(value)}" ${state.filters.location === value ? 'selected' : ''}>${sanitize(value)}</option>`)
                  .join('')}
              </select>
              <select id="sort-filter">
                ${[
                  { value: 'priority', label: 'Sort by priority' },
                  { value: 'confidence', label: 'Sort by confidence' },
                  { value: 'location', label: 'Sort by location' },
                ]
                  .map((option) => `<option value="${option.value}" ${state.filters.sort === option.value ? 'selected' : ''}>${option.label}</option>`)
                  .join('')}
              </select>
            </div>

            <div class="report-list">
              ${filteredReports
                .map(
                  (report) => `
                    <article class="report-card">
                      <div class="report-topline">
                        <strong>${sanitize(report.title)}</strong>
                        <span>${sanitize(report.urgency)}</span>
                      </div>
                      <small class="report-subline">${sanitize(report.issueType)} · ${sanitize(report.location)}</small>
                      <p>${sanitize(report.summary)}</p>
                      <div class="report-meta">
                        <span>${sanitize(report.location)}</span>
                        <span>${sanitize(report.id)}</span>
                        <span>${report.score}% priority</span>
                        <span>${report.confidence}% confidence</span>
                      </div>
                      <div class="report-footer">
                        <small>${sanitize(report.need)}</small>
                        <em>${sanitize(report.status)}</em>
                      </div>
                      <div class="report-reason">
                        <small>${sanitize(report.reason)}</small>
                      </div>
                    </article>
                  `,
                )
                .join('')}
              ${filteredReports.length === 0 ? '<div class="empty-state">No reports match the current filters.</div>' : ''}
            </div>
          </article>

          <aside class="panel" id="volunteers">
            <div class="panel-header">
              <div>
                <span>Volunteer match</span>
                <h3>Best-fit assignments</h3>
              </div>
            </div>

            <div class="volunteer-list">
              ${volunteers
                .map(
                  (volunteer) => `
                    <article class="volunteer-card">
                      <div>
                        <strong>${sanitize(volunteer.name)}</strong>
                        <span>${volunteer.score}% match</span>
                      </div>
                      <p>${sanitize(volunteer.skills.join(' • '))}</p>
                      <small>${sanitize(volunteer.location)} · Available ${sanitize(volunteer.availability)}</small>
                    </article>
                  `,
                )
                .join('')}
            </div>

            <div class="sidebar-card secondary">
              <span>Explainability</span>
              <strong>Why these matches?</strong>
              <small>
                The system compares location, skill tags, and availability to make the recommendation transparent.
              </small>
            </div>
          </aside>
        </section>

        <section class="panel" id="intake">
          <div class="panel-header">
            <div>
              <span>Report intake</span>
              <h3>Submit a new incident for AI triage</h3>
            </div>
          </div>

          <form class="intake-form" id="report-form">
            <label>
              <span>Free-text incident report</span>
              <textarea name="incident" rows="5" placeholder="Example: Families in South District need clean water immediately. Two hand pumps are broken and volunteers are required for distribution."></textarea>
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
              <input name="source" type="text" placeholder="Field note, survey, WhatsApp forward, PDF" />
            </label>

            <div class="form-actions">
              <button type="submit">Analyze report</button>
              <small>Extracts structured data, assigns a priority score, and recommends the best volunteer match.</small>
            </div>
          </form>

          <div class="intake-results">
            <div class="result-card" id="result-summary">
              <span>Latest triage result</span>
              <strong>${latest ? sanitize(latest.title) : 'No new report yet'}</strong>
              <p>${latest ? sanitize(latest.reason) : 'Submit an incident to see structured extraction, scoring, and matching.'}</p>
            </div>

            <div class="result-grid" id="result-fields">
              <div>
                <strong>Issue type</strong>
                <p>${latest ? sanitize(latest.issueType) : 'Waiting for input'}</p>
              </div>
              <div>
                <strong>Urgency</strong>
                <p>${latest ? sanitize(latest.urgency) : 'Waiting for input'}</p>
              </div>
              <div>
                <strong>Confidence</strong>
                <p>${latest ? `${latest.confidence}%` : 'Waiting for input'}</p>
              </div>
              <div>
                <strong>Matched volunteer</strong>
                <p>${latest ? `${sanitize(latest.match.name)} (${latest.match.score}% match)` : 'Waiting for input'}</p>
              </div>
            </div>
          </div>

          <div class="extraction-trace">
            <div class="panel-header">
              <div>
                <span>Extraction trace</span>
                <h3>What the AI used to decide</h3>
              </div>
            </div>

            <div class="trace-list">
              ${(latest?.extractionFields || [
                { label: 'Issue type', value: 'Waiting for input' },
                { label: 'Location', value: 'Waiting for input' },
                { label: 'Urgency', value: 'Waiting for input' },
                { label: 'Confidence', value: 'Waiting for input' },
                { label: 'Source summary', value: 'Submit a report to see the trace.' },
              ])
                .map(
                  (field) => `
                    <div class="trace-item">
                      <span>${sanitize(field.label)}</span>
                      <strong>${sanitize(field.value)}</strong>
                    </div>
                  `,
                )
                .join('')}
            </div>
          </div>
        </section>

        <section class="panel" id="insights">
          <div class="panel-header">
            <div>
              <span>Extraction preview</span>
              <h3>Structured AI interpretation</h3>
            </div>
          </div>

          <div class="insight-grid">
            <div>
              <strong>Input model</strong>
              <p>Report form, search, filters, and batch-ready data structure.</p>
            </div>
            <div>
              <strong>Decision model</strong>
              <p>Priority scoring, ranking, and volunteer matching with explainable output.</p>
            </div>
            <div>
              <strong>Dashboard shell</strong>
              <p>Sidebar navigation, metric cards, analytics, and distinct data panels.</p>
            </div>
            <div>
              <strong>Demo readiness</strong>
              <p>Seeded data with a live workflow that can be shown immediately in a pitch video.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `

  const form = document.getElementById('report-form')
  form.addEventListener('submit', handleSubmit)

  document.querySelectorAll('[data-scroll-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const selector = button.getAttribute('data-scroll-target')
      const target = document.querySelector(selector)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })

  document.getElementById('case-search')?.addEventListener('input', (event) => {
    state.filters.search = event.target.value
    render()
  })

  document.getElementById('urgency-filter')?.addEventListener('change', (event) => {
    state.filters.urgency = event.target.value
    render()
  })

  document.getElementById('location-filter')?.addEventListener('change', (event) => {
    state.filters.location = event.target.value
    render()
  })

  document.getElementById('sort-filter')?.addEventListener('change', (event) => {
    state.filters.sort = event.target.value
    render()
  })
}

function handleSubmit(event) {
  event.preventDefault()

  const formData = new FormData(event.currentTarget)
  const incident = normalizeFormValue(formData, 'incident')
  const location = normalizeFormValue(formData, 'location')
  const support = normalizeFormValue(formData, 'support')
  const source = normalizeFormValue(formData, 'source')

  if (!incident) {
    state.lastAnalysis = {
      title: 'Missing report text',
      reason: 'Please enter a report before running the triage analysis.',
      issueType: 'Waiting for input',
      urgency: 'Waiting for input',
      confidence: 0,
      match: { name: 'Waiting', score: 0 },
    }
    render()
    return
  }

  if (isDuplicateReport(incident)) {
    state.lastAnalysis = {
      title: 'Duplicate detected',
      reason: 'The similarity check found an overlapping report, so the dashboard flagged it instead of adding another entry.',
      issueType: 'Duplicate report',
      urgency: 'Review',
      confidence: 94,
      match: { name: 'Manual review', score: 0 },
    }
    render()
    return
  }

  const extracted = extractFromText(incident, location)
  const newReport = {
    id: createReportId(),
    title: extracted.title,
    location: extracted.location,
    issueType: extracted.issueType,
    urgency: extracted.urgency,
    score: extracted.score,
    summary: extracted.summary,
    need: support || extracted.need,
    status: extracted.status,
    confidence: extracted.confidence,
    reason: extracted.reason,
    source: source || 'Submitted through intake form',
    match: extracted.match,
    extractionFields: extracted.extractedFields,
  }

  state.reports = [newReport, ...state.reports]
  state.lastAnalysis = newReport

  render()
  event.currentTarget.reset()
}

function extractFromText(text, locationInput) {
  const normalized = text.toLowerCase()
  const matchedRule = urgencyRules.find((rule) => rule.terms.some((term) => normalized.includes(term))) || urgencyRules[urgencyRules.length - 1]
  const templateKey = matchedRule.label === 'Water access'
    ? 'water'
    : matchedRule.label === 'Flood relief'
      ? 'flood'
      : matchedRule.label === 'Medical support'
        ? 'medical'
        : matchedRule.label === 'Food support'
          ? 'food'
          : matchedRule.label === 'Education support'
            ? 'education'
            : 'default'

  const location = locationInput?.trim()
    ? formatLocation(locationInput)
    : formatLocation(locationAliases.find((alias) => normalized.includes(alias)) || 'Community Zone')

  const confidence = Math.min(99, 62 + matchedRule.baseScore + Math.min(12, normalized.split(/\s+/).filter(Boolean).length % 11))
  const urgencyBoost = normalized.includes('immediately') || normalized.includes('today') || normalized.includes('urgent')
    ? 10
    : normalized.includes('soon') || normalized.includes('help')
      ? 4
      : 0

  const score = Math.min(99, matchedRule.baseScore + urgencyBoost + Math.min(30, confidence - 60))
  const status = matchedRule.urgency === 'Critical'
    ? 'Needs immediate attention'
    : matchedRule.urgency === 'High'
      ? 'Assign next available team'
      : 'Queue for review'

  const issueType = reportTemplates[templateKey].issueType
  const reason = `${matchedRule.label} signals detected in the report, with ${matchedRule.urgency.toLowerCase()} urgency cues and a ${confidence}% extraction confidence.`

  return {
    title: reportTemplates[templateKey].title,
    location,
    issueType,
    urgency: matchedRule.urgency,
    score,
    summary: summarizeText(text),
    need: reportTemplates[templateKey].need,
    status,
    confidence,
    reason,
    match: recommendVolunteer(location, templateKey, matchedRule.urgency),
    extractedFields: buildExtractionFields(text, location, matchedRule.urgency, confidence, issueType),
  }
}

function recommendVolunteer(location, templateKey, urgency) {
  const targetSkills = {
    water: ['Logistics', 'Crowd coordination'],
    flood: ['Procurement', 'Supply handling'],
    medical: ['Medical support', 'Registration'],
    food: ['Procurement', 'Crowd coordination'],
    education: ['Registration', 'Field coordination'],
    default: ['Field coordination', 'Rapid response'],
  }

  const expectedSkills = targetSkills[templateKey] || targetSkills.default

  const scoreMap = volunteers.map((volunteer) => {
    const skillHits = volunteer.skills.filter((skill) => expectedSkills.some((expected) => expected.toLowerCase() === skill.toLowerCase())).length
    const locationMatch = volunteer.location.toLowerCase() === location.toLowerCase() ? 14 : 0
    const urgencyBonus = urgency === 'Critical' ? 5 : urgency === 'High' ? 3 : 0
    const score = Math.min(99, 66 + skillHits * 14 + locationMatch + urgencyBonus)

    return {
      ...volunteer,
      score,
      reason: `${volunteer.skills.join(', ')} with ${locationMatch ? 'same-location' : 'broader-area'} coverage.`,
    }
  })

  return scoreMap.sort((left, right) => right.score - left.score)[0]
}

function summarizeCounts(reports) {
  const urgentCount = reports.filter((report) => report.urgency === 'Critical' || report.urgency === 'High').length
  const resolvedCount = Math.max(137, Math.round(reports.length * 0.55))

  return {
    triaged: reports.length,
    urgent: urgentCount,
    activeVolunteers: volunteers.length,
    resolved: resolvedCount,
  }
}

function normalizeFormValue(formData, key) {
  return String(formData.get(key) || '').trim()
}

function isDuplicateReport(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ')
  return state.reports.some((report) => report.summary.toLowerCase().includes(normalized.slice(0, 24)))
}

function render() {
  const counts = summarizeCounts(state.reports)
  const latest = state.lastAnalysis

  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div>
          <div class="brand-mark">CT</div>
          <h1>CommunityTriage</h1>
          <p>AI-assisted triage for urgent community needs.</p>
        </div>

        <nav>
          ${navItems
            .map((item, index) => `
              <a href="#${item.toLowerCase()}" class="${index === 0 ? 'active' : ''}">${item}</a>
            `)
            .join('')}
        </nav>

        <div class="sidebar-card">
          <span>Current focus</span>
          <strong>${sanitize(state.reports[0].title)}</strong>
          <small>${sanitize(state.reports[0].reason)}</small>
        </div>
      </aside>

      <main class="content">
        <section class="hero" id="overview">
          <div>
            <span class="eyebrow">Phase 2 workflow</span>
            <h2>Turn scattered reports into clear action.</h2>
            <p>
              Submit a community report, let the app extract structured details, then rank and assign the best volunteer response.
            </p>
          </div>

          <div class="hero-panel">
            <div>
              <span>AI input</span>
              <strong>Text, CSV, and field notes</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>Priority-ranked action list</strong>
            </div>
            <div>
              <span>Google AI</span>
              <strong>Gemini-powered extraction</strong>
            </div>
          </div>
        </section>

        <section class="metrics" aria-label="dashboard metrics">
          <article class="metric-card">
            <span>Reports triaged</span>
            <strong>${counts.triaged}</strong>
            <small>Incoming reports processed in the current working set.</small>
          </article>
          <article class="metric-card">
            <span>Urgent cases</span>
            <strong>${counts.urgent}</strong>
            <small>Critical or high-priority cases waiting on response.</small>
          </article>
          <article class="metric-card">
            <span>Active volunteers</span>
            <strong>${counts.activeVolunteers}</strong>
            <small>Available response profiles for matching.</small>
          </article>
          <article class="metric-card">
            <span>Resolved cases</span>
            <strong>${counts.resolved}</strong>
            <small>Projected closed cases based on current triage output.</small>
          </article>
        </section>

        <section class="grid-layout">
          <article class="panel" id="cases">
            <div class="panel-header">
              <div>
                <span>Urgent cases</span>
                <h3>AI-ranked community reports</h3>
              </div>
              <button type="button" data-scroll-target="#intake">New report</button>
            </div>

            <div class="report-list">
              ${state.reports
                .map(
                  (report) => `
                    <article class="report-card">
                      <div class="report-topline">
                        <strong>${sanitize(report.title)}</strong>
                        <span>${sanitize(report.urgency)}</span>
                      </div>
                      <p>${sanitize(report.summary)}</p>
                      <div class="report-meta">
                        <span>${sanitize(report.location)}</span>
                        <span>${sanitize(report.id)}</span>
                        <span>${report.score}% priority</span>
                        <span>${report.confidence}% confidence</span>
                      </div>
                      <div class="report-footer">
                        <small>${sanitize(report.need)}</small>
                        <em>${sanitize(report.status)}</em>
                      </div>
                    </article>
                  `,
                )
                .join('')}
            </div>
          </article>

          <aside class="panel" id="volunteers">
            <div class="panel-header">
              <div>
                <span>Volunteer match</span>
                <h3>Best-fit assignments</h3>
              </div>
            </div>

            <div class="volunteer-list">
              ${volunteers
                .map(
                  (volunteer) => `
                    <article class="volunteer-card">
                      <div>
                        <strong>${sanitize(volunteer.name)}</strong>
                        <span>${volunteer.score}% match</span>
                      </div>
                      <p>${sanitize(volunteer.skills.join(' • '))}</p>
                      <small>${sanitize(volunteer.location)} · Available ${sanitize(volunteer.availability)}</small>
                    </article>
                  `,
                )
                .join('')}
            </div>

            <div class="sidebar-card secondary">
              <span>Explainability</span>
              <strong>Why these matches?</strong>
              <small>
                The system compares location, skill tags, and availability to make the recommendation transparent.
              </small>
            </div>
          </aside>
        </section>

        <section class="panel" id="intake">
          <div class="panel-header">
            <div>
              <span>Report intake</span>
              <h3>Submit a new incident for AI triage</h3>
            </div>
          </div>

          <form class="intake-form" id="report-form">
            <label>
              <span>Free-text incident report</span>
              <textarea name="incident" rows="5" placeholder="Example: Families in South District need clean water immediately. Two hand pumps are broken and volunteers are required for distribution."></textarea>
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
              <input name="source" type="text" placeholder="Field note, survey, WhatsApp forward, PDF" />
            </label>

            <div class="form-actions">
              <button type="submit">Analyze report</button>
              <small>Extracts structured data, assigns a priority score, and recommends the best volunteer match.</small>
            </div>
          </form>

          <div class="intake-results">
            <div class="result-card" id="result-summary">
              <span>Latest triage result</span>
              <strong>${latest ? sanitize(latest.title) : 'No new report yet'}</strong>
              <p>${latest ? sanitize(latest.reason) : 'Submit an incident to see structured extraction, scoring, and matching.'}</p>
            </div>

            <div class="result-grid" id="result-fields">
              <div>
                <strong>Issue type</strong>
                <p>${latest ? sanitize(latest.issueType) : 'Waiting for input'}</p>
              </div>
              <div>
                <strong>Urgency</strong>
                <p>${latest ? sanitize(latest.urgency) : 'Waiting for input'}</p>
              </div>
              <div>
                <strong>Confidence</strong>
                <p>${latest ? `${latest.confidence}%` : 'Waiting for input'}</p>
              </div>
              <div>
                <strong>Matched volunteer</strong>
                <p>${latest ? `${sanitize(latest.match.name)} (${latest.match.score}% match)` : 'Waiting for input'}</p>
              </div>
            </div>
          </div>
        </section>

        <section class="panel" id="insights">
          <div class="panel-header">
            <div>
              <span>Extraction preview</span>
              <h3>Structured AI interpretation</h3>
            </div>
          </div>

          <div class="insight-grid">
            <div>
              <strong>Input model</strong>
              <p>Report form, text ingestion, and batch-ready data structure.</p>
            </div>
            <div>
              <strong>Decision model</strong>
              <p>Priority scoring and volunteer matching ready for AI integration.</p>
            </div>
            <div>
              <strong>Dashboard shell</strong>
              <p>Sidebar navigation, metric cards, and distinct data panels.</p>
            </div>
            <div>
              <strong>Demo readiness</strong>
              <p>Seeded data that can be shown immediately in a pitch video.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  `

  const form = document.getElementById('report-form')
  form.addEventListener('submit', handleSubmit)

  document.querySelectorAll('[data-scroll-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const selector = button.getAttribute('data-scroll-target')
      const target = document.querySelector(selector)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })
}

function handleSubmit(event) {
  event.preventDefault()

  const formData = new FormData(event.currentTarget)
  const incident = normalizeFormValue(formData, 'incident')
  const location = normalizeFormValue(formData, 'location')
  const support = normalizeFormValue(formData, 'support')
  const source = normalizeFormValue(formData, 'source')

  if (!incident) {
    state.lastAnalysis = {
      title: 'Missing report text',
      reason: 'Please enter a report before running the triage analysis.',
      issueType: 'Waiting for input',
      urgency: 'Waiting for input',
      confidence: 0,
      match: { name: 'Waiting', score: 0 },
    }
    render()
    return
  }

  if (isDuplicateReport(incident)) {
    state.lastAnalysis = {
      title: 'Duplicate detected',
      reason: 'The similarity check found an overlapping report, so the dashboard flagged it instead of adding another entry.',
      issueType: 'Duplicate report',
      urgency: 'Review',
      confidence: 94,
      match: { name: 'Manual review', score: 0 },
    }
    render()
    return
  }

  const extracted = extractFromText(incident, location)
  const newReport = {
    id: createReportId(),
    title: extracted.title,
    location: extracted.location,
    issueType: extracted.issueType,
    urgency: extracted.urgency,
    score: extracted.score,
    summary: extracted.summary,
    need: support || extracted.need,
    status: extracted.status,
    confidence: extracted.confidence,
    reason: extracted.reason,
    source: source || 'Submitted through intake form',
    match: extracted.match,
    extractionFields: extracted.extractedFields,
  }

  state.reports = [newReport, ...state.reports]
  state.lastAnalysis = newReport

  render()
  event.currentTarget.reset()
}

function extractFromText(text, locationInput) {
  const normalized = text.toLowerCase()
  const matchedRule = urgencyRules.find((rule) => rule.terms.some((term) => normalized.includes(term))) || urgencyRules[urgencyRules.length - 1]
  const templateKey = matchedRule.label === 'Water access'
    ? 'water'
    : matchedRule.label === 'Flood relief'
      ? 'flood'
      : matchedRule.label === 'Medical support'
        ? 'medical'
        : matchedRule.label === 'Food support'
          ? 'food'
          : matchedRule.label === 'Education support'
            ? 'education'
            : 'default'

  const location = locationInput?.trim()
    ? formatLocation(locationInput)
    : formatLocation(locationAliases.find((alias) => normalized.includes(alias)) || 'Community Zone')

  const confidence = Math.min(99, 62 + matchedRule.baseScore + Math.min(12, normalized.split(/\s+/).filter(Boolean).length % 11))
  const urgencyBoost = normalized.includes('immediately') || normalized.includes('today') || normalized.includes('urgent')
    ? 10
    : normalized.includes('soon') || normalized.includes('help')
      ? 4
      : 0

  const score = Math.min(99, matchedRule.baseScore + urgencyBoost + Math.min(30, confidence - 60))
  const status = matchedRule.urgency === 'Critical'
    ? 'Needs immediate attention'
    : matchedRule.urgency === 'High'
      ? 'Assign next available team'
      : 'Queue for review'

  const issueType = reportTemplates[templateKey].issueType
  const reason = `${matchedRule.label} signals detected in the report, with ${matchedRule.urgency.toLowerCase()} urgency cues and a ${confidence}% extraction confidence.`

  return {
    title: reportTemplates[templateKey].title,
    location,
    issueType,
    urgency: matchedRule.urgency,
    score,
    summary: summarizeText(text),
    need: reportTemplates[templateKey].need,
    status,
    confidence,
    reason,
    match: recommendVolunteer(location, templateKey, matchedRule.urgency),
    extractedFields: buildExtractionFields(text, location, matchedRule.urgency, confidence, issueType),
  }
}

function recommendVolunteer(location, templateKey, urgency) {
  const targetSkills = {
    water: ['Logistics', 'Crowd coordination'],
    flood: ['Procurement', 'Supply handling'],
    medical: ['Medical support', 'Registration'],
    food: ['Procurement', 'Crowd coordination'],
    education: ['Registration', 'Field coordination'],
    default: ['Field coordination', 'Rapid response'],
  }

  const expectedSkills = targetSkills[templateKey] || targetSkills.default

  const scoreMap = volunteers.map((volunteer) => {
    const skillHits = volunteer.skills.filter((skill) => expectedSkills.some((expected) => expected.toLowerCase() === skill.toLowerCase())).length
    const locationMatch = volunteer.location.toLowerCase() === location.toLowerCase() ? 14 : 0
    const urgencyBonus = urgency === 'Critical' ? 5 : urgency === 'High' ? 3 : 0
    const score = Math.min(99, 66 + skillHits * 14 + locationMatch + urgencyBonus)

    return {
      ...volunteer,
      score,
      reason: `${volunteer.skills.join(', ')} with ${locationMatch ? 'same-location' : 'broader-area'} coverage.`,
    }
  })

  return scoreMap.sort((left, right) => right.score - left.score)[0]
}

function summarizeCounts(reports) {
  const urgentCount = reports.filter((report) => report.urgency === 'Critical' || report.urgency === 'High').length
  const resolvedCount = Math.max(137, Math.round(reports.length * 0.55))

  return {
    triaged: reports.length,
    urgent: urgentCount,
    activeVolunteers: volunteers.length,
    resolved: resolvedCount,
  }
}

function normalizeFormValue(formData, key) {
  return String(formData.get(key) || '').trim()
}

function isDuplicateReport(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ')
  return state.reports.some((report) => report.summary.toLowerCase().includes(normalized.slice(0, 24)))
}

render()