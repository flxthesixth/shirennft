const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const source = fs.readFileSync('public/_worker.js', 'utf8').replace('export default', 'globalThis.worker =')
const context = { URL, Request, Response, Headers, AbortSignal, Set, JSON, fetch: async (url) => {
  const path = new URL(url).pathname
  if (path === '/v1/markets') return new Response(JSON.stringify({ data: { markets: [{ market_id: '1', display_name: 'BTC/USDC', last_price: '85000', quote_volume_24h: '100000', active: true, config: { unlocked: true, max_leverage: '25', min_order_size: '0.00015' } }] } }))
  if (path === '/v1/portfolio/details') return new Response(JSON.stringify({ data: { summary: { total_account_value: '500', free_collateral: '480', margin_usage: '0.1' }, positions: Array.from({ length: 38 }, (_, i) => ({ market_id: String(i), market_name: 'BTC/USDC', size: '0', side: 0, unrealized_pnl: '0' })) } }))
  return new Response('bad upstream', { status: 502 })
} }
vm.runInNewContext(source, context)
const env = { ASSETS: { fetch: () => new Response('asset') } }
test('rejects malformed RISEx trading payloads', async () => {
  const original = context.fetch
  context.fetch = async () => new Response(JSON.stringify({ data: { markets: 'invalid' } }))
  try {
    const response = await context.worker.fetch(new Request('https://site.test/api/trading/markets'), env)
    assert.equal(response.status, 502)
    context.fetch = async () => new Response(JSON.stringify({ data: { summary: {}, positions: null } }))
    const portfolio = await context.worker.fetch(new Request('https://site.test/api/trading/portfolio?address=0x0000000000000000000000000000000000000000'), env)
    assert.equal(portfolio.status, 502)
    context.fetch = async () => new Response(JSON.stringify({ data: { summary: { total_account_value: 'NaN', free_collateral: '0', margin_usage: '0' }, positions: [] } }))
    const invalidBalance = await context.worker.fetch(new Request('https://site.test/api/trading/portfolio?address=0x0000000000000000000000000000000000000000'), env)
    assert.equal(invalidBalance.status, 502)
  } finally { context.fetch = original }
})
test('trading market and portfolio are bounded read-only routes', async () => {
  const m = await context.worker.fetch(new Request('https://site.test/api/trading/markets'), env)
  assert.equal(m.status, 200)
  assert.equal((await m.json()).markets[0].display_name, 'BTC/USDC')
  const p = await context.worker.fetch(new Request('https://site.test/api/trading/portfolio?address=0x0000000000000000000000000000000000000000'), env)
  const portfolio = await p.json()
  assert.equal(portfolio.summary.total_account_value, '500')
  assert.equal(portfolio.positions.length, 38)
  assert.ok(portfolio.positions.every(position => position.size === '0'))
  const bad = await context.worker.fetch(new Request('https://site.test/api/trading/portfolio?address=bad'), env)
  assert.equal(bad.status, 400)
  const post = await context.worker.fetch(new Request('https://site.test/api/trading/markets', { method: 'POST' }), env)
  assert.equal(post.status, 405)
})
