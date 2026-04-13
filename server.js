const ROOT_DIR = __dirname
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { URL } = require('node:url')

loadEnvFiles()

const PORT = Number(process.env.PORT || 3000)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

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
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`)

    if (request.method === 'GET' && requestUrl.pathname === '/api/health') {
      return sendJson(response, 200, {
        ok: true,
        backend: 'node',
        geminiConfigured: Boolean(GEMINI_API_KEY),
        model: GEMINI_MODEL,
      })
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/analyze-report') {
      const body = await readJsonBody(request)
      const incident = String(body.incident || '').trim()

      if (!incident) {
        return sendJson(response, 400, { error: 'Incident text is required.' })
      }

      if (!GEMINI_API_KEY) {
        return sendJson(response, 503, {
          error: 'Gemini is not configured on the backend.',
          code: 'GEMINI_NOT_CONFIGURED',
        })
      }

      const analysis = await analyzeWithGemini({
        incident,
        locationHint: String(body.locationHint || '').trim(),
        supportHint: String(body.supportHint || '').trim(),
        source: String(body.source || '').trim(),
      })

      return sendJson(response, 200, {
        provider: 'Gemini',
        model: GEMINI_MODEL,
        analysis,
      })
    }

    if (request.method === 'GET') {
      return serveStaticFile(requestUrl.pathname, response)
    }

    sendJson(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    const statusCode = error.statusCode || 500
    sendJson(response, statusCode, {
      error: error.message || 'Unexpected server error.',
    })
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

async function analyzeWithGemini({ incident, locationHint, supportHint, source }) {
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

  const payload = await response.json()
  if (!response.ok) {
    const apiMessage =
      payload?.error?.message ||
      payload?.error?.status ||
      'Gemini request failed.'
    const error = new Error(apiMessage)
    error.statusCode = response.status
    throw error
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
    const error = new Error('Gemini returned an empty response.')
    error.statusCode = 502
    throw error
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

    const parsingError = new Error('Gemini did not return valid JSON.')
    parsingError.statusCode = 502
    throw parsingError
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
    const parsingError = new Error('Invalid JSON body.')
    parsingError.statusCode = 400
    throw parsingError
  }
}

function serveStaticFile(requestPath, response) {
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(ROOT_DIR, safePath)

  if (!filePath.startsWith(ROOT_DIR)) {
    return sendJson(response, 403, { error: 'Forbidden.' })
  }

  fs.readFile(filePath, (error, fileBuffer) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendJson(response, 404, { error: 'Not found.' })
        return
      }

      sendJson(response, 500, { error: 'Failed to read static file.' })
      return
    }

    const extension = path.extname(filePath).toLowerCase()
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    })
    response.end(fileBuffer)
  })
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  })
  response.end(JSON.stringify(payload))
}
