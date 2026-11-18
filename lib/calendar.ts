import 'server-only'
// Everything on Portfolio → Calendar, gathered automatically:
//  • earnings dates for every holding (and any extra tickers the club follows)
//  • FOMC decisions, CPI, PPI, the jobs report, JOLTS, GDP and PCE releases
//  • market holidays and early closes
//  • club events (Attendance → events) and dates the PPG adds by hand
import { createClient } from '@/lib/supabase/server'
import { getEarningsDates } from '@/lib/market'
import { marketHolidays, parseBeaSchedule, parseBlsIcs, parseFomc } from '@/lib/schedules'
import { todayET } from '@/lib/format'
import type { CalendarNote } from '@/lib/types'

export type CalendarKind = 'earnings' | 'fed' | 'data' | 'market' | 'club'

export type CalendarEvent = {
  date: string
  kind: CalendarKind
  title: string
  detail?: string | null
  time?: string | null
  ticker?: string
  estimate?: boolean
  /** Hand-added dates can be removed. */
  noteId?: string
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

async function page(url: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/calendar,*/*' }, next: { revalidate: 43200 } })
    return res.ok ? await res.text() : ''
  } catch {
    return ''
  }
}

/** Fed and economic-data release dates. Each source fails on its own. */
export async function getMacroEvents(): Promise<CalendarEvent[]> {
  const [fed, bls, bea] = await Promise.all([
    page('https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm'),
    page('https://www.bls.gov/schedule/news_release/bls.ics'),
    page('https://www.bea.gov/news/schedule'),
  ])
  const events: CalendarEvent[] = []
  for (const m of parseFomc(fed)) {
    events.push({ date: m.date, kind: 'fed', title: 'FOMC rate decision', time: '2:00 PM',
      detail: m.projections ? 'Statement, new economic projections and press conference' : 'Statement and press conference' })
  }
  for (const r of [...parseBlsIcs(bls), ...parseBeaSchedule(bea, todayET())]) {
    events.push({ date: r.date, kind: 'data', title: r.name, time: r.time, detail: r.detail })
  }
  return events
}

export async function getCalendar({ from, to, tickers, notes }: { from: string; to: string; tickers: string[]; notes: CalendarNote[] }) {
  const supabase = await createClient()
  const years = [...new Set([from.slice(0, 4), to.slice(0, 4)].map(Number))]
  const [earnings, macro, { data: meetings }] = await Promise.all([
    getEarningsDates(tickers),
    getMacroEvents(),
    supabase.from('meetings').select('id, title, meeting_date').eq('kind', 'event').gte('meeting_date', from).lte('meeting_date', to),
  ])
  const events: CalendarEvent[] = [
    ...earnings.map(e => ({
      date: e.date, kind: 'earnings' as const, title: `${e.symbol} earnings`, ticker: e.symbol, estimate: e.estimate,
      time: e.time, detail: e.estimate ? 'Estimated date' : e.time ? `Reports ${e.time}` : null,
    })),
    ...macro,
    ...years.flatMap(y => marketHolidays(y)).map(h => ({
      date: h.date, kind: 'market' as const, title: h.early ? 'Market closes early' : `Market closed: ${h.name}`, time: h.early ? '1:00 PM' : null,
    })),
    ...(meetings ?? []).map(m => ({ date: m.meeting_date as string, kind: 'club' as const, title: m.title as string, detail: 'FIG event' })),
    ...notes.map(n => ({ date: n.date, kind: 'club' as const, title: n.title, noteId: n.id })),
  ]
  const order: Record<CalendarKind, number> = { market: 0, fed: 1, data: 2, club: 3, earnings: 4 }
  return events
    .filter(e => e.date >= from && e.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || a.title.localeCompare(b.title))
}
