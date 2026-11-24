// Portfolio math shared by the portal pages and the daily snapshot job.
import type { Holding, Quote } from '@/lib/types'

export type Position = Holding & {
  /** Per share, or per $100 of face for bonds. */
  price: number | null
  value: number | null
  /** Total cost basis. */
  cost: number | null
  dayChange: number | null
  dayChangePct: number | null
  gain: number | null
  gainPct: number | null
  weight: number | null
  high52: number | null
  low52: number | null
  /** Where `price` came from: a live quote, or Fidelity (bonds, and any stock whose live quote didn't come back). */
  priceSource: 'live' | 'fidelity' | null
  /** First bought today: today's change runs from the purchase price, as on Fidelity. */
  boughtToday: boolean
}

export type SectorSlice = { sector: string; value: number; weight: number; count: number; dayChangePct: number | null }

export type Portfolio = {
  positions: Position[]
  invested: number
  cash: number
  total: number
  /** Cost and unrealized gain of the positions whose cost basis is known. */
  cost: number
  gain: number
  costCovered: number
  dayChange: number
  /** Today's change against yesterday's total, cash included, like Fidelity's account "Today's gain/loss". */
  dayChangePct: number | null
  missingShares: number
  /** Stocks with no live quote and no Fidelity price to fall back on (left out of the totals). */
  unpriced: number
  /** Stocks valued at the last Fidelity price because no live quote came back. */
  fallbackPriced: number
  /** Time of the newest live quote (ms since epoch). */
  quotedAt: number | null
  sectors: SectorSlice[]
  hasValues: boolean
}

export type PortfolioOptions = {
  /** Today in Eastern time ("YYYY-MM-DD"), to spot holdings first bought today. */
  today?: string
  /** Last known price by ticker (from the Fidelity import), used when a live quote is missing. */
  fallbackPrices?: Record<string, number>
}

export const PORTFOLIO_LEVEL = 'Portfolio-level'

/** Bonds are quoted per $100 of face: a $2,000 note at 93.72 is worth $1,874.40. */
export function priceUnit(h: Pick<Holding, 'asset_type' | 'ticker'>) {
  return h.asset_type === 'bond' && !h.ticker ? 0.01 : 1
}

const n = (v: number | string | null | undefined) => (v === null || v === undefined || v === '' ? null : Number(v))

export function buildPortfolio(holdings: Holding[], quotes: Record<string, Quote>, cash = 0, options: PortfolioOptions = {}): Portfolio {
  const { today, fallbackPrices = {} } = options
  let missingShares = 0
  let unpriced = 0
  let fallbackPriced = 0
  let quotedAt: number | null = null

  const positions: Position[] = holdings.filter(h => h.is_active).map(h => {
    const ticker = h.ticker ? h.ticker.trim().toUpperCase() : null
    const q = ticker ? quotes[ticker] ?? null : null
    const fallback = ticker && !q ? n(fallbackPrices[ticker] ?? fallbackPrices[ticker.replace(/[./]/g, '-')]) : null
    if (ticker && !q) {
      if (fallback !== null && fallback > 0) fallbackPriced++
      else unpriced++
    }
    if (ticker && !h.shares) missingShares++
    if (q?.time && (quotedAt === null || q.time > quotedAt)) quotedAt = q.time
    const unit = priceUnit(h)
    const shares = n(h.shares) ?? 0
    const costBasis = n(h.cost_basis)
    const manual = n(h.manual_value)
    const quoted = q?.price ?? (fallback !== null && fallback > 0 ? fallback : null)
    const value = ticker ? (quoted !== null && shares ? quoted * shares : null) : manual
    const price = ticker ? quoted : (manual !== null && shares ? manual / (shares * unit) : null)
    const cost = costBasis !== null && shares ? costBasis * shares * unit : null
    const gain = value !== null && cost !== null ? value - cost : null
    const boughtToday = Boolean(today && ticker && h.purchased_on === today)
    let dayChange = ticker && q?.change !== null && q?.change !== undefined && shares ? q.change * shares : null
    let dayChangePct = q?.changePct ?? null
    // Bought today: FIG only made (or lost) the move since the purchase, not since yesterday's close.
    if (boughtToday && q && gain !== null && cost) {
      dayChange = gain
      dayChangePct = gain / cost
    }
    return {
      ...h,
      price,
      value,
      cost,
      dayChange,
      dayChangePct,
      gain,
      gainPct: gain !== null && cost ? gain / cost : null,
      weight: null,
      high52: q?.high52 ?? null,
      low52: q?.low52 ?? null,
      priceSource: ticker ? (q ? 'live' : quoted !== null ? 'fidelity' : null) : manual !== null ? 'fidelity' : null,
      boughtToday,
    }
  })

  const invested = positions.reduce((s, p) => s + (p.value ?? 0), 0)
  const total = invested + (cash || 0)
  for (const p of positions) p.weight = p.value !== null && total > 0 ? p.value / total : null

  const withCost = positions.filter(p => p.gain !== null)
  const dayChange = positions.reduce((s, p) => s + (p.dayChange ?? 0), 0)
  const previousTotal = total - dayChange
  const hasDayChange = positions.some(p => p.dayChange !== null)

  const bySector = new Map<string, { value: number; count: number; change: number }>()
  for (const p of positions) {
    const key = p.sector ?? PORTFOLIO_LEVEL
    const cur = bySector.get(key) ?? { value: 0, count: 0, change: 0 }
    cur.value += p.value ?? 0
    cur.count += 1
    cur.change += p.dayChange ?? 0
    bySector.set(key, cur)
  }
  const sectors = [...bySector.entries()]
    .map(([sector, v]) => ({
      sector,
      value: v.value,
      count: v.count,
      weight: total > 0 ? v.value / total : 0,
      dayChangePct: v.value - v.change > 0 ? v.change / (v.value - v.change) : null,
    }))
    .sort((a, b) => b.value - a.value || b.count - a.count)

  return {
    positions,
    invested,
    cash: cash || 0,
    total,
    cost: withCost.reduce((s, p) => s + p.cost!, 0),
    gain: withCost.reduce((s, p) => s + p.gain!, 0),
    costCovered: withCost.length,
    dayChange,
    dayChangePct: hasDayChange && invested > 0 && previousTotal > 0 ? dayChange / previousTotal : null,
    missingShares,
    unpriced,
    fallbackPriced,
    quotedAt,
    sectors,
    hasValues: invested > 0,
  }
}

/** Equal-weight day change for a list of positions (works before share counts exist). */
export function averageDayChange(positions: Position[]) {
  const vals = positions.map(p => p.dayChangePct).filter((v): v is number => v !== null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

/** Bond yields from price (per $100), coupon (%) and maturity: current yield,
 *  and yield to maturity with semiannual coupons (ignores accrued interest). */
export function bondYields(price: number | null, coupon: number | null, maturity: string | null, today: string) {
  if (price === null || price <= 0 || coupon === null) return { current: null, toMaturity: null, years: null }
  const years = maturity ? (Date.parse(`${maturity}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / (365.25 * 86_400_000) : null
  const current = coupon / price
  if (years === null || years <= 0) return { current, toMaturity: null, years }
  const periods = years * 2
  const pv = (y: number) => {
    const r = y / 2
    const discount = (1 + r) ** -periods
    return (r === 0 ? (coupon / 2) * periods : ((coupon / 2) * (1 - discount)) / r) + 100 * discount
  }
  let lo = -0.5, hi = 1
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (pv(mid) > price) lo = mid
    else hi = mid
  }
  return { current, toMaturity: (lo + hi) / 2, years }
}
