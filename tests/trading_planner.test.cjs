const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const source = fs.readFileSync('src/app/trading/planner.ts', 'utf8')
const loaded = { exports: {} }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module: loaded, exports: loaded.exports, Math, Number, Error })
const { plan } = loaded.exports
const markets = [{ market_id: '1', display_name: 'BTC/USDC', last_price: '85000', active: true, config: { unlocked: true, max_leverage: '25', min_order_size: '0.00015' }, quote_volume_24h: '10000000' }]
const input = { capital: 500, target: 10000, days: 30, riskPct: 1, stopPct: 2, tradesPerDay: 1, winRate: 50 }

test('target means ending balance, deadline variable, infeasible target stays infeasible', () => {
  const r = plan(input, markets)
  assert.ok(Math.abs(r.requiredDailyPct - 10.5) < 0.1)
  assert.equal(r.options.length, 1)
  assert.equal(r.options[0].feasible, false)
  assert.ok(r.options[0].requiredRewardRisk > 20)
  const longer = plan({ ...input, days: 90 }, markets)
  assert.ok(longer.requiredDailyPct < r.requiredDailyPct)
})
test('never claims a strategy when no enabled market or invalid inputs', () => {
  assert.equal(plan({ ...input, target: 1000 }, []).options.length, 0)
  assert.throws(() => plan({ ...input, target: 500 }, markets))
  assert.throws(() => plan({ ...input, days: 0 }, markets))
  assert.throws(() => plan({ ...input, days: 2.5 }, markets))
  assert.throws(() => plan({ ...input, tradesPerDay: 1.5 }, markets))
  assert.throws(() => plan({ ...input, capital: Infinity }, markets))
})
test('caps leverage by market and excludes market whose min order cannot fit risk', () => {
  const r = plan({ ...input, capital: 20, target: 30 }, markets)
  assert.equal(r.options.length, 0)
})
test('required winner move compounds winning and losing trades, not arithmetic mean', () => {
  const r = plan({ ...input, capital: 1000, target: 2000, days: 100, tradesPerDay: 1, winRate: 50, feeBps: 0 }, markets)
  const lossFraction = r.risk / 1000
  const winFraction = r.requiredRewardRisk * r.notional * (input.stopPct / 100) / 1000
  const projectedLogGrowth = 100 * (0.5 * Math.log1p(winFraction) + 0.5 * Math.log1p(-lossFraction))
  assert.ok(Math.abs(projectedLogGrowth - Math.log(2)) < 1e-10)
  const withFee = plan({ ...input, capital: 1000, target: 2000, days: 100, tradesPerDay: 1, winRate: 50, feeBps: 5 }, markets)
  const netWin = (withFee.requiredRewardRisk * withFee.notional * 0.02 - withFee.options[0].estimatedRoundTripFee) / 1000
  assert.ok(Math.abs(100 * (0.5 * Math.log1p(netWin) + 0.5 * Math.log1p(-0.01)) - Math.log(2)) < 1e-10)
})
test('trade count, losing streak and fee assumptions are explicit', () => {
  const r = plan({ ...input, target: 600, days: 30, tradesPerDay: 2, feeBps: 5 }, markets)
  assert.equal(r.tradeCount, 60)
  assert.ok(r.options[0].estimatedRoundTripFee > 0)
  assert.ok(r.lossAfterThree > r.risk * 2)
  assert.ok(r.options[0].requiredRewardRisk > plan({ ...input, target: 600, tradesPerDay: 2, feeBps: 0 }, markets).options[0].requiredRewardRisk)
})
