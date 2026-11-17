import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getHistory, getQuotes, type HistoryRange } from '@/lib/market'
import { getSettings } from '@/lib/data'
import { buildPortfolio, type Position } from '@/lib/portfolio'
import type { Holding } from '@/lib/types'

/** Active holdings priced with live quotes, plus cash from settings. Cached per request. */
export const loadPortfolio = cache(async () => {
  const supabase = await createClient()
  const [{ data }, settings] = await Promise.all([
    supabase.from('holdings').select('*').eq('is_active', true).order('ticker'),
    getSettings(),
  ])
  const holdings = (data ?? []) as Holding[]
  const quotes = await getQuotes(holdings.map(h => h.ticker))
  return {
    holdings,
    quotes,
    portfolio: buildPortfolio(holdings, quotes, settings.portfolio.cash),
    sync: settings.portfolio.fidelity ?? null,
  }
})

/** How the S&P 500 (price only, like the holdings' gains) has moved since each
 *  stock or fund was first bought. Keyed by holding id. Bonds are left out:
 *  most of their return is coupons, so a price-only comparison misleads. */
export async function sinceFirstBuy(positions: Position[]): Promise<Record<string, number>> {
  const dated = positions.filter(p => p.purchased_on && p.ticker)
  if (dated.length === 0) return {}
  const earliest = dated.map(p => p.purchased_on!).sort()[0]
  const years = (Date.now() - Date.parse(`${earliest}T00:00:00Z`)) / (365.25 * 86_400_000)
  const range: HistoryRange = years < 0.9 ? '1y' : years < 1.9 ? '2y' : years < 4.9 ? '5y' : years < 9.9 ? '10y' : 'max'
  const spy = await getHistory('SPY', range, true)
  if (!spy || spy.closes.length < 2) return {}
  const last = spy.closes[spy.closes.length - 1]
  const out: Record<string, number> = {}
  for (const p of dated) {
    const i = spy.dates.findIndex(d => d >= p.purchased_on!)
    if (i >= 0 && i < spy.dates.length - 1) out[p.id] = last / spy.closes[i] - 1
  }
  return out
}
