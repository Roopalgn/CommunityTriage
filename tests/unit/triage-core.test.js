const test = require('node:test')
const assert = require('node:assert/strict')

const triageCore = require('../../src/triage-core.js')

test('normalizeUrgency returns valid operational buckets', () => {
  assert.equal(triageCore.normalizeUrgency('critical'), 'Critical')
  assert.equal(triageCore.normalizeUrgency('HIGH'), 'High')
  assert.equal(triageCore.normalizeUrgency('something-else'), 'Medium')
})

test('normalizeUrgency handles edge cases', () => {
  assert.equal(triageCore.normalizeUrgency(''), 'Medium')
  assert.equal(triageCore.normalizeUrgency(null), 'Medium')
  assert.equal(triageCore.normalizeUrgency(undefined), 'Medium')
  assert.equal(triageCore.normalizeUrgency(0), 'Medium')
  assert.equal(triageCore.normalizeUrgency('  Critical  '), 'Critical')
})

test('clampNumber and normalizeRequiredResources normalize numeric and resource inputs', () => {
  assert.equal(triageCore.clampNumber('97.4', 0, 99, 70), 97)
  assert.equal(triageCore.clampNumber('not-a-number', 0, 99, 70), 70)

  assert.equal(
    triageCore.normalizeRequiredResources(['water tankers', ' ', 'blankets'], 'fallback value'),
    'water tankers, blankets',
  )
  assert.equal(triageCore.normalizeRequiredResources('', 'fallback value'), 'fallback value')
})

test('clampNumber handles edge cases', () => {
  assert.equal(triageCore.clampNumber(NaN, 0, 99, 50), 50)
  assert.equal(triageCore.clampNumber(Infinity, 0, 99, 50), 50)
  assert.equal(triageCore.clampNumber(-Infinity, 0, 99, 50), 50)
  assert.equal(triageCore.clampNumber(-5, 0, 99, 50), 0)
  assert.equal(triageCore.clampNumber(150, 0, 99, 50), 99)
  assert.equal(triageCore.clampNumber(0, 0, 99, 50), 0)
})

test('formatLocation maps known aliases correctly', () => {
  assert.equal(triageCore.formatLocation('south district'), 'South District')
  assert.equal(triageCore.formatLocation('CENTRAL WARD area'), 'Central Ward')
  assert.equal(triageCore.formatLocation(''), 'Community Zone')
  assert.equal(triageCore.formatLocation(null), 'Community Zone')
  assert.equal(triageCore.formatLocation('custom place'), 'Custom Place')
})

test('tokenize splits text into meaningful tokens', () => {
  const tokens = triageCore.tokenize('Water shortage in South District!')
  assert.ok(tokens.includes('water'))
  assert.ok(tokens.includes('shortage'))
  assert.ok(tokens.includes('south'))
  assert.ok(tokens.includes('district'))
  assert.ok(!tokens.includes('in'))
})

test('tokenize handles empty and null input', () => {
  assert.deepEqual(triageCore.tokenize(''), [])
  assert.deepEqual(triageCore.tokenize(null), [])
  assert.deepEqual(triageCore.tokenize(undefined), [])
})

test('calculateHybridPriorityScore keeps scores bounded and urgency-sensitive', () => {
  const criticalScore = triageCore.calculateHybridPriorityScore({
    confidence: 92,
    urgency: 'Critical',
    fallbackScore: 88,
  })

  const mediumScore = triageCore.calculateHybridPriorityScore({
    confidence: 92,
    urgency: 'Medium',
    fallbackScore: 88,
  })

  assert.ok(criticalScore <= 99)
  assert.ok(mediumScore <= 99)
  assert.ok(criticalScore > mediumScore)
})

test('calculateHybridPriorityScore handles extreme values', () => {
  const lowScore = triageCore.calculateHybridPriorityScore({
    confidence: 0,
    urgency: 'Medium',
    fallbackScore: 0,
  })

  const highScore = triageCore.calculateHybridPriorityScore({
    confidence: 100,
    urgency: 'Critical',
    fallbackScore: 99,
  })

  assert.ok(lowScore >= 0)
  assert.ok(highScore <= 99)
})

test('calculateDuplicateSignals gives higher confidence for near-identical reports', () => {
  const candidate = {
    title: 'Flood relief supply gap',
    summary: 'Families displaced after flooding need blankets and dry food.',
    need: 'Blankets, dry food, transport',
    rawText: 'Flooded streets in Riverside Zone displaced families and urgent blanket support is needed.',
    location: 'Riverside Zone',
    issueType: 'Flood relief',
    source: 'Survey form',
  }

  const closeMatch = {
    title: 'Flood support needed',
    summary: 'Displaced families require blankets and food packets immediately.',
    need: 'Food packets, blankets',
    rawText: 'Riverside Zone flood displaced families and relief supplies are needed urgently.',
    location: 'Riverside Zone',
    issueType: 'Flood relief',
    source: 'Survey form',
  }

  const weakMatch = {
    title: 'Health camp registration support',
    summary: 'A camp requires patient registration volunteers.',
    need: 'Registration desk support',
    rawText: 'Central Ward health camp needs registration and queue management help.',
    location: 'Central Ward',
    issueType: 'Medical support',
    source: 'NGO outreach',
  }

  const closeSignals = triageCore.calculateDuplicateSignals(candidate, closeMatch)
  const weakSignals = triageCore.calculateDuplicateSignals(candidate, weakMatch)

  assert.ok(closeSignals.duplicateScore > weakSignals.duplicateScore)
  assert.ok(closeSignals.sameLocation)
  assert.ok(closeSignals.sameIssue)
  assert.ok(closeSignals.sameSource)
})

test('calculateDuplicateSignals handles empty reports', () => {
  const empty = { title: '', summary: '', need: '', rawText: '', location: '', issueType: '', source: '' }
  const signals = triageCore.calculateDuplicateSignals(empty, empty)
  assert.equal(typeof signals.duplicateScore, 'number')
  assert.ok(signals.duplicateScore >= 0)
})
