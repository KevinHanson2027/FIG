import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = searchParams.get('symbols') ?? 'SPY,QQQ,DIA'

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=symbol,shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        next: { revalidate: 60 },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ quoteResponse: { result: [] } })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ quoteResponse: { result: [] } })
  }
}
