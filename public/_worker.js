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
