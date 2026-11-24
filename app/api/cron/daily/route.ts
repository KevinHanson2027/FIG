import { NextResponse } from 'next/server'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { getQuotes } from '@/lib/market'
import { buildPortfolio } from '@/lib/portfolio'
import { todayET } from '@/lib/format'
import type { Holding } from '@/lib/types'

// Runs once a day via Vercel Cron (vercel.json). Records the portfolio's
// value for the performance chart and keeps the free Supabase project from
// pausing during quiet weeks (breaks, summer).
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!hasServiceRole()) {
    return NextResponse.json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not set' }, { status: 500 })
  }

  const admin = createAdminClient()
  await admin.from('email_link_log').delete().lt('sent_at', new Date(Date.now() - 7 * 86_400_000).toISOString())

  const today = todayET()
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay()
  if (weekday === 0 || weekday === 6) return NextResponse.json({ ok: true, snapshot: 'skipped (weekend)' })

  const [{ data: holdings, error }, { data: setting }] = await Promise.all([
    admin.from('holdings').select('*').eq('is_active', true),
    admin.from('settings').select('value').eq('key', 'portfolio').maybeSingle(),
  ])
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const portfolioSetting = setting?.value as { cash?: number; fidelity?: { prices?: Record<string, number> } | null } | null
  const cash = Number(portfolioSetting?.cash ?? 0)
  const quotes = await getQuotes([...(holdings ?? []).map(h => h.ticker as string | null), 'SPY'])
  if (!quotes.SPY) return NextResponse.json({ ok: false, error: 'Market data unavailable' }, { status: 502 })

  const p = buildPortfolio((holdings ?? []) as Holding[], quotes, cash, { today, fallbackPrices: portfolioSetting?.fidelity?.prices })
  if (!p.hasValues) return NextResponse.json({ ok: true, snapshot: 'skipped (no share counts yet)' })
  // Missing prices would record a wrong value and bend the performance chart.
  // A straggler or two can use the last Fidelity price; if more of the fund
  // than that has no live price, skip the day (1M and YTD tolerate a gap).
  const notLive = p.positions.filter(x => x.ticker && x.priceSource !== 'live')
  const notLiveValue = notLive.reduce((s, x) => s + (x.value ?? 0), 0)
  if (p.unpriced > 0 || notLiveValue > p.total * 0.05) {
    return NextResponse.json({ ok: false, error: `No live price for ${notLive.map(x => x.ticker).join(', ')}; snapshot skipped` }, { status: 502 })
  }

  const { error: upsertError } = await admin.from('portfolio_snapshots').upsert({
    snapshot_date: today,
    total_value: Math.round(p.total * 100) / 100,
    invested_value: Math.round(p.invested * 100) / 100,
    cash: p.cash,
    benchmark_close: quotes.SPY.price,
    by_sector: Object.fromEntries(p.sectors.map(s => [s.sector, Math.round(s.value * 100) / 100])),
  }, { onConflict: 'snapshot_date' })
  if (upsertError) return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 })

  return NextResponse.json({ ok: true, snapshot: today, total: p.total, missingShares: p.missingShares })
}
