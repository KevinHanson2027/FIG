// Market-data sections of the portal home page. Each is an async Server
// Component wrapped in <Suspense>, so Yahoo latency never blocks the page.
import Link from 'next/link'
import { ChartLine, Newspaper } from 'lucide-react'
import { loadPortfolio } from '@/lib/holdings'
import { getNews, getQuotes } from '@/lib/market'
import { getSectors } from '@/lib/data'
import { averageDayChange } from '@/lib/portfolio'
import { money } from '@/lib/format'
import { Card, Delta, EmptyState, Stat } from '@/components/portal/ui'
import { NewsList } from '@/components/portal/NewsList'

export function StatSkeleton() {
  return <div className="ui-skeleton" style={{ height: 108 }} />
}

export async function MarketTiles({ sector }: { sector: string }) {
  const [{ portfolio }, sectors] = await Promise.all([loadPortfolio(), getSectors()])
  const mine = portfolio.positions.filter(p => p.sector === sector)
  const benchmark = sectors.find(s => s.name === sector)?.benchmark ?? 'SPY'
  const quotes = await getQuotes([benchmark])
  const bench = quotes[benchmark.toUpperCase()]

  const sectorMove = mine.some(p => p.value)
    ? mine.reduce((s, p) => s + (p.dayChange ?? 0), 0) / mine.reduce((s, p) => s + ((p.value ?? 0) - (p.dayChange ?? 0)), 0)
    : averageDayChange(mine)

  return (
    <>
      {portfolio.hasValues ? (
        <Stat label="Portfolio value" icon={<ChartLine size={15} />} value={money(portfolio.total)}
          sub={<Delta value={portfolio.dayChangePct} money={money(portfolio.dayChange)} />} />
      ) : (
        <Stat label="Portfolio today" icon={<ChartLine size={15} />} value={<Delta value={averageDayChange(portfolio.positions)} />}
          sub={`Average move across ${portfolio.positions.length} holdings`} />
      )}
      {mine.length > 0 ? (
        <Stat label={`${sector} today`} value={<Delta value={sectorMove} />}
          sub={<>{mine.length} holding{mine.length === 1 ? '' : 's'}{bench ? <> · {benchmark} <Delta value={bench.changePct} /></> : null}</>} />
      ) : (
        <Stat label="S&P 500 today" value={<Delta value={bench?.changePct} />} sub={bench?.price ? `SPY ${money(bench.price, true)}` : 'Market data unavailable'} />
      )}
    </>
  )
}

export async function SectorHoldings({ sector }: { sector: string }) {
  const { portfolio } = await loadPortfolio()
  const mine = portfolio.positions.filter(p => p.sector === sector)
  const showingMovers = mine.length === 0
  const rows = showingMovers
    ? [...portfolio.positions].filter(p => p.dayChangePct !== null).sort((a, b) => Math.abs(b.dayChangePct!) - Math.abs(a.dayChangePct!)).slice(0, 6)
    : mine

  return (
    <Card
      title={showingMovers ? "Today's biggest movers" : `${sector} holdings`}
      description={showingMovers ? 'Largest moves in the FIG portfolio today' : undefined}
      actions={<Link href="/portal/portfolio" className="ui-btn ui-btn-ghost ui-btn-sm">Full portfolio</Link>}
      tight
    >
      {rows.length === 0 ? (
        <EmptyState icon={<ChartLine size={20} />} title="No price data right now">Market data will appear once quotes are available.</EmptyState>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Holding</th>
                <th className="num">Price</th>
                <th className="num">Today</th>
                {portfolio.hasValues && <th className="num">Weight</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--ui-ink)' }}>{p.ticker ?? '—'}</div>
                    <div className="ui-small ui-muted" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  </td>
                  <td className="num">{p.price !== null ? money(p.price, true) : p.ticker ? '—' : money(p.manual_value)}</td>
                  <td className="num"><Delta value={p.dayChangePct} /></td>
                  {portfolio.hasValues && <td className="num">{p.weight !== null ? `${(p.weight * 100).toFixed(1)}%` : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export async function SectorNews({ sector }: { sector: string }) {
  const [{ portfolio }, sectors] = await Promise.all([loadPortfolio(), getSectors()])
  const mine = portfolio.positions.filter(p => p.sector === sector && p.ticker)
  const benchmark = sectors.find(s => s.name === sector)?.benchmark
  const symbols = mine.length
    ? [...mine.map(p => p.ticker), benchmark]
    : [...portfolio.positions].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).filter(p => p.ticker).slice(0, 10).map(p => p.ticker)
  const news = await getNews(symbols, 6)

  return (
    <Card title={<><Newspaper size={18} /> {mine.length ? `${sector} news` : 'Portfolio news'}</>} tight>
      <NewsList items={news} empty="No recent headlines for these holdings." />
    </Card>
  )
}
