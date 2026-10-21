import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors } from '@/lib/data'
import type { MemberInternal, ProfileChange, RoleRequest } from '@/lib/types'
import { Card, PageHeader } from '@/components/portal/ui'
import { PlansForm, PublicProfileForm, ReferralForm, RolesCard } from './forms'

export const metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const { member, roles, access, email } = await requireMember()
  const supabase = await createClient()
  const [internalRes, pendingRes, requestsRes, sectors] = await Promise.all([
    supabase.from('member_internal').select('*').eq('member_id', member.id).maybeSingle(),
    supabase.from('profile_changes').select('*').eq('member_id', member.id).eq('status', 'pending').maybeSingle(),
    supabase.from('role_requests').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(12),
    getSectors(),
  ])
  const slug = sectors.find(s => s.name === member.sector)?.slug

  return (
    <>
      <PageHeader title="My Profile" description="How you appear on the FIG website, your plans, and your roles." />
      <div className="ui-grid ui-grid-main">
        <div className="ui-stack">
          <PublicProfileForm
            member={member}
            pending={(pendingRes.data as ProfileChange | null) ?? null}
            sectors={sectors.map(s => s.name)}
            publicUrl={member.is_public && slug ? `/members/${slug}/${member.id}` : null}
          />
          <PlansForm member={member} internal={(internalRes.data as MemberInternal | null) ?? null} />
        </div>
        <div className="ui-stack">
          <RolesCard
            roles={roles}
            requests={(requestsRes.data ?? []) as RoleRequest[]}
            investmentSectors={sectors.filter(s => s.kind === 'investment').map(s => s.name)}
            memberId={member.id}
          />
          {!access.canRecruit && <ReferralForm sectors={sectors.filter(s => s.kind === 'investment').map(s => s.name)} />}
          <Card title={<><KeyRound size={18} /> Sign-in</>}>
            <p className="ui-small ui-muted" style={{ marginBottom: 12 }}>
              You sign in as <strong style={{ color: 'var(--ui-ink)' }}>{email}</strong>.
            </p>
            <Link href="/portal/account" className="ui-btn ui-btn-secondary ui-btn-sm">Change password</Link>
          </Card>
        </div>
      </div>
    </>
  )
}
