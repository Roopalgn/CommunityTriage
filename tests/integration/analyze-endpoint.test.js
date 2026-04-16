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
