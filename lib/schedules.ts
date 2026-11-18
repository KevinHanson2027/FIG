// Market and economic calendar dates, read from the official free sources.
// Pure parsing (no fetching) so it can be tested; lib/calendar.ts fetches.
//  • FOMC decisions: federalreserve.gov/monetarypolicy/fomccalendars.htm
//  • CPI, PPI, jobs report, JOLTS: the BLS release calendar (bls.ics)
//  • GDP and PCE (Personal Income and Outlays): bea.gov/news/schedule
//  • Market holidays: NYSE rules, worked out for any year

export type ScheduledRelease = { date: string; time: string | null; name: string; detail: string | null }

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const monthIndex = (name: string) => MONTHS.indexOf(name.trim().slice(0, 3).toLowerCase())

/** FOMC decision days (the last day of each meeting). `projections` marks
 *  meetings with a Summary of Economic Projections (an asterisk on the page). */
export function parseFomc(html: string): { date: string; projections: boolean }[] {
  const out = new Map<string, boolean>()
  const parts = html.split(/(\d{4}) FOMC Meetings/)
  for (let i = 1; i < parts.length; i += 2) {
    const year = Number(parts[i])
    const body = parts[i + 1] ?? ''
    const rows = body.matchAll(/fomc-meeting__month[^>]*>\s*(?:<strong>)?\s*([A-Za-z/]+)\s*(?:<\/strong>)?\s*<\/div>\s*<div[^>]*fomc-meeting__date[^>]*>([^<]+)</g)
    for (const [, months, dates] of rows) {
      const days = dates.match(/\d{1,2}/g)?.map(Number)
      if (!days?.length) continue
      const names = months.split('/')
      // "Apr/May 30-1": the decision is on the last day, in the second month.
      const crosses = days.length > 1 && days[days.length - 1] < days[0]
      const m = monthIndex(crosses ? names[names.length - 1] : names[0])
      if (m < 0) continue
      const date = iso(year, m + 1, days[days.length - 1])
      out.set(date, (out.get(date) ?? false) || dates.includes('*'))
    }
  }
  return [...out.entries()].map(([date, projections]) => ({ date, projections })).sort((a, b) => a.date.localeCompare(b.date))
}

const BLS_RELEASES: [RegExp, string][] = [
  [/^Consumer Price Index/i, 'CPI'],
  [/^Producer Price Index/i, 'PPI'],
  [/^Employment Situation$/i, 'Jobs report'],
  [/^Job Openings and Labor Turnover Survey$/i, 'JOLTS'],
]

function clock(h: number, m: number) {
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`
}

/** CPI, PPI, the jobs report and JOLTS from the BLS iCalendar feed. */
export function parseBlsIcs(ics: string): ScheduledRelease[] {
  const text = ics.replace(/\r?\n[ \t]/g, '') // unfold long lines
  const out: ScheduledRelease[] = []
  for (const block of text.split('BEGIN:VEVENT').slice(1)) {
    const summary = block.match(/\nSUMMARY[^:\n]*:([^\r\n]*)/)?.[1]?.trim() ?? ''
    const rule = BLS_RELEASES.find(([re]) => re.test(summary))
    const start = block.match(/\nDTSTART[^:\n]*:(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/)
    if (!rule || !start) continue
    const [, y, mo, d, h, mi] = start
    out.push({ date: `${y}-${mo}-${d}`, time: h ? clock(+h, +mi) : null, name: rule[1], detail: summary })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** GDP and Personal Income and Outlays (PCE) from BEA's schedule page.
 *  Rows list upcoming releases in order without a year, so the year rolls
 *  over when the month goes backwards. */
export function parseBeaSchedule(html: string, today: string): ScheduledRelease[] {
  const out: ScheduledRelease[] = []
  let year = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(5, 7)) - 1
  let lastMonth = -1
  const rows = html.matchAll(/release-date">\s*([A-Za-z]+)\s+(\d{1,2})\s*<\/div>(?:\s*<small[^>]*>\s*([^<]*?)\s*<\/small>)?[\s\S]*?release-title[^>]*>\s*(?:<a[^>]*>)?\s*([^<]+?)\s*</g)
  for (const [, monthName, day, time, title] of rows) {
    const m = monthIndex(monthName)
    if (m < 0) continue
    if (lastMonth === -1 && m < currentMonth - 1) year++ // first row already in next year
    else if (lastMonth !== -1 && m < lastMonth) year++
    lastMonth = m
    const name = /^GDP\b|Gross Domestic Product/i.test(title) && !/by (State|County|Industry)/i.test(title) ? 'GDP'
      : /^Personal Income and Outlays/i.test(title) ? 'PCE inflation' : null
    if (!name) continue
    out.push({ date: iso(year, m + 1, Number(day)), time: time?.trim() || null, name, detail: title.replace(/\s+/g, ' ') })
  }
  return out
}

/* ---------------------------------------------------------------------
 * NYSE holidays (full closures) and 1 p.m. early closes
 * ------------------------------------------------------------------- */

function easter(year: number) {
  // Anonymous Gregorian algorithm.
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d))
const toIso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)
/** The nth weekday (0 = Sunday) of a month; n = -1 for the last one. */
function nthWeekday(y: number, m: number, weekday: number, n: number) {
  if (n > 0) {
    const first = utc(y, m, 1)
    return addDays(first, ((weekday - first.getUTCDay() + 7) % 7) + (n - 1) * 7)
  }
  const last = utc(y, m + 1, 0)
  return addDays(last, -((last.getUTCDay() - weekday + 7) % 7))
}
/** Saturday holidays are observed Friday, Sunday ones Monday. */
function observed(d: Date) {
  const w = d.getUTCDay()
  return w === 6 ? addDays(d, -1) : w === 0 ? addDays(d, 1) : d
}

export function marketHolidays(year: number): { date: string; name: string; early: boolean }[] {
  const closed: [Date, string][] = [
    [observed(utc(year, 1, 1)), 'New Year’s Day'],
    [nthWeekday(year, 1, 1, 3), 'Martin Luther King Jr. Day'],
    [nthWeekday(year, 2, 1, 3), 'Presidents’ Day'],
    [addDays(easter(year), -2), 'Good Friday'],
    [nthWeekday(year, 5, 1, -1), 'Memorial Day'],
    [observed(utc(year, 6, 19)), 'Juneteenth'],
    [observed(utc(year, 7, 4)), 'Independence Day'],
    [nthWeekday(year, 9, 1, 1), 'Labor Day'],
    [nthWeekday(year, 11, 4, 4), 'Thanksgiving'],
    [observed(utc(year, 12, 25)), 'Christmas'],
  ]
  // NYSE doesn't move New Year's Day back into the previous year.
  const out = closed.filter(([d]) => d.getUTCFullYear() === year).map(([d, name]) => ({ date: toIso(d), name, early: false }))
  const weekday = (d: Date) => d.getUTCDay() > 0 && d.getUTCDay() < 6
  const july3 = utc(year, 7, 3), xmasEve = utc(year, 12, 24)
  if (weekday(july3) && utc(year, 7, 4).getUTCDay() !== 6 && utc(year, 7, 4).getUTCDay() !== 0) out.push({ date: toIso(july3), name: 'Early close (1 p.m.)', early: true })
  out.push({ date: toIso(addDays(nthWeekday(year, 11, 4, 4), 1)), name: 'Early close (1 p.m.)', early: true })
  if (weekday(xmasEve)) out.push({ date: toIso(xmasEve), name: 'Early close (1 p.m.)', early: true })
  // A day that's already closed (e.g. Christmas observed on Friday the 24th) isn't also an early close.
  const closedDays = new Set(out.filter(h => !h.early).map(h => h.date))
  return out.filter(h => !h.early || !closedDays.has(h.date)).sort((a, b) => a.date.localeCompare(b.date))
}

/* ---------------------------------------------------------------------
 * Economic series
 * ------------------------------------------------------------------- */

export type Observation = { period: string; value: number } // period "2026-10" or "2026-Q3"

/** Year-over-year change of the latest month that has a value a year earlier
 *  (skips gaps, like months not published during a shutdown). */
export function latestYoY(obs: Observation[]): { value: number; period: string } | null {
  const byPeriod = new Map(obs.map(o => [o.period, o.value]))
  const sorted = [...obs].sort((a, b) => b.period.localeCompare(a.period))
  for (const o of sorted.slice(0, 6)) {
    const [y, m] = o.period.split('-')
    const prior = byPeriod.get(`${Number(y) - 1}-${m}`)
    if (prior) return { value: o.value / prior - 1, period: o.period }
  }
  return null
}

/** "2026-10" → "Oct 2026", "2026-Q3" → "Q3 2026". */
export function periodLabel(period: string) {
  const [y, p] = period.split('-')
  if (p?.startsWith('Q')) return `${p} ${y}`
  const m = Number(p)
  return m >= 1 && m <= 12 ? `${MONTHS[m - 1][0].toUpperCase()}${MONTHS[m - 1].slice(1)} ${y}` : period
}
