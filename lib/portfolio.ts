// Portfolio math shared by the portal pages and the daily snapshot job.
import type { Holding, Quote } from '@/lib/types'

export type Position = Holding & {
  price: number | null
  value: number | null
  dayChange: number | null
  dayChangePct: number | null
  gain: number | null
  gainPct: number | null
  weight: number | null
  high52: number | null
  low52: number | null
}

export type SectorSlice = { sector: string; value: number; weight: number; count: number; dayChangePct: number | null }

export type Portfolio = {
  positions: Position[]
  invested: number
  cash: number
  total: number
  dayChange: number
  dayChangePct: number | null
  missingShares: number
  unpriced: number
  sectors: SectorSlice[]
  hasValues: boolean
}

export const PORTFOLIO_LEVEL = 'Portfolio-level'

export function buildPortfolio(holdings: Holding[], quotes: Record<string, Quote>, cash = 0): Portfolio {
  let missingShares = 0
  let unpriced = 0

  const positions: Position[] = holdings.filter(h => h.is_active).map(h => {
    const q = h.ticker ? quotes[h.ticker.toUpperCase()] ?? null : null
    const price = q?.price ?? null
    if (h.ticker && !q) unpriced++
    if (h.ticker && !h.shares) missingShares++
    const value = h.ticker
      ? (price !== null && h.shares ? price * h.shares : null)
      : (h.manual_value ?? null)
    const dayChange = h.ticker && q?.change !== null && q?.change !== undefined && h.shares ? q.change * h.shares : null
    const gain = h.ticker && price !== null && h.cost_basis && h.shares ? (price - h.cost_basis) * h.shares : null
    return {
      ...h,
      price,
      value,
      dayChange,
      dayChangePct: q?.changePct ?? null,
      gain,
      gainPct: gain !== null && h.cost_basis ? gain / (h.cost_basis * h.shares) : null,
      weight: null,
      high52: q?.high52 ?? null,
      low52: q?.low52 ?? null,
    }
  })

  const invested = positions.reduce((s, p) => s + (p.value ?? 0), 0)
  const total = invested + (cash || 0)
  for (const p of positions) p.weight = p.value !== null && total > 0 ? p.value / total : null

  const dayChange = positions.reduce((s, p) => s + (p.dayChange ?? 0), 0)
  const previousInvested = invested - dayChange

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
    dayChange,
    dayChangePct: previousInvested > 0 ? dayChange / previousInvested : null,
    missingShares,
    unpriced,
    sectors,
    hasValues: invested > 0,
  }
}

/** Equal-weight day change for a list of positions (works before share counts exist). */
export function averageDayChange(positions: Position[]) {
  const vals = positions.map(p => p.dayChangePct).filter((v): v is number => v !== null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}
