const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const source = fs.readFileSync('src/app/trading/planner.ts', 'utf8')
const loaded = { exports: {} }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module: loaded, exports: loaded.exports, Math, Number, Error })
const { plan, ceilingPath } = loaded.exports

test('ceiling path plots target and fee-aware 3x reward/risk scenario without promising outcome', () => {
  const settings = { ...input, capital: 1000, target: 1100, days: 100, stopPct: 5, feeBps: 100 }
  const r = plan(settings, markets)
  const path = ceilingPath(settings, r)
  assert.equal(path.length, 5)
  assert.equal(path[0].target, 1000)
  assert.equal(path[0].ceiling, 1000)
  assert.ok(Math.abs(path[4].target - 1100) < 1e-6)
  const move = 3 * settings.stopPct / 100
  const win = (r.notional * move - r.notional * 0.01 * (2 + move)) / settings.capital
  const expected = 1000 * Math.exp(settings.days * (0.5 * Math.log1p(win) + 0.5 * Math.log1p(-0.01)))
  assert.ok(Math.abs(path[4].ceiling - expected) < 1e-6)
  assert.ok(path.every(point => Number.isFinite(point.target) && Number.isFinite(point.ceiling)))
})

test('ceiling path rejects non-representable extreme values', () => {
  const settings = { ...input, capital: 1000, target: 1100, days: 3650, tradesPerDay: 10, riskPct: 2, stopPct: 50, winRate: 99, feeBps: 0 }
  const r = plan(settings, markets)
  assert.equal(ceilingPath(settings, r).at(-1).ceiling, null)
})
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
test('accepts user risk above 2% but rejects total-loss or invalid risk', () => {
  const r = plan({ ...input, capital: 1000, target: 1200, riskPct: 3 }, markets)
  assert.equal(r.risk, 30)
  assert.throws(() => plan({ ...input, riskPct: 100 }, markets))
  assert.throws(() => plan({ ...input, riskPct: -1 }, markets))
})
test('only evaluates a user-selected market', () => {
  const other = { ...markets[0], market_id: '2', display_name: 'SOL/USDC', quote_volume_24h: '1' }
  const r = plan({ ...input, capital: 1000, target: 1200 }, [other])
  assert.deepEqual(r.options.map(o => o.marketId), ['2'])
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
  const move = withFee.requiredRewardRisk * 0.02
  const netWin = (withFee.notional * move - withFee.notional * 0.0005 * (2 + move)) / 1000
  assert.ok(Math.abs(100 * (0.5 * Math.log1p(netWin) + 0.5 * Math.log1p(-0.01)) - Math.log(2)) < 1e-10)
})
test('selects three eligible markets after leverage filtering', () => {
  const four = [1, 2, 3, 4].map((n) => ({ ...markets[0], market_id: String(n), quote_volume_24h: String(10000 - n), config: { ...markets[0].config, max_leverage: n === 4 ? '5' : '1', min_order_size: '0.00001' } }))
  const r = plan({ ...input, capital: 1000, target: 1100, stopPct: 0.5 }, four)
  assert.deepEqual(r.options.map(o => o.marketId), ['4'])
})
test('compounded target includes exit fee on winning and losing close notional', () => {
  const settings = { ...input, capital: 1000, target: 1100, days: 100, stopPct: 5, feeBps: 100 }
  const r = plan(settings, markets)
  const entry = r.notional, fee = settings.feeBps / 10000, stop = settings.stopPct / 100
  const winnerMove = r.requiredRewardRisk * stop
  const win = (entry * winnerMove - fee * entry * (2 + winnerMove)) / settings.capital
  const loss = (entry * stop + fee * entry * (2 - stop)) / settings.capital
  const projected = settings.capital * Math.exp(settings.days * (0.5 * Math.log1p(win) + 0.5 * Math.log1p(-loss)))
  assert.ok(Math.abs(projected - settings.target) < 0.01, projected)
})
test('trade count, losing streak and fee assumptions are explicit', () => {
  const r = plan({ ...input, target: 600, days: 30, tradesPerDay: 2, feeBps: 5 }, markets)
  assert.equal(r.tradeCount, 60)
  assert.ok(r.options[0].estimatedRoundTripFee > 0)
  assert.ok(r.lossAfterThree > r.risk * 2)
  assert.ok(r.options[0].requiredRewardRisk > plan({ ...input, target: 600, tradesPerDay: 2, feeBps: 0 }, markets).options[0].requiredRewardRisk)
})
