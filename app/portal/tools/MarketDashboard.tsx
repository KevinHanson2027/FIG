'use client'
import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChartCandlestick, Flame, Globe, Grid3x3, ListFilter, Wrench } from 'lucide-react'
import type { Quote } from '@/lib/types'

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

function QuoteTable({ symbols, title, names }: { symbols: string[]; title: string; names?: Record<string, string> }) {
  const [quotes, setQuotes] = useState<Quote[] | null>(null)

  useEffect(() => {
    fetch(`/api/quotes?symbols=${symbols.join(',')}`)
      .then(r => r.json())
      .then(d => setQuotes(symbols.map(s => d?.quotes?.[s]).filter(Boolean)))
      .catch(() => setQuotes([]))
  // symbols is a stable constant — safe to disable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="ui-card">
      <div className="ui-card-head"><h2>{title}</h2></div>
      {quotes === null ? (
        <div className="ui-card-body"><div className="ui-skeleton" style={{ height: 220 }} /></div>
      ) : quotes.length === 0 ? (
        <div className="ui-card-body ui-small ui-muted">
          Market data is unavailable right now.{' '}
          <a href="https://finance.yahoo.com" target="_blank" rel="noopener noreferrer" className="ui-link">Open Yahoo Finance →</a>
        </div>
      ) : (
        <ul className="ui-list">
          {quotes.map(q => (
            <li key={q.symbol} className="ui-list-item" style={{ padding: '10px 20px' }}>
              <div className="ui-list-main">
                <div className="ui-list-title">{q.symbol}</div>
                <div className="ui-list-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{names?.[q.symbol] ?? q.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{q.price !== null ? `$${q.price.toFixed(2)}` : '—'}</div>
                {q.changePct !== null && (
                  <div className={q.changePct >= 0 ? 'ui-up' : 'ui-down'} style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                    {q.changePct >= 0 ? '▲' : '▼'} {Math.abs(q.changePct * 100).toFixed(2)}%
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const FREE_TOOLS = [
  { name: 'StockAnalysis.com', url: 'https://stockanalysis.com/', desc: 'Financials, earnings, forecasts, and IPO data — all free' },
  { name: 'TIKR Terminal', url: 'https://tikr.com/', desc: '10+ years of financial statements — closest free alt to Capital IQ' },
  { name: 'Macrotrends', url: 'https://www.macrotrends.net/', desc: 'Long-term economic & financial charts going back decades' },
  { name: 'Koyfin', url: 'https://www.koyfin.com/', desc: 'Free Bloomberg-style charting, macro dashboard, and screener' },
  { name: 'Finviz', url: 'https://finviz.com/', desc: 'Stock screener, sector heat maps, insider trading, futures' },
  { name: 'Simply Wall St', url: 'https://simplywall.st/', desc: 'Visual fundamental analysis with snowflake scoring' },
  { name: 'Barchart Options', url: 'https://www.barchart.com/options', desc: 'Options flow, implied volatility, unusual activity' },
  { name: 'FRED Economic Data', url: 'https://fred.stlouisfed.org/', desc: 'St. Louis Fed — 800k+ economic time series, free forever' },
  { name: 'Damodaran Data (NYU)', url: 'https://pages.stern.nyu.edu/~adamodar/', desc: 'Valuation datasets, betas, ERP, and multiples from Prof. Damodaran' },
  { name: 'SEC EDGAR', url: 'https://www.sec.gov/cgi-bin/browse-edgar', desc: '10-K, 10-Q, 8-K, proxy, and all regulatory filings' },
  { name: 'Earnings Whispers', url: 'https://www.earningswhispers.com/', desc: 'Free earnings calendar with whisper numbers and analyst sentiment' },
  { name: 'Portfolio Visualizer', url: 'https://www.portfoliovisualizer.com/', desc: 'Free portfolio backtesting, factor analysis, and Monte Carlo sim' },
  { name: 'OpenInsider', url: 'https://openinsider.com/', desc: 'Free SEC Form 4 insider buy/sell tracker with clustering analysis' },
  { name: 'Unusual Whales', url: 'https://unusualwhales.com/', desc: 'Options flow, dark pool prints, and congressional trades (free tier)' },
]

function ToolCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="ui-card">
      <div className="ui-card-head"><div><h2>{icon} {title}</h2><p>{description}</p></div></div>
      <div className="ui-card-body">{children}</div>
    </section>
  )
}

function SymbolSelector({ active, onSelect }: { active: string; onSelect: (s: string) => void }) {
  const [custom, setCustom] = useState('')
  return (
    <div className="ui-row" style={{ marginBottom: 16 }}>
      <div className="ui-chips">
        {QUICK_TICKERS.map(s => (
          <button key={s} type="button" className={`ui-chip${active === s ? ' on' : ''}`} onClick={() => onSelect(s)}>{s}</button>
        ))}
      </div>
      <form className="ui-row" style={{ flexWrap: 'nowrap' }} onSubmit={e => { e.preventDefault(); if (custom.trim()) { onSelect(custom.trim().toUpperCase()); setCustom('') } }}>
        <input className="ui-input" style={{ width: 130, height: 32 }} value={custom} onChange={e => setCustom(e.target.value)} placeholder="Any ticker…" aria-label="Ticker" />
        <button type="submit" className="ui-btn ui-btn-primary ui-btn-sm">Go</button>
      </form>
    </div>
  )
}

export default function MarketDashboard() {
  const [activeSymbol, setActiveSymbol] = useState('SPY')
  const sectorNames = Object.fromEntries(SECTOR_ETFS.map(s => [s.symbol, s.name]))

  return (
    <div className="ui-stack">
      <div className="ui-card" style={{ overflow: 'hidden' }}><TradingViewTicker /></div>

      <div className="ui-grid ui-grid-2">
        <QuoteTable symbols={WATCHLIST} title="Major indices & ETFs" />
        <QuoteTable symbols={SECTOR_SYMBOLS} title="Sector ETFs" names={sectorNames} />
      </div>

      <ToolCard icon={<ChartCandlestick size={18} />} title="Symbol analysis" description="Pick a ticker — the chart, technical summary and financials update together.">
        <SymbolSelector active={activeSymbol} onSelect={setActiveSymbol} />
        <div className="ui-grid ui-grid-2" style={{ marginBottom: 20 }}>
          <div><div className="ui-label" style={{ marginBottom: 8 }}>Advanced chart</div><TradingViewChart symbol={activeSymbol} /></div>
          <div><div className="ui-label" style={{ marginBottom: 8 }}>Technical summary</div><TradingViewTechnicalAnalysis symbol={activeSymbol} /></div>
        </div>
        <div className="ui-label" style={{ marginBottom: 8 }}>Financials — income statement, balance sheet and cash flow</div>
        <TradingViewFinancials symbol={activeSymbol} />
      </ToolCard>

      <ToolCard icon={<Grid3x3 size={18} />} title="S&P 500 heatmap" description="Colored by today's move, sized by market cap. Click a block for its chart.">
        <TradingViewHeatmap />
      </ToolCard>

      <div className="ui-grid ui-grid-2">
        <ToolCard icon={<CalendarDays size={18} />} title="Economic calendar" description="Upcoming US releases — CPI, FOMC, payrolls, GDP.">
          <TradingViewEconomicCalendar />
        </ToolCard>
        <ToolCard icon={<Flame size={18} />} title="Today's top movers" description="Biggest gainers, losers and most active US stocks.">
          <TradingViewHotlists />
        </ToolCard>
      </div>

      <ToolCard icon={<Globe size={18} />} title="Market overview" description="12-month performance across indices, commodities, bonds and currencies.">
        <TradingViewMarketOverview />
      </ToolCard>

      <ToolCard icon={<ListFilter size={18} />} title="Stock screener" description="Filter US stocks by price, volume, sector, fundamentals and technicals.">
        <TradingViewScreener />
      </ToolCard>

      <ToolCard icon={<Wrench size={18} />} title="Free research tools" description="Curated sites — all free for their core features.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
          {FREE_TOOLS.map(tool => (
            <a key={tool.url} href={tool.url} target="_blank" rel="noopener noreferrer" className="portal-action" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 4 }}>
              <strong>{tool.name} →</strong>
              <span className="ui-small ui-muted">{tool.desc}</span>
            </a>
          ))}
        </div>
      </ToolCard>
      <p className="ui-hint" style={{ textAlign: 'center' }}>Charts and data by TradingView and Yahoo Finance. Prices may be delayed.</p>
    </div>
  )
}
