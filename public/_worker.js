const pilotWallets = new Set(['0xe819ac5280fe77512aa89d032f608449e4c1d925'])
const addressPattern = /^0x[a-fA-F0-9]{40}$/

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/trading/')) {
      const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
      const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers })
      if (request.method !== 'GET') return respond({ error: 'Method not allowed' }, 405)
      let upstream
      if (url.pathname === '/api/trading/markets') upstream = 'https://api.rise.trade/v1/markets'
      else if (url.pathname === '/api/trading/leaderboard') {
        const periods = { '1d': '24H', '7d': '7D', '30d': '30D', all: 'ALL' }
        const period = url.searchParams.get('period') || '30d'
        if (!Object.hasOwn(periods, period) || [...url.searchParams.keys()].some(key => key !== 'period')) return respond({ error: 'Invalid period' }, 400)
        upstream = `https://api.rise.trade/api/v1/leaderboard/combined?timeframe=LEADERBOARD_TIME_FRAME_${periods[period]}&sort_by=COMBINED_LEADERBOARD_SORT_BY_PNL&asc=false&limit=100&page=1`
      }
      else if (url.pathname === '/api/trading/portfolio') {
        const address = url.searchParams.get('address')
        if (!address || !addressPattern.test(address)) return respond({ error: 'Invalid wallet address' }, 400)
        upstream = 'https://api.rise.trade/v1/portfolio/details?account=' + encodeURIComponent(address)
      } else return respond({ error: 'Not found' }, 404)
      try {
        const response = await fetch(upstream, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) })
        if (!response.ok) return respond({ error: 'RISEx data unavailable' }, 502)
        const payload = await response.json()
        if (!payload?.data || typeof payload.data !== 'object') return respond({ error: 'RISEx data unavailable' }, 502)
        if (url.pathname.endsWith('/leaderboard')) {
          const entries = payload.data.entries
          if (!Array.isArray(entries) || entries.length > 100 || entries.some(entry => !addressPattern.test(entry?.address) || !['rank', 'notional_pnl', 'roi_percent', 'win_rate', 'trades', 'notional_volume'].every(key => entry[key] != null && entry[key] !== '' && Number.isFinite(Number(entry[key]))))) return respond({ error: 'RISEx data unavailable' }, 502)
          return respond({ entries: entries.map(({ rank, address, notional_pnl, roi_percent, win_rate, trades, notional_volume }) => ({ rank, address, notional_pnl, roi_percent, win_rate, trades, notional_volume })), fetchedAt: new Date().toISOString() })
        }
        if (url.pathname.endsWith('/markets') ? !Array.isArray(payload.data.markets) : !payload.data.summary || typeof payload.data.summary !== 'object' || !Array.isArray(payload.data.positions) || !['total_account_value', 'free_collateral', 'margin_usage'].every(key => payload.data.summary[key] != null && payload.data.summary[key] !== '' && Number.isFinite(Number(payload.data.summary[key])))) return respond({ error: 'RISEx data unavailable' }, 502)
        return respond(url.pathname.endsWith('/markets') ? { markets: payload.data.markets } : { summary: payload.data.summary, positions: payload.data.positions })
      } catch { return respond({ error: 'RISEx data unavailable' }, 502) }
    }
    if (url.pathname === '/api/wallet-tracker') {
      const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
      const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers })
      const address = url.searchParams.get('address')
      if (request.method !== 'GET') return respond({ error: 'Method not allowed' }, 405)
      if (!address || !addressPattern.test(address) || [...url.searchParams.keys()].some(key => key !== 'address')) return respond({ error: 'Invalid wallet address' }, 400)
      const root = `https://eth.blockscout.com/api/v2/addresses/${address}`
      try {
        const results = await Promise.all(['', '/token-balances', '/nft', '/transactions'].map(async path => {
          const r = await fetch(root + path, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
          if (!r.ok) throw Error('upstream')
          return r.json()
        }))
        const [wallet, tokens, nfts, txs] = results
        if (!wallet || typeof wallet.coin_balance !== 'string' || !Array.isArray(tokens) || !Array.isArray(nfts?.items) || !Array.isArray(txs?.items)) throw Error('payload')
        const price = value => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null
        const amount = (value, decimals) => { const n = Number(value) / 10 ** Number(decimals); return Number.isFinite(n) && n >= 0 ? n : null }
        const assets = []
        const native = amount(wallet.coin_balance, 18)
        if (native === null) throw Error('balance')
        assets.push({ id: 'native', symbol: 'ETH', name: 'Ether', amount: native, usd: price(wallet.exchange_rate) === null ? null : native * price(wallet.exchange_rate), category: 'Core' })
        // ponytail: only first explorer page; expose truncation rather than silently claiming a complete portfolio.
        for (const item of tokens.slice(0, 500)) {
          const token = item?.token
          if (token?.type !== 'ERC-20' || !addressPattern.test(token.address_hash) || !/^\d+$/.test(String(token.decimals)) || Number(token.decimals) > 36 || !/^\d+$/.test(String(item.value))) continue
          const qty = amount(item.value, token.decimals)
          if (qty === null || qty === 0) continue
          const rate = price(token.exchange_rate)
          assets.push({ id: token.address_hash.toLowerCase(), symbol: String(token.symbol || 'Token').slice(0, 30), name: String(token.name || 'Token').slice(0, 80), amount: qty, usd: rate === null ? null : qty * rate, category: /^(USDC|USDT|DAI|USDS|USDE|FRAX|LUSD|PYUSD)$/i.test(token.symbol) ? 'Stablecoin' : 'Token', reputation: token.reputation || null })
        }
        const transactions = txs.items.slice(0, 25).filter(tx => typeof tx?.hash === 'string' && /^0x[a-fA-F0-9]{64}$/.test(tx.hash)).map(tx => ({ hash: tx.hash, timestamp: tx.timestamp || null, from: tx.from?.hash || null, to: tx.to?.hash || null, status: tx.status || tx.result || null, value: /^\d+$/.test(String(tx.value)) ? Number(tx.value) / 1e18 : null }))
        return respond({ chain: 'Ethereum', address, assets, nftCount: nfts.items.length, nftMore: Boolean(nfts.next_page_params), tokenMore: tokens.length > 500, transactions, transactionMore: Boolean(txs.next_page_params), fetchedAt: new Date().toISOString() })
      } catch { return respond({ error: 'Explorer data unavailable' }, 502) }
    }
    if (url.pathname !== '/api/eligibility') return env.ASSETS.fetch(request)
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
    const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers })
    if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)
    if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return respond({ error: 'Forbidden' }, 403)
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return respond({ error: 'Expected JSON' }, 415)
    if (Number(request.headers.get('Content-Length')) > 1024) return respond({ error: 'Request too large' }, 413)
    let body
    try { body = await request.text(); if (body.length > 1024) return respond({ error: 'Request too large' }, 413) } catch { return respond({ error: 'Invalid request' }, 400) }
    let address
    try { address = JSON.parse(body)?.address } catch { return respond({ error: 'Invalid JSON' }, 400) }
    if (typeof address !== 'string' || !addressPattern.test(address)) return respond({ error: 'Invalid wallet address' }, 400)
    // ponytail: seed address only; move the allowlist to private KV/D1 when the full list arrives.
    return respond({ eligible: pilotWallets.has(address.toLowerCase()) })
  },
}
