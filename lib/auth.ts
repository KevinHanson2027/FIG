import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccess, type Access } from '@/lib/roles'
import type { Member, RoleGrant } from '@/lib/types'

export type Viewer = {
  userId: string
  email: string
  member: Member | null
  roles: RoleGrant[]
  access: Access
  /** How this session signed in, e.g. ['password'] or ['invite'] (from the JWT). */
  authMethods: string[]
}

export type ActiveViewer = Viewer & { member: Member }

/** The signed-in user, their roster entry and roles. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null

  const { data: member } = await supabase
    .from('members_directory')
    .select('*')
    .eq('user_id', claims.sub)
    .maybeSingle<Member>()

  let roles: RoleGrant[] = []
  if (member?.status === 'active') {
    const { data: rows } = await supabase
      .from('member_roles')
      .select('role, sector')
      .eq('member_id', member.id)
    roles = (rows ?? []) as RoleGrant[]
  }

  const amr = (claims.amr as { method: string }[] | undefined) ?? []
  return {
    userId: claims.sub,
    email: (claims.email as string | undefined) ?? '',
    member: member ?? null,
    roles,
    access: getAccess(roles),
    authMethods: amr.map(a => a.method),
  }
})

/** Applicants and members who haven't finished first-login setup. */
export function needsOnboarding(member: Member | null) {
  return Boolean(member && (member.status === 'pending' || (member.status === 'active' && !member.onboarded_at)))
}

/** For portal pages: an active, set-up member. Everyone else goes to
 *  /portal/welcome (onboarding, "waiting for approval", or the inactive
 *  account screen — the portal layout decides which). */
export async function requireMember(): Promise<ActiveViewer> {
  const viewer = await getViewer()
  if (!viewer) redirect('/login')
  if (!viewer.member || viewer.member.status !== 'active' || !viewer.member.onboarded_at) redirect('/portal/welcome')
  return viewer as ActiveViewer
}

/** For Server Actions: throws instead of redirecting. */
export async function assertMember(): Promise<ActiveViewer> {
  const viewer = await getViewer()
  if (!viewer?.member || viewer.member.status !== 'active') {
    throw new Error('Please sign in again.')
  }
  return viewer as ActiveViewer
}

export async function assertAdmin(): Promise<ActiveViewer> {
  const viewer = await assertMember()
  if (!viewer.access.isAdmin) throw new Error('Only co-presidents can do that.')
  return viewer
}
