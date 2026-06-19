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
const SECTOR_SYMBOLS = SECTOR_ETFS.map(s => s.symbol)
const QUICK_TICKERS = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'MSFT', 'JPM', 'BRK-B', 'GLD']

function useTradingViewWidget(
  config: Record<string, unknown>,
  scriptSrc: string,
  deps: unknown[] = [],
) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = ''
    const script = document.createElement('script')
    script.src = scriptSrc
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify(config)
    containerRef.current.appendChild(script)
    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  // deps are passed explicitly by callers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return containerRef
}

function TradingViewTicker() {
  const ref = useTradingViewWidget(
    {
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
    },
    'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js',
    [],
  )
  return (
    <div className="tradingview-widget-container" ref={ref}>
      <div className="tradingview-widget-container__widget" />
    </div>
  )
}

function TradingViewHeatmap() {
  const ref = useTradingViewWidget(
    {
      exchanges: [],
      dataSource: 'SPX500',
      grouping: 'sector',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      locale: 'en',
      colorTheme: 'light',
      hasTopBar: true,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      width: '100%',
      height: 500,
    },
    'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js',
    [],
  )
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: '500px' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
    </div>
  )
}

function TradingViewEconomicCalendar() {
  const ref = useTradingViewWidget(
    {
      colorTheme: 'light',
      isTransparent: false,
      width: '100%',
      height: 450,
      locale: 'en',
      importanceFilter: '-1,0,1',
      countryFilter: 'us',
    },
    'https://s3.tradingview.com/external-embedding/embed-widget-events.js',
    [],
  )
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: '450px' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
    </div>
  )
}

function TradingViewMarketOverview() {
  const ref = useTradingViewWidget(
    {
      colorTheme: 'light',
      dateRange: '12M',
      showChart: true,
      locale: 'en',
      width: '100%',
      height: 550,
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      tabs: [
        {
          title: 'US Indices',
          symbols: [
            { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
            { s: 'FOREXCOM:NSXUSD', d: 'Nasdaq 100' },
            { s: 'FOREXCOM:DJI',    d: 'Dow Jones' },
            { s: 'FOREXCOM:RUT',    d: 'Russell 2000' },
          ],
        },
        {
          title: 'Commodities',
          symbols: [
            { s: 'NYMEX:CL1!',  d: 'WTI Crude Oil' },
            { s: 'NYMEX:NG1!',  d: 'Natural Gas' },
            { s: 'COMEX:GC1!',  d: 'Gold' },
            { s: 'COMEX:SI1!',  d: 'Silver' },
            { s: 'CBOT:ZC1!',   d: 'Corn' },
            { s: 'CBOT:ZW1!',   d: 'Wheat' },
          ],
        },
        {
          title: 'Bonds',
          symbols: [
            { s: 'TVC:US10Y',    d: '10Y Treasury' },
            { s: 'TVC:US02Y',    d: '2Y Treasury' },
            { s: 'TVC:US30Y',    d: '30Y Treasury' },
            { s: 'CBOT:ZB1!',   d: 'T-Bond Futures' },
            { s: 'TVC:DE10Y',   d: 'German 10Y Bund' },
          ],
        },
        {
          title: 'Forex',
          symbols: [
            { s: 'FX:EURUSD', d: 'EUR/USD' },
            { s: 'FX:GBPUSD', d: 'GBP/USD' },
            { s: 'FX:USDJPY', d: 'USD/JPY' },
            { s: 'FX:USDCHF', d: 'USD/CHF' },
            { s: 'FX:AUDUSD', d: 'AUD/USD' },
            { s: 'FX:USDCAD', d: 'USD/CAD' },
          ],
        },
      ],
    },
    'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js',
    [],
  )
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: '550px' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
    </div>
  )
}

function TradingViewHotlists() {
  const ref = useTradingViewWidget(
    {
      colorTheme: 'light',
      dateRange: '1D',
      exchange: 'US',
      showChart: true,
      locale: 'en',
      showSymbolLogo: false,
      showFloatingTooltip: false,
      width: '100%',
      height: 550,
      isTransparent: false,
    },
    'https://s3.tradingview.com/external-embedding/embed-widget-hotlists.js',
    [],
  )
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: '550px' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
    </div>
  )
}

function TradingViewScreener() {
  const ref = useTradingViewWidget(
    {
      width: '100%',
      height: 600,
      defaultColumn: 'overview',
      defaultScreen: 'most_capitalized',
      market: 'america',
      showToolbar: true,
      colorTheme: 'light',
      locale: 'en',
    },
    'https://s3.tradingview.com/external-embedding/embed-widget-screener.js',
    [],
  )
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: '600px' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
    </div>
  )
}

function TradingViewChart({ symbol }: { symbol: string }) {
  const ref = useTradingViewWidget(
    {
      autosize: true,
      symbol,
      interval: 'D',
      timezone: 'America/New_York',
      theme: 'light',
      style: '1',
      locale: 'en',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      height: 400,
    },
    'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js',
    [symbol],
  )
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: '400px' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
    </div>
  )
}

function TradingViewTechnicalAnalysis({ symbol }: { symbol: string }) {
  const ref = useTradingViewWidget(
    {
      interval: '1D',
      width: '100%',
      isTransparent: false,
      height: 425,
      symbol,
      showIntervalTabs: true,
      displayMode: 'single',
      locale: 'en',
      colorTheme: 'light',
    },
    'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js',
    [symbol],
  )
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: '425px' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
    </div>
  )
}

function TradingViewFinancials({ symbol }: { symbol: string }) {
  const ref = useTradingViewWidget(
    {
      isTransparent: false,
      largeChartUrl: '',
      displayMode: 'regular',
      width: '100%',
      height: 830,
      colorTheme: 'light',
      symbol,
      locale: 'en',
    },
    'https://s3.tradingview.com/external-embedding/embed-widget-financials.js',
    [symbol],
  )
  return (
    <div className="tradingview-widget-container" ref={ref} style={{ height: '830px' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%' }} />
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
  // symbols is a stable constant ref — safe to disable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="hub-tool-widget">
      <div className="hub-tool-header"><h3>{title}</h3></div>
      {loading ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>Loading quotes…</div>
      ) : quotes.length === 0 ? (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
          Market data unavailable.{' '}
          <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer" style={{ color: '#C80F2E' }}>
            Open Yahoo Finance →
          </a>
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
  // Data & Financials
  { name: 'StockAnalysis.com',      url: 'https://stockanalysis.com/',                         desc: 'Financials, earnings, forecasts, and IPO data — all free' },
  { name: 'TIKR Terminal',          url: 'https://tikr.com/',                                  desc: '10+ years of financial statements — closest free alt to Capital IQ' },
  { name: 'Macrotrends',            url: 'https://www.macrotrends.net/',                       desc: 'Long-term economic & financial charts going back decades' },
  { name: 'Koyfin',                 url: 'https://www.koyfin.com/',                            desc: 'Free Bloomberg-style charting, macro dashboard, and screener' },
  // Screening & Research
  { name: 'Finviz',                 url: 'https://finviz.com/',                                desc: 'Stock screener, sector heat maps, insider trading, futures' },
  { name: 'Simply Wall St',         url: 'https://simplywall.st/',                             desc: 'Visual fundamental analysis with snowflake scoring' },
  { name: 'Barchart Options',       url: 'https://www.barchart.com/options',                  desc: 'Options flow, implied volatility, unusual activity' },
  // Macro & Economic
  { name: 'FRED Economic Data',     url: 'https://fred.stlouisfed.org/',                      desc: 'St. Louis Fed — 800k+ economic time series, free forever' },
  { name: 'Damodaran Data (NYU)',   url: 'https://pages.stern.nyu.edu/~adamodar/',             desc: 'Valuation datasets, betas, ERP, and multiples from Prof. Damodaran' },
  // Filings
  { name: 'SEC EDGAR',              url: 'https://www.sec.gov/cgi-bin/browse-edgar',          desc: '10-K, 10-Q, 8-K, proxy, and all regulatory filings' },
  // Earnings
  { name: 'Earnings Whispers',      url: 'https://www.earningswhispers.com/',                 desc: 'Free earnings calendar with whisper numbers and analyst sentiment' },
  // Portfolio & Backtesting
  { name: 'Portfolio Visualizer',   url: 'https://www.portfoliovisualizer.com/',              desc: 'Free portfolio backtesting, factor analysis, and Monte Carlo sim' },
  // Insider & Alternative Data
  { name: 'OpenInsider',            url: 'https://openinsider.com/',                           desc: 'Free SEC Form 4 insider buy/sell tracker with clustering analysis' },
  { name: 'Unusual Whales',         url: 'https://unusualwhales.com/',                        desc: 'Options flow, dark pool prints, and congressional trades (free tier)' },
]

function SymbolSelector({
  active,
  onSelect,
  label,
}: {
  active: string
  onSelect: (s: string) => void
  label: string
}) {
  const [custom, setCustom] = useState('')
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 0.5rem' }}>{label}</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {QUICK_TICKERS.map(s => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: active === s ? '#C80F2E' : '#ddd',
              background: active === s ? '#fee2e2' : 'white',
              color: active === s ? '#C80F2E' : '#333',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
        <form
          onSubmit={e => {
            e.preventDefault()
            if (custom.trim()) { onSelect(custom.trim().toUpperCase()); setCustom('') }
          }}
          style={{ display: 'flex', gap: '0.25rem' }}
        >
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Any ticker…"
            style={{ padding: '0.3rem 0.5rem', border: '1px solid #ddd', borderRadius: '20px', fontSize: '0.8rem', width: '110px' }}
          />
          <button
            type="submit"
            style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', background: '#C80F2E', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Go
          </button>
        </form>
      </div>
    </div>
  )
}

export default function MarketDashboard() {
  const [activeSymbol, setActiveSymbol] = useState('SPY')

  return (
    <div>

      {/* Ticker tape */}
      <div style={{ marginBottom: '1.5rem', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <TradingViewTicker />
      </div>

      {/* Live quote tables */}
      <div className="hub-tools-grid" style={{ marginBottom: '1.5rem' }}>
        <QuoteTable symbols={WATCHLIST}       title="📊 Major Indices & ETFs" />
        <QuoteTable symbols={SECTOR_SYMBOLS}  title="🗂 Sector ETF Performance" />
      </div>

      {/* S&P 500 Heatmap */}
      <div className="hub-card" style={{ marginBottom: '1.5rem' }}>
        <h3>🌡 S&P 500 Heatmap</h3>
        <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 0.75rem' }}>
          Color-coded by daily % change, sized by market cap. Click any block to open a full chart.
        </p>
        <TradingViewHeatmap />
      </div>

      {/* Economic Calendar */}
      <div className="hub-card" style={{ marginBottom: '1.5rem' }}>
        <h3>🗓 Economic Calendar</h3>
        <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 0.75rem' }}>
          Upcoming US macro releases — CPI, FOMC, NFP, GDP, and more.
        </p>
        <TradingViewEconomicCalendar />
      </div>

      {/* Market Overview */}
      <div className="hub-card" style={{ marginBottom: '1.5rem' }}>
        <h3>🌐 Market Overview</h3>
        <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 0.75rem' }}>
          12-month performance across indices, commodities, bonds, and forex.
        </p>
        <TradingViewMarketOverview />
      </div>

      {/* Top Movers */}
      <div className="hub-card" style={{ marginBottom: '1.5rem' }}>
        <h3>🚀 Today&apos;s Top Movers</h3>
        <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 0.75rem' }}>
          Biggest gainers, losers, and most-active US equities updated in real time.
        </p>
        <TradingViewHotlists />
      </div>

      {/* Stock Screener */}
      <div className="hub-card" style={{ marginBottom: '1.5rem' }}>
        <h3>🔍 Stock Screener</h3>
        <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 0.75rem' }}>
          Filter US equities by price, volume, sector, fundamentals, and technical signals.
        </p>
        <TradingViewScreener />
      </div>

      {/* Symbol-linked tools — shared ticker selector */}
      <div className="hub-card" style={{ marginBottom: '1.5rem' }}>
        <h3>📈 Symbol Analysis</h3>
        <SymbolSelector
          active={activeSymbol}
          onSelect={setActiveSymbol}
          label="Select a ticker — chart, technical summary, and financials all update together."
        />

        {/* Chart + Technical Analysis side-by-side on wider screens */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#333', marginBottom: '0.5rem' }}>Advanced Chart</p>
            <TradingViewChart symbol={activeSymbol} />
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#333', marginBottom: '0.5rem' }}>Technical Summary</p>
            <TradingViewTechnicalAnalysis symbol={activeSymbol} />
          </div>
        </div>

        {/* Company Financials */}
        <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#333', marginBottom: '0.5rem' }}>
          Company Financials — income statement, balance sheet, and cash flow
        </p>
        <TradingViewFinancials symbol={activeSymbol} />
      </div>

      {/* Free Research Links */}
      <div className="hub-card">
        <h3>🔧 Free Research Tools</h3>
        <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 1rem' }}>
          Curated external tools — all free, no subscriptions required for core features.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
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
