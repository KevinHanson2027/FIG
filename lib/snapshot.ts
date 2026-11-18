import 'server-only'
// The KPIs on Portfolio → Overview: the fund's value and returns, the best and
// worst holdings, and a market and economy snapshot.
import { getHistory, getQuotes } from '@/lib/market'
import { getEconomy, type Indicator } from '@/lib/economy'
import { todayET } from '@/lib/format'
import type { Portfolio, Position } from '@/lib/portfolio'
import type { PortfolioSettings, Snapshot } from '@/lib/types'

export type MarketLine = { symbol: string; label: string; price: number | null; change: number | null; changePct: number | null; unit: 'index' | 'yield' | 'usd' | 'plain' }

const WALL_ST: [string, string][] = [['^GSPC', 'S&P 500'], ['^DJI', 'Dow 30'], ['^IXIC', 'Nasdaq'], ['^RUT', 'Russell 2000']]
const HARD_ASSETS: [string, string, MarketLine['unit']][] = [
  ['^TNX', '10-yr Treasury', 'yield'], ['DX-Y.NYB', 'US dollar index', 'plain'], ['GC=F', 'Gold', 'usd'],
  ['SI=F', 'Silver', 'usd'], ['BTC-USD', 'Bitcoin', 'usd'], ['CL=F', 'Oil (WTI)', 'usd'],
]

export type FundKpis = {
  value: number | null
  oneDay: number | null
  oneMonth: number | null
  ytd: number | null
  spxYtd: number | null
  /** YTD minus the S&P 500's YTD, in percentage points. */
  vsSpx: number | null
  /** Where the year-start value came from, if any. */
  ytdBase: 'snapshots' | 'manual' | null
  best: Position | null
  worst: Position | null
}

const DAY = 86_400_000
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`)

/** The same day one calendar month earlier ("2026-03-31" → "2026-02-28"). */
function monthBefore(day: string) {
  const [y, m, d] = day.split('-').map(Number)
  const last = new Date(Date.UTC(y, m - 1, 0)).getUTCDate()
  const date = new Date(Date.UTC(m === 1 ? y - 1 : y, m === 1 ? 11 : m - 2, Math.min(d, last)))
  return date.toISOString().slice(0, 10)
}

/** Latest snapshot on or before `day`, if it's within a week of it. */
function valueOn(snapshots: Snapshot[], day: string) {
  let found: Snapshot | null = null
  for (const s of snapshots) if (s.snapshot_date <= day && (!found || s.snapshot_date > found.snapshot_date)) found = s
  return found && ms(day) - ms(found.snapshot_date) <= 7 * DAY ? Number(found.total_value) : null
}

export function fundKpis(portfolio: Portfolio, snapshots: Snapshot[], settings: PortfolioSettings, spxNow: number | null, spxYearStart: number | null): FundKpis {
  const today = todayET()
  const year = Number(today.slice(0, 4))
  const value = portfolio.hasValues ? portfolio.total : null
  const previous = value !== null ? value - portfolio.dayChange : null
  const monthBase = valueOn(snapshots, monthBefore(today))
  const snapBase = valueOn(snapshots, `${year - 1}-12-31`)
  const manualBase = settings.year_start?.year === year && settings.year_start.value > 0 ? settings.year_start.value : null
  const yearBase = snapBase ?? manualBase
  const ytd = value !== null && yearBase ? value / yearBase - 1 : null
  const spxYtd = spxNow && spxYearStart ? spxNow / spxYearStart - 1 : null
  const ranked = portfolio.positions.filter(p => p.gainPct !== null).sort((a, b) => b.gainPct! - a.gainPct!)
  return {
    value,
    oneDay: value !== null && previous ? portfolio.dayChange / previous : null,
    oneMonth: value !== null && monthBase ? value / monthBase - 1 : null,
    ytd,
    spxYtd,
    vsSpx: ytd !== null && spxYtd !== null ? ytd - spxYtd : null,
    ytdBase: snapBase ? 'snapshots' : manualBase ? 'manual' : null,
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
  }
}

/** Market lines and economic indicators. External sources; each can fail alone. */
export async function getMarketSnapshot(): Promise<{ wallSt: MarketLine[]; assets: MarketLine[]; economy: Indicator[]; spxNow: number | null; spxYearStart: number | null }> {
  const year = Number(todayET().slice(0, 4))
  const [quotes, economy, spx] = await Promise.all([
    getQuotes([...WALL_ST.map(s => s[0]), ...HARD_ASSETS.map(s => s[0])]),
    getEconomy(),
    getHistory('^GSPC', '1y', true),
  ])
  const line = (symbol: string, label: string, unit: MarketLine['unit']): MarketLine => {
    const q = quotes[symbol.toUpperCase()]
    return { symbol, label, price: q?.price ?? null, change: q?.change ?? null, changePct: q?.changePct ?? null, unit }
  }
  let spxYearStart: number | null = null
  if (spx) for (let i = spx.dates.length - 1; i >= 0; i--) if (spx.dates[i] <= `${year - 1}-12-31`) { spxYearStart = spx.closes[i]; break }
  return {
    wallSt: WALL_ST.map(([s, l]) => line(s, l, 'index')),
    assets: HARD_ASSETS.map(([s, l, u]) => line(s, l, u)),
    economy,
    spxNow: quotes['^GSPC']?.price ?? (spx ? spx.closes[spx.closes.length - 1] : null),
    spxYearStart,
  }
}
