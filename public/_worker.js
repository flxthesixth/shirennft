const pilotWallets = new Set(['0xe819ac5280fe77512aa89d032f608449e4c1d925'])
const addressPattern = /^0x[a-fA-F0-9]{40}$/

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
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
