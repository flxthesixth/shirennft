'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { Market, plan } from './planner'
import styles from './page.module.css'

type Portfolio = { summary: { total_account_value: string; free_collateral: string; margin_usage: string }; positions: { size: string; market_name: string; side: number; unrealized_pnl: string }[] }
type Provider = { request: (args: { method: string }) => Promise<unknown>; on?: (event: string, handler: (...args: unknown[]) => void) => void }
const addressPattern = /^0x[a-fA-F0-9]{40}$/

export default function TradingPage() {
  const [address, setAddress] = useState('')
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [capital, setCapital] = useState('')
  const [target, setTarget] = useState('10000')
  const [days, setDays] = useState('30')
  const [risk, setRisk] = useState('1')
  const [stop, setStop] = useState('2')
  const [trades, setTrades] = useState('1')
  const [winRate, setWinRate] = useState('50')
  const [feeBps, setFeeBps] = useState('5')
  const [result, setResult] = useState<ReturnType<typeof plan> | null>(null)

  useEffect(() => {
    const provider = (window as Window & { ethereum?: Provider }).ethereum
    if (!provider?.on) return
    const invalidate = () => { setAddress(''); setPortfolio(null); setMarkets([]); setResult(null); setCapital(''); setError('Wallet changed. Reconnect to refresh account data.') }
    provider.on('accountsChanged', invalidate)
    provider.on('chainChanged', invalidate)
    return () => {
      const removable = provider as Provider & { removeListener?: (event: string, handler: (...args: unknown[]) => void) => void }
      removable.removeListener?.('accountsChanged', invalidate)
      removable.removeListener?.('chainChanged', invalidate)
    }
  }, [])

  async function connect() {
    setError(''); setResult(null); setPortfolio(null); setAddress(''); setCapital(''); setLoading(true)
    try {
      const provider = (window as Window & { ethereum?: Provider }).ethereum
      if (!provider) throw new Error('Open this page in a browser wallet or install a wallet extension.')
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      const account = Array.isArray(accounts) ? accounts[0] : null
      if (typeof account !== 'string' || !addressPattern.test(account)) throw new Error('Wallet returned no valid address.')
      const [p, m] = await Promise.all([fetch(`/api/trading/portfolio?address=${encodeURIComponent(account)}`, { cache: 'no-store' }), fetch('/api/trading/markets', { cache: 'no-store' })])
      if (!p.ok || !m.ok) throw new Error('RISEx data unavailable. Try again later.')
      const [accountData, marketData] = await Promise.all([p.json(), m.json()])
      if (!accountData?.summary || !Array.isArray(accountData.positions) || !Array.isArray(marketData?.markets)) throw new Error('RISEx returned unexpected data.')
      setAddress(account); setPortfolio(accountData); setMarkets(marketData.markets)
      setCapital(String(Number(accountData.summary.free_collateral) || ''))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Connection failed.') }
    finally { setLoading(false) }
  }

  function calculate(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null)
    try {
      setResult(plan({ capital: Number(capital), target: Number(target), days: Number(days), riskPct: Number(risk), stopPct: Number(stop), tradesPerDay: Number(trades), winRate: Number(winRate), feeBps: Number(feeBps) }, markets))
    } catch { setError('Check inputs: target ending balance above allocated capital; days 1–3650; risk >0–2%; stop >0–50%; trades/day 1–10; win rate >0–<100%; fees 0–100 bps per side.') }
  }
  const activePositions = portfolio?.positions.filter(p => Number(p.size) !== 0) ?? []
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.top}><Link href="/" className={styles.brand}>SHIRΞN<span>.</span></Link><Link href="/">← BACK</Link></header>
    <div className={styles.intro}><span>RISEx / READ-ONLY</span><h1>Pre-Trade Desk</h1><p>Plan from your actual account. Examine what a target demands before placing a trade.</p></div>
    <section className={styles.panel}><div className={styles.row}><div><span className={styles.kicker}>CONNECTED ACCOUNT</span><p>{address ? `${address.slice(0, 8)}…${address.slice(-6)}` : 'No wallet connected'}</p></div><button type="button" onClick={connect} disabled={loading}>{loading ? 'LOADING...' : address ? 'REFRESH / CONNECT' : 'CONNECT WALLET'}</button></div>
      {portfolio && <div className={styles.metrics}><div><span>Account value</span><strong>${Number(portfolio.summary.total_account_value).toLocaleString()}</strong></div><div><span>Free collateral</span><strong>${Number(portfolio.summary.free_collateral).toLocaleString()}</strong></div><div><span>Open positions</span><strong>{activePositions.length}</strong></div></div>}
      {activePositions.length > 0 && <p className={styles.small}>Existing exposure: {activePositions.map(p => `${p.market_name} ${p.side === 0 ? 'long' : 'short'} (${p.size})`).join(' · ')}. Plans below do not model cross-margin interaction.</p>}
    </section>
    {portfolio && <form onSubmit={calculate} className={styles.panel}><span className={styles.kicker}>YOUR PARAMETERS</span><div className={styles.fields}>
      <label>Capital allocated (USD)<input type="number" min="0.01" step="any" value={capital} onChange={e => setCapital(e.target.value)} required /></label>
      <label>Target ending balance (USD)<input type="number" min="0.01" step="any" value={target} onChange={e => setTarget(e.target.value)} required /></label>
      <label>Time horizon (days)<input type="number" min="1" max="3650" step="1" value={days} onChange={e => setDays(e.target.value)} required /></label>
      <label>Risk per trade (%)<input type="number" min="0.01" max="2" step="any" value={risk} onChange={e => setRisk(e.target.value)} required /></label>
      <label>Assumed stop distance (%)<input type="number" min="0.01" max="50" step="any" value={stop} onChange={e => setStop(e.target.value)} required /></label>
      <label>Trades per day<input type="number" min="1" max="10" step="1" value={trades} onChange={e => setTrades(e.target.value)} required /></label>
      <label>Assumed win rate (%)<input type="number" min="0.01" max="99.99" step="any" value={winRate} onChange={e => setWinRate(e.target.value)} required /></label>
      <label>Assumed fee per side (bps)<input type="number" min="0" max="100" step="any" value={feeBps} onChange={e => setFeeBps(e.target.value)} required /></label>
    </div>{Number(capital) > Number(portfolio.summary.free_collateral) && <p className={styles.small}>Planning with assumed future capital. Current RISEx free collateral is ${Number(portfolio.summary.free_collateral).toLocaleString()}; this amount is not available for trading yet.</p>}<button type="submit">ANALYZE TARGET ↗</button><p className={styles.small}>Fee is your assumption, not a live RISEx fee quote. Funding, slippage, liquidation and market direction not modeled. No orders or wallet signatures requested.</p></form>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {result && <section className={styles.panel} aria-live="polite"><span className={styles.kicker}>TARGET PRESSURE</span><div className={styles.metrics}><div><span>Required daily growth</span><strong>{result.requiredDailyPct.toFixed(2)}%</strong></div><div><span>Risk per trade</span><strong>${result.risk.toFixed(2)}</strong></div><div><span>Required reward / risk*</span><strong>{result.requiredRewardRisk.toFixed(1)}×</strong></div></div><p className={styles.small}>{result.tradeCount} hypothetical trades in {days} days · 3 consecutive stop-outs: about ${result.lossAfterThree.toFixed(2)} lost before slippage/funding. Stop trading after a pre-set loss limit; plan screen time accordingly.</p><p className={styles.small}>*Deterministic compounded path using assumed win rate, fixed stop and fees; not a probability or forecast. Real trade order, funding, slippage and liquidations can change outcomes.</p>
      <span className={styles.kicker}>TRADE FREQUENCY SCENARIOS</span>{result.scenarios.map(s => <div className={styles.option} key={s.tradesPerDay}><strong>{s.tradesPerDay} trade{s.tradesPerDay > 1 ? 's' : ''} / day</strong><p>{s.tradeCount} trades total · required reward/risk {s.requiredRewardRisk.toFixed(1)}× · target price move {s.requiredMovePct.toFixed(1)}% per winning trade · screen load {s.screenLoad}</p><b>{result.options.length && s.feasible ? 'WITHIN PLANNING BOUNDS — NOT A FORECAST' : 'NOT WITHIN PLANNING BOUNDS'}</b></div>)}
      <span className={styles.kicker}>MARKET CANDIDATES</span>
      {result.options.length === 0 ? <p>No active RISEx market fits the minimum order, risk and leverage limits used here. Adjust parameters; do not force a trade.</p> : result.options.map(o => <div className={styles.option} key={o.marketId}><div><strong>{o.name}</strong><span>Live RISEx market · ${o.price.toLocaleString()}</span></div><p>Illustrative position: ${o.notional.toFixed(2)} · {o.leverage.toFixed(2)}× leverage · stop {stop}% · target move {o.requiredMovePct.toFixed(1)}% · assumed round-trip fees ${o.estimatedRoundTripFee.toFixed(2)} · required reward/risk {o.requiredRewardRisk.toFixed(1)}×</p><b>{o.feasible ? 'WITHIN PLANNING BOUNDS — NOT A TRADE SIGNAL' : 'TARGET EXCEEDS PLANNING BOUNDS'}</b></div>)}
      <p className={styles.small}>Market names are candidates by volume, not picks or expected winners. Up to 2% risk/trade, 5× leverage, 3× required reward/risk and 2% daily target are conservative display bounds, not guarantees or RISEx risk rules. Stop orders may slip. Pause after losses; limit trade frequency to what you can monitor.</p>
    </section>}
  </div></main>
}
