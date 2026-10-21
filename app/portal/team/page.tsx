import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors, getSettings } from '@/lib/data'
import { summarize } from '@/lib/attendance'
import { loadPortfolio } from '@/lib/holdings'
import { todayET } from '@/lib/format'
import type { Attendance, Meeting, MeetingKind, Member, MemberInternal, RoleGrant, Task } from '@/lib/types'
import { NoAccess, PageHeader, Tabs } from '@/components/portal/ui'
import { SelectNav } from '@/components/portal/SelectNav'
import { TaskManager } from '@/components/portal/TaskManager'
import { AttendanceManager } from '@/components/portal/AttendanceManager'
import { HoldingsTable } from '@/components/portal/HoldingsTable'
import Roster, { type RosterRow } from './Roster'

export const metadata = { title: 'Sector Team' }

const TABS = ['roster', 'tasks', 'attendance', 'holdings'] as const
type Tab = (typeof TABS)[number]

export default async function TeamPage({ searchParams }: { searchParams: { sector?: string; tab?: string } }) {
  const { member, access } = await requireMember()
  if (!access.canManageTeams) return <NoAccess what="Sector Teams is the workspace for Portfolio Managers." />

  const [sectors, settings] = await Promise.all([getSectors(), getSettings()])
  const allowed = access.isAdmin ? sectors.map(s => s.name) : access.pmSectors
  const sector = searchParams.sector && allowed.includes(searchParams.sector)
    ? searchParams.sector
    : allowed.includes(member.sector) ? member.sector : allowed[0]
  const sectorInfo = sectors.find(s => s.name === sector)
  const isInvestment = sectorInfo?.kind === 'investment'
  const tab: Tab = TABS.includes(searchParams.tab as Tab) && (searchParams.tab !== 'holdings' || isInvestment) ? (searchParams.tab as Tab) : 'roster'
  const today = todayET()

  const supabase = await createClient()
  const { data: memberRows } = await supabase
    .from('members_directory')
    .select('*')
    .eq('sector', sector)
    .eq('status', 'active')
    .order('sort_order')
    .order('name')
  const members = (memberRows ?? []) as Member[]
  const ids = members.map(m => m.id)
  const teamMembers = members.map(m => ({ id: m.id, name: m.name, headshot_url: m.headshot_url }))

  let body: React.ReactNode = null

  if (tab === 'roster') {
    const [internalRes, rolesRes, tasksRes, meetingsRes, recordsRes] = await Promise.all([
      supabase.from('member_internal').select('*').in('member_id', ids),
      supabase.from('member_roles').select('member_id, role, sector').in('member_id', ids),
      supabase.from('tasks').select('assigned_to, status').in('assigned_to', ids).neq('status', 'done'),
      supabase.from('meetings').select('*').gte('meeting_date', settings.term.starts_on),
      supabase.from('attendance').select('*').in('member_id', ids),
    ])
    const internal = new Map(((internalRes.data ?? []) as MemberInternal[]).map(i => [i.member_id, i]))
    const roles = (rolesRes.data ?? []) as (RoleGrant & { member_id: string })[]
    const meetings = (meetingsRes.data ?? []) as Meeting[]
    const records = (recordsRes.data ?? []) as Attendance[]
    const rows: RosterRow[] = members.map(m => {
      const mine = roles.filter(r => r.member_id === m.id)
      const inPpg = mine.some(r => r.role === 'ppg_member' || r.role === 'ppg_manager')
      const att = summarize(meetings, records, m, { inPpg, since: settings.term.starts_on, today })
      return {
        member: m,
        internal: internal.get(m.id) ?? null,
        roles: mine.map(r => ({ role: r.role, sector: r.sector })),
        attendance: { rate: att.rate, present: att.present, late: att.late, excused: att.excused, absent: att.absent },
        openTasks: (tasksRes.data ?? []).filter(t => t.assigned_to === m.id).length,
      }
    })
    body = <Roster rows={rows} sector={sector} termName={settings.term.name} />
  }

  if (tab === 'tasks') {
    const [tasksRes, holdingsRes] = await Promise.all([
      supabase.from('tasks').select('*, assignee:members_directory!tasks_assigned_to_fkey(name)').eq('team', 'sector').eq('sector', sector)
        .order('created_at', { ascending: false }).limit(400),
      supabase.from('holdings').select('ticker').eq('sector', sector).eq('is_active', true),
    ])
    const tasks = ((tasksRes.data ?? []) as (Task & { assignee: { name: string } | null })[]).map(t => ({ ...t, assignee: t.assignee?.name ?? null }))
    body = <TaskManager team="sector" sector={sector} members={teamMembers} tasks={tasks}
      tickers={(holdingsRes.data ?? []).map(h => h.ticker).filter(Boolean) as string[]} />
  }

  if (tab === 'attendance') {
    const { data: meetingRows } = await supabase.from('meetings').select('*').gte('meeting_date', settings.term.starts_on)
      .order('meeting_date', { ascending: false }).order('created_at', { ascending: false })
    const meetings = ((meetingRows ?? []) as Meeting[]).filter(m => m.kind === 'general' || m.kind === 'event' || (m.kind === 'sector' && m.sector === sector))
    const { data: recordRows } = meetings.length && ids.length
      ? await supabase.from('attendance').select('*').in('meeting_id', meetings.map(m => m.id)).in('member_id', ids)
      : { data: [] }
    const createKinds: MeetingKind[] = access.isAdmin ? ['general', 'sector', 'event'] : ['sector']
    body = <AttendanceManager meetings={meetings} records={(recordRows ?? []) as Attendance[]} members={teamMembers}
      createKinds={createKinds} sector={sector} defaultTitle={`${sector} meeting`}
      editableMeetingIds={meetings.filter(m => access.isAdmin || (m.kind === 'sector' && access.pmSectors.includes(m.sector ?? ''))).map(m => m.id)} />
  }

  if (tab === 'holdings') {
    const { portfolio } = await loadPortfolio()
    body = <HoldingsTable title={`${sector} holdings`} positions={portfolio.positions.filter(p => p.sector === sector)} hasValues={portfolio.hasValues}
      editableSectors={access.pmSectors} sectorOptions={sectors.filter(s => s.kind === 'investment').map(s => s.name)}
      canManageAll={access.isAdmin || access.isPpgManager} showSector={false} />
  }

  return (
    <>
      <PageHeader
        title={`${sector} Team`}
        description={`${members.length} active member${members.length === 1 ? '' : 's'} · ${settings.term.name}`}
        actions={allowed.length > 1 ? <SelectNav param="sector" value={sector} label="Choose sector" options={allowed.map(s => ({ value: s, label: s }))} /> : null}
      />
      <Tabs basePath="/portal/team" params={{ sector }} active={tab} tabs={[
        { id: 'roster', label: 'Roster' },
        { id: 'tasks', label: 'Assignments' },
        { id: 'attendance', label: 'Attendance' },
        ...(isInvestment ? [{ id: 'holdings', label: 'Holdings' }] : []),
      ]} />
      {body}
    </>
  )
}
