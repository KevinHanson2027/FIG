'use server'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { brandedEmail, isEmailConfigured, sendEmail } from '@/lib/email'
import { deliverSignInLink, getOrigin, type LinkDelivery } from '@/lib/accounts'

export type LinkResult = { ok: true; delivery: LinkDelivery } | { ok: false; error: string }

const NO_SERVICE_ROLE = 'Sign-in links need SUPABASE_SERVICE_ROLE_KEY in your Vercel settings. See SETUP.md, step 3.'

/** Email (or hand back) a one-time sign-in link for a member. */
export async function sendSignInLink(memberId: string): Promise<LinkResult> {
  await assertAdmin()
  if (!hasServiceRole()) return { ok: false, error: NO_SERVICE_ROLE }
  const supabase = await createClient()
  const { data: m } = await supabase.from('members_directory').select('name, email, status, onboarded_at').eq('id', memberId).maybeSingle()
  if (!m?.email) return { ok: false, error: 'Add an email address for this member first.' }
  if (m.status !== 'active') return { ok: false, error: 'Only active members can sign in.' }
  try {
    return { ok: true, delivery: await deliverSignInLink({ name: m.name, email: m.email, onboarded_at: m.onboarded_at }) }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export type BulkLinkResult = { ok: true; sent: number; links: { name: string; email: string; url: string }[]; failed: string[] } | { ok: false; error: string }

/** Sign-in links for many members at once (e.g. everyone not yet activated). */
export async function sendSignInLinks(memberIds: string[]): Promise<BulkLinkResult> {
  await assertAdmin()
  if (!hasServiceRole()) return { ok: false, error: NO_SERVICE_ROLE }
  const supabase = await createClient()
  const { data } = await supabase.from('members_directory').select('id, name, email, onboarded_at').in('id', memberIds).eq('status', 'active').not('email', 'is', null)
  let sent = 0
  const links: { name: string; email: string; url: string }[] = []
  const failed: string[] = []
  for (const m of data ?? []) {
    try {
      const d = await deliverSignInLink({ name: m.name, email: m.email!, onboarded_at: m.onboarded_at })
      if (d.sent) sent++
      else links.push({ name: m.name, email: m.email!, url: d.url })
    } catch {
      failed.push(m.name)
    }
  }
  return { ok: true, sent, links, failed }
}

export type ApproveResult =
  | { ok: true; approved: number; emailed: number; links: { name: string; email: string; url: string }[]; failed: string[] }
  | { ok: false; error: string }

/** Approve applicants (self sign-up or "request access"), optionally with
 *  every role they asked for. People without an account yet get a sign-up
 *  link; people who already verified get a "you're in" email. */
export async function approveMembers(memberIds: string[], withRoles: boolean): Promise<ApproveResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { data } = await supabase.from('members_directory').select('id, name, email, user_id, onboarded_at').in('id', memberIds).eq('status', 'pending')
  const result = { ok: true as const, approved: 0, emailed: 0, links: [] as { name: string; email: string; url: string }[], failed: [] as string[] }
  for (const m of data ?? []) {
    const { error } = await supabase.rpc('approve_member', { p_member: m.id, p_with_roles: withRoles })
    if (error) { result.failed.push(m.name); continue }
    result.approved++
    if (!m.email) continue
    try {
      if (!m.user_id) {
        // Applied without an account (email wasn't set up): send a sign-up link.
        if (!hasServiceRole()) continue
        const d = await deliverSignInLink({ name: m.name, email: m.email, onboarded_at: m.onboarded_at })
        if (d.sent) result.emailed++
        else result.links.push({ name: m.name, email: m.email, url: d.url })
      } else if (isEmailConfigured()) {
        const origin = await getOrigin()
        const heading = 'You’re in — welcome to FIG!'
        await sendEmail({
          to: m.email,
          subject: heading,
          ...brandedEmail({
            heading,
            paragraphs: [`Hi ${m.name.split(' ')[0]},`, 'A co-president approved your FIG member account. Sign in to see the portfolio, your team and your tasks.'],
            button: { label: 'Open the member portal', url: `${origin}/login` },
          }),
        })
        result.emailed++
      }
    } catch (e) {
      console.error('approval email failed', e)
    }
  }
  revalidatePath('/portal', 'layout')
  return result
}

/** Turn down an application: removes it (and its unused login) so the
 *  person can apply again later if it was a mistake. */
export async function denyApplication(memberId: string): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin()
  const supabase = await createClient()
  const { data: m } = await supabase.from('members_directory').select('user_id, status').eq('id', memberId).maybeSingle()
  if (!m || m.status !== 'pending') return { ok: false, error: 'This application was already handled.' }
  const { error } = await supabase.from('members_directory').delete().eq('id', memberId).eq('status', 'pending')
  if (error) return { ok: false, error: error.message }
  if (m.user_id && hasServiceRole()) {
    try { await createAdminClient().auth.admin.deleteUser(m.user_id) } catch (e) { console.error(e) }
  }
  revalidatePath('/portal', 'layout')
  return { ok: true }
}

export type NewMember = { name: string; email: string; sector: string; class_year: number | null; title?: string }

/** Add members to the roster in bulk (start of year), optionally sending sign-in links. */
export async function addMembers(rows: NewMember[], sendLinks: boolean): Promise<{ ok: true; added: number; skipped: string[]; links: BulkLinkResult | null } | { ok: false; error: string }> {
  await assertAdmin()
  const supabase = await createClient()
  const emails = rows.map(r => r.email.trim().toLowerCase())
  const { data: existing } = await supabase.from('members_directory').select('email').in('email', emails)
  const taken = new Set((existing ?? []).map(e => e.email))
  const fresh = rows.filter(r => !taken.has(r.email.trim().toLowerCase()))
  if (fresh.length) {
    const { data: inserted, error } = await supabase.from('members_directory').insert(fresh.map(r => ({
      name: r.name.trim(), email: r.email.trim().toLowerCase(), sector: r.sector, class_year: r.class_year,
      title: r.title?.trim() || `${r.sector} Analyst`, status: 'active', is_public: true, sort_order: 10,
    }))).select('id')
    if (error) return { ok: false, error: error.message }
    revalidatePath('/portal/admin/members')
    const links = sendLinks && inserted?.length ? await sendSignInLinks(inserted.map(i => i.id)) : null
    return { ok: true, added: fresh.length, skipped: rows.filter(r => taken.has(r.email.trim().toLowerCase())).map(r => r.email), links }
  }
  return { ok: true, added: 0, skipped: rows.map(r => r.email), links: null }
}
