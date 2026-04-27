const test = require('node:test')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..', '..')

async function waitForServer(url, timeoutMs = 12000) {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch (error) {
      // Server may still be booting.
    }

    await new Promise((resolve) => setTimeout(resolve, 160))
  }

  throw new Error(`Timed out waiting for server readiness: ${url}`)
}

function createTestPort() {
  return 4300 + Math.floor(Math.random() * 500)
}

test('analyze endpoint returns fallback-compatible error metadata when Gemini is unavailable', async (t) => {
  const port = createTestPort()
  const child = spawn(process.execPath, ['server.js'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      GEMINI_API_KEY: '',
      GEMINI_MODEL: 'gemini-2.5-flash',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  t.after(() => {
    if (!child.killed) {
      child.kill()
    }
  })

  await waitForServer(`http://localhost:${port}/api/health`)

  const healthResponse = await fetch(`http://localhost:${port}/api/health`)
  assert.equal(healthResponse.status, 200)
  const healthPayload = await healthResponse.json()
  assert.equal(healthPayload.geminiConfigured, false)
  assert.ok(healthPayload.requestId)

  const unsupportedContentTypeResponse = await fetch(`http://localhost:${port}/api/analyze-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'x-client-request-id': 'test-client-request-unsupported-type',
    },
    body: 'incident=plain-text',
  })

  assert.equal(unsupportedContentTypeResponse.status, 415)
  const unsupportedContentTypePayload = await unsupportedContentTypeResponse.json()
  assert.equal(unsupportedContentTypePayload.code, 'UNSUPPORTED_CONTENT_TYPE')

  const tooLargeIncidentResponse = await fetch(`http://localhost:${port}/api/analyze-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-request-id': 'test-client-request-too-large',
    },
    body: JSON.stringify({
      incident: 'x'.repeat(4501),
      locationHint: 'South District',
      supportHint: 'Water',
      source: 'Test harness',
    }),
  })

  assert.equal(tooLargeIncidentResponse.status, 413)
  const tooLargeIncidentPayload = await tooLargeIncidentResponse.json()
  assert.equal(tooLargeIncidentPayload.code, 'INCIDENT_TOO_LARGE')

  const analyzeResponse = await fetch(`http://localhost:${port}/api/analyze-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-request-id': 'test-client-request-1',
    },
    body: JSON.stringify({
      incident: 'Families need immediate drinking water support in South District.',
      locationHint: 'South District',
      supportHint: 'Water tankers',
      source: 'Test harness',
    }),
  })

  assert.equal(analyzeResponse.status, 503)
  const analyzePayload = await analyzeResponse.json()

  assert.equal(analyzePayload.code, 'GEMINI_NOT_CONFIGURED')
  assert.equal(analyzePayload.retryable, false)
  assert.equal(analyzePayload.fallbackReason, 'gemini_not_configured')
  assert.ok(analyzePayload.requestId)
  assert.equal(analyzePayload.clientRequestId, 'test-client-request-1')
})

test('state persistence endpoints round-trip correctly', async (t) => {
  const port = createTestPort()
  const child = spawn(process.execPath, ['server.js'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      GEMINI_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  t.after(() => {
    if (!child.killed) {
      child.kill()
    }
  })

  await waitForServer(`http://localhost:${port}/api/health`)

  const testState = {
    reports: [{ id: 'CT-9999', title: 'Test report' }],
    auditTrail: [{ id: 'AT-1', type: 'test' }],
    nextReportNumber: 10000,
    nextAuditNumber: 2,
  }

  const putResponse = await fetch(`http://localhost:${port}/api/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testState),
  })

  assert.equal(putResponse.status, 200)
  const putPayload = await putResponse.json()
  assert.equal(putPayload.ok, true)

  const getResponse = await fetch(`http://localhost:${port}/api/state`)
  assert.equal(getResponse.status, 200)
  const getPayload = await getResponse.json()
  assert.ok(getPayload.state)
  assert.equal(getPayload.state.reports[0].id, 'CT-9999')
  assert.equal(getPayload.state.nextReportNumber, 10000)
})

test('analyze endpoint rejects oversized auxiliary fields', async (t) => {
  const port = createTestPort()
  const child = spawn(process.execPath, ['server.js'], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      GEMINI_API_KEY: 'test-key',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  t.after(() => {
    if (!child.killed) {
      child.kill()
    }
  })

  await waitForServer(`http://localhost:${port}/api/health`)

  const oversizedFieldResponse = await fetch(`http://localhost:${port}/api/analyze-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incident: 'Valid incident text for testing field limits.',
      locationHint: 'x'.repeat(501),
      supportHint: 'Water',
      source: 'Test',
    }),
  })

  assert.equal(oversizedFieldResponse.status, 413)
  const oversizedFieldPayload = await oversizedFieldResponse.json()
  assert.equal(oversizedFieldPayload.code, 'FIELD_TOO_LARGE')
})
