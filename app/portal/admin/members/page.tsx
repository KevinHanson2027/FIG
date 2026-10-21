import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { hasServiceRole } from '@/lib/supabase/admin'
import { isEmailConfigured } from '@/lib/email'
import { getSectors, getSettings } from '@/lib/data'
import { summarize } from '@/lib/attendance'
import { todayET } from '@/lib/format'
import type { Attendance, Meeting, Member, RoleGrant } from '@/lib/types'
import { NoAccess, PageHeader } from '@/components/portal/ui'
import MembersAdmin, { type AdminRow } from './MembersAdmin'

export const metadata = { title: 'Members & Roles' }

export default async function MembersPage({ searchParams }: { searchParams: { account?: string } }) {
  const { access, member: me } = await requireMember()
  if (!access.isAdmin) return <NoAccess what="Members & Roles is for the co-presidents." />
  const supabase = await createClient()
  const [settings, sectors] = await Promise.all([getSettings(), getSectors(true)])
  const [membersRes, rolesRes, meetingsRes, attendanceRes] = await Promise.all([
    supabase.from('members_directory').select('*').order('name'),
    supabase.from('member_roles').select('member_id, role, sector'),
    supabase.from('meetings').select('*').gte('meeting_date', settings.term.starts_on),
    supabase.from('attendance').select('*'),
  ])
  const members = (membersRes.data ?? []) as Member[]
  const roles = (rolesRes.data ?? []) as (RoleGrant & { member_id: string })[]
  const meetings = (meetingsRes.data ?? []) as Meeting[]
  const records = (attendanceRes.data ?? []) as Attendance[]
  const today = todayET()

  const rows: AdminRow[] = members.map(m => {
    const mine = roles.filter(r => r.member_id === m.id).map(r => ({ role: r.role, sector: r.sector }))
    const inPpg = mine.some(r => r.role === 'ppg_member' || r.role === 'ppg_manager')
    const rate = m.status === 'active' ? summarize(meetings, records, m, { inPpg, since: settings.term.starts_on, today }).rate : null
    return { member: m, roles: mine, attendance: rate }
  })

  return (
    <>
      <PageHeader title="Members & Roles" description="Everyone on the roster. Edit profiles, assign roles, send sign-in links and archive alumni." />
      <MembersAdmin
        rows={rows}
        sectors={sectors.map(s => ({ name: s.name, slug: s.slug, kind: s.kind }))}
        initialAccount={searchParams.account ?? 'all'}
        canSendLinks={hasServiceRole()}
        emailConfigured={isEmailConfigured()}
        viewerId={me.id}
      />
    </>
  )
}
