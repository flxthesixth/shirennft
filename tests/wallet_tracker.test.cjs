const { test } = require('node:test')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const fs = require('node:fs')
const source = fs.readFileSync('public/_worker.js', 'utf8').replace('export default', 'globalThis.worker =')
const context = vm.createContext({ URL, Response, AbortSignal, Date, Set, fetch: async () => { throw Error('unexpected upstream') } })
vm.runInContext(source, context)
const call = url => context.worker.fetch(new Request(url), { ASSETS: { fetch: () => { throw Error('assets') } } })
const base = 'https://example.org/api/wallet-tracker?address=0x1111111111111111111111111111111111111111'
test('tracker rejects invalid address and unknown query', async () => {
  assert.equal((await call(base.replace(/1/g, 'x'))).status, 400)
  assert.equal((await call(base + '&url=https://evil.test')).status, 400)
})
test('tracker normalizes native, tokens and unpriced NFTs', async () => {
  const original = context.fetch
  context.fetch = async url => {
    const path = new URL(url).pathname
    if (path.endsWith('token-balances')) return Response.json([
      { token: { address_hash: '0x2222222222222222222222222222222222222222', symbol: 'USDC', name: 'USD Coin', decimals: '6', exchange_rate: '1', type: 'ERC-20', reputation: 'ok' }, value: '2000000' },
      { token: { address_hash: '0x3333333333333333333333333333333333333333', symbol: 'UNKNOWN', name: 'Unknown', decimals: '18', exchange_rate: null, type: 'ERC-20', reputation: 'ok' }, value: '1000000000000000000' }
    ])
    if (path.endsWith('/nft')) return Response.json({ items: [{ id: '1' }, { id: '2' }], next_page_params: {} })
    if (path.endsWith('/transactions')) return Response.json({ items: [], next_page_params: null })
    return Response.json({ coin_balance: '1000000000000000000', exchange_rate: '2500' })
  }
  try {
    const r = await call(base); assert.equal(r.status, 200)
    const data = await r.json()
    assert.equal(data.assets.length, 3)
    assert.equal(data.assets[0].usd, 2500)
    assert.equal(data.assets[1].usd, 2)
    assert.equal(data.assets[2].usd, null)
    assert.equal(data.nftCount, 2)
    assert.equal(data.nftMore, true)
    assert.equal(data.transactions.length, 0)
  } finally { context.fetch = original }
})
test('tracker fails closed on malformed upstream', async () => {
  const original = context.fetch
  context.fetch = async () => Response.json({ bogus: true })
  try { assert.equal((await call(base)).status, 502) } finally { context.fetch = original }
})
