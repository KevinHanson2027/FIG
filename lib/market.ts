import 'server-only'
import { unstable_cache } from 'next/cache'
import type { Quote } from '@/lib/types'
import type { SecurityInfo } from '@/lib/fidelity'

// Free market data from Yahoo Finance's public chart endpoints (no API key).
//
// Prices are always fetched fresh. They used to go through Next.js's data
// cache, which serves the saved copy and refreshes it in the background, so
// the first person to open a page after a quiet spell saw prices from the
// previous visit, sometimes days old. Now each server instance only remembers
// a quote for a few seconds, enough to share one fetch between the parts of
// a page and the people looking at it at the same moment.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
const HEADERS = { 'User-Agent': UA, Accept: 'application/json' }

function chunk<T>(items: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Short-lived memory shared by requests on the same server instance. */
function memory<T>(ttl: number, limit = 400) {
  const entries = new Map<string, { at: number; value: T }>()
  return {
    get(key: string) {
      const hit = entries.get(key)
      return hit && Date.now() - hit.at < ttl ? hit.value : undefined
    },
    set(key: string, value: T) {
      if (entries.size >= limit) {
        const now = Date.now()
        for (const [k, v] of entries) if (now - v.at >= ttl) entries.delete(k)
        if (entries.size >= limit) entries.clear()
      }
      entries.set(key, { at: Date.now(), value })
    },
  }
}

const QUOTE_TTL = 15_000
const recentQuotes = memory<Quote>(QUOTE_TTL)

/** Latest price and day change for up to hundreds of symbols (20 per request).
 *  A symbol Yahoo doesn't return is asked for again, then through the chart
 *  endpoint, so one bad response doesn't drop holdings out of the totals. */
export async function getQuotes(symbols: (string | null | undefined)[]): Promise<Record<string, Quote>> {
  const unique = [...new Set(symbols.filter(Boolean).map(s => s!.trim().toUpperCase()))]
  if (unique.length === 0) return {}
  const out: Record<string, Quote> = {}
  let need: string[] = []
  for (const s of unique) {
    const hit = recentQuotes.get(s)
    if (hit) out[s] = hit
    else need.push(s)
  }
  for (let attempt = 0; attempt < 2 && need.length; attempt++) {
    const parts = await Promise.all(chunk(need, 20).map(fetchSpark))
    for (const part of parts) Object.assign(out, part)
    need = need.filter(s => !out[s])
  }
  if (need.length) {
    const singles = await Promise.all(need.slice(0, 12).map(fetchChartQuote))
    for (const q of singles) if (q) out[q.symbol] = q
  }
  for (const s of unique) {
    const q = out[s]
    if (q && !recentQuotes.get(s)) recentQuotes.set(s, q)
  }
  return out
}

type YahooMeta = {
  symbol?: string
  regularMarketPrice?: number
  chartPreviousClose?: number
  previousClose?: number
  regularMarketTime?: number
  shortName?: string
  longName?: string
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
}

function quoteFrom(symbol: string, meta: YahooMeta): Quote | null {
  const price = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : null
  if (price === null) return null
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? null
  const change = prev !== null ? price - prev : null
  return {
    symbol: symbol.toUpperCase(),
    name: meta.shortName ?? meta.longName ?? null,
    price,
    previousClose: prev,
    change,
    changePct: change !== null && prev ? change / prev : null,
    high52: meta.fiftyTwoWeekHigh ?? null,
    low52: meta.fiftyTwoWeekLow ?? null,
    time: typeof meta.regularMarketTime === 'number' ? meta.regularMarketTime * 1000 : null,
  }
}

async function fetchSpark(symbols: string[]): Promise<Record<string, Quote>> {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols.join(','))}&range=1d&interval=1d`
  try {
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) return {}
    const json = await res.json()
    const out: Record<string, Quote> = {}
    for (const r of json?.spark?.result ?? []) {
      const meta = r?.response?.[0]?.meta
      if (!meta || !r.symbol) continue
      const q = quoteFrom(String(r.symbol), meta)
      if (q) out[q.symbol] = q
    }
    return out
  } catch {
    return {}
  }
}

/** One symbol through the chart endpoint, for symbols the batch call missed. */
async function fetchChartQuote(symbol: string): Promise<Quote | null> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`
  try {
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) return null
    const meta = (await res.json())?.chart?.result?.[0]?.meta
    return meta ? quoteFrom(symbol, meta) : null
  } catch {
    return null
  }
}

export type History = { symbol: string; dates: string[]; closes: number[] }
export type HistoryRange = '6mo' | '1y' | '2y' | '5y' | '10y' | 'max'

const recentHistory = memory<History>(30 * 60_000, 300)

/** Daily closes, adjusted for dividends unless `priceOnly`. Fetched fresh and
 *  remembered for 30 minutes on the server instance. */
export async function getHistory(symbol: string, range: HistoryRange = '1y', priceOnly = false): Promise<History | null> {
  const key = `${symbol.toUpperCase()}|${range}|${priceOnly ? 'price' : 'adj'}`
  const hit = recentHistory.get(key)
  if (hit) return hit
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`
  try {
    const res = await fetch(url, { headers: HEADERS, cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    const stamps: number[] = result?.timestamp ?? []
    const closes: (number | null)[] = (!priceOnly && result?.indicators?.adjclose?.[0]?.adjclose) || result?.indicators?.quote?.[0]?.close || []
    const dates: string[] = []
    const values: number[] = []
    stamps.forEach((t, i) => {
      const c = closes[i]
      if (typeof c === 'number' && Number.isFinite(c)) {
        dates.push(new Date(t * 1000).toISOString().slice(0, 10))
        values.push(c)
      }
    })
    if (!values.length) return null
    const history = { symbol: symbol.toUpperCase(), dates, closes: values }
    recentHistory.set(key, history)
    return history
  } catch {
    return null
  }
}

/** Name, sector and type for tickers new to the portfolio (Yahoo search). Cached a day. */
export async function getSecurityInfo(symbols: string[]): Promise<Record<string, SecurityInfo>> {
  const out: Record<string, SecurityInfo> = {}
  await Promise.all([...new Set(symbols.map(s => s.toUpperCase()))].slice(0, 25).map(async symbol => {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=5&newsCount=0&listsCount=0`
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, next: { revalidate: 86400 } })
      if (!res.ok) return
      const json = await res.json()
      const q = (json?.quotes ?? []).find((x: { symbol?: string }) => x.symbol?.toUpperCase() === symbol)
      if (!q) return
      const type = String(q.quoteType ?? '').toUpperCase()
      out[symbol] = {
        name: (q.longname || q.shortname || null)?.replace(/\s*\(The\)$/i, '') ?? null,
        sector: q.sector ?? null,
        type: type === 'ETF' ? 'etf' : type === 'MUTUALFUND' ? 'fund' : type === 'EQUITY' ? 'equity' : null,
      }
    } catch { /* unknown ticker or Yahoo unavailable: the preview asks instead */ }
  }))
  return out
}

// Yahoo's quote endpoint (which carries earnings dates) needs a session
// cookie and a "crumb". Get one when needed and reuse it for a few hours.
let yahooSession: { cookie: string; crumb: string; at: number } | null = null

async function getYahooSession(fresh = false) {
  if (!fresh && yahooSession && Date.now() - yahooSession.at < 4 * 3_600_000) return yahooSession
  try {
    const first = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'manual', cache: 'no-store' })
    const cookie = (first.headers.getSetCookie?.() ?? []).map(c => c.split(';')[0]).join('; ')
    const res = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': UA, cookie }, cache: 'no-store' })
    const crumb = (await res.text()).trim()
    if (!res.ok || !cookie || !crumb || crumb.length > 40 || /[<\s]/.test(crumb)) return null
    yahooSession = { cookie, crumb, at: Date.now() }
    return yahooSession
  } catch {
    return null
  }
}

export type EarningsDate = { symbol: string; date: string; estimate: boolean; time: 'before open' | 'after close' | null }

/** Last and next earnings dates for up to 100 tickers (Eastern dates). */
export async function getEarningsDates(symbols: string[]): Promise<EarningsDate[]> {
  const list = [...new Set(symbols.map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9.\-]{1,10}$/.test(s)))].slice(0, 100)
  if (list.length === 0) return []
  const etDay = (sec: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(sec * 1000))
  const etHour = (sec: number) => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(new Date(sec * 1000)))
  for (const fresh of [false, true]) {
    const session = await getYahooSession(fresh)
    if (!session) return []
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(list.join(','))}`
      + `&fields=earningsTimestamp,earningsTimestampStart,earningsTimestampEnd,isEarningsDateEstimate&crumb=${encodeURIComponent(session.crumb)}`
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', cookie: session.cookie }, next: { revalidate: 21600 } })
      if (res.status === 401 || res.status === 403) continue // session expired: try once more with a new one
      if (!res.ok) return []
      const json = await res.json()
      const out: EarningsDate[] = []
      for (const q of json?.quoteResponse?.result ?? []) {
        const seen = new Set<string>()
        const estimate = Boolean(q.isEarningsDateEstimate)
        for (const [ts, isEstimate] of [[q.earningsTimestamp, false], [q.earningsTimestampStart, estimate], [q.earningsTimestampEnd, estimate]] as [number | undefined, boolean][]) {
          if (typeof ts !== 'number' || !ts) continue
          const date = etDay(ts)
          if (seen.has(date)) continue
          seen.add(date)
          const hour = etHour(ts)
          out.push({ symbol: String(q.symbol).toUpperCase(), date, estimate: isEstimate, time: isEstimate || hour === 0 ? null : hour < 12 ? 'before open' : 'after close' })
        }
      }
      return out
    } catch {
      return []
    }
  }
  return []
}

export type EconomicRelease = { date: string; time: string; name: string; period: string | null }

const ECON_NAMES: [RegExp, string][] = [
  [/^CPI MM, SA$/i, 'CPI'],
  [/^PPI Final Demand MM$/i, 'PPI'],
  [/^Non-Farm Payrolls$/i, 'Jobs report'],
  [/^JOLTS/i, 'JOLTS'],
  [/^Retail Sales MM$/i, 'Retail sales'],
  [/^GDP (Advance|2nd Estimate|3rd Estimate|Final)/i, 'GDP'],
  [/^PCE Price Index MM/i, 'PCE inflation'],
]

/** Major US economic releases from Yahoo's economic calendar (Eastern dates). */
async function fetchEconomicReleases(from: string, to: string): Promise<EconomicRelease[]> {
  const session = await getYahooSession()
  if (!session) return []
  const out: EconomicRelease[] = []
  const et = (iso: string) => {
    const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
    return {
      date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d),
      time: d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }),
    }
  }
  for (let offset = 0; offset < 1000; offset += 250) {
    const body = {
      sortType: 'ASC', entityIdType: 'economic_event', sortField: 'startdatetime',
      includeFields: ['econ_release', 'country_code', 'startdatetime', 'period'],
      query: { operator: 'and', operands: [
        { operator: 'gte', operands: ['startdatetime', from] },
        { operator: 'lte', operands: ['startdatetime', to] },
        { operator: 'eq', operands: ['country_code', 'US'] },
      ] },
      offset, size: 250,
    }
    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v1/finance/visualization?lang=en-US&region=US&crumb=${encodeURIComponent(session.crumb)}`, {
        method: 'POST', cache: 'no-store',
        headers: { 'User-Agent': UA, cookie: session.cookie, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) break
      const doc = (await res.json())?.finance?.result?.[0]?.documents?.[0]
      const cols: string[] = (doc?.columns ?? []).map((c: { id: string }) => c.id)
      const rows: unknown[][] = doc?.rows ?? []
      for (const row of rows) {
        const r = Object.fromEntries(cols.map((c, i) => [c, row[i]])) as { econ_release?: string; startdatetime?: string; period?: string }
        const rule = ECON_NAMES.find(([re]) => re.test(r.econ_release ?? ''))
        if (!rule || !r.startdatetime) continue
        out.push({ ...et(r.startdatetime), name: rule[1], period: r.period || null })
      }
      if (rows.length < 250) break
    } catch {
      break
    }
  }
  return out
}

/** Cached for six hours across requests. */
export const getEconomicReleases = unstable_cache(fetchEconomicReleases, ['yahoo-economic-releases'], { revalidate: 21600 })

/** Fetch many histories with limited concurrency. */
export async function getHistories(symbols: string[], range: HistoryRange = '1y') {
  const unique = [...new Set(symbols.map(s => s.toUpperCase()))]
  const out: Record<string, History> = {}
  let next = 0
  async function worker() {
    while (next < unique.length) {
      const symbol = unique[next++]
      const h = await getHistory(symbol, range)
      if (h) out[symbol] = h
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, unique.length) }, worker))
  return out
}

export type NewsItem = { title: string; link: string; publishedAt: string | null; source: string; summary: string | null }

function decode(s: string) {
  return s
    .replace(/^<!\[CDATA\[|\]\]>$/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .trim()
}

function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? decode(m[1]) : null
}

/** Headlines for a set of tickers from Yahoo Finance RSS. Cached 15 minutes. */
export async function getNews(symbols: (string | null | undefined)[], limit = 8): Promise<NewsItem[]> {
  const list = [...new Set(symbols.filter(Boolean).map(s => s!.toUpperCase()))].slice(0, 12)
  if (list.length === 0) return []
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(list.join(','))}&region=US&lang=en-US`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, next: { revalidate: 900 } })
    if (!res.ok) return []
    const xml = await res.text()
    const seen = new Set<string>()
    const items: NewsItem[] = []
    for (const block of xml.match(/<item>[\s\S]*?<\/item>/gi) ?? []) {
      const title = tag(block, 'title')
      const link = tag(block, 'link')
      if (!title || !link || !/^https?:\/\//i.test(link) || seen.has(title)) continue
      seen.add(title)
      const pub = tag(block, 'pubDate')
      let source = ''
      try { source = new URL(link).hostname.replace(/^www\./, '') } catch { /* ignore */ }
      items.push({
        title,
        link,
        publishedAt: pub ? new Date(pub).toISOString() : null,
        source,
        summary: tag(block, 'description'),
      })
    }
    items.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    return items.slice(0, limit)
  } catch {
    return []
  }
}
