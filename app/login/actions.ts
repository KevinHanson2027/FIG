'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { isEmailConfigured } from '@/lib/email'
import { deliverSignInLink } from '@/lib/accounts'
import type { SignupSettings } from '@/lib/types'

type Result = { ok: boolean; message: string }
export type StartResult =
  | { status: 'sent'; message: string }
  | { status: 'join' }       // not on the roster yet: ask for name + sector
  | { status: 'fallback' }   // email isn't set up: use the request-access form
  | { status: 'error'; message: string }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

async function signupSettings(): Promise<SignupSettings> {
  const { data } = await createAdminClient().from('settings').select('value').eq('key', 'signup').maybeSingle()
  return { open: true, domains: [], ...(data?.value as Partial<SignupSettings> | undefined) }
}

function domainAllowed(email: string, domains: string[]) {
  if (!domains.length) return true
  const d = email.split('@')[1] ?? ''
  return domains.some(x => d === x.toLowerCase() || d.endsWith(`.${x.toLowerCase()}`))
}

/** Too many emails to one address, or overall, in a short time? */
async function rateLimited(email: string) {
  const admin = createAdminClient()
  const [recent, hourly] = await Promise.all([
    admin.from('email_link_log').select('sent_at').eq('email', email).neq('purpose', 'admin_notify').gte('sent_at', new Date(Date.now() - 60_000).toISOString()).limit(1),
    admin.from('email_link_log').select('sent_at', { count: 'exact', head: true }).neq('purpose', 'admin_notify').gte('sent_at', new Date(Date.now() - 3_600_000).toISOString()),
  ])
  if (recent.data?.length) return 'A link was just sent. Please wait a minute before asking for another.'
  if ((hourly.count ?? 0) > 60) return 'Too many sign-in emails right now. Please try again later.'
  return null
}

async function logEmail(email: string, purpose: string) {
  await createAdminClient().from('email_link_log').insert({ email, purpose })
}

/** "Set up your account": roster members get a link straight away;
 *  anyone else is asked for their name and team so they can apply. */
export async function startAccount(rawEmail: string): Promise<StartResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!EMAIL.test(email)) return { status: 'error', message: 'Please enter a valid email address.' }
  if (!hasServiceRole() || !isEmailConfigured()) return { status: 'fallback' }

  const limited = await rateLimited(email)
  if (limited) return { status: 'error', message: limited }

  const { data: member } = await createAdminClient()
    .from('members_directory')
    .select('name, email, status, user_id, onboarded_at')
    .eq('email', email)
    .maybeSingle()

  if (member?.status === 'alumni') return { status: 'error', message: 'That membership is archived. Please contact a co-president.' }
  if (member?.status === 'pending' && member.user_id && member.onboarded_at) {
    return { status: 'error', message: 'Your application is with the co-presidents. Sign in with your password to check on it.' }
  }
  if (!member) {
    const settings = await signupSettings()
    if (!settings.open) return { status: 'error', message: "New member sign-up is closed right now. Ask a co-president to add you." }
    if (!domainAllowed(email, settings.domains)) {
      return { status: 'error', message: `Please use your school email (${settings.domains.map(d => `@${d}`).join(' or ')}).` }
    }
    return { status: 'join' }
  }

  try {
    await deliverSignInLink({ name: member.name, email, onboarded_at: member.onboarded_at }, member.status === 'pending' ? 'apply' : undefined)
    await logEmail(email, 'sign_in')
    return { status: 'sent', message: `We sent a link to ${email}. It can take a minute — check your junk folder too.` }
  } catch (e) {
    console.error('sign-in link failed', e)
    return { status: 'error', message: "We couldn't send the email. Please try again, or ask a co-president for a link." }
  }
}

/** Someone not on the roster creates an account: their application waits
 *  for a co-president, and they verify their email to start onboarding. */
export async function joinFig(input: { email: string; name: string; sector: string }): Promise<Result> {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!EMAIL.test(email) || !name || name.length > 120) return { ok: false, message: 'Please enter your name and school email.' }
  if (!hasServiceRole() || !isEmailConfigured()) return { ok: false, message: 'Self sign-up isn’t available yet. Use “Request access” instead.' }

  const settings = await signupSettings()
  if (!settings.open) return { ok: false, message: 'New member sign-up is closed right now.' }
  if (!domainAllowed(email, settings.domains)) return { ok: false, message: 'Please use your school email address.' }
  const limited = await rateLimited(email)
  if (limited) return { ok: false, message: limited }

  const admin = createAdminClient()
  const { data: sector } = await admin.from('sectors').select('name').eq('name', input.sector).eq('is_active', true).maybeSingle()
  if (!sector) return { ok: false, message: 'Please choose your sector.' }

  const { data: existing } = await admin.from('members_directory').select('id').eq('email', email).maybeSingle()
  if (!existing) {
    const { error } = await admin.from('members_directory').insert({ name, email, sector: sector.name, status: 'pending', is_public: false, sort_order: 50 })
    if (error) return { ok: false, message: 'Something went wrong creating your account. Please try again.' }
  }

  try {
    await deliverSignInLink({ name, email, onboarded_at: null }, 'apply')
    await logEmail(email, 'apply')
    return { ok: true, message: `Almost there! We sent a link to ${email} — open it to confirm your email and finish setting up.` }
  } catch (e) {
    console.error('apply link failed', e)
    return { ok: false, message: "We couldn't send the email. Please try again in a minute." }
  }
}

/** "Forgot password": email a one-time link to set a new one. */
export async function sendPasswordReset(rawEmail: string): Promise<Result> {
  const email = rawEmail.trim().toLowerCase()
  if (!EMAIL.test(email)) return { ok: false, message: 'Please enter a valid email address.' }
  if (!hasServiceRole() || !isEmailConfigured()) {
    return { ok: false, message: "Password reset emails aren't set up yet. Ask a co-president to send you a link from the portal." }
  }
  const limited = await rateLimited(email)
  if (limited) return { ok: false, message: limited }

  const { data: member } = await createAdminClient().from('members_directory').select('name, status, onboarded_at').eq('email', email).maybeSingle()
  if (!member || member.status === 'alumni') return { ok: false, message: "We couldn't find an active member with that email." }
  try {
    await deliverSignInLink({ name: member.name, email, onboarded_at: member.onboarded_at })
    await logEmail(email, 'reset')
    return { ok: true, message: `We sent a link to ${email}. It can take a minute — check your junk folder too.` }
  } catch (e) {
    console.error('reset link failed', e)
    return { ok: false, message: "We couldn't send the email. Please try again, or ask a co-president for a link." }
  }
}

/** Fallback when email isn't configured: an application without an
 *  account; a co-president approves it and shares a sign-up link. */
export async function requestAccess(input: {
  name: string
  email: string
  sector: string
  classYear: string
  note: string
  website: string // honeypot: real people leave it empty
}): Promise<Result> {
  if (input.website) return { ok: true, message: 'Thanks! A co-president will review your request.' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('request_access', {
    p_name: input.name,
    p_email: input.email,
    p_sector: input.sector,
    p_class_year: input.classYear ? Number(input.classYear) : null,
    p_note: input.note || null,
  })
  if (error) {
    if (/already on the roster/i.test(error.message)) return { ok: false, message: "You're already on the roster. Ask a co-president to send you a sign-in link from the portal." }
    return { ok: false, message: error.message }
  }
  return { ok: true, message: "Thanks! A co-president will review your request and send you a link to set up your account." }
}
