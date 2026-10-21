import 'server-only'
import type { Quote } from '@/lib/types'

// Free market data from Yahoo Finance's public chart endpoints (no API key).
// Responses are cached by Next.js so pages stay fast and we stay polite.

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

function chunk<T>(items: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Latest price and day change for up to hundreds of symbols (20 per request). */
export async function getQuotes(symbols: (string | null | undefined)[]): Promise<Record<string, Quote>> {
  const unique = [...new Set(symbols.filter(Boolean).map(s => s!.trim().toUpperCase()))]
  if (unique.length === 0) return {}
  const parts = await Promise.all(chunk(unique, 20).map(fetchSpark))
  return Object.assign({}, ...parts)
}

async function fetchSpark(symbols: string[]): Promise<Record<string, Quote>> {
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbols.join(','))}&range=1d&interval=1d`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, next: { revalidate: 60 } })
    if (!res.ok) return {}
    const json = await res.json()
    const out: Record<string, Quote> = {}
    for (const r of json?.spark?.result ?? []) {
      const meta = r?.response?.[0]?.meta
      if (!meta || !r.symbol) continue
      const price: number | null = meta.regularMarketPrice ?? null
      const prev: number | null = meta.chartPreviousClose ?? meta.previousClose ?? null
      const change = price !== null && prev !== null ? price - prev : null
      out[String(r.symbol).toUpperCase()] = {
        symbol: r.symbol,
        name: meta.shortName ?? meta.longName ?? null,
        price,
        previousClose: prev,
        change,
        changePct: change !== null && prev ? change / prev : null,
        high52: meta.fiftyTwoWeekHigh ?? null,
        low52: meta.fiftyTwoWeekLow ?? null,
      }
    }
    return out
  } catch {
    return {}
  }
}

export type History = { symbol: string; dates: string[]; closes: number[] }

/** Daily adjusted closes. Cached for six hours. */
export async function getHistory(symbol: string, range: '6mo' | '1y' | '2y' | '5y' = '1y'): Promise<History | null> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, next: { revalidate: 21600 } })
    if (!res.ok) return null
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    const stamps: number[] = result?.timestamp ?? []
    const closes: (number | null)[] = result?.indicators?.adjclose?.[0]?.adjclose ?? result?.indicators?.quote?.[0]?.close ?? []
    const dates: string[] = []
    const values: number[] = []
    stamps.forEach((t, i) => {
      const c = closes[i]
      if (typeof c === 'number' && Number.isFinite(c)) {
        dates.push(new Date(t * 1000).toISOString().slice(0, 10))
        values.push(c)
      }
    })
    return values.length ? { symbol: symbol.toUpperCase(), dates, closes: values } : null
  } catch {
    return null
  }
}

/** Fetch many histories with limited concurrency. */
export async function getHistories(symbols: string[], range: '6mo' | '1y' | '2y' | '5y' = '1y') {
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
