'use client'
import { useEffect, useRef, useState } from 'react'

type QuoteData = {
  symbol: string
  shortName: string
  regularMarketPrice: number
  regularMarketChange: number
  regularMarketChangePercent: number
}

const WATCHLIST = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'TLT', 'GLD', 'USO']
const SECTOR_ETFS = [
  { symbol: 'XLK',  name: 'Technology' },
  { symbol: 'XLF',  name: 'Financials' },
  { symbol: 'XLE',  name: 'Energy' },
  { symbol: 'XLV',  name: 'Healthcare' },
  { symbol: 'XLY',  name: 'Consumer Disc.' },
  { symbol: 'XLP',  name: 'Consumer Staples' },
  { symbol: 'XLRE', name: 'Real Estate' },
  { symbol: 'XLI',  name: 'Industrials' },
]

function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'America/New_York',
      theme: 'light',
      style: '1',
      locale: 'en',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      height: 400,
    })
    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [symbol])

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height: '400px' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
    </div>
  )
}

function TradingViewTicker() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
        { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
        { proName: 'FOREXCOM:DJI',    title: 'Dow Jones' },
        { description: 'Russell 2000', proName: 'FOREXCOM:RUT' },
        { description: '10Y Treasury', proName: 'TVC:US10Y' },
        { description: 'Gold',         proName: 'OANDA:XAUUSD' },
        { description: 'Oil (WTI)',     proName: 'NYMEX:CL1!' },
        { description: 'Bitcoin',       proName: 'BITSTAMP:BTCUSD' },
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: 'adaptive',
      colorTheme: 'light',
      locale: 'en',
    })
    containerRef.current.appendChild(script)
  }, [])

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget" />
    </div>
  )
}

function QuoteTable({ symbols, title }: { symbols: string[]; title: string }) {
  const [quotes, setQuotes] = useState<QuoteData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/quotes?symbols=${symbols.join(',')}`)
      .then(r => r.json())
      .then(d => {
        const result = d?.quoteResponse?.result ?? []
        setQuotes(result)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [symbols])

  return (
    <div className="hub-tool-widget">
      <div className="hub-tool-header"><h3>{title}</h3></div>
      {loading ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>Loading quotes…</div>
      ) : quotes.length === 0 ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
          Market data unavailable. <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer" style={{ color: '#e62d2e' }}>Open Yahoo Finance →</a>
        </div>
      ) : (
        quotes.map(q => (
          <div key={q.symbol} className="hub-ticker-row">
            <div>
              <div className="hub-ticker-symbol">{q.symbol}</div>
              <div className="hub-ticker-name">{q.shortName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="hub-ticker-price">${q.regularMarketPrice?.toFixed(2)}</div>
              <div className={q.regularMarketChange >= 0 ? 'hub-ticker-change-up' : 'hub-ticker-change-down'}>
                {q.regularMarketChange >= 0 ? '▲' : '▼'} {Math.abs(q.regularMarketChangePercent).toFixed(2)}%
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

const FREE_TOOLS = [
  { name: 'Finviz Market Screener', url: 'https://finviz.com/', desc: 'Stock screener, heat maps, insider trading' },
  { name: 'Macrotrends', url: 'https://www.macrotrends.net/', desc: 'Long-term economic & financial charts' },
  { name: 'FRED Economic Data', url: 'https://fred.stlouisfed.org/', desc: 'Federal Reserve macro data' },
  { name: 'SEC EDGAR Filings', url: 'https://www.sec.gov/cgi-bin/browse-edgar', desc: '10-K, 10-Q, 8-K filings' },
  { name: 'Barchart Options', url: 'https://www.barchart.com/options', desc: 'Options flow, IV, unusual activity' },
  { name: 'Simply Wall St', url: 'https://simplywall.st/', desc: 'Visual fundamental analysis' },
  { name: 'StockAnalysis.com', url: 'https://stockanalysis.com/', desc: 'Free financials, earnings, forecasts' },
  { name: 'Koyfin', url: 'https://www.koyfin.com/', desc: 'Free Bloomberg-style charting platform' },
]

export default function MarketDashboard() {
  const [chartSymbol, setChartSymbol] = useState('SPY')
  const [customSymbol, setCustomSymbol] = useState('')

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <TradingViewTicker />
      </div>

      <div className="hub-tools-grid" style={{ marginBottom: '1.5rem' }}>
        <QuoteTable
          symbols={WATCHLIST}
          title="📊 Major Indices & ETFs"
        />
        <QuoteTable
          symbols={SECTOR_ETFS.map(s => s.symbol)}
          title="🗂 Sector ETF Performance"
        />
      </div>

      <div className="hub-card" style={{ marginBottom: '1.5rem' }}>
        <h3>📈 Interactive Chart</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {['SPY', 'QQQ', 'AAPL', 'NVDA', 'MSFT', 'JPM', 'BRK-B', 'GLD'].map(s => (
            <button
              key={s}
              onClick={() => setChartSymbol(s)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: chartSymbol === s ? '#e62d2e' : '#ddd',
                background: chartSymbol === s ? '#fee2e2' : 'white',
                color: chartSymbol === s ? '#e62d2e' : '#333',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
          <form onSubmit={e => { e.preventDefault(); if (customSymbol) setChartSymbol(customSymbol.toUpperCase()) }} style={{ display: 'flex', gap: '0.25rem' }}>
            <input
              value={customSymbol}
              onChange={e => setCustomSymbol(e.target.value)}
              placeholder="Any ticker…"
              style={{ padding: '0.3rem 0.5rem', border: '1px solid #ddd', borderRadius: '20px', fontSize: '0.8rem', width: '110px' }}
            />
            <button type="submit" style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', background: '#e62d2e', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Go</button>
          </form>
        </div>
        <TradingViewChart symbol={chartSymbol} />
      </div>

      <div className="hub-card">
        <h3>🔧 Free Research Tools</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
          {FREE_TOOLS.map(tool => (
            <a
              key={tool.url}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', padding: '1rem', border: '1px solid #eee', borderRadius: '8px', textDecoration: 'none', transition: 'all 0.2s' }}
            >
              <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{tool.name} →</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>{tool.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
