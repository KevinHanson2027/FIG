// Technical and risk analytics for the Portfolio Performance Group.
// Pure functions over daily closing prices (no I/O).
import type { History } from '@/lib/market'

const TRADING_DAYS = 252

export function returns(closes: number[]) {
  const out: number[] = []
  for (let i = 1; i < closes.length; i++) out.push(closes[i] / closes[i - 1] - 1)
  return out
}

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

export function stdev(xs: number[]) {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}

export function covariance(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n))
  let s = 0
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb)
  return s / (n - 1)
}

export function correlation(a: number[], b: number[]) {
  const sa = stdev(a), sb = stdev(b)
  return sa && sb ? covariance(a, b) / (sa * sb) : 0
}

export function sma(closes: number[], n: number) {
  if (closes.length < n) return null
  return mean(closes.slice(-n))
}

/** Wilder's RSI. */
export function rsi(closes: number[], n = 14) {
  if (closes.length <= n) return null
  let gain = 0, loss = 0
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gain += d; else loss -= d
  }
  gain /= n; loss /= n
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    gain = (gain * (n - 1) + Math.max(d, 0)) / n
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n
  }
  if (loss === 0) return 100
  return 100 - 100 / (1 + gain / loss)
}

export function maxDrawdown(closes: number[]) {
  let peak = -Infinity, worst = 0
  for (const c of closes) {
    peak = Math.max(peak, c)
    worst = Math.min(worst, c / peak - 1)
  }
  return worst
}

/** Return from the close `days` trading days ago (or the first close) to the last. */
export function trailing(closes: number[], days: number | null) {
  if (closes.length < 2) return null
  const start = days === null ? closes[0] : closes[Math.max(0, closes.length - 1 - days)]
  return closes[closes.length - 1] / start - 1
}

function sinceDate(h: History, isoDate: string) {
  const i = h.dates.findIndex(d => d >= isoDate)
  if (i < 0 || i >= h.closes.length - 1) return null
  return h.closes[h.closes.length - 1] / h.closes[Math.max(0, i - 1)] - 1
}

/** Align two series on common dates and return their daily returns. */
function alignedReturns(a: History, b: History) {
  const bMap = new Map(b.dates.map((d, i) => [d, b.closes[i]]))
  const pa: number[] = [], pb: number[] = []
  a.dates.forEach((d, i) => { const v = bMap.get(d); if (v !== undefined) { pa.push(a.closes[i]); pb.push(v) } })
  return [returns(pa), returns(pb)] as const
}

export type Technicals = {
  ticker: string
  price: number
  ret1M: number | null
  ret3M: number | null
  retYTD: number | null
  ret1Y: number | null
  vol: number
  beta: number | null
  rsi: number | null
  vsSma50: number | null
  vsSma200: number | null
  trend: 'up' | 'down' | null
  rangePos: number | null
  drawdown: number
}

export function technicals(h: History, bench: History | null, ytdStart: string): Technicals {
  const c = h.closes
  const price = c[c.length - 1]
  const s50 = sma(c, 50), s200 = sma(c, 200)
  const hi = Math.max(...c), lo = Math.min(...c)
  let beta: number | null = null
  if (bench && h.symbol !== bench.symbol) {
    const [ra, rb] = alignedReturns(h, bench)
    const v = stdev(rb) ** 2
    beta = v ? covariance(ra, rb) / v : null
  }
  return {
    ticker: h.symbol,
    price,
    ret1M: trailing(c, 21),
    ret3M: trailing(c, 63),
    retYTD: sinceDate(h, ytdStart),
    ret1Y: trailing(c, null),
    vol: stdev(returns(c)) * Math.sqrt(TRADING_DAYS),
    beta,
    rsi: rsi(c),
    vsSma50: s50 ? price / s50 - 1 : null,
    vsSma200: s200 ? price / s200 - 1 : null,
    trend: s50 && s200 ? (s50 >= s200 ? 'up' : 'down') : null,
    rangePos: hi > lo ? (price - lo) / (hi - lo) : null,
    drawdown: maxDrawdown(c),
  }
}

export type Backtest = {
  dates: string[]
  portfolio: number[]   // indexed to 100
  benchmark: number[]   // indexed to 100
  stats: {
    ret: number; benchRet: number; vol: number; benchVol: number; sharpe: number | null
    beta: number; correlation: number; trackingError: number; maxDrawdown: number; benchDrawdown: number
  }
}

/** Daily-rebalanced backtest of today's weights over the benchmark's calendar. */
export function backtest(histories: Record<string, History>, weights: Record<string, number>, bench: History, riskFree: number): Backtest | null {
  const maps = Object.fromEntries(Object.entries(histories).map(([s, h]) => [s, new Map(h.dates.map((d, i) => [d, h.closes[i]]))]))
  const symbols = Object.keys(weights).filter(s => maps[s])
  if (symbols.length === 0 || bench.dates.length < 30) return null

  const port = [100], bm = [100], dates = [bench.dates[0]], pr: number[] = [], br: number[] = []
  for (let i = 1; i < bench.dates.length; i++) {
    const d = bench.dates[i], prev = bench.dates[i - 1]
    let wSum = 0, r = 0
    for (const s of symbols) {
      const a = maps[s].get(prev), b = maps[s].get(d)
      if (a && b) { r += weights[s] * (b / a - 1); wSum += weights[s] }
    }
    const pRet = wSum > 0 ? r / wSum : 0
    const bRet = bench.closes[i] / bench.closes[i - 1] - 1
    pr.push(pRet); br.push(bRet)
    port.push(port[port.length - 1] * (1 + pRet))
    bm.push(bm[bm.length - 1] * (1 + bRet))
    dates.push(d)
  }
  const vol = stdev(pr) * Math.sqrt(TRADING_DAYS)
  const benchVol = stdev(br) * Math.sqrt(TRADING_DAYS)
  const years = pr.length / TRADING_DAYS
  const ret = port[port.length - 1] / 100 - 1
  const annual = years > 0 ? (1 + ret) ** (1 / years) - 1 : ret
  const varB = stdev(br) ** 2
  return {
    dates,
    portfolio: port,
    benchmark: bm,
    stats: {
      ret,
      benchRet: bm[bm.length - 1] / 100 - 1,
      vol,
      benchVol,
      sharpe: vol ? (annual - riskFree) / vol : null,
      beta: varB ? covariance(pr, br) / varB : 0,
      correlation: correlation(pr, br),
      trackingError: stdev(pr.map((x, i) => x - br[i])) * Math.sqrt(TRADING_DAYS),
      maxDrawdown: maxDrawdown(port),
      benchDrawdown: maxDrawdown(bm),
    },
  }
}

/** Pairwise correlation of daily returns on common dates. */
export function correlationMatrix(histories: History[]) {
  const n = histories.length
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(1))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a, b] = alignedReturns(histories[i], histories[j])
      m[i][j] = m[j][i] = correlation(a, b)
    }
  }
  return m
}

/** Weighted return of a group of holdings since a date. */
export function groupReturn(histories: Record<string, History>, weights: Record<string, number>, sinceIso: string) {
  let wSum = 0, r = 0
  for (const [s, w] of Object.entries(weights)) {
    const h = histories[s]
    if (!h) continue
    const v = sinceDate(h, sinceIso)
    if (v === null) continue
    r += w * v
    wSum += w
  }
  return wSum ? r / wSum : null
}

export function returnSince(h: History | undefined, sinceIso: string) {
  return h ? sinceDate(h, sinceIso) : null
}
