import { Suspense } from 'react'
import Link from 'next/link'
import { ChartLine, Newspaper, PieChart } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors, getSettings } from '@/lib/data'
import { loadPortfolio, sinceFirstBuy } from '@/lib/holdings'
import { getNews } from '@/lib/market'
import { getCalendar } from '@/lib/calendar'
import { PORTFOLIO_LEVEL } from '@/lib/portfolio'
import { day, money, todayET } from '@/lib/format'
import type { FidelitySync, Holding, Snapshot } from '@/lib/types'
import { Card, EmptyState, Notice, PageHeader } from '@/components/portal/ui'
import { BarList, LineChart, VIZ } from '@/components/portal/charts'
import { HoldingsTable } from '@/components/portal/HoldingsTable'
import { PortfolioHeatmap, type HeatItem } from '@/components/portal/PortfolioHeatmap'
import { PortfolioCalendar, monthGrid } from '@/components/portal/PortfolioCalendar'
import { PortfolioSnapshot, SnapshotSkeleton } from '@/components/portal/PortfolioSnapshot'
import { NewsList } from '@/components/portal/NewsList'
import { SelectNav } from '@/components/portal/SelectNav'
import { PortfolioTabs } from '@/components/portal/SectionTabs'

export const metadata = { title: 'Portfolio' }

/** Label for the last Fidelity import, and whether it's over a month old. */
function syncInfo(sync: FidelitySync | null) {
  if (!sync) return null
  const asOf = sync.as_of ?? sync.imported_at.slice(0, 10)
  const age = (Date.parse(`${todayET()}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000
  return { label: sync.label ?? day(asOf), stale: age > 35 }
}

type SoldHolding = Pick<Holding, 'id' | 'ticker' | 'name' | 'sector' | 'purchased_on' | 'sold_on'>

const TABS = ['overview', 'holdings', 'heatmap', 'calendar'] as const
type Tab = (typeof TABS)[number]
const DAY = 86_400_000

export default async function PortfolioPage({ searchParams }: { searchParams: { news?: string; tab?: string; month?: string } }) {
  const { member, access } = await requireMember()
  const tab: Tab = TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : 'overview'
  const [{ portfolio, sync: lastSync }, sectors] = await Promise.all([loadPortfolio(), getSectors()])
  const investment = sectors.filter(s => s.kind === 'investment').map(s => s.name)
  const canImport = access.canManagePpg
  const sync = syncInfo(lastSync)
  const header = (
    <>
      <PageHeader
        title="Portfolio"
        description={sync ? `Live prices, delayed about a minute. Shares and cost from Fidelity, ${sync.label}.` : "FIG's holdings, live. Prices are delayed about a minute."}
        actions={access.hasPpg ? <Link href="/portal/ppg" className="ui-btn ui-btn-secondary"><ChartLine size={16} /> Advanced analytics</Link> : null}
      />
      <PortfolioTabs active={tab} />
    </>
  )

  if (tab === 'holdings') {
    const supabase = await createClient()
    const [spySince, { data: soldRows }] = await Promise.all([
      sinceFirstBuy(portfolio.positions),
      supabase.from('holdings').select('id, ticker, name, sector, purchased_on, sold_on').eq('is_active', false)
        .order('sold_on', { ascending: false, nullsFirst: false }).limit(100),
    ])
    const sold = (soldRows ?? []) as SoldHolding[]
    return (
      <>
        {header}
        {portfolio.missingShares > 0 && (
          <div style={{ marginBottom: 20 }}>
            <Notice tone="warn">
              <strong>{portfolio.missingShares} of {portfolio.positions.length} holdings have no share count</strong>, so values and weights are incomplete.
              {canImport ? ' Use Update from Fidelity to fill them all in at once.' : ' A co-president or the PPG manager can update them from Fidelity.'}
            </Notice>
          </div>
        )}
        <HoldingsTable
          positions={portfolio.positions}
          hasValues={portfolio.hasValues}
          editableSectors={access.pmSectors}
          sectorOptions={investment}
          canManageAll={access.isAdmin || access.isPpgManager}
          cash={portfolio.cash}
          sync={sync}
          canImport={canImport}
          spySince={spySince}
        />
        {sold.length > 0 && (
          <details className="ui-card sold-holdings">
            <summary>
              <span><strong>Sold holdings</strong> <span className="ui-muted">· {sold.length}</span></span>
              <span className="ui-small ui-muted">Kept for the record</span>
            </summary>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead><tr><th>Holding</th><th>Sector</th><th>Bought</th><th>Sold</th></tr></thead>
                <tbody>
                  {sold.map(h => (
                    <tr key={h.id}>
                      <td><strong style={{ color: 'var(--ui-ink)' }}>{h.ticker ?? h.name}</strong>{h.ticker && <span className="cell-sub">{h.name}</span>}</td>
                      <td className="ui-small nowrap">{h.sector ?? PORTFOLIO_LEVEL}</td>
                      <td className="nowrap">{h.purchased_on ? day(h.purchased_on) : <span className="ui-muted">—</span>}</td>
                      <td className="nowrap">{h.sold_on ? day(h.sold_on) : <span className="ui-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </>
    )
  }

  if (tab === 'heatmap') {
    const items: HeatItem[] = portfolio.positions.map(p => ({
      id: p.id, label: p.ticker ?? p.name, name: p.name, sector: p.sector ?? PORTFOLIO_LEVEL,
      value: p.value, weight: p.weight, day: p.dayChangePct, dayChange: p.dayChange, total: p.gainPct, cost: p.cost, gain: p.gain,
    }))
    return (
      <>
        {header}
        <PortfolioHeatmap items={items} sized={portfolio.hasValues} />
      </>
    )
  }

  if (tab === 'calendar') {
    const today = todayET()
    const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month ?? '') ? searchParams.month! : today.slice(0, 7)
    const grid = monthGrid(month)
    const horizon = new Date(Date.parse(`${today}T00:00:00Z`) + 21 * DAY).toISOString().slice(0, 10)
    const settings = await getSettings()
    const notes = settings.portfolio.events ?? []
    const watch = settings.portfolio.watch ?? []
    const events = await getCalendar({
      from: grid.start < today ? grid.start : today,
      to: grid.end > horizon ? grid.end : horizon,
      tickers: [...portfolio.positions.map(p => p.ticker).filter((t): t is string => Boolean(t)), ...watch],
      notes,
    })
    return (
      <>
        {header}
        <PortfolioCalendar month={month} events={events} today={today} canEdit={access.canManagePpg} notes={notes} watch={watch} />
      </>
    )
  }

  const supabase = await createClient()
  const [{ data: snapshotRows }, settings] = await Promise.all([
    supabase.from('portfolio_snapshots').select('*').order('snapshot_date'),
    getSettings(),
  ])
  const snapshots = (snapshotRows ?? []) as Snapshot[]
  const newsSector = searchParams.news ?? (investment.includes(member.sector) ? member.sector : 'all')

  return (
    <>
      {header}

      {portfolio.missingShares > 0 && canImport && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="warn">
            {portfolio.missingShares} holdings have no share count yet. <Link href="/portal/portfolio?tab=holdings" className="ui-link">Update from Fidelity on the Holdings tab</Link> so values and the performance chart work.
          </Notice>
        </div>
      )}

      <Suspense fallback={<SnapshotSkeleton />}>
        <PortfolioSnapshot portfolio={portfolio} snapshots={snapshots} settings={settings.portfolio} canEdit={access.canManagePpg} />
      </Suspense>

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
              <p className="ui-hint" style={{ marginTop: 8 }}>Recorded every weekday evening, so donations in or out show up as moves.</p>
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
            <BarList items={portfolio.sectors.map(s => ({ label: s.sector, value: s.weight * 100, note: money(s.value) }))} unit="percent" />
          ) : (
            <BarList items={portfolio.sectors.map(s => ({ label: s.sector, value: s.count }))} />
          )}
        </Card>
      </div>

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
