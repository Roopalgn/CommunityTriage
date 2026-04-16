const test = require('node:test')
const assert = require('node:assert/strict')

const triageCore = require('../../src/triage-core.js')

test('normalizeUrgency returns valid operational buckets', () => {
  assert.equal(triageCore.normalizeUrgency('critical'), 'Critical')
  assert.equal(triageCore.normalizeUrgency('HIGH'), 'High')
  assert.equal(triageCore.normalizeUrgency('something-else'), 'Medium')
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
