const fs = require('node:fs')
const path = require('node:path')

const ROOT_DIR = path.resolve(__dirname, '..')
const DATASET_PATH = path.join(__dirname, 'gold-dataset.json')
const OUTPUT_PATH = path.join(__dirname, 'latest-metrics.json')

loadEnvFiles(ROOT_DIR)

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_MAX_RETRIES = clampInteger(process.env.GEMINI_MAX_RETRIES, 0, 4, 2)
const GEMINI_RETRY_BASE_MS = clampInteger(process.env.GEMINI_RETRY_BASE_MS, 100, 5000, 350)
const RETRYABLE_PROVIDER_STATUS = new Set([429, 503, 504])

const OFFLINE_MODE = process.argv.includes('--offline')

const locationAliases = ['south district', 'central ward', 'riverside zone', 'north point', 'east market', 'west end']

const issueCatalog = {
  'Water shortage': ['water', 'thirst', 'pump', 'borewell', 'sanitation', 'potable'],
  'Flood relief': ['flood', 'relocation', 'displaced', 'blanket', 'evacuated', 'rain'],
  'Medical support': ['medical', 'medicine', 'health', 'patient', 'camp', 'dengue'],
  'Food support': ['food', 'meal', 'ration', 'nutrition', 'hunger', 'distribution'],
  'Education support': ['school', 'class', 'tutor', 'learning', 'children'],
  'General support': ['volunteer', 'queue', 'coordination', 'registration', 'support'],
}

const urgencyRules = [
  { issueType: 'Water shortage', urgency: 'Critical' },
  { issueType: 'Flood relief', urgency: 'High' },
  { issueType: 'Medical support', urgency: 'High' },
  { issueType: 'Food support', urgency: 'High' },
  { issueType: 'Education support', urgency: 'Medium' },
  { issueType: 'General support', urgency: 'Medium' },
]

main().catch((error) => {
  console.error('Evaluation failed:', error.message)
  process.exitCode = 1
})

async function main() {
  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf8'))
  const cases = Array.isArray(dataset.cases) ? dataset.cases : []

  if (!cases.length) {
    throw new Error('No evaluation cases were found in evaluation/gold-dataset.json.')
  }

  const effectiveOffline = OFFLINE_MODE || !GEMINI_API_KEY
  const evaluatedCases = []

  for (const item of cases) {
    const result = await evaluateCase(item, { offline: effectiveOffline })
    evaluatedCases.push(result)
  }

  const metrics = summarizeMetrics(evaluatedCases)
  const report = {
    generatedAt: new Date().toISOString(),
    datasetVersion: dataset.version || 'unknown',
    offline: effectiveOffline,
    model: effectiveOffline ? 'fallback-local' : GEMINI_MODEL,
    metrics,
    cases: evaluatedCases,
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  printMetricsTable(report)
  console.log(`\nSaved detailed evaluation output to ${path.relative(ROOT_DIR, OUTPUT_PATH)}`)
}

async function evaluateCase(item, { offline }) {
  const startedAt = Date.now()
  const expected = normalizePrediction(item.expected || {})

  let prediction
  let provider = 'fallback-local'
  let fallbackUsed = true
  let fallbackReason = offline ? (OFFLINE_MODE ? 'offline_mode' : 'gemini_not_configured') : ''
  let attempts = 0

  if (!offline) {
    try {
      const result = await analyzeWithGeminiWithRetry(item)
      prediction = normalizePrediction(result.analysis)
      provider = 'gemini'
      fallbackUsed = false
      fallbackReason = ''
      attempts = result.attempts
    } catch (error) {
      prediction = normalizePrediction(buildFallbackPrediction(item))
      provider = 'fallback-local'
      fallbackUsed = true
      fallbackReason = error.code || 'provider_error'
      attempts = error.attempts || 1
    }
  }

  if (!prediction) {
    prediction = normalizePrediction(buildFallbackPrediction(item))
    attempts = Math.max(attempts, 1)
  }

  const latencyMs = Date.now() - startedAt
  const comparison = comparePrediction(prediction, expected)

  return {
    id: item.id,
    provider,
    fallbackUsed,
    fallbackReason,
    attempts,
    latencyMs,
    prediction,
    expected,
    comparison,
  }
}

function comparePrediction(prediction, expected) {
  const issueTypeMatch = canonicalIssueType(prediction.issueType) === canonicalIssueType(expected.issueType)
  const urgencyMatch = canonicalUrgency(prediction.urgency) === canonicalUrgency(expected.urgency)
  const locationMatch = canonicalLocation(prediction.location) === canonicalLocation(expected.location)

  const score = Number(((Number(issueTypeMatch) + Number(urgencyMatch) + Number(locationMatch)) / 3).toFixed(2))

  return {
    issueTypeMatch,
    urgencyMatch,
    locationMatch,
    score,
  }
}

function summarizeMetrics(evaluatedCases) {
  const total = evaluatedCases.length
  const fallbackCount = evaluatedCases.filter((item) => item.fallbackUsed).length
  const geminiCount = total - fallbackCount
  const issueTypeMatches = evaluatedCases.filter((item) => item.comparison.issueTypeMatch).length
  const urgencyMatches = evaluatedCases.filter((item) => item.comparison.urgencyMatch).length
  const locationMatches = evaluatedCases.filter((item) => item.comparison.locationMatch).length
  const averageScore = evaluatedCases.reduce((sum, item) => sum + item.comparison.score, 0) / Math.max(total, 1)
  const latencies = evaluatedCases.map((item) => item.latencyMs).sort((left, right) => left - right)
  const averageLatencyMs = Math.round(latencies.reduce((sum, value) => sum + value, 0) / Math.max(latencies.length, 1))
  const p95LatencyMs = latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] || 0

  return {
    totalCases: total,
    geminiCases: geminiCount,
    fallbackCases: fallbackCount,
    fallbackRatePct: roundPercent((fallbackCount / Math.max(total, 1)) * 100),
    issueTypeAccuracyPct: roundPercent((issueTypeMatches / Math.max(total, 1)) * 100),
    urgencyAccuracyPct: roundPercent((urgencyMatches / Math.max(total, 1)) * 100),
    locationAccuracyPct: roundPercent((locationMatches / Math.max(total, 1)) * 100),
    averageExtractionScorePct: roundPercent(averageScore * 100),
    averageLatencyMs,
    p95LatencyMs,
  }
}

function roundPercent(value) {
  return Number(value.toFixed(1))
}

function printMetricsTable(report) {
  const metrics = report.metrics
  const modeLabel = report.offline ? 'fallback-only' : 'gemini-with-fallback'

  console.log('\nCommunityTriage Evaluation Summary')
  console.log(`Mode: ${modeLabel}`)
  console.log(`Model: ${report.model}`)
  console.log('| Metric | Value |')
  console.log('| --- | --- |')
  console.log(`| Total cases | ${metrics.totalCases} |`)
  console.log(`| Gemini cases | ${metrics.geminiCases} |`)
  console.log(`| Fallback cases | ${metrics.fallbackCases} |`)
  console.log(`| Fallback rate | ${metrics.fallbackRatePct}% |`)
  console.log(`| Issue type accuracy | ${metrics.issueTypeAccuracyPct}% |`)
  console.log(`| Urgency accuracy | ${metrics.urgencyAccuracyPct}% |`)
  console.log(`| Location accuracy | ${metrics.locationAccuracyPct}% |`)
  console.log(`| Average extraction score | ${metrics.averageExtractionScorePct}% |`)
  console.log(`| Average latency | ${metrics.averageLatencyMs} ms |`)
  console.log(`| P95 latency | ${metrics.p95LatencyMs} ms |`)
}

function buildFallbackPrediction(item) {
  const text = String(item.incident || '').toLowerCase()
  const hint = String(item.locationHint || '').toLowerCase()
  const location = normalizeLocation(hint || text)
  const issueType = detectIssueType(text)
  const urgency = detectUrgency(issueType)

  return {
    issueType,
    location,
    urgency,
  }
}

function detectIssueType(text) {
  const scored = Object.entries(issueCatalog)
    .map(([issueType, terms]) => ({
      issueType,
      score: terms.reduce((sum, term) => (text.includes(term) ? sum + 1 : sum), 0),
    }))
    .sort((left, right) => right.score - left.score)

  if (!scored.length || scored[0].score === 0) {
    return 'General support'
  }

  return scored[0].issueType
}

function detectUrgency(issueType) {
  const matched = urgencyRules.find((rule) => rule.issueType === issueType)
  return matched ? matched.urgency : 'Medium'
}

function normalizePrediction(value) {
  return {
    issueType: canonicalIssueType(value.issueType || value.issue || ''),
    location: normalizeLocation(value.location || ''),
    urgency: canonicalUrgency(value.urgency || ''),
  }
}

function canonicalIssueType(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized.includes('water')) {
    return 'Water shortage'
  }

  if (normalized.includes('flood')) {
    return 'Flood relief'
  }

  if (normalized.includes('medical') || normalized.includes('health') || normalized.includes('medicine')) {
    return 'Medical support'
  }

  if (normalized.includes('food') || normalized.includes('ration') || normalized.includes('meal')) {
    return 'Food support'
  }

  if (normalized.includes('education') || normalized.includes('school') || normalized.includes('learning')) {
    return 'Education support'
  }

  return 'General support'
}

function canonicalUrgency(value) {
  const normalized = String(value || '').trim().toLowerCase()

  if (normalized === 'critical') {
    return 'Critical'
  }

  if (normalized === 'high') {
    return 'High'
  }

  return 'Medium'
}

function normalizeLocation(value) {
  const normalized = String(value || '').trim().toLowerCase()
  const foundAlias = locationAliases.find((alias) => normalized.includes(alias))
  return toTitleCase(foundAlias || normalized || 'Community Zone')
}

function canonicalLocation(value) {
  return normalizeLocation(value).toLowerCase()
}

function toTitleCase(value) {
  return String(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

async function analyzeWithGeminiWithRetry(item) {
  const incident = String(item.incident || '').trim()
  const locationHint = String(item.locationHint || '').trim()
  const supportHint = String(item.supportHint || '').trim()
  const source = String(item.source || '').trim()

  let attempts = 0
  let lastError = null

  while (attempts <= GEMINI_MAX_RETRIES) {
    attempts += 1

    try {
      const analysis = await analyzeWithGeminiOnce({ incident, locationHint, supportHint, source })
      return { analysis, attempts }
    } catch (error) {
      lastError = error

      if (!error.retryable || attempts > GEMINI_MAX_RETRIES) {
        error.attempts = attempts
        throw error
      }

      const backoffMs = Math.min(4000, GEMINI_RETRY_BASE_MS * 2 ** (attempts - 1))
      await delay(backoffMs)
    }
  }

  if (lastError) {
    throw lastError
  }

  throw createProviderError('Gemini evaluation failed unexpectedly.', {
    code: 'GEMINI_EVAL_UNKNOWN_ERROR',
    retryable: false,
  })
}

async function analyzeWithGeminiOnce({ incident, locationHint, supportHint, source }) {
  const prompt = [
    'You are extracting structured incident triage data for an NGO operations dashboard.',
    'Return a single JSON object only.',
    'Use concise strings.',
    'Confidence must be a number from 0 to 100.',
    'Urgency must be exactly one of: Critical, High, Medium.',
    '',
    `Incident report: ${incident}`,
    `Location hint: ${locationHint || 'Unknown'}`,
    `Support hint: ${supportHint || 'Unknown'}`,
    `Source: ${source || 'Unknown'}`,
    '',
    'Return JSON with these keys:',
    'issueType, location, affectedGroup, requiredResources, urgency, confidence, summary, justification',
    '',
    'requiredResources should be an array of short strings.',
  ].join('\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    },
  )

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const classification = classifyProviderFailure(response.status)
    const apiMessage = payload?.error?.message || payload?.error?.status || 'Gemini request failed.'

    throw createProviderError(apiMessage, classification)
  }

  const rawText = extractGeminiText(payload)
  const parsed = parseGeminiJson(rawText)

  return {
    issueType: String(parsed.issueType || 'General support').trim(),
    location: String(parsed.location || locationHint || 'Community Zone').trim(),
    urgency: String(parsed.urgency || 'Medium').trim(),
  }
}

function extractGeminiText(payload) {
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim()

  if (!text) {
    throw createProviderError('Gemini returned an empty response.', {
      code: 'GEMINI_EMPTY_RESPONSE',
      retryable: false,
    })
  }

  return text
}

function parseGeminiJson(rawText) {
  try {
    return JSON.parse(rawText)
  } catch (error) {
    const objectStart = rawText.indexOf('{')
    const objectEnd = rawText.lastIndexOf('}')

    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      return JSON.parse(rawText.slice(objectStart, objectEnd + 1))
    }

    throw createProviderError('Gemini did not return valid JSON.', {
      code: 'GEMINI_INVALID_JSON',
      retryable: false,
    })
  }
}

function classifyProviderFailure(statusCode) {
  if (RETRYABLE_PROVIDER_STATUS.has(statusCode)) {
    return {
      code: 'GEMINI_HIGH_DEMAND',
      retryable: true,
    }
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      code: 'GEMINI_AUTH_FAILED',
      retryable: false,
    }
  }

  if (statusCode === 404) {
    return {
      code: 'GEMINI_MODEL_NOT_FOUND',
      retryable: false,
    }
  }

  if (statusCode >= 500) {
    return {
      code: 'GEMINI_UPSTREAM_ERROR',
      retryable: true,
    }
  }

  return {
    code: 'GEMINI_REQUEST_FAILED',
    retryable: false,
  }
}

function createProviderError(message, { code = 'GEMINI_REQUEST_FAILED', retryable = false } = {}) {
  const error = new Error(message)
  error.code = code
  error.retryable = retryable
  return error
}

function delay(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  })
}

function clampInteger(value, min, max, fallback) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)))
}

function loadEnvFiles(rootDir) {
  const envFiles = ['.env.local', '.env']

  for (const fileName of envFiles) {
    const filePath = path.join(rootDir, fileName)
    if (!fs.existsSync(filePath)) {
      continue
    }

    const contents = fs.readFileSync(filePath, 'utf8')
    for (const line of contents.split(/\r?\n/)) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue
      }

      const separatorIndex = trimmedLine.indexOf('=')
      if (separatorIndex === -1) {
        continue
      }

      const key = trimmedLine.slice(0, separatorIndex).trim()
      const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')

      if (key && process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}
