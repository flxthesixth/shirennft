const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')

const source = fs.readFileSync('src/app/eligibility/reveal.ts', 'utf8')
const loaded = { exports: {} }
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  { module: loaded, exports: loaded.exports, Error },
)
const { parseEligibilityResult, revealProfiles } = loaded.exports

test('maps authoritative boolean responses without inventing a whitelist tier', () => {
  assert.equal(JSON.stringify(parseEligibilityResult({ eligible: true })), JSON.stringify({ eligible: true, profile: 'eligible' }))
  assert.equal(JSON.stringify(parseEligibilityResult({ eligible: false })), JSON.stringify({ eligible: false, profile: 'none' }))
})

test('rejects malformed or tier-like responses unsupported by the backend contract', () => {
  for (const payload of [null, {}, { eligible: 'true' }, { tier: 'gold' }, { eligible: true, tier: 'gold' }]) {
    assert.throws(() => parseEligibilityResult(payload), /unavailable/i)
  }
})

test('uses truthful reveal copy for eligible and unlisted wallets', () => {
  assert.equal(revealProfiles.eligible.title, 'ELIGIBLE SOUL')
  assert.match(revealProfiles.eligible.description, /current pilot list/i)
  assert.equal(revealProfiles.none.title, 'UNWRITTEN')
  assert.match(revealProfiles.none.description, /not on the current pilot list/i)
  assert.doesNotMatch(JSON.stringify(revealProfiles), /gold|silver|free mint/i)
})
