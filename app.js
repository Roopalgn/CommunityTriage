// Legacy entry point retained for reference.
// The site now loads main.js.
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

const navItems = ['Overview', 'Cases', 'Intake', 'Volunteers', 'Insights', 'Audit']

const LOW_CONFIDENCE_THRESHOLD = 85
const AUDIT_TRAIL_LIMIT = 45
const STATE_STORAGE_KEY = 'communitytriage.runtime.v1'
const STATE_STORAGE_VERSION = 1

const targetSkillsByTemplate = {
  water: ['Logistics', 'Crowd coordination'],
  flood: ['Procurement', 'Supply handling'],
  medical: ['Medical support', 'Registration'],
  food: ['Procurement', 'Crowd coordination'],
  education: ['Registration', 'Field coordination'],
  default: ['Field coordination', 'Rapid response'],
}

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
const triageCore = typeof window !== 'undefined' ? window.CommunityTriageCore || null : null

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
  if (triageCore?.formatLocation) {
    return triageCore.formatLocation(value, locationAliases)
  }

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

function buildExtractionFields({
  text,
  location,
  urgency,
  confidence,
  issueType,
  support,
  source,
  affectedGroup = 'Community members',
  provider = 'Rule-based',
  duplicateOf = '',
}) {
  return [
    { label: 'Issue type', value: issueType },
    { label: 'Location', value: location },
    { label: 'Urgency', value: urgency },
    { label: 'Confidence', value: `${confidence}%` },
    { label: 'Affected group', value: affectedGroup },
    { label: 'Expected support', value: support },
    { label: 'Source', value: source },
    { label: 'Analysis provider', value: provider },
    ...(duplicateOf ? [{ label: 'Duplicate review', value: `Possible match with ${duplicateOf}` }] : []),
    { label: 'Source summary', value: summarizeText(text) },
  ]
}

function createScoreBreakdown(items) {
  return items.map((item) => ({
    label: item.label,
    value: item.value,
    detail: item.detail,
  }))
}

function createRuleScoreBreakdown({ matchedRule, urgencyBoost, confidence, score }) {
  const confidenceContribution = Math.min(30, confidence - 60)

  return createScoreBreakdown([
    {
      label: 'Rule signals',
      value: `${matchedRule.baseScore} pts`,
      detail: `${matchedRule.label} keywords and category cues shaped the base ranking.`,
    },
    {
      label: 'Urgency cues',
      value: `${urgencyBoost} pts`,
      detail: 'Words like urgent, immediately, and today raise the time-sensitivity score.',
    },
    {
      label: 'Confidence contribution',
      value: `${confidenceContribution} pts`,
      detail: 'The structured extraction confidence adds explainable weight to the final priority.',
    },
    {
      label: 'Final priority',
      value: `${score} pts`,
      detail: 'Fallback ranking remains deterministic when Gemini is unavailable.',
    },
  ])
}

function createHybridScoreBreakdown({ confidence, urgency, fallbackScore, score }) {
  const aiContribution = Math.round(confidence * 0.4)
  const urgencyContribution = Math.round(getUrgencyScore(urgency) * 0.35)
  const ruleContribution = Math.round(fallbackScore * 0.25)

  return createScoreBreakdown([
    {
      label: 'Gemini confidence',
      value: `${aiContribution} pts`,
      detail: `${confidence}% model confidence contributes directly to the ranking.`,
    },
    {
      label: 'Urgency weighting',
      value: `${urgencyContribution} pts`,
      detail: `${urgency} cases receive an operational urgency boost for NGO triage.`,
    },
    {
      label: 'Deterministic signals',
      value: `${ruleContribution} pts`,
      detail: 'Rule-based cues keep the score stable and auditable when model output varies.',
    },
    {
      label: 'Final hybrid score',
      value: `${score} pts`,
      detail: 'The final ranking combines model output with deterministic safeguards.',
    },
  ])
}

function hydrateSeedReport(report) {
  return {
    ...report,
    rawText: report.summary,
    affectedGroup: 'Local households',
    provider: 'Baseline case data',
    duplicateOf: '',
    scoreBreakdown: createScoreBreakdown([
      {
        label: 'Baseline priority',
        value: `${report.score} pts`,
        detail: 'This baseline case initializes the queue and preserves realistic starting conditions.',
      },
      {
        label: 'Operational urgency',
        value: `${report.urgency}`,
        detail: 'The baseline dataset reflects the categories used in live triage operations.',
      },
    ]),
    extractionFields: buildExtractionFields({
      text: report.summary,
      location: report.location,
      urgency: report.urgency,
      confidence: report.confidence,
      issueType: report.issueType,
      support: report.need,
      source: report.source,
      affectedGroup: 'Local households',
      provider: 'Baseline case data',
      duplicateOf: '',
    }),
  }
}

function normalizeUrgency(value) {
  if (triageCore?.normalizeUrgency) {
    return triageCore.normalizeUrgency(value)
  }

  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'critical') {
    return 'Critical'
  }

  if (normalized === 'high') {
    return 'High'
  }

  return 'Medium'
}

function clampNumber(value, min, max, fallback) {
  if (triageCore?.clampNumber) {
    return triageCore.clampNumber(value, min, max, fallback)
  }

  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)))
}

function getTemplateKeyFromIssueType(issueType, incident) {
  const normalizedIssueType = String(issueType || '').toLowerCase()

  if (normalizedIssueType.includes('water')) {
    return 'water'
  }

  if (normalizedIssueType.includes('flood')) {
    return 'flood'
  }

  if (normalizedIssueType.includes('medical') || normalizedIssueType.includes('health')) {
    return 'medical'
  }

  if (normalizedIssueType.includes('food') || normalizedIssueType.includes('ration')) {
    return 'food'
  }

  if (normalizedIssueType.includes('education') || normalizedIssueType.includes('school')) {
    return 'education'
  }

  const normalizedIncident = String(incident || '').toLowerCase()

  if (normalizedIncident.includes('water') || normalizedIncident.includes('pump')) {
    return 'water'
  }

  if (normalizedIncident.includes('flood') || normalizedIncident.includes('blanket')) {
    return 'flood'
  }

  if (normalizedIncident.includes('medical') || normalizedIncident.includes('patient')) {
    return 'medical'
  }

  if (normalizedIncident.includes('food') || normalizedIncident.includes('ration')) {
    return 'food'
  }

  return 'default'
}

function getStatusFromUrgency(urgency) {
  if (urgency === 'Critical') {
    return 'Needs immediate attention'
  }

  if (urgency === 'High') {
    return 'Assign next available team'
  }

  return 'Queue for review'
}

function findVolunteerById(volunteerId) {
  return volunteers.find((volunteer) => volunteer.id === volunteerId) || null
}

function findVolunteerByName(name) {
  const normalizedName = String(name || '').trim().toLowerCase()
  if (!normalizedName) {
    return null
  }

  return volunteers.find((volunteer) => volunteer.name.toLowerCase() === normalizedName) || null
}

function getTemplateContextFromReport(report) {
  return {
    location: report.location,
    templateKey: getTemplateKeyFromIssueType(report.issueType, report.rawText || report.summary),
    urgency: report.urgency,
  }
}

function getUrgencyScore(urgency) {
  if (urgency === 'Critical') {
    return 96
  }

  if (urgency === 'High') {
    return 84
  }

  return 68
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

function calculateVolunteerFit({ location, templateKey, urgency }, volunteer) {
  const expectedSkills = targetSkillsByTemplate[templateKey] || targetSkillsByTemplate.default
  const normalizedExpectedSkills = expectedSkills.map((skill) => skill.toLowerCase())
  const matchedSkills = volunteer.skills.filter((skill) => normalizedExpectedSkills.includes(skill.toLowerCase()))
  const skillHits = matchedSkills.length
  const locationMatch = volunteer.location.toLowerCase() === location.toLowerCase()
  const urgencyBonus = urgency === 'Critical' ? 5 : urgency === 'High' ? 3 : 0
  const speedBonus = availabilityBonus(volunteer.availability)
  const score = Math.min(99, 58 + skillHits * 14 + (locationMatch ? 14 : 0) + speedBonus + urgencyBonus)

  return {
    score,
    summary: `${volunteer.skills.join(', ')} | ${locationMatch ? 'same-location coverage' : 'cross-area support'} | availability ${volunteer.availability.toLowerCase()}.`,
    breakdown: [
      {
        label: 'Skill fit',
        value: `${skillHits}/${expectedSkills.length} matched`,
        detail: matchedSkills.length
          ? `Matched skills: ${matchedSkills.join(', ')}.`
          : `Expected skills: ${expectedSkills.join(', ')}.`,
      },
      {
        label: 'Location fit',
        value: locationMatch ? 'Same area' : 'Cross-area',
        detail: locationMatch
          ? `${volunteer.location} matches the case location.`
          : `${volunteer.location} can still provide support for ${location}.`,
      },
      {
        label: 'Availability',
        value: volunteer.availability,
        detail: `Availability bonus: ${speedBonus} points for response timing.`,
      },
      {
        label: 'Final fit score',
        value: `${score}%`,
        detail: `Includes urgency weighting (${urgencyBonus} points) for ${urgency.toLowerCase()} cases.`,
      },
    ],
  }
}

function getMatchBreakdown(report, volunteer) {
  if (!report || !volunteer) {
    return []
  }

  return calculateVolunteerFit(getTemplateContextFromReport(report), volunteer).breakdown
}

function getReviewFlags(report) {
  const flags = []

  if (report.confidence < LOW_CONFIDENCE_THRESHOLD) {
    flags.push({
      code: 'low-confidence',
      label: `Low confidence (${report.confidence}%)`,
      detail: 'Requires human verification before field action.',
    })
  }

  if (report.duplicateOf) {
    flags.push({
      code: 'duplicate',
      label: `Possible duplicate of ${report.duplicateOf}`,
      detail: 'Review against the linked case before dispatch.',
    })
  }

  return flags
}

function getStatusForWorkflow(report) {
  if (report.assignedVolunteerId) {
    const assignedVolunteer = findVolunteerById(report.assignedVolunteerId)
    return assignedVolunteer ? `Assigned to ${assignedVolunteer.name}` : 'Assigned for field response'
  }

  if (report.reviewFlags.some((flag) => flag.code === 'duplicate')) {
    return 'Flagged for duplicate review'
  }

  if (report.reviewFlags.some((flag) => flag.code === 'low-confidence')) {
    return 'Needs human review'
  }

  return getStatusFromUrgency(report.urgency)
}

function enrichReportForWorkflow(report) {
  const matchedVolunteer = findVolunteerById(report.match?.id) || findVolunteerByName(report.match?.name)
  const normalizedMatch = matchedVolunteer
    ? {
        ...matchedVolunteer,
        score: report.match?.score || matchedVolunteer.score,
        reason: report.match?.reason || `${matchedVolunteer.skills.join(', ')} support the case requirements.`,
      }
    : report.match
  const normalizedReport = {
    ...report,
    match: normalizedMatch,
    assignedVolunteerId: report.assignedVolunteerId || '',
  }

  normalizedReport.reviewFlags = getReviewFlags(normalizedReport)
  normalizedReport.status = getStatusForWorkflow(normalizedReport)

  return normalizedReport
}

function getAuditTypeLabel(type) {
  const labels = {
    analyze: 'Analyze',
    override: 'Override',
    assign: 'Assignment',
    'duplicate-flag': 'Duplicate flag',
  }

  return labels[type] || 'Audit'
}

function formatAuditTime(timestamp) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function createClientRequestId(prefix = 'client') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function buildSeedAuditTrail(reports, nextAuditId = 1, nextEventId = 1) {
  const auditTrail = reports.map((report, index) => ({
    id: `AT-${nextAuditId + index}`,
    eventId: `EV-${nextEventId + index}`,
    requestId: `seed-${report.id}`,
    type: 'analyze',
    reportId: report.id,
    message: `Case ${report.id} entered the queue with ${report.urgency.toLowerCase()} urgency and ${report.confidence}% confidence.`,
    timestamp: new Date(Date.now() - (index + 1) * 60000).toISOString(),
    metadata: {
      provider: report.provider,
      confidence: report.confidence,
      source: 'baseline',
    },
  }))

  return {
    auditTrail,
    nextAuditId: nextAuditId + auditTrail.length,
    nextEventId: nextEventId + auditTrail.length,
  }
}

function getPersistableStateSnapshot() {
  return {
    version: STATE_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    reports: state.reports,
    nextId: state.nextId,
    nextAuditId: state.nextAuditId,
    nextEventId: state.nextEventId,
    lastAnalysisId: state.lastAnalysis?.id || null,
    selectedReportId: state.selectedReportId || null,
    auditTrail: state.auditTrail,
  }
}

function persistOperationalState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(getPersistableStateSnapshot()))
  } catch (error) {
    console.warn('State persistence skipped:', error)
  }
}

function hydrateStateFromStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    const rawSnapshot = window.localStorage.getItem(STATE_STORAGE_KEY)
    if (!rawSnapshot) {
      return
    }

    const snapshot = JSON.parse(rawSnapshot)
    if (!snapshot || snapshot.version !== STATE_STORAGE_VERSION) {
      return
    }

    if (!Array.isArray(snapshot.reports) || !snapshot.reports.length) {
      return
    }

    const restoredReports = snapshot.reports.map((report) => enrichReportForWorkflow(report))
    const restoredAuditTrail = Array.isArray(snapshot.auditTrail)
      ? snapshot.auditTrail
          .map((entry) => ({
            ...entry,
            eventId: entry.eventId || `EV-${entry.id || createClientRequestId('event')}`,
            requestId: entry.requestId || createClientRequestId('restored'),
            metadata: entry.metadata || {},
          }))
          .slice(0, AUDIT_TRAIL_LIMIT)
      : []

    const highestReportNumericId = restoredReports
      .map((report) => Number(String(report.id || '').replace(/[^0-9]/g, '')))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 1044)

    state.reports = restoredReports
    state.nextId = Math.max(highestReportNumericId + 1, Number(snapshot.nextId) || 1045)
    state.auditTrail = restoredAuditTrail
    state.nextAuditId = Math.max(Number(snapshot.nextAuditId) || 1, restoredAuditTrail.length + 1)
    state.nextEventId = Math.max(Number(snapshot.nextEventId) || 1, restoredAuditTrail.length + 1)

    const restoredLastAnalysis = restoredReports.find((report) => report.id === snapshot.lastAnalysisId) || restoredReports[0]
    state.lastAnalysis = restoredLastAnalysis || null
    state.selectedReportId =
      restoredReports.find((report) => report.id === snapshot.selectedReportId)?.id ||
      restoredLastAnalysis?.id ||
      restoredReports[0]?.id ||
      null
  } catch (error) {
    console.warn('Failed to restore saved state:', error)
  }
}

function logAuditEvent(type, reportId, message, metadata = {}) {
  const requestId = metadata.requestId || createClientRequestId(type)

  state.auditTrail = [
    {
      id: `AT-${state.nextAuditId++}`,
      eventId: `EV-${state.nextEventId++}`,
      requestId,
      type,
      reportId,
      message,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        requestId,
      },
    },
    ...state.auditTrail,
  ].slice(0, AUDIT_TRAIL_LIMIT)
}

function recommendVolunteer(location, templateKey, urgency) {
  const context = { location, templateKey, urgency }

  const scoredVolunteers = volunteers.map((volunteer) => {
    const fit = calculateVolunteerFit(context, volunteer)

    return {
      ...volunteer,
      score: fit.score,
      reason: fit.summary,
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
  const affectedGroup = normalized.includes('children') || normalized.includes('elderly')
    ? 'Children and elderly residents'
    : normalized.includes('families')
      ? 'Local families'
      : 'Community members'

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
    provider: 'Rule-based fallback',
    affectedGroup,
    duplicateOf: '',
    scoreBreakdown: createRuleScoreBreakdown({
      matchedRule,
      urgencyBoost,
      confidence,
      score,
    }),
    match: recommendVolunteer(location, templateKey, matchedRule.urgency),
    extractionFields: buildExtractionFields({
      text,
      location,
      urgency: matchedRule.urgency,
      confidence,
      issueType,
      support: need,
      source,
      affectedGroup,
      provider: 'Rule-based fallback',
      duplicateOf: '',
    }),
  }
}

function normalizeRequiredResources(value, fallback) {
  if (triageCore?.normalizeRequiredResources) {
    return triageCore.normalizeRequiredResources(value, fallback)
  }

  if (Array.isArray(value)) {
    const cleaned = value.map((entry) => String(entry).trim()).filter(Boolean)
    if (cleaned.length) {
      return cleaned.join(', ')
    }
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return fallback
}

function buildReportFromBackend({ incident, location, support, source, analysis, model }) {
  const fallback = extractFromText(incident, location, support, source)
  const issueType = String(analysis.issueType || fallback.issueType).trim()
  const templateKey = getTemplateKeyFromIssueType(issueType, incident)
  const resolvedLocation = formatLocation(analysis.location || fallback.location)
  const urgency = normalizeUrgency(analysis.urgency || fallback.urgency)
  const confidence = clampNumber(analysis.confidence, 45, 99, fallback.confidence)
  const need = normalizeRequiredResources(analysis.requiredResources, support || fallback.need)
  const affectedGroup = String(analysis.affectedGroup || fallback.affectedGroup || 'Community members').trim()
  const providerLabel = model ? `Gemini (${model})` : 'Gemini'
  const summary = summarizeText(analysis.summary || incident)
  const reason = String(analysis.justification || fallback.reason).trim()
  const score = Math.min(
    99,
    triageCore?.calculateHybridPriorityScore
      ? triageCore.calculateHybridPriorityScore({
        confidence,
        urgency,
        fallbackScore: fallback.score,
      })
      : Math.round(confidence * 0.4 + getUrgencyScore(urgency) * 0.35 + fallback.score * 0.25),
  )

  return {
    id: createReportId(),
    rawText: incident,
    title: reportTemplates[templateKey].title,
    location: resolvedLocation,
    issueType,
    urgency,
    score,
    summary,
    need,
    status: getStatusFromUrgency(urgency),
    confidence,
    reason,
    source: source || 'Submitted through intake form',
    provider: providerLabel,
    affectedGroup,
    duplicateOf: '',
    scoreBreakdown: createHybridScoreBreakdown({
      confidence,
      urgency,
      fallbackScore: fallback.score,
      score,
    }),
    match: recommendVolunteer(resolvedLocation, templateKey, urgency),
    extractionFields: buildExtractionFields({
      text: incident,
      location: resolvedLocation,
      urgency,
      confidence,
      issueType,
      support: need,
      source: source || 'Submitted through intake form',
      affectedGroup,
      provider: providerLabel,
      duplicateOf: '',
    }),
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

function calculateDuplicateSignals(candidateReport, existingReport) {
  if (triageCore?.calculateDuplicateSignals) {
    return triageCore.calculateDuplicateSignals(candidateReport, existingReport)
  }

  const candidateTokens = tokenize(`${candidateReport.title} ${candidateReport.summary} ${candidateReport.need} ${candidateReport.rawText}`)
  const existingTokens = tokenize(`${existingReport.title} ${existingReport.summary} ${existingReport.need} ${existingReport.rawText || ''}`)
  const sharedTokens = candidateTokens.filter((token) => existingTokens.includes(token))
  const overlapRatio = sharedTokens.length / Math.max(candidateTokens.length, 1)
  const sameLocation = candidateReport.location === existingReport.location
  const sameIssue = candidateReport.issueType.toLowerCase() === existingReport.issueType.toLowerCase()
  const sameSource = candidateReport.source.toLowerCase() === existingReport.source.toLowerCase()
  const duplicateScore =
    overlapRatio * 0.55 +
    (sameLocation ? 0.2 : 0) +
    (sameIssue ? 0.2 : 0) +
    (sameSource ? 0.05 : 0)

  return {
    overlapRatio,
    sameLocation,
    sameIssue,
    sameSource,
    duplicateScore,
  }
}

function findDuplicateMatch(candidateReport) {
  const rankedMatches = state.reports
    .map((report) => ({
      report,
      ...calculateDuplicateSignals(candidateReport, report),
    }))
    .sort((left, right) => right.duplicateScore - left.duplicateScore)

  const topMatch = rankedMatches[0]
  if (!topMatch) {
    return null
  }

  const threshold = topMatch.report.provider === 'Baseline case data' ? 0.78 : 0.82

  if (topMatch.duplicateScore < threshold) {
    return null
  }

  return topMatch
}

function parseCsvLine(line) {
  const values = []
  let currentValue = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    const nextCharacter = line[index + 1]

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
      values.push(currentValue.trim())
      currentValue = ''
      continue
    }

    currentValue += character
  }

  values.push(currentValue.trim())
  return values
}

function parseCsvText(csvText) {
  const lines = String(csvText)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return []
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase())

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || ''
      return row
    }, {})
  })
}

function buildImportedReport(row) {
  const incident = row.incident || row.report || row.text || row.description || ''
  const location = row.location || row.area || row.zone || ''
  const support = row.support || row.need || row.resources || ''
  const source = row.source || row.channel || 'CSV import'

  const extracted = extractFromText(incident, location, support, source)

  return {
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
    source,
    provider: 'CSV import (local normalization)',
    affectedGroup: extracted.affectedGroup,
    duplicateOf: '',
    scoreBreakdown: [
      ...extracted.scoreBreakdown.slice(0, 3),
      {
        label: 'Import path',
        value: 'Batch CSV',
        detail: 'CSV rows are normalized locally for fast bulk intake and triage preview.',
      },
    ],
    match: extracted.match,
    extractionFields: buildExtractionFields({
      text: incident,
      location: extracted.location,
      urgency: extracted.urgency,
      confidence: extracted.confidence,
      issueType: extracted.issueType,
      support: extracted.need,
      source,
      affectedGroup: extracted.affectedGroup,
      provider: 'CSV import (local normalization)',
      duplicateOf: '',
    }),
  }
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
  const reviewQueue = reports.filter((report) => report.reviewFlags?.length).length

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
  const locationHotspots = Object.entries(byLocation)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
  const issueHotspots = Object.entries(byIssue)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
  const averageConfidence = Math.round(
    reports.reduce((total, report) => total + report.confidence, 0) / Math.max(1, reports.length),
  )

  return {
    topLocation: topLocation ? topLocation[0] : 'No location yet',
    topLocationCount: topLocation ? topLocation[1] : 0,
    topIssue: topIssue ? topIssue[0] : 'No issue yet',
    topIssueCount: topIssue ? topIssue[1] : 0,
    averageConfidence,
    locationHotspots,
    issueHotspots,
    urgentShare: reports.length
      ? Math.round((reports.filter((report) => report.urgency === 'Critical' || report.urgency === 'High').length / reports.length) * 100)
      : 0,
  }
}

const seededReports = rawSeedReports.map((report) => enrichReportForWorkflow(hydrateSeedReport(report)))
const seedAudit = buildSeedAuditTrail(seededReports)

const state = {
  reports: seededReports,
  nextId: 1045,
  nextAuditId: seedAudit.nextAuditId,
  nextEventId: seedAudit.nextEventId,
  lastAnalysis: null,
  selectedReportId: seededReports[0]?.id || null,
  auditTrail: seedAudit.auditTrail,
  backend: {
    available: false,
    geminiConfigured: false,
    model: null,
  },
  analysisStatus: {
    state: 'idle',
    message: '',
  },
  filters: {
    search: '',
    urgency: 'All',
    location: 'All',
    sort: 'priority',
  },
}

state.lastAnalysis = state.reports[0] || null
hydrateStateFromStorage()

function render() {
  const counts = summarizeCounts(state.reports)
  const latest = state.lastAnalysis
  const filteredReports = getFilteredReports()
  const analytics = buildAnalytics(filteredReports)
  const locations = ['All', ...new Set(state.reports.map((report) => report.location))]
  const selectedReport = state.reports.find((report) => report.id === state.selectedReportId) || state.reports[0] || null
  const selectedVolunteer = selectedReport
    ? findVolunteerById(selectedReport.assignedVolunteerId) ||
      findVolunteerById(selectedReport.match?.id) ||
      findVolunteerByName(selectedReport.match?.name)
    : null
  const selectedFitBreakdown = selectedReport && selectedVolunteer ? getMatchBreakdown(selectedReport, selectedVolunteer) : []
  const selectedVolunteerId = selectedReport?.assignedVolunteerId || selectedReport?.match?.id || ''

  if (selectedReport && state.selectedReportId !== selectedReport.id) {
    state.selectedReportId = selectedReport.id
  }

  const activeEngineLabel = state.backend.geminiConfigured ? 'Gemini-assisted extraction' : 'Rule-based fallback'
  const backendLabel = state.backend.available ? 'Node API online' : 'Static fallback mode'
  const googleAiLabel = state.backend.geminiConfigured
    ? state.backend.model
    : 'Add GEMINI_API_KEY to enable Gemini'
  const statusMarkup = state.analysisStatus.message
    ? `<div class="status-banner ${state.analysisStatus.state}" role="status" aria-live="polite">${sanitize(state.analysisStatus.message)}</div>`
    : ''
  const analyzeButtonText = state.analysisStatus.state === 'loading' ? 'Analyzing with Gemini...' : 'Analyze report'
  const locationHotspotsMarkup = analytics.locationHotspots.length
    ? analytics.locationHotspots
        .map(([label, count]) => `
          <div class="hotspot-chip">
            <strong>${sanitize(label)}</strong>
            <span>${count} case${count === 1 ? '' : 's'}</span>
          </div>
        `)
        .join('')
    : '<div class="empty-state">No hotspots yet.</div>'
  const issueHotspotsMarkup = analytics.issueHotspots.length
    ? analytics.issueHotspots
        .map(([label, count]) => `
          <div class="hotspot-chip">
            <strong>${sanitize(label)}</strong>
            <span>${count} case${count === 1 ? '' : 's'}</span>
          </div>
        `)
        .join('')
    : '<div class="empty-state">No issue clusters yet.</div>'
  const scoreBreakdownMarkup = latest?.scoreBreakdown?.length
    ? latest.scoreBreakdown
        .map(
          (item) => `
            <div class="breakdown-card">
              <span>${sanitize(item.label)}</span>
              <strong>${sanitize(item.value)}</strong>
              <small>${sanitize(item.detail)}</small>
            </div>
          `,
        )
        .join('')
    : `
      <div class="breakdown-card">
        <span>Priority breakdown</span>
        <strong>Waiting for input</strong>
        <small>Analyze a report to see how the score is assembled.</small>
      </div>
    `
  const selectedFlagsMarkup = selectedReport?.reviewFlags?.length
    ? selectedReport.reviewFlags
        .map((flag) => `<span class="flag-chip ${sanitize(flag.code)}">${sanitize(flag.label)}</span>`)
        .join('')
    : '<span class="flag-chip ok">No review flags</span>'
  const selectedFitMarkup = selectedFitBreakdown.length
    ? selectedFitBreakdown
        .map(
          (item) => `
            <div class="mini-breakdown-card">
              <span>${sanitize(item.label)}</span>
              <strong>${sanitize(item.value)}</strong>
              <small>${sanitize(item.detail)}</small>
            </div>
          `,
        )
        .join('')
    : `
      <div class="mini-breakdown-card">
        <span>Volunteer match</span>
        <strong>No match selected</strong>
        <small>Select or assign a volunteer to view reasoning.</small>
      </div>
    `
  const assignmentOptionsMarkup = volunteers
    .map(
      (volunteer) =>
        `<option value="${sanitize(volunteer.id)}" ${selectedVolunteerId === volunteer.id ? 'selected' : ''}>${sanitize(volunteer.name)} | ${sanitize(volunteer.location)} | ${sanitize(volunteer.availability)}</option>`,
    )
    .join('')
  const auditTrailMarkup = state.auditTrail.length
    ? state.auditTrail
        .map(
          (entry) => `
            <article class="audit-entry">
              <div class="audit-topline">
                <span>${sanitize(getAuditTypeLabel(entry.type))}</span>
                <strong>${sanitize(entry.reportId)}</strong>
                <small>${sanitize(entry.eventId || entry.id)} | ${sanitize(entry.requestId || 'n/a')} | ${sanitize(formatAuditTime(entry.timestamp))}</small>
              </div>
              <p>${sanitize(entry.message)}</p>
            </article>
          `,
        )
        .join('')
    : '<div class="empty-state">No audit events yet. Analyze, override, or assign to start the log.</div>'

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
            .map((item, index) => `<a href="#${item.toLowerCase()}" class="${index === 0 ? 'active' : ''}" ${index === 0 ? 'aria-current="page"' : ''}>${item}</a>`)
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
            <span class="eyebrow">Operational intelligence for NGOs</span>
            <h2>Turn scattered reports into clear action.</h2>
            <p>
              Intake community reports, structure the need, rank urgency, and recommend the best volunteer response with visible reasoning.
            </p>
            <div class="hero-notes">
              <span>1. Capture an incoming report</span>
              <span>2. Analyze the report</span>
              <span>3. Review priority and assign response</span>
            </div>
          </div>

          <div class="hero-panel">
            <div>
              <span>Current engine</span>
              <strong>${sanitize(activeEngineLabel)}</strong>
            </div>
            <div>
              <span>Backend</span>
              <strong>${sanitize(backendLabel)}</strong>
            </div>
            <div>
              <span>Google AI</span>
              <strong>${sanitize(googleAiLabel)}</strong>
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
            <small>Profiles currently available for field matching.</small>
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

          <div class="hotspot-grid">
            <div class="hotspot-panel">
              <span>Location clusters</span>
              <h4>Where needs are concentrating</h4>
              <div class="hotspot-list">
                ${locationHotspotsMarkup}
              </div>
            </div>
            <div class="hotspot-panel">
              <span>Issue clusters</span>
              <h4>Which needs are repeating</h4>
              <div class="hotspot-list">
                ${issueHotspotsMarkup}
              </div>
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
              <input id="case-search" type="search" value="${sanitize(state.filters.search)}" placeholder="Search location, issue, or source" aria-label="Search cases" />
              <select id="urgency-filter" aria-label="Filter by urgency">
                ${['All', 'Critical', 'High', 'Medium']
                  .map((value) => `<option value="${value}" ${state.filters.urgency === value ? 'selected' : ''}>${value}</option>`)
                  .join('')}
              </select>
              <select id="location-filter" aria-label="Filter by location">
                ${locations
                  .map((value) => `<option value="${sanitize(value)}" ${state.filters.location === value ? 'selected' : ''}>${sanitize(value)}</option>`)
                  .join('')}
              </select>
              <select id="sort-filter" aria-label="Sort case list">
                ${[
                  { value: 'priority', label: 'Sort by priority' },
                  { value: 'confidence', label: 'Sort by confidence' },
                  { value: 'location', label: 'Sort by location' },
                ]
                  .map((option) => `<option value="${option.value}" ${state.filters.sort === option.value ? 'selected' : ''}>${option.label}</option>`)
                  .join('')}
              </select>
            </div>

            <div class="report-list" aria-live="polite">
              ${filteredReports
                .map(
                  (report) => `
                    <article class="report-card ${selectedReport?.id === report.id ? 'active' : ''}">
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
                        <span>${sanitize(report.provider || 'Rule-based fallback')}</span>
                        ${report.duplicateOf ? `<span>Duplicate review: ${sanitize(report.duplicateOf)}</span>` : ''}
                      </div>
                      ${report.reviewFlags?.length
                        ? `<div class="flag-row">${report.reviewFlags
                            .map((flag) => `<span class="flag-chip ${sanitize(flag.code)}">${sanitize(flag.label)}</span>`)
                            .join('')}</div>`
                        : ''}
                      <div class="report-footer">
                        <small>${sanitize(report.need)}</small>
                        <em>${sanitize(report.status)}</em>
                      </div>
                      <div class="report-reason">
                        <small>${sanitize(report.reason)}</small>
                      </div>
                      <div class="report-actions">
                        <button type="button" class="ghost-button select-case" data-report-id="${sanitize(report.id)}" aria-pressed="${selectedReport?.id === report.id ? 'true' : 'false'}">${selectedReport?.id === report.id ? 'Selected case' : 'View details'}</button>
                        ${report.assignedVolunteerId
                          ? `<button type="button" class="ghost-button danger" data-unassign-report="${sanitize(report.id)}">Unassign</button>`
                          : `<button type="button" data-assign-report="${sanitize(report.id)}" data-volunteer-id="${sanitize(report.match?.id || '')}" ${report.match?.id ? '' : 'disabled'}>Assign suggested</button>`}
                      </div>
                    </article>
                  `,
                )
                .join('')}
              ${filteredReports.length === 0 ? '<div class="empty-state">No reports match the current filters.</div>' : ''}
            </div>
          </article>

          <aside class="panel case-detail-panel" id="volunteers">
            <div class="panel-header">
              <div>
                <span>Case detail</span>
                <h3>Human review and assignment</h3>
              </div>
            </div>

            ${selectedReport
              ? `
                <div class="detail-card">
                  <div class="detail-headline">
                    <strong>${sanitize(selectedReport.title)}</strong>
                    <span>${sanitize(selectedReport.id)}</span>
                  </div>
                  <p>${sanitize(selectedReport.summary)}</p>
                  <div class="detail-grid">
                    <div>
                      <span>Issue</span>
                      <strong>${sanitize(selectedReport.issueType)}</strong>
                    </div>
                    <div>
                      <span>Location</span>
                      <strong>${sanitize(selectedReport.location)}</strong>
                    </div>
                    <div>
                      <span>Urgency</span>
                      <strong>${sanitize(selectedReport.urgency)}</strong>
                    </div>
                    <div>
                      <span>Priority score</span>
                      <strong>${selectedReport.score}%</strong>
                    </div>
                    <div>
                      <span>Confidence</span>
                      <strong>${selectedReport.confidence}%</strong>
                    </div>
                    <div>
                      <span>Assigned volunteer</span>
                      <strong>${selectedVolunteer ? sanitize(selectedVolunteer.name) : 'Not assigned'}</strong>
                    </div>
                  </div>
                </div>

                <div class="review-box">
                  <h4>Review flags</h4>
                  <div class="flag-row">${selectedFlagsMarkup}</div>
                </div>

                <form class="override-form" id="override-form" data-report-id="${sanitize(selectedReport.id)}">
                  <label>
                    <span>Manual urgency override</span>
                    <select name="overrideUrgency">
                      ${['Critical', 'High', 'Medium']
                        .map((value) => `<option value="${value}" ${selectedReport.urgency === value ? 'selected' : ''}>${value}</option>`)
                        .join('')}
                    </select>
                  </label>
                  <label>
                    <span>Manual priority score</span>
                    <input name="overrideScore" type="number" min="0" max="99" value="${selectedReport.score}" />
                  </label>
                  <button type="submit">Apply manual override</button>
                </form>

                ${selectedReport.manualOverride
                  ? `<small class="detail-note">Last override: ${sanitize(selectedReport.manualOverride.previousUrgency)} ${selectedReport.manualOverride.previousScore}% -> ${sanitize(selectedReport.manualOverride.urgency)} ${selectedReport.manualOverride.score}%.</small>`
                  : ''}

                <div class="assignment-controls">
                  <label>
                    <span>Assignment picker</span>
                    <select id="assignment-select-${sanitize(selectedReport.id)}" data-report-id="${sanitize(selectedReport.id)}">
                      ${assignmentOptionsMarkup}
                    </select>
                  </label>
                  <div class="assignment-actions">
                    <button type="button" data-assign-from-select="${sanitize(selectedReport.id)}">Assign selected volunteer</button>
                    <button type="button" class="ghost-button danger" data-unassign-report="${sanitize(selectedReport.id)}" ${selectedReport.assignedVolunteerId ? '' : 'disabled'}>Unassign</button>
                  </div>
                </div>

                <div class="mini-breakdown-grid">
                  ${selectedFitMarkup}
                </div>

                <div class="volunteer-list quick-assign-list">
                  ${volunteers
                    .map(
                      (volunteer) => `
                        <article class="volunteer-card">
                          <div>
                            <strong>${sanitize(volunteer.name)}</strong>
                            <span>${sanitize(volunteer.location)}</span>
                          </div>
                          <p>${sanitize(volunteer.skills.join(' | '))}</p>
                          <small>Available ${sanitize(volunteer.availability)}</small>
                          <button type="button" data-assign-report="${sanitize(selectedReport.id)}" data-volunteer-id="${sanitize(volunteer.id)}" ${selectedReport.assignedVolunteerId === volunteer.id ? 'disabled' : ''}>${selectedReport.assignedVolunteerId === volunteer.id ? 'Assigned' : 'Assign'}</button>
                        </article>
                      `,
                    )
                    .join('')}
                </div>
              `
              : '<div class="empty-state">No case selected. Choose a report to begin manual review.</div>'}
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
              <span>Quick starters</span>
              <p>Use a sample report to prefill the form and review triage behavior quickly.</p>
            </div>
            <div class="shortcut-actions">
              <button type="button" class="demo-preset" data-demo-key="water">Use water response sample</button>
              <button type="button" class="demo-preset" data-demo-key="flood">Use flood response sample</button>
              <button type="button" class="demo-preset" data-demo-key="medical">Use medical camp sample</button>
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

            <label class="csv-input">
              <span>Batch CSV import</span>
              <input id="csv-upload" type="file" accept=".csv,text/csv" />
              <small>Columns supported: incident, location, support, source. Batch imports use fast local normalization.</small>
            </label>

            <div class="form-actions">
              <button type="submit" id="analyze-button" ${state.analysisStatus.state === 'loading' ? 'disabled' : ''} aria-busy="${state.analysisStatus.state === 'loading' ? 'true' : 'false'}">${sanitize(analyzeButtonText)}</button>
              <small>Reports are sent to the backend for Gemini analysis when configured, with rule-based fallback if the API is unavailable. Potential duplicates are flagged instead of hard-blocked.</small>
            </div>
          </form>

          ${statusMarkup}

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
              <div>
                <strong>Provider</strong>
                <p>${latest ? sanitize(latest.provider || 'Rule-based fallback') : 'Waiting for input'}</p>
              </div>
              <div>
                <strong>Affected group</strong>
                <p>${latest ? sanitize(latest.affectedGroup || 'Community members') : 'Waiting for input'}</p>
              </div>
            </div>
          </div>

          <div class="extraction-trace">
            <div class="panel-header">
              <div>
                <span>Extraction trace</span>
                <h3>What the active analysis path used</h3>
              </div>
            </div>

            <div class="trace-list">
              ${(latest?.extractionFields || [
                { label: 'Issue type', value: 'Waiting for input' },
                { label: 'Location', value: 'Waiting for input' },
                { label: 'Urgency', value: 'Waiting for input' },
                { label: 'Confidence', value: 'Waiting for input' },
                { label: 'Affected group', value: 'Waiting for input' },
                { label: 'Expected support', value: 'Waiting for input' },
                { label: 'Source', value: 'Waiting for input' },
                { label: 'Analysis provider', value: 'Waiting for input' },
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

          <div class="score-breakdown">
            <div class="panel-header">
              <div>
                <span>Priority model</span>
                <h3>How the score was built</h3>
              </div>
            </div>

            <div class="breakdown-grid">
              ${scoreBreakdownMarkup}
            </div>
          </div>
        </section>

        <section class="panel" id="insights">
          <div class="panel-header">
            <div>
              <span>Operational insights</span>
              <h3>How this platform drives action</h3>
            </div>
          </div>

          <div class="insight-grid">
            <div>
              <strong>Problem framing</strong>
              <p>NGOs receive scattered reports and need a fast way to structure, rank, and act on them.</p>
            </div>
            <div>
              <strong>Current capabilities</strong>
              <p>The platform includes Gemini-backed analysis, low-confidence flags, manual overrides, one-click assignment actions, and explicit fallback when the API is unavailable.</p>
            </div>
            <div>
              <strong>Trust layer</strong>
              <p>The dashboard exposes confidence, rationale, review flags, and assignment reasoning so triage decisions remain explainable.</p>
            </div>
            <div>
              <strong>Delivery focus</strong>
              <p>An audit trail captures analyze, duplicate flag, override, and assignment events to maintain human-in-the-loop governance.</p>
            </div>
          </div>
        </section>

        <section class="panel" id="audit">
          <div class="panel-header">
            <div>
              <span>Audit trail</span>
              <h3>Decision log for review and assignment actions</h3>
            </div>
          </div>

          <div class="audit-list" role="log" aria-live="polite">
            ${auditTrailMarkup}
          </div>
        </section>
      </main>
    </div>
  `

  persistOperationalState()
 
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

  document.querySelectorAll('.select-case').forEach((button) => {
    button.addEventListener('click', handleCaseSelection)
  })

  document.getElementById('override-form')?.addEventListener('submit', handlePriorityOverride)

  document.querySelectorAll('[data-assign-report]').forEach((button) => {
    button.addEventListener('click', handleAssignVolunteer)
  })

  document.querySelectorAll('[data-assign-from-select]').forEach((button) => {
    button.addEventListener('click', handleAssignFromPicker)
  })

  document.querySelectorAll('[data-unassign-report]').forEach((button) => {
    button.addEventListener('click', handleUnassignVolunteer)
  })

  document.getElementById('csv-upload')?.addEventListener('change', handleCsvImport)
}

function updateReport(reportId, updater) {
  let updatedReport = null

  state.reports = state.reports.map((report) => {
    if (report.id !== reportId) {
      return report
    }

    updatedReport = enrichReportForWorkflow(updater(report))
    return updatedReport
  })

  if (!updatedReport) {
    return null
  }

  if (state.lastAnalysis?.id === reportId) {
    state.lastAnalysis = updatedReport
  }

  state.selectedReportId = reportId
  return updatedReport
}

function assignVolunteerToReport(reportId, volunteerId, sourceLabel, requestId = createClientRequestId('assign')) {
  const volunteer = findVolunteerById(volunteerId)

  if (!volunteer) {
    state.analysisStatus = {
      state: 'error',
      message: 'Select a valid volunteer before assigning.',
    }
    render()
    return
  }

  const updatedReport = updateReport(reportId, (report) => {
    const fit = calculateVolunteerFit(getTemplateContextFromReport(report), volunteer)

    return {
      ...report,
      assignedVolunteerId: volunteer.id,
      match: {
        ...volunteer,
        score: fit.score,
        reason: fit.summary,
      },
    }
  })

  if (!updatedReport) {
    return
  }

  state.analysisStatus = {
    state: 'success',
    message: `${volunteer.name} assigned to ${reportId}.`,
  }

  logAuditEvent('assign', reportId, `Assigned ${volunteer.name} to ${reportId} via ${sourceLabel}.`, {
    requestId,
    action: 'assign',
    volunteerId: volunteer.id,
    sourceLabel,
  })
  render()
}

function handleCaseSelection(event) {
  const reportId = event.currentTarget.getAttribute('data-report-id')

  if (!reportId) {
    return
  }

  state.selectedReportId = reportId
  render()
}

function handlePriorityOverride(event) {
  event.preventDefault()
  const requestId = createClientRequestId('override')

  const reportId = event.currentTarget.getAttribute('data-report-id')
  if (!reportId) {
    return
  }

  const formData = new FormData(event.currentTarget)
  const urgency = normalizeUrgency(formData.get('overrideUrgency'))
  const score = clampNumber(formData.get('overrideScore'), 0, 99, 70)

  const updatedReport = updateReport(reportId, (report) => {
    const previousUrgency = report.urgency
    const previousScore = report.score
    const extractionFields = [
      ...(report.extractionFields || []).filter((field) => field.label !== 'Manual override'),
      {
        label: 'Manual override',
        value: `${urgency} urgency and ${score}% priority`,
      },
    ]

    return {
      ...report,
      urgency,
      score,
      manualOverride: {
        previousUrgency,
        previousScore,
        urgency,
        score,
        timestamp: new Date().toISOString(),
      },
      extractionFields,
    }
  })

  if (!updatedReport) {
    return
  }

  state.analysisStatus = {
    state: 'success',
    message: `Manual override applied to ${reportId}.`,
  }

  logAuditEvent(
    'override',
    reportId,
    `Priority updated from ${updatedReport.manualOverride.previousUrgency}/${updatedReport.manualOverride.previousScore}% to ${urgency}/${score}%.`,
    {
      requestId,
      action: 'override',
      previousUrgency: updatedReport.manualOverride.previousUrgency,
      previousScore: updatedReport.manualOverride.previousScore,
      nextUrgency: urgency,
      nextScore: score,
    },
  )

  render()
}

function handleAssignVolunteer(event) {
  const requestId = createClientRequestId('assign')
  const reportId = event.currentTarget.getAttribute('data-assign-report')
  const volunteerId = event.currentTarget.getAttribute('data-volunteer-id')

  if (!reportId || !volunteerId) {
    return
  }

  assignVolunteerToReport(reportId, volunteerId, 'quick action', requestId)
}

function handleAssignFromPicker(event) {
  const requestId = createClientRequestId('assign')
  const reportId = event.currentTarget.getAttribute('data-assign-from-select')

  if (!reportId) {
    return
  }

  const picker = document.getElementById(`assignment-select-${reportId}`)
  const volunteerId = picker?.value || ''
  assignVolunteerToReport(reportId, volunteerId, 'assignment picker', requestId)
}

function handleUnassignVolunteer(event) {
  const requestId = createClientRequestId('unassign')
  const reportId = event.currentTarget.getAttribute('data-unassign-report')

  if (!reportId) {
    return
  }

  const updatedReport = updateReport(reportId, (report) => ({
    ...report,
    assignedVolunteerId: '',
  }))

  if (!updatedReport) {
    return
  }

  state.analysisStatus = {
    state: 'fallback',
    message: `Volunteer unassigned from ${reportId}.`,
  }

  logAuditEvent('assign', reportId, `Removed volunteer assignment from ${reportId}.`, {
    requestId,
    action: 'unassign',
  })
  render()
}

async function handleCsvImport(event) {
  const requestId = createClientRequestId('csv')
  const file = event.target.files?.[0]

  if (!file) {
    return
  }

  try {
    const csvText = await file.text()
    const rows = parseCsvText(csvText)

    if (!rows.length) {
      state.analysisStatus = {
        state: 'error',
        message: 'CSV import needs a header row plus at least one data row.',
      }
      render()
      return
    }

    let importedCount = 0
    let duplicateFlagCount = 0

    const importedReports = rows
      .map((row) => {
        const incident = row.incident || row.report || row.text || row.description || ''
        if (!incident.trim()) {
          return null
        }

        let report = enrichReportForWorkflow(buildImportedReport(row))
        const duplicateMatch = findDuplicateMatch(report)

        if (duplicateMatch) {
          report = enrichReportForWorkflow({
            ...report,
            duplicateOf: duplicateMatch.report.id,
            reason: `${report.reason} A similar case (${duplicateMatch.report.id}) is already in the queue, so this row was marked for review instead of being blocked.`,
            extractionFields: buildExtractionFields({
              text: report.rawText,
              location: report.location,
              urgency: report.urgency,
              confidence: report.confidence,
              issueType: report.issueType,
              support: report.need,
              source: report.source,
              affectedGroup: report.affectedGroup,
              provider: report.provider,
              duplicateOf: duplicateMatch.report.id,
            }),
          })

          duplicateFlagCount += 1
          logAuditEvent('duplicate-flag', report.id, `CSV intake flagged ${report.id} as a potential duplicate of ${duplicateMatch.report.id}.`, {
            requestId,
            action: 'csv-duplicate-flag',
            matchedReportId: duplicateMatch.report.id,
          })
        }

        logAuditEvent('analyze', report.id, `CSV intake analyzed ${report.id} with ${report.confidence}% confidence.`, {
          requestId,
          action: 'csv-analyze',
          provider: report.provider,
          confidence: report.confidence,
        })
        importedCount += 1
        return report
      })
      .filter(Boolean)

    if (!importedReports.length) {
      state.analysisStatus = {
        state: 'error',
        message: 'No usable incident rows were found in the CSV file.',
      }
      render()
      return
    }

    state.reports = [...importedReports.reverse(), ...state.reports]
    state.lastAnalysis = importedReports[importedReports.length - 1]
    state.selectedReportId = state.lastAnalysis.id
    state.analysisStatus = {
      state: 'success',
      message: `Imported ${importedCount} CSV report${importedCount === 1 ? '' : 's'}${duplicateFlagCount ? `, with ${duplicateFlagCount} flagged for duplicate review` : ''}.`,
    }
    render()
  } catch (error) {
    state.analysisStatus = {
      state: 'error',
      message: `CSV import failed: ${error.message}`,
    }
    render()
  } finally {
    event.target.value = ''
  }
}

async function handleSubmit(event) {
  event.preventDefault()
  const requestId = createClientRequestId('analyze')

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
      provider: 'Waiting for input',
      affectedGroup: 'Waiting for input',
      extractionFields: buildExtractionFields({
        text: '',
        location: 'Waiting for input',
        urgency: 'Waiting for input',
        confidence: 0,
        issueType: 'Waiting for input',
        support: 'Waiting for input',
        source: 'Waiting for input',
        affectedGroup: 'Waiting for input',
        provider: 'Waiting for input',
      }),
      match: { name: 'Waiting', score: 0 },
    }
    state.analysisStatus = {
      state: 'error',
      message: 'Enter a report before running analysis.',
    }
    render()
    return
  }

  state.analysisStatus = {
    state: 'loading',
    message: state.backend.geminiConfigured
      ? 'Analyzing report with Gemini...'
      : 'Trying backend analysis, then falling back locally if needed...',
  }
  render()

  let newReport
  let providerRequestId = requestId
  let providerAttempts = 1
  let providerLatencyMs = 0
  let providerCode = ''
  let fallbackReason = ''
  let fallbackUsed = false

  try {
    const response = await fetch('/api/analyze-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-request-id': requestId,
      },
      body: JSON.stringify({
        incident,
        locationHint: location,
        supportHint: support,
        source,
      }),
    })

    providerRequestId = response.headers.get('x-request-id') || providerRequestId
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const providerError = new Error(payload.error || 'Backend analysis failed.')
      providerError.code = payload.code || 'BACKEND_ERROR'
      providerError.retryable = Boolean(payload.retryable)
      providerError.fallbackReason = payload.fallbackReason || 'backend_error'
      providerError.requestId = payload.requestId || providerRequestId
      providerError.attempts = payload.attempts || 1
      providerError.latencyMs = payload.latencyMs || 0
      throw providerError
    }

    providerRequestId = payload.requestId || providerRequestId
    providerAttempts = payload.attempts || 1
    providerLatencyMs = payload.latencyMs || 0

    newReport = buildReportFromBackend({
      incident,
      location,
      support,
      source,
      analysis: payload.analysis || {},
      model: payload.model,
    })

    state.backend.available = true
    state.backend.geminiConfigured = true
    state.backend.model = payload.model || state.backend.model || 'gemini-2.5-flash'
    state.analysisStatus = {
      state: 'success',
      message: `Gemini analysis completed using ${payload.model || 'the configured model'}${providerAttempts > 1 ? ` after ${providerAttempts} attempts` : ''}.`,
    }
  } catch (error) {
    fallbackUsed = true
    providerCode = error.code || 'BACKEND_ERROR'
    fallbackReason = error.fallbackReason || 'backend_error'
    providerRequestId = error.requestId || providerRequestId
    providerAttempts = error.attempts || providerAttempts
    providerLatencyMs = error.latencyMs || providerLatencyMs

    const extracted = extractFromText(incident, location, support, source)
    newReport = {
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
      provider: extracted.provider,
      affectedGroup: extracted.affectedGroup,
      duplicateOf: extracted.duplicateOf,
      scoreBreakdown: extracted.scoreBreakdown,
      match: extracted.match,
      extractionFields: extracted.extractionFields,
    }

    state.analysisStatus = {
      state: 'fallback',
      message: `${error.message}${providerCode ? ` [${providerCode}]` : ''} Using the local fallback analysis path for this run.`,
    }
  }

  const duplicateMatch = findDuplicateMatch(newReport)
  if (duplicateMatch) {
    newReport.duplicateOf = duplicateMatch.report.id
    newReport.reason = `${newReport.reason} A similar case (${duplicateMatch.report.id}) is already in the queue, so this report was added with a review flag instead of being blocked.`
    newReport.extractionFields = buildExtractionFields({
      text: newReport.rawText,
      location: newReport.location,
      urgency: newReport.urgency,
      confidence: newReport.confidence,
      issueType: newReport.issueType,
      support: newReport.need,
      source: newReport.source,
      affectedGroup: newReport.affectedGroup,
      provider: newReport.provider,
      duplicateOf: newReport.duplicateOf,
    })
    state.analysisStatus = {
      state: 'fallback',
      message: `Potential duplicate with ${duplicateMatch.report.id}. The report was still added for manual review.`,
    }

    logAuditEvent('duplicate-flag', newReport.id, `New report ${newReport.id} was flagged as a potential duplicate of ${duplicateMatch.report.id}.`, {
      requestId: providerRequestId,
      action: 'duplicate-flag',
      matchedReportId: duplicateMatch.report.id,
      providerCode,
      fallbackReason,
    })
  }

  newReport = enrichReportForWorkflow(newReport)

  state.reports = [newReport, ...state.reports]
  state.lastAnalysis = newReport
  state.selectedReportId = newReport.id

  logAuditEvent('analyze', newReport.id, `${newReport.provider} analyzed ${newReport.id} with ${newReport.confidence}% confidence.`, {
    requestId: providerRequestId,
    action: 'analyze',
    provider: newReport.provider,
    confidence: newReport.confidence,
    attempts: providerAttempts,
    latencyMs: providerLatencyMs,
    fallbackUsed,
    providerCode,
    fallbackReason,
  })

  render()
  event.currentTarget.reset()
}

async function syncBackendStatus() {
  try {
    const response = await fetch('/api/health')

    if (!response.ok) {
      throw new Error('Backend health check failed.')
    }

    const payload = await response.json()
    state.backend.available = true
    state.backend.geminiConfigured = Boolean(payload.geminiConfigured)
    state.backend.model = payload.model || null
  } catch (error) {
    state.backend.available = false
    state.backend.geminiConfigured = false
    state.backend.model = null
  }

  render()
}

render()
syncBackendStatus()
