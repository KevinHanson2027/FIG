import { Suspense } from 'react'
import Link from 'next/link'
import { Activity, FileText } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors, getSettings } from '@/lib/data'
import { loadPortfolio } from '@/lib/holdings'
import { getHistories } from '@/lib/market'
import { backtest, correlationMatrix, groupReturn, returnSince, technicals } from '@/lib/analytics'
import { pct, todayET } from '@/lib/format'
import type { Attendance, Meeting, Resource, Task } from '@/lib/types'
import { Badge, Card, EmptyState, NoAccess, Notice, PageHeader, Stat, Tabs } from '@/components/portal/ui'
import { Heatmap, LineChart, VIZ } from '@/components/portal/charts'
import { TaskManager } from '@/components/portal/TaskManager'
import { AttendanceManager } from '@/components/portal/AttendanceManager'
import { ResourceLibrary } from '@/components/portal/ResourceLibrary'
import TechnicalsTable from './TechnicalsTable'
import PortfolioSettingsForm from './PortfolioSettingsForm'

export const metadata = { title: 'Portfolio Performance Group' }
export const maxDuration = 30

const TABS = ['analytics', 'assignments', 'files', 'meetings', 'settings'] as const
type Tab = (typeof TABS)[number]

export default async function PpgPage({ searchParams }: { searchParams: { tab?: string } }) {
  const { member, access } = await requireMember()
  if (!access.hasPpg) return <NoAccess what="This workspace is for the Portfolio Performance Group." />
  const manager = access.canManagePpg
  const requested = TABS.includes(searchParams.tab as Tab) ? (searchParams.tab as Tab) : 'analytics'
  const tab: Tab = !manager && (requested === 'meetings' || requested === 'settings') ? 'analytics' : requested
  const supabase = await createClient()

  // PPG roster (members holding a PPG role).
  const { data: roleRows } = await supabase
    .from('member_roles')
    .select('role, member:members_directory!member_roles_member_id_fkey(id, name, headshot_url, status)')
    .in('role', ['ppg_member', 'ppg_manager'])
  const roster = new Map<string, { id: string; name: string; headshot_url: string | null; manager: boolean }>()
  for (const r of (roleRows ?? []) as unknown as { role: string; member: { id: string; name: string; headshot_url: string | null; status: string } | null }[]) {
    if (!r.member || r.member.status !== 'active') continue
    const cur = roster.get(r.member.id)
    roster.set(r.member.id, { id: r.member.id, name: r.member.name, headshot_url: r.member.headshot_url, manager: (cur?.manager ?? false) || r.role === 'ppg_manager' })
  }
  const team = [...roster.values()].sort((a, b) => Number(b.manager) - Number(a.manager) || a.name.localeCompare(b.name))

  let body: React.ReactNode = null
  if (tab === 'analytics') {
    body = (
      <Suspense fallback={<AnalyticsSkeleton />}>
        <Analytics />
      </Suspense>
    )
  }
  if (tab === 'assignments') {
    if (manager) {
      const { data } = await supabase.from('tasks').select('*, assignee:members_directory!tasks_assigned_to_fkey(name)').eq('team', 'ppg').order('created_at', { ascending: false }).limit(400)
      const tasks = ((data ?? []) as (Task & { assignee: { name: string } | null })[]).map(t => ({ ...t, assignee: t.assignee?.name ?? null }))
      const { portfolio } = await loadPortfolio()
      body = <TaskManager team="ppg" sector={null} members={team} tasks={tasks} tickers={portfolio.positions.map(p => p.ticker).filter(Boolean) as string[]} />
    } else {
      const { data } = await supabase.from('tasks').select('*').eq('team', 'ppg').eq('assigned_to', member.id).neq('status', 'done').order('due_date')
      const mine = (data ?? []) as Task[]
      body = (
        <Card title="My PPG assignments" actions={<Link href="/portal/tasks" className="ui-btn ui-btn-secondary ui-btn-sm">Open My Tasks</Link>} tight>
          {mine.length === 0 ? <EmptyState title="No open PPG assignments" /> : (
            <ul className="ui-list">
              {mine.map(t => (
                <li key={t.id} className="ui-list-item">
                  <div className="ui-list-main"><div className="ui-list-title">{t.title}</div><div className="ui-list-sub">{t.due_date ? `Due ${t.due_date}` : 'No due date'}</div></div>
                  <Badge tone={t.status === 'submitted' ? 'amber' : 'blue'}>{t.status === 'submitted' ? 'Submitted' : 'Open'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )
    }
  }
  if (tab === 'files') {
    const { data } = await supabase.from('resources').select('*, uploader:members_directory(name)').eq('audience', 'ppg').order('created_at', { ascending: false })
    const resources = ((data ?? []) as (Resource & { uploader: { name: string } | null })[]).map(r => ({ ...r, uploader: r.uploader?.name ?? null }))
    body = <ResourceLibrary resources={resources} viewerId={member.id} isAdmin={access.isAdmin} title="PPG files"
      description="Models, data and reports shared by the PPG manager."
      uploadOptions={manager ? [{ key: 'ppg', audience: 'ppg', sector: null, label: 'Portfolio Performance Group' }] : []} />
  }
  if (tab === 'meetings' && manager) {
    const settings = await getSettings()
    const { data: m } = await supabase.from('meetings').select('*').eq('kind', 'ppg').gte('meeting_date', settings.term.starts_on).order('meeting_date', { ascending: false })
    const meetings = (m ?? []) as Meeting[]
    const { data: rec } = meetings.length ? await supabase.from('attendance').select('*').in('meeting_id', meetings.map(x => x.id)) : { data: [] }
    body = <AttendanceManager meetings={meetings} records={(rec ?? []) as Attendance[]} members={team} createKinds={['ppg']} sector={null}
      defaultTitle="PPG meeting" editableMeetingIds={meetings.map(x => x.id)} />
  }
  if (tab === 'settings' && manager) {
    const settings = await getSettings()
    body = (
      <div className="ui-grid ui-grid-2">
        <PortfolioSettingsForm initial={settings.portfolio} />
        <Card title={<><FileText size={18} /> Portfolio reporting</>} description="Publish monthly reports and edit the public Portfolio Reporting and Holdings pages.">
          <div className="ui-row">
            <Link href="/portal/content?tab=reports" className="ui-btn ui-btn-primary ui-btn-sm">Manage reports</Link>
            <Link href="/portal/content?page=portfolio-reporting" className="ui-btn ui-btn-secondary ui-btn-sm">Edit reporting page</Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Portfolio Performance Group"
        description={`${team.length} member${team.length === 1 ? '' : 's'}${team.find(t => t.manager) ? ` · led by ${team.filter(t => t.manager).map(t => t.name).join(', ')}` : ''}`}
      />
      <Tabs basePath="/portal/ppg" active={tab} tabs={[
        { id: 'analytics', label: 'Analytics' },
        { id: 'assignments', label: 'Assignments' },
        { id: 'files', label: 'Files' },
        ...(manager ? [{ id: 'meetings', label: 'Meetings' }, { id: 'settings', label: 'Settings' }] : []),
      ]} />
      {body}
    </>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="ui-stack" aria-busy="true" aria-label="Loading analytics">
      <div className="ui-grid ui-grid-4">{[0, 1, 2, 3].map(i => <div key={i} className="ui-skeleton" style={{ height: 108 }} />)}</div>
      <div className="ui-skeleton" style={{ height: 340 }} />
      <div className="ui-skeleton" style={{ height: 420 }} />
    </div>
  )
}

async function Analytics() {
  const [{ portfolio }, sectors, settings] = await Promise.all([loadPortfolio(), getSectors(), getSettings()])
  const priced = portfolio.positions.filter(p => p.ticker)
  if (priced.length === 0) return <Card><EmptyState icon={<Activity size={22} />} title="No holdings to analyze yet" /></Card>

  const valueWeighted = portfolio.hasValues && priced.some(p => p.value)
  const weights: Record<string, number> = {}
  for (const p of priced) {
    const w = valueWeighted ? p.value ?? 0 : 1
    if (w > 0) weights[p.ticker!.toUpperCase()] = w
  }
  const benchSymbols = [...new Set(sectors.map(s => s.benchmark).filter(Boolean) as string[])]
  const histories = await getHistories([...Object.keys(weights), 'SPY', ...benchSymbols], '1y')
  const spy = histories.SPY
  if (!spy) {
    return <Notice tone="warn">Market history is temporarily unavailable from the data provider. Try again in a few minutes.</Notice>
  }

  const ytd = `${todayET().slice(0, 4)}-01-01`
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0)
  const rows = priced.filter(p => histories[p.ticker!.toUpperCase()]).map(p => ({
    ...technicals(histories[p.ticker!.toUpperCase()], spy, ytd),
    weight: weights[p.ticker!.toUpperCase()] ? weights[p.ticker!.toUpperCase()] / totalW : null,
    sector: p.sector ?? 'Portfolio-level',
  }))
  const bt = backtest(histories, weights, spy, settings.portfolio.risk_free_rate)

  const top = [...rows].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 12)
  const corr = correlationMatrix(top.map(r => histories[r.ticker]))

  const threeMonthsAgo = spy.dates[Math.max(0, spy.dates.length - 64)]
  const yearStart = spy.dates[0]
  const sectorRows = sectors.filter(s => s.kind === 'investment').map(s => {
    const w = Object.fromEntries(priced.filter(p => p.sector === s.name && weights[p.ticker!.toUpperCase()]).map(p => [p.ticker!.toUpperCase(), weights[p.ticker!.toUpperCase()]]))
    const bench = s.benchmark ? histories[s.benchmark.toUpperCase()] : undefined
    return {
      sector: s.name, benchmark: s.benchmark, count: Object.keys(w).length,
      fig3m: groupReturn(histories, w, threeMonthsAgo), etf3m: returnSince(bench, threeMonthsAgo),
      fig1y: groupReturn(histories, w, yearStart), etf1y: returnSince(bench, yearStart),
    }
  }).filter(r => r.count > 0)

  const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b)
  const Ret = ({ v }: { v: number | null }) => v === null ? <span className="ui-muted">—</span> : <span className={v > 0 ? 'ui-up' : v < 0 ? 'ui-down' : ''}>{pct(v, 1)}</span>

  return (
    <div className="ui-stack">
      <Notice tone="info">
        {valueWeighted
          ? 'Analytics use today’s holdings at their current market-value weights, backtested over the past year.'
          : 'Share counts are missing, so analytics treat every holding equally. Add shares on the Portfolio page for value-weighted results.'}
      </Notice>

      {bt && (
        <div className="ui-grid ui-grid-4">
          <Stat label="1-year return" value={<Ret v={bt.stats.ret} />} sub={<>S&amp;P 500 <Ret v={bt.stats.benchRet} /></>} />
          <Stat label="Volatility" value={pct(bt.stats.vol, 1, false)} sub={`S&P 500 ${pct(bt.stats.benchVol, 1, false)} · annualized`} />
          <Stat label="Beta / Sharpe" value={`${bt.stats.beta.toFixed(2)} / ${bt.stats.sharpe === null ? '—' : bt.stats.sharpe.toFixed(2)}`} sub={`Sharpe uses ${pct(settings.portfolio.risk_free_rate, 1, false)} risk-free`} />
          <Stat label="Max drawdown" value={<span className="ui-down">{pct(bt.stats.maxDrawdown, 1, false)}</span>} sub={`S&P 500 ${pct(bt.stats.benchDrawdown, 1, false)} · tracking error ${pct(bt.stats.trackingError, 1, false)}`} />
        </div>
      )}

      {bt && (
        <Card title="Current holdings vs. S&P 500" description="Growth of $100 over the past year, rebalanced daily to today’s weights.">
          <LineChart label="Backtest of current FIG holdings versus the S&P 500, growth of 100 dollars" dates={bt.dates}
            series={[
              { name: 'S&P 500 (SPY)', color: VIZ.context, values: bt.benchmark },
              { name: 'FIG holdings', color: VIZ.series, values: bt.portfolio, emphasis: true },
            ]} />
        </Card>
      )}

      <TechnicalsTable rows={rows} />

      <div className="ui-grid ui-grid-2">
        <Card title="Correlation" description={`Daily-return correlation of the ${top.length} largest positions (1Y). High values mean they tend to move together.`}>
          <Heatmap labels={top.map(r => r.ticker)} matrix={corr} caption="Correlation of daily returns between the largest holdings" />
        </Card>
        <Card title="Sectors vs. benchmarks" description="FIG’s holdings in each sector compared with that sector’s ETF." tight>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead><tr><th>Sector</th><th className="num">FIG 3M</th><th className="num">ETF 3M</th><th className="num">± 3M</th><th className="num">FIG 1Y</th><th className="num">± 1Y</th></tr></thead>
              <tbody>
                {sectorRows.map(r => (
                  <tr key={r.sector}>
                    <td><div style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{r.sector}</div><div className="ui-small ui-muted">vs {r.benchmark ?? '—'} · {r.count} holding{r.count === 1 ? '' : 's'}</div></td>
                    <td className="num"><Ret v={r.fig3m} /></td>
                    <td className="num"><Ret v={r.etf3m} /></td>
                    <td className="num"><Ret v={diff(r.fig3m, r.etf3m)} /></td>
                    <td className="num"><Ret v={r.fig1y} /></td>
                    <td className="num"><Ret v={diff(r.fig1y, r.etf1y)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
