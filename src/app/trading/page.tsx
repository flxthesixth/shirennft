'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Market, ceilingPath, plan } from './planner'
import styles from './page.module.css'

type Trader = { rank: string; address: string; notional_pnl: string; roi_percent: string; win_rate: string; trades: string; notional_volume: string }
type Portfolio = { summary: { total_account_value: string; free_collateral: string; margin_usage: string }; positions: { size: string; market_name: string; side: number; unrealized_pnl: string }[] }
type Provider = { request: (args: { method: string }) => Promise<unknown>; on?: (event: string, handler: (...args: unknown[]) => void) => void }
const addressPattern = /^0x[a-fA-F0-9]{40}$/

export default function TradingPage() {
  const [address, setAddress] = useState('')
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [selectedMarket, setSelectedMarket] = useState('')
  const [traders, setTraders] = useState<Trader[]>([])
  const [period, setPeriod] = useState('30d')
  const [traderError, setTraderError] = useState('')
  const [traderLoading, setTraderLoading] = useState(false)
  const [openTrader, setOpenTrader] = useState('')
  const [publicPositions, setPublicPositions] = useState<{ market_name: string; size: string; side: number; leverage: string; unrealized_pnl: string }[] | null>(null)
  const [positionError, setPositionError] = useState('')
  const [positionLoading, setPositionLoading] = useState(false)
  const positionVersion = useRef(0)
  const [fetchedAt, setFetchedAt] = useState('')
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
  const [chartStep, setChartStep] = useState(4)
  const connectVersion = useRef(0)
  const leaderboardVersion = useRef(0)

  useEffect(() => {
    const provider = (window as Window & { ethereum?: Provider }).ethereum
    if (!provider?.on) return
    const invalidate = () => { connectVersion.current++; setLoading(false); setAddress(''); setPortfolio(null); setMarkets([]); setSelectedMarket(''); setResult(null); setCapital(''); setError('Wallet changed. Reconnect to refresh account data.') }
    provider.on('accountsChanged', invalidate)
    provider.on('chainChanged', invalidate)
    return () => {
      const removable = provider as Provider & { removeListener?: (event: string, handler: (...args: unknown[]) => void) => void }
      removable.removeListener?.('accountsChanged', invalidate)
      removable.removeListener?.('chainChanged', invalidate)
    }
  }, [])

  async function connect() {
    const version = ++connectVersion.current
    setError(''); setResult(null); setPortfolio(null); setAddress(''); setSelectedMarket(''); setCapital(''); setLoading(true)
    try {
      const provider = (window as Window & { ethereum?: Provider }).ethereum
      if (!provider) throw new Error('Open this page in a browser wallet or install a wallet extension.')
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      if (version !== connectVersion.current) return
      const account = Array.isArray(accounts) ? accounts[0] : null
      if (typeof account !== 'string' || !addressPattern.test(account)) throw new Error('Wallet returned no valid address.')
      const [p, m] = await Promise.all([fetch(`/api/trading/portfolio?address=${encodeURIComponent(account)}`, { cache: 'no-store' }), fetch('/api/trading/markets', { cache: 'no-store' })])
      if (version !== connectVersion.current) return
      if (!p.ok || !m.ok) throw new Error('RISEx data unavailable. Try again later.')
      const [accountData, marketData] = await Promise.all([p.json(), m.json()])
      if (version !== connectVersion.current) return
      if (!accountData?.summary || !Array.isArray(accountData.positions) || !Array.isArray(marketData?.markets)) throw new Error('RISEx returned unexpected data.')
      setAddress(account); setPortfolio(accountData); setMarkets(marketData.markets)
      setSelectedMarket('')
      setCapital(String(Number(accountData.summary.free_collateral) || ''))
    } catch (cause) { if (version === connectVersion.current) setError(cause instanceof Error ? cause.message : 'Connection failed.') }
    finally { if (version === connectVersion.current) setLoading(false) }
  }

  async function loadTraders(nextPeriod = period) {
    const version = ++leaderboardVersion.current
    positionVersion.current++; setOpenTrader(''); setPublicPositions(null); setPositionError(''); setPositionLoading(false)
    setPeriod(nextPeriod); setTraders([]); setFetchedAt(''); setTraderError(''); setTraderLoading(true)
    try {
      const response = await fetch(`/api/trading/leaderboard?period=${nextPeriod}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Leaderboard unavailable. Try again.')
      const data = await response.json()
      if (!Array.isArray(data.entries) || typeof data.fetchedAt !== 'string') throw new Error('Leaderboard unavailable. Try again.')
      if (version === leaderboardVersion.current) { setTraders(data.entries); setFetchedAt(data.fetchedAt) }
    } catch (cause) { if (version === leaderboardVersion.current) setTraderError(cause instanceof Error ? cause.message : 'Leaderboard unavailable.') }
    finally { if (version === leaderboardVersion.current) setTraderLoading(false) }
  }

  async function loadPositions(address: string) {
    const version = ++positionVersion.current
    setOpenTrader(address); setPublicPositions(null); setPositionError(''); setPositionLoading(true)
    try {
      const response = await fetch(`/api/trading/portfolio?address=${encodeURIComponent(address)}`, { cache: 'no-store' })
      if (!response.ok) throw Error('Public positions unavailable. Try again.')
      const data = await response.json()
      if (!Array.isArray(data?.positions) || data.positions.some((p: Record<string, unknown>) => typeof p.market_name !== 'string' || !Number.isFinite(Number(p.size)) || ![0, 1].includes(p.side as number) || !Number.isFinite(Number(p.leverage)) || !Number.isFinite(Number(p.unrealized_pnl)))) throw Error('Invalid position data.')
      if (version === positionVersion.current) setPublicPositions(data.positions.filter((p: { size: string }) => Number(p.size) !== 0))
    } catch (cause) { if (version === positionVersion.current) setPositionError(cause instanceof Error ? cause.message : 'Public positions unavailable.') }
    finally { if (version === positionVersion.current) setPositionLoading(false) }
  }
  const availableMarkets = markets.filter(m => m.active && m.config?.unlocked && Number(m.last_price) > 0).sort((a, b) => Number(b.quote_volume_24h) - Number(a.quote_volume_24h))
  const marketId = selectedMarket || availableMarkets[0]?.market_id || ''
  function calculate(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null)
    try {
      setResult(plan({ capital: Number(capital), target: Number(target), days: Number(days), riskPct: Number(risk), stopPct: Number(stop), tradesPerDay: Number(trades), winRate: Number(winRate), feeBps: Number(feeBps) }, markets.filter(m => m.market_id === marketId)))
    } catch { setError('Check inputs: target above capital; days 1–3650; risk above 0% and below 100%; stop above 0% and at most 50%; trades/day 1–10; win rate above 0% and below 100%; fees 0–100 bps per side.') }
  }
  const activePositions = portfolio?.positions.filter(p => Number(p.size) !== 0) ?? []
  const path = result ? ceilingPath({ capital: Number(capital), target: Number(target), days: Number(days), riskPct: Number(risk), stopPct: Number(stop), tradesPerDay: Number(trades), winRate: Number(winRate), feeBps: Number(feeBps) }, result) : []
  const end = path.at(-1)
  const inspected = path[chartStep]
  const levels = path.flatMap(point => [point.target, point.ceiling].filter((value): value is number => value != null && value > 0))
  const floor = Math.min(...levels)
  const span = Math.log(Math.max(...levels) / floor) || 1
  const plot = (key: 'target' | 'ceiling') => path.map((point, index) => `${index * 25},${90 - 80 * Math.log((point[key] ?? floor) / floor) / span}`).join(' ')
  const reasons = result ? [
    ...(result.requiredDailyPct > 2 ? [`Daily growth ${result.requiredDailyPct.toFixed(2)}% exceeds the 2% display bound. Extend the horizon or lower the ending target.`] : []),
    ...(result.requiredRewardRisk > 3 ? [`Required reward/risk ${result.requiredRewardRisk.toFixed(2)}× exceeds the 3× display bound. Extend the horizon, lower the target, or revisit the assumed win rate and trade frequency.`] : []),
    ...(result.options.length === 0 ? ['This market does not fit its minimum order or leverage limit with your risk and stop. Choose another market or adjust the inputs.'] : []),
  ] : []
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.top}><Link href="/" className={styles.brand}>SHIRΞN<span>.</span></Link><Link href="/">← BACK</Link></header>
    <div className={styles.intro}><span>RISEx / READ-ONLY</span><h1>Pre-Trade Desk</h1><p>Plan from your actual account. Examine what a target demands before placing a trade.</p></div>
    <section className={styles.panel}><div className={styles.row}><div><span className={styles.kicker}>CONNECTED ACCOUNT</span><p>{address ? `${address.slice(0, 8)}…${address.slice(-6)}` : 'No wallet connected'}</p></div><button type="button" onClick={connect} disabled={loading}>{loading ? 'LOADING...' : address ? 'REFRESH / CONNECT' : 'CONNECT WALLET'}</button></div>
      {portfolio && <div className={styles.metrics}><div><span>Account value</span><strong>${Number(portfolio.summary.total_account_value).toLocaleString()}</strong></div><div><span>Free collateral</span><strong>${Number(portfolio.summary.free_collateral).toLocaleString()}</strong></div><div><span>Open positions</span><strong>{activePositions.length}</strong></div></div>}
      {activePositions.length > 0 && <p className={styles.small}>Existing exposure: {activePositions.map(p => `${p.market_name} ${p.side === 0 ? 'long' : 'short'} (${p.size})`).join(' · ')}. Plans below do not model cross-margin interaction.</p>}
    </section>
    {portfolio && <form onSubmit={calculate} onChange={() => setResult(null)} className={styles.panel}><span className={styles.kicker}>PLAN</span><div className={styles.fields}>
      <label>Market<select aria-label="Market" value={marketId} onChange={e => setSelectedMarket(e.target.value)} required>{availableMarkets.map(m => <option key={m.market_id} value={m.market_id}>{m.display_name}</option>)}</select></label>
      <label>Capital allocated (USD)<input type="number" min="0.01" step="any" value={capital} onChange={e => setCapital(e.target.value)} required /></label>
      <label>Target ending balance (USD)<input type="number" min="0.01" step="any" value={target} onChange={e => setTarget(e.target.value)} required /></label>
      <label>Time horizon (days)<input type="number" min="1" max="3650" step="1" value={days} onChange={e => setDays(e.target.value)} required /></label>
      <label>Risk per trade (%)<input type="number" min="0.01" max="99.99" step="any" value={risk} onChange={e => setRisk(e.target.value)} required /></label>
      <label>Assumed stop distance (%)<input type="number" min="0.01" max="50" step="any" value={stop} onChange={e => setStop(e.target.value)} required /></label>
      <label>Trades per day<input type="number" min="1" max="10" step="1" value={trades} onChange={e => setTrades(e.target.value)} required /></label>
      <label>Assumed win rate (%)<input type="number" min="0.01" max="99.99" step="any" value={winRate} onChange={e => setWinRate(e.target.value)} required /></label>
      <label>Assumed fee per side (bps)<input type="number" min="0" max="100" step="any" value={feeBps} onChange={e => setFeeBps(e.target.value)} required /></label>
    </div>{Number(risk) > 2 && <p className={styles.warning}>Risk above 2% per trade. Three losses in a row would cut this plan’s capital by about {(100 * (1 - Math.pow(1 - Number(risk) / 100, 3))).toFixed(1)}%, before slippage.</p>}{Number(capital) > Number(portfolio.summary.free_collateral) && <p className={styles.small}>Capital exceeds current free collateral (${Number(portfolio.summary.free_collateral).toLocaleString()}). This is a hypothetical plan.</p>}<button type="submit">Analyze</button><p className={styles.small}>Fee is an estimate you enter, not a live quote. Funding, slippage and liquidation are not included. No orders or signatures.</p></form>}
    <section className={styles.panel}><span className={styles.kicker}>TRADER WATCHLIST</span><h2>RISEx top 100</h2><p className={styles.small}>Ranked by notional PnL. A high rank does not mean low risk. Open positions load when you choose a trader. They can change at any time; this is not a copy signal.</p><div className={styles.row}><label>Period<select aria-label="Leaderboard period" value={period} onChange={e => loadTraders(e.target.value)}><option value="1d">1 day</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="all">All time</option></select></label><button type="button" onClick={() => loadTraders()} disabled={traderLoading}>{traderLoading ? 'Loading...' : traders.length ? 'Refresh top 100' : 'Load top 100'}</button></div>{traderError && <p role="alert" className={styles.error}>{traderError}</p>}{fetchedAt && <p className={styles.small}>{traders.length} traders · fetched {new Date(fetchedAt).toLocaleString()}</p>}<div className={styles.traderList}>{traders.map(trader => <details key={trader.address} className={styles.trader}><summary><strong>#{trader.rank} {trader.address.slice(0, 6)}…{trader.address.slice(-4)}</strong><span>ROI {Number(trader.roi_percent).toFixed(1)}% · {trader.trades} trades</span></summary><p>Notional PnL ${(Number(trader.notional_pnl) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })} · Win rate {Number(trader.win_rate).toFixed(1)}% · Volume ${Number(trader.notional_volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p><p className={styles.small}>Leaderboard figures do not show drawdown. Check the trader on RISEx before deciding.</p><button type="button" disabled={positionLoading && openTrader === trader.address} onClick={() => loadPositions(trader.address)}>{positionLoading && openTrader === trader.address ? 'Loading...' : 'Load open positions'}</button>{openTrader === trader.address && <div aria-live="polite">{positionError && <p role="alert" className={styles.error}>{positionError}</p>}{publicPositions && (publicPositions.length ? <ul className={styles.positionList}>{publicPositions.map((position, index) => <li key={`${position.market_name}-${index}`}><strong>{position.market_name}</strong> · {position.side === 0 ? 'Long' : 'Short'} · Size {position.size} · {position.leverage}× leverage · Unrealized PnL ${Number(position.unrealized_pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}</li>)}</ul> : <p className={styles.small}>No open positions reported.</p>)}</div>}</details>)}</div><p className={styles.small}>Data: <a href="https://www.rise.trade/en/leaderboard" target="_blank" rel="noopener noreferrer">RISEx leaderboard</a>. No orders or wallet signatures.</p></section>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {result && <section className={styles.panel} aria-live="polite"><span className={styles.kicker}>RESULT · {availableMarkets.find(m => m.market_id === marketId)?.display_name}</span><h2 className={styles.verdict}>{reasons.length ? 'Plan exceeds limits' : 'Plan fits these limits'}</h2><p className={styles.small}>{reasons.length ? 'Check the reasons below. These are planning limits, not RISEx rules.' : 'This is a calculation, not a forecast or a trade signal.'}</p>{reasons.length > 0 && <ul className={styles.reasons}>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
      <div className={styles.chart}><div className={styles.chartHead}><span className={styles.kicker}>ENDING BALANCE PATH</span><span>USD · {days} days</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Illustrative target balance and 3× reward-to-risk scenario over time"><line x1="0" x2="100" y1="90" y2="90" className={styles.axis}/><polyline points={plot('target')} className={styles.targetLine}/>{end?.ceiling != null && <polyline points={plot('ceiling')} className={styles.scenarioLine}/>}</svg><label className={styles.chartInspect}>Inspect day {Math.round(inspected.day)}<input type="range" min="0" max="4" step="1" value={chartStep} onChange={event => setChartStep(Number(event.target.value))} aria-label="Inspect balance path by day" /></label><p className={styles.chartReadout}>Target ${inspected.target.toLocaleString(undefined, { maximumFractionDigits: 2 })} · 3× scenario {inspected.ceiling == null ? 'not representable' : `$${inspected.ceiling.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</p><div className={styles.chartLegend}><span><i className={styles.targetKey}/> Target ${Number(target).toLocaleString()}</span><span><i className={styles.scenarioKey}/> 3× reward/risk scenario {end?.ceiling == null ? 'not representable' : `$${end.ceiling.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</span></div><p className={styles.small}>Illustration assumes fixed fractional risk, {winRate}% wins, {trades} trades/day, {stop}% stop and {feeBps} bps/side. The 3× line is an assumed outcome per win, not a return cap, price forecast, or achievable strategy. No slippage, funding, liquidation or trade-order effects.</p></div>
      <span className={styles.kicker}>TARGET PRESSURE</span><div className={styles.metrics}><div><span>Required daily growth</span><strong>{result.requiredDailyPct.toFixed(2)}%</strong></div><div><span>Risk per trade</span><strong>${result.risk.toFixed(2)}</strong></div><div><span>Required reward / risk*</span><strong>{result.requiredRewardRisk.toFixed(1)}×</strong></div></div><p className={styles.small}>{result.tradeCount} hypothetical trades in {days} days · 3 consecutive stop-outs: about ${result.lossAfterThree.toFixed(2)} lost before slippage/funding. Stop trading after a pre-set loss limit; plan screen time accordingly.</p><p className={styles.small}>*Deterministic compounded path using assumed win rate, fixed stop and fees; not a probability or forecast. Real trade order, funding, slippage and liquidations can change outcomes.</p>
      <span className={styles.kicker}>TRADE FREQUENCY SCENARIOS</span>{result.scenarios.map(s => <div className={styles.option} key={s.tradesPerDay}><strong>{s.tradesPerDay} trade{s.tradesPerDay > 1 ? 's' : ''} / day</strong><p>{s.tradeCount} trades total · required reward/risk {s.requiredRewardRisk.toFixed(1)}× · target price move {s.requiredMovePct.toFixed(1)}% per winning trade · screen load {s.screenLoad}</p><b>{result.options.length && s.feasible ? 'WITHIN PLANNING BOUNDS — NOT A FORECAST' : 'NOT WITHIN PLANNING BOUNDS'}</b></div>)}
      <span className={styles.kicker}>SELECTED MARKET</span>
      {result.options.length === 0 ? <p>This market does not fit the minimum order or leverage needed for this plan.</p> : result.options.map(o => <div className={styles.option} key={o.marketId}><div><strong>{o.name}</strong><span>Live RISEx market · ${o.price.toLocaleString()}</span></div><p>Illustrative position: ${o.notional.toFixed(2)} · {o.leverage.toFixed(2)}× leverage · stop {stop}% · target move {o.requiredMovePct.toFixed(1)}% · baseline round-trip fees ${o.estimatedRoundTripFee.toFixed(2)} at entry notional (exit fee varies with price) · required reward/risk {o.requiredRewardRisk.toFixed(1)}×</p><b>{o.feasible ? 'WITHIN PLANNING BOUNDS — NOT A TRADE SIGNAL' : 'TARGET EXCEEDS PLANNING BOUNDS'}</b></div>)}
      <p className={styles.small}>You chose this market. Risk above 2% is allowed but warned. Leverage is capped at 5× in this plan; 3× reward/risk and 2% daily growth are display limits, not RISEx rules. Stops can slip.</p>
    </section>}
  </div></main>
}
