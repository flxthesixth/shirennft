export type Market = {
  market_id: string
  display_name: string
  last_price: string
  quote_volume_24h: string
  active: boolean
  config: { unlocked: boolean; max_leverage: string; min_order_size: string }
}

type Inputs = { capital: number; target: number; days: number; riskPct: number; stopPct: number; tradesPerDay: number; winRate: number; feeBps?: number }

export function plan(input: Inputs, markets: Market[]) {
  const { capital, target, days, riskPct, stopPct, tradesPerDay, winRate, feeBps = 0 } = input
  if (![capital, target, days, riskPct, stopPct, tradesPerDay, winRate, feeBps].every(Number.isFinite) || capital <= 0 || target <= capital || days < 1 || days > 3650 || !Number.isInteger(days) || !Number.isInteger(tradesPerDay) || riskPct <= 0 || riskPct > 2 || stopPct <= 0 || stopPct > 50 || tradesPerDay < 1 || tradesPerDay > 10 || winRate <= 0 || winRate >= 100 || feeBps < 0 || feeBps > 100) throw new Error('Invalid planning inputs')
  const risk = capital * riskPct / 100
  const notional = risk / (stopPct / 100 + 2 * feeBps / 10000)
  const requiredDailyPct = (Math.pow(target / capital, 1 / days) - 1) * 100
  const requiredNetPerTrade = Math.expm1(Math.log(target / capital) / (days * tradesPerDay))
  const p = winRate / 100
  // ponytail: fixed fractional risk, win rate and fees; no path probabilities or market impact.
  const fee = notional * 2 * feeBps / 10000
  const lossFraction = risk / capital
  const rewardRiskFor = (frequency: number) => {
    const logGrowth = Math.log(target / capital) / (days * frequency)
    const winNetFraction = Math.expm1((logGrowth - (1 - p) * Math.log1p(-lossFraction)) / p)
    return (winNetFraction * capital + fee) / (notional * stopPct / 100)
  }
  const requiredRewardRisk = rewardRiskFor(tradesPerDay)
  const tradeCount = days * tradesPerDay
  if (!Number.isFinite(requiredDailyPct) || !Number.isFinite(requiredRewardRisk)) throw new Error('Unrepresentable planning inputs')
  const lossAfterThree = capital * (1 - Math.pow(1 - riskPct / 100, 3))
  const scenarios = Array.from(new Set([1, Math.min(10, tradesPerDay * 2), Math.min(10, tradesPerDay * 4)])).sort((a, b) => a - b).map(frequency => {
    const rr = rewardRiskFor(frequency)
    return { tradesPerDay: frequency, tradeCount: days * frequency, requiredRewardRisk: rr, requiredMovePct: rr * stopPct, feasible: target <= capital || (rr > 0 && rr <= 3 && requiredDailyPct <= 2), screenLoad: frequency <= 1 ? 'LOW' : frequency <= 3 ? 'MEDIUM' : 'HIGH' }
  })
  const options = markets.filter(m => m.active && m.config?.unlocked && Number(m.last_price) > 0 && Number(m.config.max_leverage) >= 1 && Number(m.config.min_order_size) > 0 && Number(m.config.min_order_size) * Number(m.last_price) <= notional)
    .sort((a, b) => Number(b.quote_volume_24h) - Number(a.quote_volume_24h)).slice(0, 3)
    .map(m => ({ marketId: m.market_id, name: m.display_name, price: Number(m.last_price), notional, risk, leverage: Math.max(1, notional / capital), maxLeverage: Math.min(5, Number(m.config.max_leverage)), requiredRewardRisk, requiredMovePct: requiredRewardRisk * stopPct, estimatedRoundTripFee: fee, feasible: target <= capital || (notional / capital <= Math.min(5, Number(m.config.max_leverage)) && requiredRewardRisk > 0 && requiredRewardRisk <= 3 && requiredDailyPct <= 2) }))
    .filter(o => o.leverage <= o.maxLeverage)
  return { requiredDailyPct, requiredNetPerTrade, requiredRewardRisk, tradeCount, lossAfterThree, risk, notional, scenarios, options }
}
