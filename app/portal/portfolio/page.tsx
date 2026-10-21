import { Suspense } from 'react'
import Link from 'next/link'
import { ChartLine, Newspaper, PieChart } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors } from '@/lib/data'
import { loadPortfolio } from '@/lib/holdings'
import { getNews } from '@/lib/market'
import { averageDayChange } from '@/lib/portfolio'
import { money, pct } from '@/lib/format'
import type { Snapshot } from '@/lib/types'
import { Card, Delta, EmptyState, Notice, PageHeader, Stat } from '@/components/portal/ui'
import { BarList, LineChart, VIZ } from '@/components/portal/charts'
import { HoldingsTable } from '@/components/portal/HoldingsTable'
import { NewsList } from '@/components/portal/NewsList'
import { SelectNav } from '@/components/portal/SelectNav'

export const metadata = { title: 'Portfolio' }

export default async function PortfolioPage({ searchParams }: { searchParams: { news?: string } }) {
  const { member, access } = await requireMember()
  const supabase = await createClient()
  const [{ portfolio }, sectors, snapshotsRes] = await Promise.all([
    loadPortfolio(),
    getSectors(),
    supabase.from('portfolio_snapshots').select('*').order('snapshot_date'),
  ])
  const snapshots = (snapshotsRes.data ?? []) as Snapshot[]
  const investment = sectors.filter(s => s.kind === 'investment').map(s => s.name)
  const newsSector = searchParams.news ?? (investment.includes(member.sector) ? member.sector : 'all')
  const unrealized = portfolio.positions.reduce((s, p) => s + (p.gain ?? 0), 0)
  const costCovered = portfolio.positions.filter(p => p.gain !== null)
  const costBase = costCovered.reduce((s, p) => s + (p.cost_basis ?? 0) * p.shares, 0)

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Live view of FIG's holdings. Prices are delayed and refresh about every minute."
        actions={access.hasPpg ? <Link href="/portal/ppg" className="ui-btn ui-btn-secondary"><ChartLine size={16} /> Advanced analytics</Link> : null}
      />

      {portfolio.missingShares > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="warn">
            <strong>{portfolio.missingShares} of {portfolio.positions.length} holdings don&apos;t have share counts yet</strong>, so values and weights are incomplete.
            {access.canManageTeams || access.isPpgManager ? ' Use the pencil icon on each row to add shares and average cost.' : ' Your PM or the PPG manager can add them.'}
          </Notice>
        </div>
      )}

      <div className="ui-grid ui-grid-4" style={{ marginBottom: 20 }}>
        <Stat label="Total value" value={portfolio.hasValues ? money(portfolio.total) : '—'} sub={portfolio.cash ? `Includes ${money(portfolio.cash)} cash` : 'Holdings + cash'} />
        <Stat label="Today" value={<Delta value={portfolio.hasValues ? portfolio.dayChangePct : averageDayChange(portfolio.positions)} />}
          sub={portfolio.hasValues ? `${portfolio.dayChange >= 0 ? '+' : '−'}${money(Math.abs(portfolio.dayChange))}` : 'Average move per holding'} />
        <Stat label="Holdings" value={portfolio.positions.length} sub={`${portfolio.sectors.length} sector${portfolio.sectors.length === 1 ? '' : 's'}`} />
        <Stat label="Unrealized gain" value={costCovered.length ? <span className={unrealized >= 0 ? 'ui-up' : 'ui-down'}>{unrealized >= 0 ? '+' : '−'}{money(Math.abs(unrealized))}</span> : '—'}
          sub={costCovered.length ? `${pct(costBase ? unrealized / costBase : null)} on ${costCovered.length} positions with cost basis` : 'Needs average cost per share'} />
      </div>

      <div className="ui-grid ui-grid-main" style={{ marginBottom: 20 }}>
        <Card title={<><ChartLine size={18} /> Performance</>} description={snapshots.length >= 2 ? 'Daily portfolio value vs. the S&P 500, both indexed to 100.' : undefined}>
          {snapshots.length >= 2 ? (
            <>
              <LineChart
                label="FIG portfolio value versus S&P 500, indexed to 100"
                dates={snapshots.map(s => s.snapshot_date)}
                series={[
                  { name: 'S&P 500 (SPY)', color: VIZ.context, values: indexSeries(snapshots.map(s => s.benchmark_close)) },
                  { name: 'FIG portfolio', color: VIZ.series, emphasis: true, values: indexSeries(snapshots.map(s => s.total_value)) },
                ]}
              />
              <p className="ui-hint" style={{ marginTop: 8 }}>Based on recorded daily value, so donations in or out show up as moves. Recorded every weekday evening.</p>
            </>
          ) : (
            <EmptyState icon={<ChartLine size={20} />} title="Performance history is building">
              FIG&apos;s total value is recorded every weekday evening{portfolio.hasValues ? '' : ' once share counts are entered'}. The chart appears after a couple of days.
            </EmptyState>
          )}
        </Card>
        <Card title={<><PieChart size={18} /> Allocation</>} description={portfolio.hasValues ? 'Share of total value by sector' : 'Number of holdings by sector'}>
          {portfolio.sectors.length === 0 ? (
            <EmptyState title="No holdings yet" />
          ) : portfolio.hasValues ? (
            <BarList items={portfolio.sectors.map(s => ({ label: s.sector, value: s.weight * 100, note: money(s.value) }))} format={v => `${v.toFixed(1)}%`} />
          ) : (
            <BarList items={portfolio.sectors.map(s => ({ label: s.sector, value: s.count }))} format={v => `${v}`} />
          )}
        </Card>
      </div>

      <div className="ui-stack">
        <HoldingsTable
          positions={portfolio.positions}
          hasValues={portfolio.hasValues}
          editableSectors={access.pmSectors}
          sectorOptions={investment}
          canManageAll={access.isAdmin || access.isPpgManager}
        />

        <Card
          title={<><Newspaper size={18} /> News</>}
          actions={
            <SelectNav param="news" value={newsSector} label="News for sector"
              options={[{ value: 'all', label: 'Whole portfolio' }, ...investment.map(s => ({ value: s, label: s }))]} />
          }
          tight
        >
          <Suspense key={newsSector} fallback={<div className="ui-skeleton" style={{ height: 240, margin: 20 }} />}>
            <PortfolioNews sector={newsSector} />
          </Suspense>
        </Card>
      </div>
    </>
  )
}

function indexSeries(values: (number | null)[]) {
  const base = values.find(v => v !== null && v > 0)
  return values.map(v => (v !== null && base ? (v / base) * 100 : null))
}

async function PortfolioNews({ sector }: { sector: string }) {
  const [{ portfolio }, sectors] = await Promise.all([loadPortfolio(), getSectors()])
  const pool = sector === 'all' ? portfolio.positions : portfolio.positions.filter(p => p.sector === sector)
  const tickers = [...pool].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).map(p => p.ticker).filter(Boolean).slice(0, 10)
  const bench = sectors.find(s => s.name === sector)?.benchmark
  const news = await getNews(bench ? [...tickers, bench] : tickers, 8)
  return <NewsList items={news} empty="No recent headlines for these holdings." />
}
