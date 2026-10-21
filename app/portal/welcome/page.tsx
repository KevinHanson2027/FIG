import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors } from '@/lib/data'
import type { MemberInternal, ProfileChange, RoleRequest } from '@/lib/types'
import Onboarding from './Onboarding'
import Waiting from './Waiting'

export const metadata = { title: 'Welcome' }

export default async function WelcomePage({ searchParams }: { searchParams: { edit?: string; step?: string } }) {
  const viewer = await getViewer()
  if (!viewer) redirect('/login?next=/portal/welcome')
  const m = viewer.member
  if (!m || m.status === 'alumni') return null // the layout shows the inactive-account screen
  // Applicants can reopen their answers; set-up members edit from My Profile.
  const editing = searchParams.edit === '1' && m.status === 'pending'
  if (m.status === 'active' && m.onboarded_at) redirect('/portal')

  const supabase = await createClient()
  const [{ data: userData }, sectors, requestsRes, internalRes, changeRes] = await Promise.all([
    supabase.auth.getUser(),
    getSectors(),
    supabase.from('role_requests').select('*').eq('member_id', m.id).order('created_at'),
    supabase.from('member_internal').select('*').eq('member_id', m.id).maybeSingle(),
    supabase.from('profile_changes').select('*').eq('member_id', m.id).eq('status', 'pending').maybeSingle(),
  ])
  const requests = (requestsRes.data ?? []) as RoleRequest[]

  if (m.status === 'pending' && m.onboarded_at && !editing) {
    return <Waiting member={m} requests={requests.filter(r => r.status !== 'cancelled')} />
  }

  const hasPassword = viewer.authMethods.includes('password') || Boolean(userData.user?.user_metadata?.password_set)
  return (
    <Onboarding
      member={m}
      heldRoles={viewer.roles}
      requests={requests.filter(r => r.status === 'pending')}
      internal={(internalRes.data as MemberInternal | null) ?? null}
      pendingChange={(changeRes.data as ProfileChange | null) ?? null}
      sectors={sectors.map(s => ({ name: s.name, kind: s.kind }))}
      needsPassword={!hasPassword}
      initialStep={searchParams.step}
    />
  )
}
