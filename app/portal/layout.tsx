import './portal.css'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getViewer, needsOnboarding, type ActiveViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { roleLine } from '@/lib/roles'
import { Shell, type ShellBadges } from '@/components/portal/Shell'
import InactiveAccount from './InactiveAccount'
import OnboardingFrame from './OnboardingFrame'

export const metadata: Metadata = {
  title: { template: '%s | FIG Portal', default: 'FIG Portal' },
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

async function loadBadges(viewer: ActiveViewer): Promise<ShellBadges> {
  const supabase = await createClient()
  const me = viewer.member.id
  const [tasks, interviews, approvals] = await Promise.all([
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', me).in('status', ['todo', 'in_progress']),
    supabase.from('interviews').select('status').eq('interviewer_id', me),
    viewer.access.isAdmin
      ? Promise.all([
          supabase.from('members_directory').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('role_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('profile_changes').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ])
      : Promise.resolve([]),
  ])
  return {
    tasks: tasks.count ?? 0,
    interviews: (interviews.data ?? []).filter(i => i.status === 'scheduled').length,
    hasInterviews: (interviews.data ?? []).length > 0,
    approvals: approvals.reduce((sum, r) => sum + (r.count ?? 0), 0),
  }
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  if (!viewer) redirect('/login?next=/portal')
  if (!viewer.member || viewer.member.status === 'alumni') {
    return <InactiveAccount email={viewer.email} status={viewer.member?.status ?? null} />
  }
  // Applicants and first-time members only see the setup wizard (/portal/welcome).
  if (needsOnboarding(viewer.member)) return <OnboardingFrame>{children}</OnboardingFrame>

  const active = viewer as ActiveViewer
  const badges = await loadBadges(active)

  return (
    <Shell
      member={{ name: active.member.name, headshot_url: active.member.headshot_url, roleLine: roleLine(active.member.title, active.roles) }}
      access={active.access}
      badges={badges}
    >
      {children}
    </Shell>
  )
}
