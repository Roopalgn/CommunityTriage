const ROOT_DIR = __dirname
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { URL } = require('node:url')
const triageCore = require('./src/triage-core.js')

loadEnvFiles()

const PORT = Number(process.env.PORT || 3000)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_MAX_RETRIES = clampInteger(process.env.GEMINI_MAX_RETRIES, 0, 4, 2)
const GEMINI_RETRY_BASE_MS = clampInteger(process.env.GEMINI_RETRY_BASE_MS, 100, 5000, 350)
const GEMINI_TIMEOUT_MS = clampInteger(process.env.GEMINI_TIMEOUT_MS, 2000, 60000, 15000)
const MAX_REQUEST_BYTES = clampInteger(process.env.MAX_REQUEST_BYTES, 16 * 1024, 2 * 1024 * 1024, 256 * 1024)
const MAX_INCIDENT_CHARS = clampInteger(process.env.MAX_INCIDENT_CHARS, 200, 12000, 4000)
const RATE_LIMIT_WINDOW_MS = clampInteger(process.env.RATE_LIMIT_WINDOW_MS, 1000, 10 * 60 * 1000, 60 * 1000)
const RATE_LIMIT_MAX_REQUESTS = clampInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 5, 600, 45)

const MAX_FIELD_CHARS = 500

const RETRYABLE_PROVIDER_STATUS = new Set([429, 503, 504])
const rateLimitBuckets = new Map()

const DATA_DIR = path.join(ROOT_DIR, 'data')
const STATE_FILE = path.join(DATA_DIR, 'state.json')

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
      }, requestId, clientRequestId)
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/state') {
      const persisted = loadPersistedState()
      return sendJson(response, 200, {
        ok: true,
        state: persisted,
        requestId,
        clientRequestId,
      }, requestId, clientRequestId)
    }

    if (request.method === 'PUT' && requestUrl.pathname === '/api/state') {
      const contentType = String(request.headers['content-type'] || '').toLowerCase()
      if (!contentType.includes('application/json')) {
        return sendJson(response, 415, {
          error: 'Content-Type must be application/json.',
          code: 'UNSUPPORTED_CONTENT_TYPE',
          retryable: false,
          requestId,
          clientRequestId,
        }, requestId, clientRequestId)
      }
      const body = await readJsonBody(request)
      if (!body || typeof body !== 'object') {
        return sendJson(response, 400, {
          error: 'Invalid state payload.',
          code: 'INVALID_STATE',
          retryable: false,
          requestId,
          clientRequestId,
        }, requestId, clientRequestId)
      }
      const saved = savePersistedState(body)
      log(saved ? 'info' : 'error', saved ? 'State persisted' : 'State persistence failed', { requestId })
      return sendJson(response, saved ? 200 : 500, {
        ok: saved,
        requestId,
        clientRequestId,
      }, requestId, clientRequestId)
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/analyze-report') {
      const rateLimit = applyRateLimit(getClientAddress(request))
      if (!rateLimit.allowed) {
        return sendJson(response, 429, {
          error: 'Too many requests. Please retry shortly.',
          code: 'RATE_LIMITED',
          retryable: true,
          fallbackReason: 'rate_limited',
          retryAfterSec: rateLimit.retryAfterSec,
          requestId,
          clientRequestId,
        }, requestId, clientRequestId)
      }

      const contentType = String(request.headers['content-type'] || '').toLowerCase()
      if (!contentType.includes('application/json')) {
        return sendJson(response, 415, {
          error: 'Content-Type must be application/json.',
          code: 'UNSUPPORTED_CONTENT_TYPE',
          retryable: false,
          fallbackReason: 'unsupported_content_type',
          requestId,
          clientRequestId,
        }, requestId, clientRequestId)
      }

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
        }, requestId, clientRequestId)
      }

      if (incident.length > MAX_INCIDENT_CHARS) {
        return sendJson(response, 413, {
          error: `Incident text exceeds ${MAX_INCIDENT_CHARS} characters.`,
          code: 'INCIDENT_TOO_LARGE',
          retryable: false,
          fallbackReason: 'incident_too_large',
          requestId,
          clientRequestId,
        }, requestId, clientRequestId)
      }

      const locationHint = String(body.locationHint || '').trim()
      const supportHint = String(body.supportHint || '').trim()
      const source = String(body.source || '').trim()

      if (locationHint.length > MAX_FIELD_CHARS || supportHint.length > MAX_FIELD_CHARS || source.length > MAX_FIELD_CHARS) {
        return sendJson(response, 413, {
          error: `Location, support, and source fields must be under ${MAX_FIELD_CHARS} characters.`,
          code: 'FIELD_TOO_LARGE',
          retryable: false,
          fallbackReason: 'field_too_large',
          requestId,
          clientRequestId,
        }, requestId, clientRequestId)
      }

      if (!GEMINI_API_KEY) {
        return sendJson(response, 503, {
          error: 'Gemini is not configured on the backend.',
          code: 'GEMINI_NOT_CONFIGURED',
          retryable: false,
          fallbackReason: 'gemini_not_configured',
          requestId,
          clientRequestId,
        }, requestId, clientRequestId)
      }

      const startedAt = Date.now()
      const result = await analyzeWithGeminiWithRetry({
        incident,
        locationHint,
        supportHint,
        source,
      })

      return sendJson(response, 200, {
        provider: 'Gemini',
        model: GEMINI_MODEL,
        attempts: result.attempts,
        latencyMs: Date.now() - startedAt,
        requestId,
        clientRequestId,
        analysis: result.analysis,
      }, requestId, clientRequestId)
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
    }, requestId, clientRequestId)
  } catch (error) {
    const statusCode = error.statusCode || 500
    log('error', error.message || 'Unexpected server error', {
      requestId,
      code: error.code,
      statusCode,
    })
    sendJson(response, statusCode, {
      error: error.message || 'Unexpected server error.',
      code: error.code || 'BACKEND_ERROR',
      retryable: Boolean(error.retryable),
      fallbackReason: error.fallbackReason || 'backend_error',
      attempts: error.attempts,
      latencyMs: error.latencyMs,
      requestId,
      clientRequestId,
    }, requestId, clientRequestId)
  }
})

server.listen(PORT, () => {
  log('info', `CommunityTriage server running on http://localhost:${PORT}`)
})

function shutdown(signal) {
  log('info', `Received ${signal}, shutting down gracefully`)
  server.close(() => {
    log('info', 'Server closed')
    process.exit(0)
  })
  setTimeout(() => {
    log('warn', 'Forced shutdown after timeout')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

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

  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  let response
  try {
    response = await fetch(
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
        signal: controller.signal,
      },
    )
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createProviderError('Gemini request timed out.', {
        statusCode: 504,
        code: 'GEMINI_TIMEOUT',
        retryable: true,
        fallbackReason: 'gemini_timeout',
      })
    }
    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }

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
  const urgency = triageCore.normalizeUrgency(analysis.urgency)
  const confidence = triageCore.clampNumber(analysis.confidence, 0, 100, 78)
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

function clampInteger(value, min, max, fallback) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(numericValue)))
}

async function readJsonBody(request) {
  const chunks = []
  let totalBytes = 0

  for await (const chunk of request) {
    totalBytes += chunk.length
    if (totalBytes > MAX_REQUEST_BYTES) {
      throw createProviderError('Request body too large.', {
        statusCode: 413,
        code: 'REQUEST_TOO_LARGE',
        retryable: false,
        fallbackReason: 'request_too_large',
      })
    }
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

function getClientAddress(request) {
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return forwardedFor || request.socket?.remoteAddress || 'unknown'
}

function applyRateLimit(clientAddress) {
  const now = Date.now()

  if (rateLimitBuckets.size > 5000) {
    for (const [key, value] of rateLimitBuckets.entries()) {
      if (value.resetAt <= now) {
        rateLimitBuckets.delete(key)
      }
    }
  }

  const current = rateLimitBuckets.get(clientAddress)
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(clientAddress, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  return { allowed: true, retryAfterSec: 0 }
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
    const contentType = MIME_TYPES[extension] || 'application/octet-stream'
    response.writeHead(200, {
      ...buildSecurityHeaders({ contentType, isHtml: extension === '.html' }),
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      ...(requestId ? { 'x-request-id': requestId } : {}),
    })
    response.end(fileBuffer)
  })
}

function sendJson(response, statusCode, payload, requestId = '', clientRequestId = '') {
  response.writeHead(statusCode, {
    ...buildSecurityHeaders({ contentType: 'application/json; charset=utf-8', isHtml: false }),
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
    ...(requestId ? { 'x-request-id': requestId } : {}),
    ...(clientRequestId ? { 'x-client-request-id': clientRequestId } : {}),
  })
  response.end(JSON.stringify(payload))
}

function buildSecurityHeaders({ contentType, isHtml }) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
  }

  if (isHtml || String(contentType || '').includes('text/html')) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data:",
      "script-src 'self' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
      "connect-src 'self'",
    ].join('; ')
  }

  return headers
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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadPersistedState() {
  try {
    ensureDataDir()
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'))
    }
  } catch {
    // Fall back to null
  }
  return null
}

function savePersistedState(state) {
  try {
    ensureDataDir()
    const safe = JSON.stringify(state)
    fs.writeFileSync(STATE_FILE, safe, 'utf8')
    return true
  } catch {
    return false
  }
}

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }
  const out = level === 'error' ? process.stderr : process.stdout
  out.write(JSON.stringify(entry) + '\n')
}

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitBuckets.entries()) {
    if (value.resetAt <= now) {
      rateLimitBuckets.delete(key)
    }
  }
}, 60000)
