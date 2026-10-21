import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getQuotes } from '@/lib/market'
import { getSettings } from '@/lib/data'
import { buildPortfolio } from '@/lib/portfolio'
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
  return { holdings, quotes, portfolio: buildPortfolio(holdings, quotes, settings.portfolio.cash) }
})
