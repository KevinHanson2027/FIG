import { NextResponse } from 'next/server'
import { getQuotes } from '@/lib/market'

// Live quotes for the portal (ticker lookups, market tools). Public data,
// but limited to a sane number of well-formed symbols.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = (searchParams.get('symbols') ?? 'SPY,QQQ,DIA')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9.\-^=]{1,12}$/.test(s))
    .slice(0, 40)
  const quotes = await getQuotes(symbols)
  return NextResponse.json({ quotes }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } })
}
