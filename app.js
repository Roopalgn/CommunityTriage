const rawSeedReports = [
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
    reason: 'Repeated water shortage signals and same-day delivery need indicate immediate community risk.',
    source: 'Ward volunteer field note',
    match: {
      name: 'Asha Menon',
      skills: ['Logistics', 'Crowd coordination'],
      location: 'South District',
      availability: 'Now',
      score: 94,
      reason: 'Same-location logistics support is the strongest fit for rapid water response.',
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
    reason: 'Displacement and relief keywords suggest time-sensitive coordination and procurement support.',
    source: 'Crowdsourced survey entry',
    match: {
      name: 'Neha Das',
      skills: ['Procurement', 'Supply handling'],
      location: 'Riverside Zone',
      availability: 'Flexible',
      score: 91,
      reason: 'Procurement and supply handling align closely with relief distribution needs.',
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
    reason: 'The request is operationally important but less acute than disruption or disaster response cases.',
    source: 'NGO outreach request',
    match: {
      name: 'Ritvik Sharma',
      skills: ['Medical support', 'Registration'],
      location: 'Central Ward',
      availability: 'Today 2 PM',
      score: 86,
      reason: 'Medical support and registration experience match the camp workflow well.',
    },
  },
]

const volunteers = [
  {
    id: 'VOL-11',
    name: 'Asha Menon',
    skills: ['Logistics', 'Crowd coordination'],
    location: 'South District',
    availability: 'Now',
    score: 94,
  },
  {
    id: 'VOL-18',
    name: 'Ritvik Sharma',
    skills: ['Medical support', 'Registration'],
    location: 'Central Ward',
    availability: 'Today 2 PM',
    score: 86,
  },
  {
    id: 'VOL-24',
    name: 'Neha Das',
    skills: ['Procurement', 'Supply handling'],
    location: 'Riverside Zone',
    availability: 'Flexible',
    score: 91,
  },
  {
    id: 'VOL-33',
    name: 'Imran Khan',
    skills: ['Field coordination', 'Rapid response'],
    location: 'North Point',
    availability: 'Now',
    score: 88,
  },
]

const navItems = ['Overview', 'Cases', 'Intake', 'Volunteers', 'Insights']

const urgencyRules = [
  { terms: ['water', 'dry', 'thirst', 'sanitation', 'pump'], urgency: 'Critical', baseScore: 34, label: 'Water access' },
  { terms: ['flood', 'evacuated', 'damaged', 'blanket', 'displaced'], urgency: 'High', baseScore: 28, label: 'Flood relief' },
  { terms: ['medical', 'medicine', 'health', 'camp', 'patient'], urgency: 'High', baseScore: 24, label: 'Medical support' },
  { terms: ['food', 'hunger', 'meal', 'ration', 'nutrition'], urgency: 'High', baseScore: 22, label: 'Food support' },
  { terms: ['school', 'children', 'tutoring', 'class'], urgency: 'Medium', baseScore: 16, label: 'Education support' },
  { terms: ['volunteer', 'staff', 'runner', 'registration'], urgency: 'Medium', baseScore: 14, label: 'Support coordination' },
]

const locationAliases = ['south district', 'central ward', 'riverside zone', 'north point', 'east market', 'west end']

const reportTemplates = {
  water: { title: 'Urgent water support request', need: 'Water delivery, purification tablets, and transport coordination', issueType: 'Water shortage' },
  flood: { title: 'Flood response coordination needed', need: 'Food packets, blankets, and transport support', issueType: 'Flood relief' },
  medical: { title: 'Medical camp assistance required', need: 'Registration support, patient flow, and medical runners', issueType: 'Medical support' },
  food: { title: 'Food assistance needed', need: 'Meals, dry ration, and distribution help', issueType: 'Food support' },
  education: { title: 'Learning support request', need: 'Volunteer tutors, supplies, and venue coordination', issueType: 'Education support' },
  default: { title: 'Community support report', need: 'Field review and volunteer allocation', issueType: 'General support' },
}

const demoScenarios = {
  water: {
    incident: 'Families in South District have no clean water after two hand pumps stopped working overnight. Children and elderly residents need immediate delivery support.',
    location: 'South District',
    support: 'Water, purification tablets, transport support',
    source: 'Field note from ward volunteer',
  },
  flood: {
    incident: 'Flood water has displaced several families near Riverside Zone. Relief teams need food packets, blankets, and logistics support before evening.',
    location: 'Riverside Zone',
    support: 'Food packets, blankets, logistics',
    source: 'Crowdsourced survey entry',
  },
  medical: {
    incident: 'A community health camp in Central Ward needs volunteers for registration, patient flow, and medicine runners for the afternoon shift.',
    location: 'Central Ward',
    support: 'Registration helpers, medical runners',
    source: 'NGO outreach request',
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
  return foundAlias ? titleCase(foundAlias) : titleCase(normalized || 'Community Zone')
}

function summarizeText(text) {
  const cleaned = String(text).trim().replace(/\s+/g, ' ')
  return cleaned.length <= 120 ? cleaned : `${cleaned.slice(0, 117)}...`
}

function createReportId() {
  return `CT-${state.nextId++}`
}

function getTemplateKey(label) {
  const map = {
    'Water access': 'water',
    'Flood relief': 'flood',
    'Medical support': 'medical',
    'Food support': 'food',
    'Education support': 'education',
    'Support coordination': 'default',
  }

  return map[label] || 'default'
}

function buildExtractionFields(text, location, urgency, confidence, issueType, support, source) {
  return [
    { label: 'Issue type', value: issueType },
    { label: 'Location', value: location },
    { label: 'Urgency', value: urgency },
    { label: 'Confidence', value: `${confidence}%` },
    { label: 'Expected support', value: support },
    { label: 'Source', value: source },
    { label: 'Source summary', value: summarizeText(text) },
  ]
}

function hydrateSeedReport(report) {
  return {
    ...report,
    rawText: report.summary,
    extractionFields: buildExtractionFields(
      report.summary,
      report.location,
      report.urgency,
      report.confidence,
      report.issueType,
      report.need,
      report.source,
    ),
  }
}

function availabilityBonus(availability) {
  const normalized = availability.toLowerCase()

  if (normalized === 'now') {
    return 8
  }

  if (normalized === 'flexible') {
    return 4
  }

  return 1
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
  const urgencyBonus = urgency === 'Critical' ? 5 : urgency === 'High' ? 3 : 0

  const scoredVolunteers = volunteers.map((volunteer) => {
    const skillHits = volunteer.skills.filter((skill) =>
      expectedSkills.some((expected) => expected.toLowerCase() === skill.toLowerCase()),
    ).length
    const locationMatch = volunteer.location.toLowerCase() === location.toLowerCase() ? 14 : 0
    const speedBonus = availabilityBonus(volunteer.availability)
    const score = Math.min(99, 58 + skillHits * 14 + locationMatch + speedBonus + urgencyBonus)

    return {
      ...volunteer,
      score,
      reason: `${volunteer.skills.join(', ')} | ${locationMatch ? 'same-location coverage' : 'cross-area support'} | availability ${volunteer.availability.toLowerCase()}.`,
    }
  })

  return scoredVolunteers.sort((left, right) => right.score - left.score)[0]
}

function extractFromText(text, locationInput, supportInput, sourceInput) {
  const normalized = String(text).toLowerCase()
  const matchedRule =
    urgencyRules.find((rule) => rule.terms.some((term) => normalized.includes(term))) ||
    urgencyRules[urgencyRules.length - 1]
  const templateKey = getTemplateKey(matchedRule.label)
  const location = locationInput.trim()
    ? formatLocation(locationInput)
    : formatLocation(locationAliases.find((alias) => normalized.includes(alias)) || 'Community Zone')
  const confidence = Math.min(
    99,
    62 + matchedRule.baseScore + Math.min(12, normalized.split(/\s+/).filter(Boolean).length % 11),
  )
  const urgencyBoost =
    normalized.includes('immediately') || normalized.includes('today') || normalized.includes('urgent')
      ? 10
      : normalized.includes('soon') || normalized.includes('help')
        ? 4
        : 0
  const score = Math.min(99, matchedRule.baseScore + urgencyBoost + Math.min(30, confidence - 60))
  const issueType = reportTemplates[templateKey].issueType
  const need = supportInput || reportTemplates[templateKey].need
  const status =
    matchedRule.urgency === 'Critical'
      ? 'Needs immediate attention'
      : matchedRule.urgency === 'High'
        ? 'Assign next available team'
        : 'Queue for review'
  const reason = `${matchedRule.label} signals detected in the report, with ${matchedRule.urgency.toLowerCase()} urgency cues and ${confidence}% extraction confidence from the current rule-based engine.`
  const source = sourceInput || 'Submitted through intake form'

  return {
    title: reportTemplates[templateKey].title,
    location,
    issueType,
    urgency: matchedRule.urgency,
    score,
    summary: summarizeText(text),
    need,
    status,
    confidence,
    reason,
    source,
    match: recommendVolunteer(location, templateKey, matchedRule.urgency),
    extractionFields: buildExtractionFields(text, location, matchedRule.urgency, confidence, issueType, need, source),
  }
}

function normalizeFormValue(formData, key) {
  return String(formData.get(key) || '').trim()
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2)
}

function findDuplicateReport(text, locationHint) {
  const incomingTokens = tokenize(text)
  const incomingLocation = formatLocation(locationHint || '')

  if (!incomingTokens.length) {
    return null
  }

  return state.reports.find((report) => {
    const existingTokens = tokenize(`${report.title} ${report.summary} ${report.need}`)
    const sharedTokens = incomingTokens.filter((token) => existingTokens.includes(token))
    const overlapRatio = sharedTokens.length / Math.max(incomingTokens.length, 1)
    const sameLocation = incomingLocation !== 'Community Zone' && report.location === incomingLocation

    return overlapRatio >= 0.55 || (sameLocation && overlapRatio >= 0.35)
  })
}

function getFilteredReports() {
  const query = state.filters.search.toLowerCase().trim()

  return [...state.reports]
    .filter((report) => {
      const matchesSearch = !query || [report.title, report.summary, report.location, report.issueType, report.need, report.source]
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

function summarizeCounts(reports) {
  const urgent = reports.filter((report) => report.urgency === 'Critical' || report.urgency === 'High').length
  const reviewQueue = reports.filter((report) => report.urgency === 'Medium' || report.confidence < 85).length

  return {
    triaged: reports.length,
    urgent,
    activeVolunteers: volunteers.length,
    reviewQueue,
  }
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
    urgentShare: reports.length
      ? Math.round((reports.filter((report) => report.urgency === 'Critical' || report.urgency === 'High').length / reports.length) * 100)
      : 0,
  }
}

const state = {
  reports: rawSeedReports.map(hydrateSeedReport),
  nextId: 1045,
  lastAnalysis: null,
  filters: {
    search: '',
    urgency: 'All',
    location: 'All',
    sort: 'priority',
  },
}

state.lastAnalysis = state.reports[0]

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
          <p>Explainable NGO triage for urgent community needs.</p>
        </div>

        <nav>
          ${navItems
            .map((item, index) => `<a href="#${item.toLowerCase()}" class="${index === 0 ? 'active' : ''}">${item}</a>`)
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
            <span class="eyebrow">Phase 1 prototype hardening</span>
            <h2>Turn scattered reports into clear action.</h2>
            <p>
              Intake community reports, structure the need, rank urgency, and recommend the best volunteer response with visible reasoning.
            </p>
            <div class="hero-notes">
              <span>1. Load a demo scenario</span>
              <span>2. Analyze the report</span>
              <span>3. Show ranked action and reasoning</span>
            </div>
          </div>

          <div class="hero-panel">
            <div>
              <span>Current engine</span>
              <strong>Rule-based extraction</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>Priority-ranked action list</strong>
            </div>
            <div>
              <span>Google AI next</span>
              <strong>Gemini integration in Push 6</strong>
            </div>
          </div>
        </section>

        <section class="metrics" aria-label="dashboard metrics">
          <article class="metric-card">
            <span>Reports triaged</span>
            <strong>${counts.triaged}</strong>
            <small>Cases currently in the working queue.</small>
          </article>
          <article class="metric-card">
            <span>Urgent cases</span>
            <strong>${counts.urgent}</strong>
            <small>Critical or high-priority items waiting on response.</small>
          </article>
          <article class="metric-card">
            <span>Active volunteers</span>
            <strong>${counts.activeVolunteers}</strong>
            <small>Profiles available for matching in this demo dataset.</small>
          </article>
          <article class="metric-card">
            <span>Review queue</span>
            <strong>${counts.reviewQueue}</strong>
            <small>Cases that need more confidence or human review.</small>
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
              <small>${analytics.topLocationCount} active reports in the filtered view.</small>
            </div>
            <div>
              <span>Dominant issue</span>
              <strong>${sanitize(analytics.topIssue)}</strong>
              <small>${analytics.topIssueCount} related cases feeding the queue.</small>
            </div>
            <div>
              <span>Average confidence</span>
              <strong>${analytics.averageConfidence}%</strong>
              <small>Confidence from the current structured extraction path.</small>
            </div>
            <div>
              <span>Urgent share</span>
              <strong>${analytics.urgentShare}%</strong>
              <small>Portion of visible cases that need fast attention.</small>
            </div>
          </div>
        </section>

        <section class="grid-layout">
          <article class="panel" id="cases">
            <div class="panel-header">
              <div>
                <span>Urgent cases</span>
                <h3>Ranked community reports</h3>
              </div>
              <button type="button" data-scroll-target="#intake">New report</button>
            </div>

            <div class="filter-bar">
              <input id="case-search" type="search" value="${sanitize(state.filters.search)}" placeholder="Search location, issue, or source" />
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
                      <small class="report-subline">${sanitize(report.issueType)} | ${sanitize(report.location)}</small>
                      <p>${sanitize(report.summary)}</p>
                      <div class="report-meta">
                        <span>${sanitize(report.id)}</span>
                        <span>${sanitize(report.source)}</span>
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
                        <span>${volunteer.score}% baseline fit</span>
                      </div>
                      <p>${sanitize(volunteer.skills.join(' | '))}</p>
                      <small>${sanitize(volunteer.location)} | Available ${sanitize(volunteer.availability)}</small>
                    </article>
                  `,
                )
                .join('')}
            </div>

            <div class="sidebar-card secondary">
              <span>Explainability</span>
              <strong>Why these matches?</strong>
              <small>
                The current scoring combines skill overlap, location fit, and volunteer availability so the recommendation stays easy to explain.
              </small>
            </div>
          </aside>
        </section>

        <section class="panel" id="intake">
          <div class="panel-header">
            <div>
              <span>Report intake</span>
              <h3>Submit a new incident for triage</h3>
            </div>
          </div>

          <div class="demo-shortcuts">
            <div>
              <span>Demo shortcuts</span>
              <p>Use a preset to keep the judging walkthrough fast and repeatable.</p>
            </div>
            <div class="shortcut-actions">
              <button type="button" class="demo-preset" data-demo-key="water">Load water crisis</button>
              <button type="button" class="demo-preset" data-demo-key="flood">Load flood relief</button>
              <button type="button" class="demo-preset" data-demo-key="medical">Load medical camp</button>
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
              <input name="source" type="text" placeholder="Field note, survey, hotline, spreadsheet" />
            </label>

            <div class="form-actions">
              <button type="submit">Analyze report</button>
              <small>Push 5 uses a transparent rule-based engine so the workflow stays stable while Gemini integration is added next.</small>
            </div>
          </form>

          <div class="intake-results">
            <div class="result-card">
              <span>Latest triage result</span>
              <strong>${latest ? sanitize(latest.title) : 'No report analyzed yet'}</strong>
              <p>${latest ? sanitize(latest.reason) : 'Submit an incident to see structured extraction, scoring, and volunteer matching.'}</p>
            </div>

            <div class="result-grid">
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
                <h3>What the current engine used</h3>
              </div>
            </div>

            <div class="trace-list">
              ${(latest?.extractionFields || [
                { label: 'Issue type', value: 'Waiting for input' },
                { label: 'Location', value: 'Waiting for input' },
                { label: 'Urgency', value: 'Waiting for input' },
                { label: 'Confidence', value: 'Waiting for input' },
                { label: 'Expected support', value: 'Waiting for input' },
                { label: 'Source', value: 'Waiting for input' },
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
              <span>Pitch support</span>
              <h3>What to say during the demo</h3>
            </div>
          </div>

          <div class="insight-grid">
            <div>
              <strong>Problem framing</strong>
              <p>NGOs receive scattered reports and need a fast way to structure, rank, and act on them.</p>
            </div>
            <div>
              <strong>Current prototype</strong>
              <p>This build shows reliable intake, explainable scoring, hotspot signals, and volunteer matching in one flow.</p>
            </div>
            <div>
              <strong>Trust layer</strong>
              <p>The dashboard exposes confidence, rationale, and source context so decisions stay explainable.</p>
            </div>
            <div>
              <strong>Next step</strong>
              <p>Push 6 upgrades the extraction path to Gemini while preserving the same visible workflow.</p>
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

  document.querySelectorAll('.demo-preset').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = demoScenarios[button.getAttribute('data-demo-key')]
      const formElement = document.getElementById('report-form')

      if (!preset || !formElement) {
        return
      }

      formElement.elements.incident.value = preset.incident
      formElement.elements.location.value = preset.location
      formElement.elements.support.value = preset.support
      formElement.elements.source.value = preset.source
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
      source: 'Waiting for input',
      extractionFields: buildExtractionFields('', 'Waiting for input', 'Waiting for input', 0, 'Waiting for input', 'Waiting for input', 'Waiting for input'),
      match: { name: 'Waiting', score: 0 },
    }
    render()
    return
  }

  const duplicate = findDuplicateReport(incident, location)
  if (duplicate) {
    state.lastAnalysis = {
      title: 'Duplicate detected',
      reason: `This report appears similar to ${duplicate.id}, so it was flagged for manual review instead of being added twice.`,
      issueType: duplicate.issueType,
      urgency: 'Review',
      confidence: 92,
      source: source || 'Submitted through intake form',
      extractionFields: buildExtractionFields(
        incident,
        location || duplicate.location,
        'Review',
        92,
        duplicate.issueType,
        support || duplicate.need,
        source || 'Submitted through intake form',
      ),
      match: { name: 'Manual review', score: 0 },
    }
    render()
    return
  }

  const extracted = extractFromText(incident, location, support, source)
  const newReport = {
    id: createReportId(),
    rawText: incident,
    title: extracted.title,
    location: extracted.location,
    issueType: extracted.issueType,
    urgency: extracted.urgency,
    score: extracted.score,
    summary: extracted.summary,
    need: extracted.need,
    status: extracted.status,
    confidence: extracted.confidence,
    reason: extracted.reason,
    source: extracted.source,
    match: extracted.match,
    extractionFields: extracted.extractionFields,
  }

  state.reports = [newReport, ...state.reports]
  state.lastAnalysis = newReport

  render()
  event.currentTarget.reset()
}

render()
