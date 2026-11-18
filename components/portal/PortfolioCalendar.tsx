// Portfolio → Calendar: a month of earnings, Fed decisions, economic data,
// market holidays and FIG dates, plus what's coming up. Server Component.
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { day, weekdayDay } from '@/lib/format'
import type { CalendarEvent, CalendarKind } from '@/lib/calendar'
import type { CalendarNote } from '@/lib/types'
import { CalendarEditor } from './CalendarEditor'

const KINDS: { kind: CalendarKind; label: string }[] = [
  { kind: 'earnings', label: 'Earnings' },
  { kind: 'fed', label: 'Fed' },
  { kind: 'data', label: 'Economic data' },
  { kind: 'market', label: 'Market hours' },
  { kind: 'club', label: 'FIG' },
]

const DAY = 86_400_000
const toIso = (t: number) => new Date(t).toISOString().slice(0, 10)
const at = (d: string) => Date.parse(`${d}T00:00:00Z`)

/** First and last day shown for a month (whole weeks, Sunday to Saturday). */
export function monthGrid(month: string) {
  const [y, m] = month.split('-').map(Number)
  const first = Date.UTC(y, m - 1, 1)
  const last = Date.UTC(y, m, 0)
  const start = first - new Date(first).getUTCDay() * DAY
  const end = last + (6 - new Date(last).getUTCDay()) * DAY
  return { start: toIso(start), end: toIso(end), first: toIso(first), last: toIso(last) }
}

export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + by, 1))
  return d.toISOString().slice(0, 7)
}

function chip(e: CalendarEvent) {
  if (e.kind === 'earnings') return e.ticker ?? e.title
  if (e.kind === 'fed') return 'FOMC'
  if (e.kind === 'market') return e.title.startsWith('Market closed') ? 'Closed' : 'Early close'
  if (e.kind === 'data') return ({ 'Jobs report': 'Jobs', 'PCE inflation': 'PCE', 'Retail sales': 'Retail' } as Record<string, string>)[e.title] ?? e.title
  return e.title
}

function describe(e: CalendarEvent) {
  return [e.title, e.time, e.detail].filter(Boolean).join(' · ')
}

export function PortfolioCalendar({ month, events, today, canEdit, notes, watch }: {
  month: string
  events: CalendarEvent[]
  today: string
  canEdit: boolean
  notes: CalendarNote[]
  watch: string[]
}) {
  const grid = monthGrid(month)
  const byDate = new Map<string, CalendarEvent[]>()
  for (const e of events) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e])
  const days: string[] = []
  for (let t = at(grid.start); t <= at(grid.end); t += DAY) days.push(toIso(t))
  const title = new Date(at(grid.first)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' })
  const horizon = toIso(at(today) + 21 * DAY)
  const upcoming = events.filter(e => e.date >= today && e.date <= horizon && !(e.kind === 'earnings' && e.estimate))
  const upcomingDays = [...new Set(upcoming.map(e => e.date))]
  const thisMonth = today.slice(0, 7)

  return (
    <>
      <section className="ui-card" style={{ marginBottom: 20 }}>
        <div className="ui-card-head">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            <p>Earnings for every holding, Fed decisions, economic releases, market holidays and FIG dates. Updated automatically.</p>
          </div>
          <div className="ui-row">
            <Link href={`/portal/portfolio?tab=calendar&month=${shiftMonth(month, -1)}`} className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label="Previous month" scroll={false}><ChevronLeft size={16} /></Link>
            {month !== thisMonth && <Link href="/portal/portfolio?tab=calendar" className="ui-btn ui-btn-secondary ui-btn-sm" scroll={false}>This month</Link>}
            <Link href={`/portal/portfolio?tab=calendar&month=${shiftMonth(month, 1)}`} className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label="Next month" scroll={false}><ChevronRight size={16} /></Link>
          </div>
        </div>
        <div className="cal-legend">
          {KINDS.map(k => <span key={k.kind}><i className={`cal-dot ${k.kind}`} aria-hidden />{k.label}</span>)}
          <span className="ui-muted">Dashed = estimated date</span>
        </div>
        <div className="cal-grid" role="grid" aria-label={title}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="cal-head" role="columnheader">{d}</div>)}
          {days.map(d => {
            const list = byDate.get(d) ?? []
            const outside = d < grid.first || d > grid.last
            const shown = list.slice(0, 4)
            return (
              <div key={d} role="gridcell" className={`cal-day${outside ? ' outside' : ''}${d === today ? ' today' : ''}${list.some(e => e.kind === 'market' && e.title.startsWith('Market closed')) ? ' closed' : ''}`}
                aria-label={`${weekdayDay(d)}${list.length ? `: ${list.map(chip).join(', ')}` : ''}`}>
                <span className="cal-num">{Number(d.slice(8))}</span>
                <div className="cal-chips">
                  {shown.map((e, i) => <span key={i} className={`cal-chip ${e.kind}${e.estimate ? ' estimate' : ''}`} title={describe(e)}>{chip(e)}</span>)}
                  {list.length > shown.length && <span className="cal-more" title={list.slice(4).map(describe).join('\n')}>+{list.length - shown.length} more</span>}
                </div>
                <div className="cal-dots" aria-hidden>{list.slice(0, 6).map((e, i) => <i key={i} className={`cal-dot ${e.kind}`} />)}</div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="ui-grid ui-grid-main">
        <section className="ui-card">
          <div className="ui-card-head"><div><h2>Coming up</h2><p>The next three weeks.</p></div></div>
          {upcomingDays.length === 0 ? (
            <p className="ui-small ui-muted" style={{ padding: '4px 20px 18px' }}>Nothing scheduled in the next three weeks.</p>
          ) : (
            <ul className="cal-agenda">
              {upcomingDays.map(d => (
                <li key={d}>
                  <div className="cal-agenda-day">{d === today ? 'Today' : weekdayDay(d)}</div>
                  <ul>
                    {upcoming.filter(e => e.date === d).map((e, i) => (
                      <li key={i}>
                        <i className={`cal-dot ${e.kind}`} aria-hidden />
                        <span><strong>{e.title}</strong>{e.time ? <span className="ui-muted"> · {e.time}</span> : null}{e.detail && e.kind !== 'earnings' && e.kind !== 'club' ? <span className="cal-agenda-detail">{e.detail}</span> : null}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>
        {canEdit ? (
          <CalendarEditor notes={notes.filter(n => n.date >= toIso(at(today) - 31 * DAY))} watch={watch} />
        ) : (
          <section className="ui-card">
            <div className="ui-card-head"><div><h2>About this calendar</h2></div></div>
            <p className="ui-small ui-muted" style={{ padding: '0 20px 18px', lineHeight: 1.6 }}>
              Earnings dates and retail sales come from Yahoo Finance; Fed meetings from the Federal Reserve; CPI, PPI, jobs and JOLTS from the BLS (or Yahoo when BLS is unavailable); GDP and PCE from the BEA.
              FIG events come from Attendance. The PPG manager and co-presidents can add other dates. Last checked {day(today)}.
            </p>
          </section>
        )}
      </div>
    </>
  )
}
