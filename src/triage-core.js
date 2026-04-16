(function attachTriageCore(root, factory) {
  const api = factory()

  if (typeof module === 'object' && module.exports) {
    module.exports = api
  }

  if (root) {
    root.CommunityTriageCore = api
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildTriageCore() {
  const DEFAULT_LOCATION_ALIASES = [
    'south district',
    'central ward',
    'riverside zone',
    'north point',
    'east market',
    'west end',
  ]

  function titleCase(value) {
    return String(value)
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ')
  }

  function formatLocation(value, aliases = DEFAULT_LOCATION_ALIASES) {
    const normalized = String(value || '').trim().toLowerCase()
    const foundAlias = aliases.find((alias) => normalized.includes(alias))
    return foundAlias ? titleCase(foundAlias) : titleCase(normalized || 'Community Zone')
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

  function clampNumber(value, min, max, fallback) {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue)) {
      return fallback
    }

    return Math.min(max, Math.max(min, Math.round(numericValue)))
  }

  function normalizeRequiredResources(value, fallback) {
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

  function tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2)
  }

  function calculateDuplicateSignals(candidateReport, existingReport) {
    const candidateTokens = tokenize(`${candidateReport.title} ${candidateReport.summary} ${candidateReport.need} ${candidateReport.rawText}`)
    const existingTokens = tokenize(`${existingReport.title} ${existingReport.summary} ${existingReport.need} ${existingReport.rawText || ''}`)
    const sharedTokens = candidateTokens.filter((token) => existingTokens.includes(token))
    const overlapRatio = sharedTokens.length / Math.max(candidateTokens.length, 1)
    const sameLocation = candidateReport.location === existingReport.location
    const sameIssue = String(candidateReport.issueType || '').toLowerCase() === String(existingReport.issueType || '').toLowerCase()
    const sameSource = String(candidateReport.source || '').toLowerCase() === String(existingReport.source || '').toLowerCase()
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

  function getUrgencyScore(urgency) {
    if (urgency === 'Critical') {
      return 96
    }

    if (urgency === 'High') {
      return 82
    }

    return 68
  }

  function calculateHybridPriorityScore({ confidence, urgency, fallbackScore }) {
    return Math.min(
      99,
      Math.round(clampNumber(confidence, 0, 100, 70) * 0.4 + getUrgencyScore(normalizeUrgency(urgency)) * 0.35 + clampNumber(fallbackScore, 0, 99, 70) * 0.25),
    )
  }

  return {
    DEFAULT_LOCATION_ALIASES,
    titleCase,
    formatLocation,
    normalizeUrgency,
    clampNumber,
    normalizeRequiredResources,
    tokenize,
    calculateDuplicateSignals,
    getUrgencyScore,
    calculateHybridPriorityScore,
  }
})
