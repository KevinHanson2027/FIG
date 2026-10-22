// Formatting helpers. FIG is in Connecticut, so times display in Eastern
// time no matter where the server runs.

export const TZ = 'America/New_York'

const moneyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const moneyCentsFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function money(n: number | null | undefined, cents = false) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return (cents ? moneyCentsFmt : moneyFmt).format(n)
}

export function compactMoney(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

/** 0.0123 → "+1.23%" */
export function pct(fraction: number | null | undefined, digits = 2, signed = true) {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return '—'
  const s = (fraction * 100).toFixed(digits)
  return `${signed && fraction > 0 ? '+' : ''}${s}%`
}

export function num(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

/** "YYYY-MM-DD" for today in Eastern time. */
export function todayET() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

function parseDay(isoDate: string) {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Date-only values ("2026-10-25") — formatted without timezone shifts. */
export function day(isoDate: string | null | undefined, withYear = true) {
  if (!isoDate) return '—'
  return parseDay(isoDate).toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}),
  })
}

export function weekdayDay(isoDate: string) {
  return parseDay(isoDate).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' })
}

/** Whole days from today (ET) until a date-only value; negative = overdue. */
export function daysUntil(isoDate: string) {
  return Math.round((parseDay(isoDate).getTime() - parseDay(todayET()).getTime()) / 86_400_000)
}

export function dueLabel(isoDate: string | null) {
  if (!isoDate) return 'No due date'
  const n = daysUntil(isoDate)
  if (n < 0) return `Overdue by ${-n} day${n === -1 ? '' : 's'}`
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  if (n < 7) return `Due ${weekdayDay(isoDate)}`
  return `Due ${day(isoDate, false)}`
}

/** Timestamps — shown in Eastern time. */
export function dateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' })
}

export function relative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`
  return shortDate(iso)
}

export function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
}

/** The semester a date falls in: Spring = Jan–Jul, Fall = Aug–Dec. Worked
 *  out from the calendar so nobody has to update it each semester. */
export function termFor(isoDate: string): { name: string; starts_on: string } {
  const [y, m] = isoDate.slice(0, 10).split('-').map(Number)
  return m >= 8 ? { name: `Fall ${y}`, starts_on: `${y}-08-01` } : { name: `Spring ${y}`, starts_on: `${y}-01-01` }
}

/** The latest class year that has graduated by this date (seniors move to alumni on June 1). */
export function graduatedClass(isoDate: string) {
  const [y, m] = isoDate.slice(0, 10).split('-').map(Number)
  return m >= 6 ? y : y - 1
}

/** Graduation years a current member can pick. */
export function classYearOptions(isoDate: string) {
  const first = graduatedClass(isoDate) + 1
  return Array.from({ length: 5 }, (_, i) => first + i)
}

/** "2026-27" style academic year for a date-only value (year starts in August). */
export function academicYear(isoDate: string) {
  const d = parseDay(isoDate)
  const y = d.getUTCFullYear()
  const start = d.getUTCMonth() >= 7 ? y : y - 1
  return `${start}–${String(start + 1).slice(2)}`
}
