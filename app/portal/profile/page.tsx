import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors } from '@/lib/data'
import type { MemberInternal, ProfileChange, RoleRequest } from '@/lib/types'
import { PageHeader } from '@/components/portal/ui'
import { ProfileTabs } from './ProfileTabs'
import ProfileEditor from './ProfileEditor'
import { PlansForm, RolesCard } from './forms'

export const metadata = { title: 'My Profile' }

export default async function ProfilePage({ searchParams }: { searchParams: { tab?: string } }) {
  const { member, roles } = await requireMember()
  const tab = searchParams.tab === 'plans' ? 'plans' : 'profile'
  const sectors = await getSectors()
  const slug = sectors.find(s => s.name === member.sector)?.slug

  if (tab === 'profile') {
    return (
      <>
        <PageHeader title="My Profile" description="Edit how you appear on the FIG website. Changes go live when you publish." />
        <ProfileTabs active="profile" />
        <ProfileEditor
          member={member}
          sectorName={member.sector}
          publicUrl={member.is_public && slug ? `/members/${slug}/${member.id}` : null}
        />
      </>
    )
  }

  const supabase = await createClient()
  const [internalRes, sectorRes, requestsRes] = await Promise.all([
    supabase.from('member_internal').select('*').eq('member_id', member.id).maybeSingle(),
    supabase.from('profile_changes').select('*').eq('member_id', member.id).eq('status', 'pending').maybeSingle(),
    supabase.from('role_requests').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(12),
  ])
  const change = sectorRes.data as ProfileChange | null
  const pendingSector = change?.changes.sector ? { id: change.id, sector: change.changes.sector } : null

  return (
    <>
      <PageHeader title="My Profile" description="Your team, plans and roles." />
      <ProfileTabs active="plans" />
      <div className="ui-grid ui-grid-2">
        <PlansForm
          member={member}
          internal={(internalRes.data as MemberInternal | null) ?? null}
          sectors={sectors.map(s => s.name)}
          pendingSector={pendingSector}
        />
        <RolesCard
          roles={roles}
          requests={(requestsRes.data ?? []) as RoleRequest[]}
          investmentSectors={sectors.filter(s => s.kind === 'investment').map(s => s.name)}
          memberId={member.id}
        />
      </div>
    </>
  )
}
