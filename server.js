const ROOT_DIR = __dirname
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { URL } = require('node:url')

loadEnvFiles()

const PORT = Number(process.env.PORT || 3000)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_MAX_RETRIES = clampInteger(process.env.GEMINI_MAX_RETRIES, 0, 4, 2)
const GEMINI_RETRY_BASE_MS = clampInteger(process.env.GEMINI_RETRY_BASE_MS, 100, 5000, 350)

const RETRYABLE_PROVIDER_STATUS = new Set([429, 503, 504])

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

const server = http.createServer(async (request, response) => {
  const requestId = createRequestId('req')
  const clientRequestId = String(request.headers['x-client-request-id'] || '').trim()

  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`)

    if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
      return sendJson(response, 200, {
        ok: true,
        backend: 'node',
        geminiConfigured: Boolean(GEMINI_API_KEY),
        model: GEMINI_MODEL,
        requestId,
        clientRequestId,
      }, requestId)
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/analyze-report') {
      const body = await readJsonBody(request)
      const incident = String(body.incident || '').trim()

      if (!incident) {
        return sendJson(response, 400, {
          error: 'Incident text is required.',
          code: 'INVALID_INCIDENT',
          retryable: false,
          fallbackReason: 'invalid_incident',
          requestId,
          clientRequestId,
        }, requestId)
      }

      if (!GEMINI_API_KEY) {
        return sendJson(response, 503, {
          error: 'Gemini is not configured on the backend.',
          code: 'GEMINI_NOT_CONFIGURED',
          retryable: false,
          fallbackReason: 'gemini_not_configured',
          requestId,
          clientRequestId,
        }, requestId)
      }

      const startedAt = Date.now()
      const result = await analyzeWithGeminiWithRetry({
        incident,
        locationHint: String(body.locationHint || '').trim(),
        supportHint: String(body.supportHint || '').trim(),
        source: String(body.source || '').trim(),
      })

      return sendJson(response, 200, {
        provider: 'Gemini',
        model: GEMINI_MODEL,
        attempts: result.attempts,
        latencyMs: Date.now() - startedAt,
        requestId,
        clientRequestId,
        analysis: result.analysis,
      }, requestId)
    }

    if (request.method === 'GET') {
      return serveStaticFile(requestUrl.pathname, response, requestId)
    }

    sendJson(response, 405, {
      error: 'Method not allowed.',
      code: 'METHOD_NOT_ALLOWED',
      retryable: false,
      fallbackReason: 'method_not_allowed',
      requestId,
      clientRequestId,
    }, requestId)
  } catch (error) {
    const statusCode = error.statusCode || 500
    sendJson(response, statusCode, {
      error: error.message || 'Unexpected server error.',
      code: error.code || 'BACKEND_ERROR',
      retryable: Boolean(error.retryable),
      fallbackReason: error.fallbackReason || 'backend_error',
      attempts: error.attempts,
      latencyMs: error.latencyMs,
      requestId,
      clientRequestId,
    }, requestId)
  }
})

server.listen(PORT, () => {
  console.log(`CommunityTriage server running on http://localhost:${PORT}`)
})

function loadEnvFiles() {
  const envFiles = ['.env.local', '.env']

  for (const fileName of envFiles) {
    const filePath = path.join(ROOT_DIR, fileName)
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

async function analyzeWithGeminiWithRetry({ incident, locationHint, supportHint, source }) {
  const startedAt = Date.now()
  let attempts = 0
  let lastError = null

  while (attempts <= GEMINI_MAX_RETRIES) {
    attempts += 1

    try {
      const analysis = await analyzeWithGeminiOnce({ incident, locationHint, supportHint, source })

      return {
        analysis,
        attempts,
        latencyMs: Date.now() - startedAt,
      }
    } catch (error) {
      lastError = error

      if (!error.retryable || attempts > GEMINI_MAX_RETRIES) {
        error.attempts = attempts
        error.latencyMs = Date.now() - startedAt
        throw error
      }

      const backoffMs = Math.min(4000, GEMINI_RETRY_BASE_MS * 2 ** (attempts - 1))
      await delay(backoffMs)
    }
  }

  if (lastError) {
    throw lastError
  }

  throw createProviderError('Gemini analysis failed unexpectedly.', {
    statusCode: 502,
    code: 'GEMINI_UNKNOWN_ERROR',
    retryable: false,
    fallbackReason: 'gemini_unknown_error',
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
    const apiMessage =
      payload?.error?.message ||
      payload?.error?.status ||
      'Gemini request failed.'
    const classification = classifyProviderFailure(response.status)

    throw createProviderError(apiMessage, {
      statusCode: response.status,
      code: classification.code,
      retryable: classification.retryable,
      fallbackReason: classification.fallbackReason,
    })
  }

  const rawText = extractGeminiText(payload)
  const parsed = parseGeminiJson(rawText)

  return normalizeGeminiAnalysis(parsed, { incident, locationHint, supportHint, source })
}

function extractGeminiText(payload) {
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim()

  if (!text) {
    throw createProviderError('Gemini returned an empty response.', {
      statusCode: 502,
      code: 'GEMINI_EMPTY_RESPONSE',
      retryable: false,
      fallbackReason: 'gemini_empty_response',
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
      statusCode: 502,
      code: 'GEMINI_INVALID_JSON',
      retryable: false,
      fallbackReason: 'gemini_invalid_json',
    })
  }
}

function normalizeGeminiAnalysis(analysis, fallback) {
  const urgency = normalizeUrgency(analysis.urgency)
  const confidence = clampNumber(analysis.confidence, 0, 100, 78)
  const requiredResources = Array.isArray(analysis.requiredResources)
    ? analysis.requiredResources.map((value) => String(value).trim()).filter(Boolean)
    : String(analysis.requiredResources || fallback.supportHint || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

  return {
    issueType: String(analysis.issueType || 'General support').trim(),
    location: String(analysis.location || fallback.locationHint || 'Community Zone').trim(),
    affectedGroup: String(analysis.affectedGroup || 'Community members').trim(),
    requiredResources,
    urgency,
    confidence,
    summary: String(analysis.summary || fallback.incident).trim(),
    justification: String(analysis.justification || 'Gemini provided a structured triage interpretation.').trim(),
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

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)))
}

function clampInteger(value, min, max, fallback) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)))
}

async function readJsonBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')
  if (!rawBody) {
    return {}
  }

  try {
    return JSON.parse(rawBody)
  } catch (error) {
    throw createProviderError('Invalid JSON body.', {
      statusCode: 400,
      code: 'INVALID_JSON_BODY',
      retryable: false,
      fallbackReason: 'invalid_json_body',
    })
  }
}

function serveStaticFile(requestPath, response, requestId) {
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(ROOT_DIR, safePath)

  if (!filePath.startsWith(ROOT_DIR)) {
    return sendJson(response, 403, {
      error: 'Forbidden.',
      code: 'FORBIDDEN_PATH',
      retryable: false,
      fallbackReason: 'forbidden_path',
      requestId,
    }, requestId)
  }

  fs.readFile(filePath, (error, fileBuffer) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendJson(response, 404, {
          error: 'Not found.',
          code: 'STATIC_NOT_FOUND',
          retryable: false,
          fallbackReason: 'static_not_found',
          requestId,
        }, requestId)
        return
      }

      sendJson(response, 500, {
        error: 'Failed to read static file.',
        code: 'STATIC_READ_FAILED',
        retryable: false,
        fallbackReason: 'static_read_failed',
        requestId,
      }, requestId)
      return
    }

    const extension = path.extname(filePath).toLowerCase()
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      ...(requestId ? { 'x-request-id': requestId } : {}),
    })
    response.end(fileBuffer)
  })
}

function sendJson(response, statusCode, payload, requestId = '') {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...(requestId ? { 'x-request-id': requestId } : {}),
  })
  response.end(JSON.stringify(payload))
}

function delay(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs)
  })
}

function createRequestId(prefix = 'req') {
  if (typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function createProviderError(message, {
  statusCode = 500,
  code = 'BACKEND_ERROR',
  retryable = false,
  fallbackReason = 'backend_error',
} = {}) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  error.retryable = retryable
  error.fallbackReason = fallbackReason
  return error
}

function classifyProviderFailure(statusCode) {
  if (statusCode === 400) {
    return {
      code: 'GEMINI_BAD_REQUEST',
      retryable: false,
      fallbackReason: 'gemini_bad_request',
    }
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      code: 'GEMINI_AUTH_FAILED',
      retryable: false,
      fallbackReason: 'gemini_auth_failed',
    }
  }

  if (statusCode === 404) {
    return {
      code: 'GEMINI_MODEL_NOT_FOUND',
      retryable: false,
      fallbackReason: 'gemini_model_not_found',
    }
  }

  if (RETRYABLE_PROVIDER_STATUS.has(statusCode)) {
    return {
      code: 'GEMINI_HIGH_DEMAND',
      retryable: true,
      fallbackReason: 'gemini_high_demand',
    }
  }

  if (statusCode >= 500) {
    return {
      code: 'GEMINI_UPSTREAM_ERROR',
      retryable: true,
      fallbackReason: 'gemini_upstream_error',
    }
  }

  return {
    code: 'GEMINI_REQUEST_FAILED',
    retryable: false,
    fallbackReason: 'gemini_request_failed',
  }
}
