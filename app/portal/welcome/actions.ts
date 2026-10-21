'use server'
import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { brandedEmail, isEmailConfigured, sendEmail } from '@/lib/email'
import { getOrigin } from '@/lib/accounts'
import { ROLES } from '@/lib/roles'
import type { Role } from '@/lib/types'

/** Marks first-login setup done and lets the co-presidents know when
 *  there's something for them to review. */
export async function finishOnboarding(): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getViewer()
  const m = viewer?.member
  if (!m || (m.status !== 'active' && m.status !== 'pending')) return { ok: false, error: 'Please sign in again.' }

  const supabase = await createClient()
  const { error } = await supabase.from('members_directory').update({ onboarded_at: new Date().toISOString() }).eq('id', m.id)
  if (error) return { ok: false, error: error.message }

  const [{ data: requests }, { data: change }] = await Promise.all([
    supabase.from('role_requests').select('role, sector').eq('member_id', m.id).eq('status', 'pending'),
    supabase.from('profile_changes').select('id').eq('member_id', m.id).eq('status', 'pending').maybeSingle(),
  ])
  const asks = (requests ?? []).map(r => `${ROLES[r.role as Role]?.label ?? r.role}${r.sector ? ` (${r.sector})` : ''}`)
  const somethingToReview = m.status === 'pending' || asks.length > 0 || Boolean(change)

  if (somethingToReview && isEmailConfigured() && hasServiceRole() && m.email) {
    try {
      const admin = createAdminClient()
      // At most one heads-up per person every 10 minutes (re-submitting shouldn't spam).
      const { data: recent } = await admin.from('email_link_log').select('sent_at').eq('email', m.email).eq('purpose', 'admin_notify')
        .gte('sent_at', new Date(Date.now() - 600_000).toISOString()).limit(1)
      if (recent?.length) throw new Error('skip: notified recently')
      const { data: admins } = await admin
        .from('member_roles')
        .select('member:members_directory!member_roles_member_id_fkey(email, status)')
        .eq('role', 'admin')
      const to = ((admins ?? []) as unknown as { member: { email: string | null; status: string } | null }[])
        .map(a => a.member).filter(x => x?.email && x.status === 'active').map(x => x!.email!)
      if (to.length) {
        const heading = m.status === 'pending' ? `New member application: ${m.name}` : `${m.name} finished setting up`
        const paragraphs = [
          m.status === 'pending'
            ? `${m.name} (${m.email}) created an account and is waiting for approval to join ${m.sector}.`
            : `${m.name} (${m.sector}) finished setting up their portal account.`,
          asks.length ? `Requested roles: ${asks.join(', ')}.` : 'No extra roles requested.',
          ...(change ? ['They also submitted profile updates for the website.'] : []),
        ]
        const origin = await getOrigin()
        await sendEmail({ to, subject: heading, ...brandedEmail({ heading, paragraphs, button: { label: 'Review in the Control Panel', url: `${origin}/portal/admin` } }) })
        await admin.from('email_link_log').insert({ email: m.email, purpose: 'admin_notify' })
      }
    } catch (e) {
      if (!String(e).includes('skip:')) console.error('admin notification failed', e) // never block onboarding on email
    }
  }

  revalidatePath('/portal', 'layout')
  return { ok: true }
}
