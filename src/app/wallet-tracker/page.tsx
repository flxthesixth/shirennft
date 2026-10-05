"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

type Category = 'Core' | 'Stablecoin' | 'Token' | 'Meme' | 'DeFi' | 'Other'
type Asset = { id: string; symbol: string; name: string; amount: number; usd: number | null; category: Category; reputation?: string | null }
type Activity = { hash: string; timestamp: string | null; from: string | null; to: string | null; status: string | null; value: number | null }
type Snapshot = { chain: string; address: string; assets: Asset[]; nftCount: number; nftMore: boolean; tokenMore: boolean; transactions: Activity[]; transactionMore: boolean; fetchedAt: string }
const categories: Category[] = ['Core', 'Stablecoin', 'Token', 'Meme', 'DeFi', 'Other']
const key = 'shiren-personal-wallet-tracker-v1'
const addressPattern = /^0x[a-fA-F0-9]{40}$/
const money = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v)
const number = (v: number) => new Intl.NumberFormat('en-US', { maximumSignificantDigits: 8 }).format(v)
const short = (s: string) => s.slice(0, 6) + '…' + s.slice(-4)

export default function WalletTracker() {
  const [addresses, setAddresses] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({})
  const [overrides, setOverrides] = useState<Record<string, Category>>({})
  const [error, setError] = useState('')
  const [failures, setFailures] = useState<Record<string, string>>({})
  const [selectedWallet, setSelectedWallet] = useState('all')
  const [retryWallet, setRetryWallet] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const version = useRef(0)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}')
      if (Array.isArray(saved.addresses)) setAddresses(saved.addresses.filter((a: unknown): a is string => typeof a === 'string' && addressPattern.test(a)).slice(0, 5))
      if (saved.overrides && typeof saved.overrides === 'object' && !Array.isArray(saved.overrides)) {
        const valid = Object.entries(saved.overrides).filter(([id, value]) => /^0x[a-fA-F0-9]{40}:([a-z0-9]+|native)$/.test(id) && categories.includes(value as Category)) as [string, Category][]
        setOverrides(Object.fromEntries(valid))
      }
    } catch { /* Ignore corrupt local settings. */ }
    setReady(true)
  }, [])
  useEffect(() => { if (ready) localStorage.setItem(key, JSON.stringify({ addresses, overrides })) }, [addresses, overrides, ready])
  useEffect(() => {
    const current = ++version.current
    let cancelled = false
    if (!ready || !addresses.length) { setSnapshots({}); setFailures({}); return }
    // ponytail: refresh only on demand/address change; add background updates when data limits and caching exist.
    const run = async () => {
      setLoading(true); setError('')
      if (!retryWallet) { setSnapshots({}); setFailures({}) }
      const targets = retryWallet && addresses.includes(retryWallet) ? [retryWallet] : addresses
      const results = await Promise.all(targets.map(async address => {
        try {
          const response = await fetch(`/api/wallet-tracker?address=${encodeURIComponent(address)}`, { cache: 'no-store' })
          if (!response.ok) throw Error(response.status === 502 ? 'Explorer data unavailable' : `Request failed (${response.status})`)
          const data = await response.json() as Snapshot
          if (!Array.isArray(data.assets) || !Array.isArray(data.transactions) || data.address?.toLowerCase() !== address) throw Error('Invalid explorer data')
          return { address, data }
        } catch (cause) { return { address, reason: cause instanceof Error ? cause.message : 'Request failed' } }
      }))
      if (cancelled || current !== version.current) return
      const good = Object.fromEntries(results.filter((r): r is { address: string; data: Snapshot } => 'data' in r).map(r => [r.address, r.data]))
      const bad = Object.fromEntries(results.filter((r): r is { address: string; reason: string } => 'reason' in r).map(r => [r.address, r.reason]))
      setSnapshots(previous => retryWallet ? { ...previous, ...good } : good)
      setFailures(previous => retryWallet ? { ...previous, ...bad, ...Object.fromEntries(Object.keys(good).map(a => [a, ''])) } : bad)
      setLoading(false)
    }
    void run()
    return () => { cancelled = true }
  }, [addresses, ready, refresh, retryWallet])
  function retry(address: string) { setRetryWallet(address); setRefresh(n => n + 1) }
  function addWallet(e: React.FormEvent) {
    e.preventDefault()
    const address = input.trim().toLowerCase()
    if (!addressPattern.test(address)) { setError('Enter a valid Ethereum address.'); return }
    if (addresses.includes(address)) { setError('Wallet already added.'); return }
    if (addresses.length >= 5) { setError('Limit: 5 wallets.'); return }
    setRetryWallet(''); setAddresses([...addresses, address]); setInput(''); setError('')
  }
  const loaded = selectedWallet === 'all' ? Object.values(snapshots) : snapshots[selectedWallet] ? [snapshots[selectedWallet]] : []
  const failedCount = addresses.filter(a => failures[a]).length
  const assets = loaded.flatMap(s => s.assets.map(asset => ({ ...asset, wallet: s.address.toLowerCase(), category: overrides[`${s.address.toLowerCase()}:${asset.id}`] || asset.category })))
  const priced = assets.filter(a => a.usd !== null && Number.isFinite(a.usd))
  const total = priced.reduce((sum, a) => sum + (a.usd || 0), 0)
  const unpriced = assets.filter(a => a.usd === null)
  const breakdown = categories.map(category => ({ category, usd: priced.filter(a => a.category === category).reduce((sum, a) => sum + (a.usd || 0), 0) })).filter(row => row.usd > 0)
  const palette = ['#9fe9b4', '#6aa7db', '#d9b978', '#d78e9d', '#a59cd8', '#9ba9a0']
  let offset = 0
  const stops = breakdown.map(row => {
    const start = offset
    offset += row.usd / total * 100
    return `${palette[categories.indexOf(row.category)]} ${start}% ${offset}%`
  })
  const allocationLabel = `Priced asset allocation: ${breakdown.map(row => `${row.category} ${(row.usd / total * 100).toFixed(1)} percent`).join(', ')}`
  const activities = loaded.flatMap(s => s.transactions.map(tx => ({ ...tx, wallet: s.address.toLowerCase() }))).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 30)
  return <main className={styles.main}>
    <nav><Link href="/">SHIREN</Link><span> / Personal Wallet Tracker</span></nav>
    <header><p className={styles.label}>READ-ONLY · ETHEREUM MAINNET</p><h1>Wallet Tracker</h1><p>Balances and activity in one place. No wallet connection or signature.</p></header>
    <section className={styles.panel}><h2>Wallets</h2><form onSubmit={addWallet} className={styles.row}><label htmlFor="address">Ethereum address</label><input id="address" value={input} onChange={e => setInput(e.target.value)} placeholder="0x…" autoComplete="off" spellCheck={false}/><button type="submit">Add wallet</button></form>
      <p className={styles.muted}>Up to 5 addresses. Saved only in this browser. Anyone with an address can view its public on-chain data.</p>
      {addresses.length > 0 && <><button type="button" disabled={loading} onClick={() => { setRetryWallet(''); setRefresh(n => n + 1) }}>Refresh</button><label className={styles.viewWallet}>View wallet <select aria-label="View wallet" value={selectedWallet} onChange={e => setSelectedWallet(e.target.value)}><option value="all">All wallets</option>{addresses.map(a => <option key={a} value={a}>{short(a)}</option>)}</select></label></>}
      {addresses.map(a => <div key={a} className={styles.wallet}><span title={a}>{short(a)}</span><a href={`https://eth.blockscout.com/address/${a}`} target="_blank" rel="noopener noreferrer">Explorer</a>{failures[a] && <span className={styles.error}>{failures[a]} <button type="button" disabled={loading} onClick={() => retry(a)} aria-label={`Retry ${a}`}>Retry</button></span>}<button onClick={() => { setRetryWallet(''); if (selectedWallet === a) setSelectedWallet('all'); setAddresses(addresses.filter(x => x !== a)) }} aria-label={`Remove ${a}`}>Remove</button></div>)}
      {failedCount > 0 && <p role="alert" className={styles.error}>{failedCount} wallet{failedCount === 1 ? '' : 's'} unavailable. Totals exclude unavailable wallets.</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}{loading && <p role="status">Loading wallet data…</p>}
    </section>
    {loaded.length > 0 && <><section className={styles.panel}><h2>Balance</h2><p className={styles.total}>{money(total)}<span> priced assets only</span></p><p className={styles.muted}>Snapshot · {loaded.map(s => new Date(s.fetchedAt).toLocaleString()).join(' / ')}. Not a complete net worth.</p>
      {total > 0 && <div className={styles.chartLayout}>
        <div className={styles.donut} role="img" aria-label={allocationLabel} style={{ background: `conic-gradient(${stops.join(', ')})` }}>
          <div className={styles.donutCenter}><span>ALLOCATION</span><strong>{breakdown.length} {breakdown.length === 1 ? 'category' : 'categories'}</strong></div>
        </div>
        <div className={styles.legend}>{breakdown.map(row => <div key={row.category} className={styles.allocation}><span><i className={styles.swatch} style={{ background: palette[categories.indexOf(row.category)] }}/>{row.category}</span><span>{money(row.usd)} <small>{(row.usd / total * 100).toFixed(1)}%</small></span></div>)}</div>
      </div>}
      {total === 0 && <p className={styles.muted}>No priced assets to chart.</p>}
      <p className={styles.muted}>NFTs: {loaded.reduce((n, s) => n + s.nftCount, 0)} shown, not priced{loaded.some(s => s.nftMore) ? ' (more pages exist)' : ''}. Unpriced tokens: {unpriced.length}. DeFi deposits, debt, positions, and assets on other chains are not included. Tokens with no price are excluded from the percentages.</p>
      {loaded.some(s => s.tokenMore) && <p className={styles.error}>Token list was capped at 500 for one wallet. Totals are incomplete.</p>}
    </section>
    <section className={styles.panel}><h2>Assets</h2><p className={styles.muted}>Change a token category here; changes stay in this browser. Categories describe holdings, not what a past transaction was for.</p>
      {assets.filter(a => a.amount > 0).sort((a, b) => (b.usd || 0) - (a.usd || 0)).slice(0, 100).map(a => <div className={styles.asset} key={`${a.wallet}:${a.id}`}><div><strong>{a.symbol}</strong> <small>{short(a.wallet)}</small><br/><small>{number(a.amount)} · {a.usd === null ? 'Price unavailable' : money(a.usd)}{a.reputation === 'scam' ? ' · Flagged by explorer' : ''}</small></div><select aria-label={`Category for ${a.symbol} in ${short(a.wallet)}`} value={a.category} onChange={e => setOverrides({ ...overrides, [`${a.wallet}:${a.id}`]: e.target.value as Category })}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>)}
      {assets.length > 100 && <p className={styles.muted}>Showing first 100 assets; totals include all fetched assets.</p>}
    </section>
    <section className={styles.panel}><h2>Recent transactions</h2><p className={styles.muted}>Native transactions only, first page per wallet. Token transfers, swaps and DeFi interactions may not appear here. Do not use this list as an expense report.</p>
      {activities.length ? activities.map(tx => <div className={styles.activity} key={`${tx.wallet}:${tx.hash}`}><span>{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Time unavailable'} · {tx.from?.toLowerCase() === tx.wallet ? 'Sent' : 'Received'} · {tx.value === null ? 'Amount unavailable' : `${number(tx.value)} ETH`} · {tx.status || 'Unknown'}</span><a href={`https://eth.blockscout.com/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer">{short(tx.hash)}</a></div>) : <p>No native transactions on fetched pages.</p>}
      {loaded.some(s => s.transactionMore) && <p className={styles.muted}>More transactions exist on explorer.</p>}
    </section></>}
    <footer>Read-only Ethereum snapshot. Split bill and other chains are not part of this MVP.</footer>
  </main>
}
