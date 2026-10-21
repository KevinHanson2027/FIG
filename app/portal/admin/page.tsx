import Link from 'next/link'
import { ChevronRight, TriangleAlert, Users } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors } from '@/lib/data'
import type { Member, MemberInternal, ProfileChange, RoleGrant, RoleRequest } from '@/lib/types'
import { NoAccess, PageHeader, Stat } from '@/components/portal/ui'
import Approvals from './Approvals'

export const metadata = { title: 'Approvals' }

export default async function AdminHome() {
  const { access } = await requireMember()
  if (!access.isAdmin) return <NoAccess what="The Control Panel is for the co-presidents." />
  const supabase = await createClient()

  const [pendingRes, roleReqRes, changeRes, activeRes, rolesRes, sectors] = await Promise.all([
    supabase.from('members_directory').select('*').eq('status', 'pending').order('created_at'),
    supabase.from('role_requests').select('*, member:members_directory!role_requests_member_id_fkey(name, sector, title, headshot_url)').eq('status', 'pending').order('created_at'),
    supabase.from('profile_changes').select('*, member:members_directory!profile_changes_member_id_fkey(*)').eq('status', 'pending').order('created_at'),
    supabase.from('members_directory').select('id, name, email, user_id, class_year').eq('status', 'active'),
    supabase.from('member_roles').select('member_id, role, sector'),
    getSectors(),
  ])
  const pending = (pendingRes.data ?? []) as Member[]
  const { data: internalRows } = pending.length
    ? await supabase.from('member_internal').select('*').in('member_id', pending.map(p => p.id))
    : { data: [] as MemberInternal[] }
  const internalOf = new Map(((internalRows ?? []) as MemberInternal[]).map(n => [n.member_id, n]))
  const pendingIds = new Set(pending.map(p => p.id))
  const allRoleRequests = (roleReqRes.data ?? []) as (RoleRequest & { member: Pick<Member, 'name' | 'sector' | 'title' | 'headshot_url'> | null })[]

  const roles = (rolesRes.data ?? []) as (RoleGrant & { member_id: string })[]
  const active = (activeRes.data ?? []) as Pick<Member, 'id' | 'name' | 'email' | 'user_id' | 'class_year'>[]
  const nameOf = new Map(active.map(m => [m.id, m.name]))
  const pmBySector = new Map<string, string[]>()
  for (const r of roles) if (r.role === 'portfolio_manager' && r.sector) pmBySector.set(r.sector, [...(pmBySector.get(r.sector) ?? []), nameOf.get(r.member_id) ?? '—'])

  const warnings: { text: string; href: string }[] = []
  const noPm = sectors.filter(s => s.kind === 'investment' && !pmBySector.get(s.name)?.length).map(s => s.name)
  if (noPm.length) warnings.push({ text: `No Portfolio Manager for ${noPm.join(', ')}`, href: '/portal/admin/members' })
  for (const [role, label] of [['ppg_manager', 'PPG Manager'], ['recruiting', 'Recruiting lead'], ['marketing', 'Marketing']] as const) {
    if (!roles.some(r => r.role === role)) warnings.push({ text: `No one is assigned as ${label}`, href: '/portal/admin/members' })
  }
  const noEmail = active.filter(m => !m.email).length
  if (noEmail) warnings.push({ text: `${noEmail} active member${noEmail === 1 ? ' has' : 's have'} no email, so they can't sign in`, href: '/portal/admin/members?account=no-email' })
  const noYear = active.filter(m => !m.class_year).length
  if (noYear) warnings.push({ text: `${noYear} member${noYear === 1 ? ' is' : 's are'} missing a graduation year (needed for the year-end transition)`, href: '/portal/admin/members?account=no-year' })

  const activated = active.filter(m => m.user_id).length

  return (
    <>
      <PageHeader title="Approvals" description="Requests from members waiting for a co-president. Approving applies the change right away." />
      <div className="ui-grid ui-grid-3" style={{ marginBottom: 20 }}>
        <Stat label="Waiting for you" value={pending.length + allRoleRequests.filter(r => !pendingIds.has(r.member_id)).length + (changeRes.data?.length ?? 0)} sub="Applications, role and profile requests" />
        <Stat label="Active members" icon={<Users size={15} />} value={active.length} sub={`${sectors.length} sectors`} />
        <Stat label="Accounts activated" value={`${activated} / ${active.length}`} sub={<Link href="/portal/admin/members?account=not-activated" className="ui-link">Send sign-in links</Link>} />
      </div>

      {warnings.length > 0 && (
        <div className="portal-actions">
          {warnings.map(w => (
            <Link key={w.text} href={w.href} className="portal-action">
              <span className="dot amber"><TriangleAlert size={16} /></span>
              <span>{w.text}</span>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      )}

      <Approvals
        applications={pending.map(p => ({
          member: p,
          internal: internalOf.get(p.id) ?? null,
          requests: allRoleRequests.filter(r => r.member_id === p.id).map(r => ({ role: r.role, sector: r.sector })),
        }))}
        roleRequests={allRoleRequests.filter(r => !pendingIds.has(r.member_id))}
        profileChanges={(changeRes.data ?? []) as (ProfileChange & { member: Member | null })[]}
        pmBySector={Object.fromEntries(pmBySector)}
      />
    </>
  )
}
