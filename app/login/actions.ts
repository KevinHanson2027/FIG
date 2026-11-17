'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { isEmailConfigured } from '@/lib/email'
import { deliverSignInLink, ensureMemberLink } from '@/lib/accounts'
import { codeMatches, getAccessCode } from '@/lib/accessCode'
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

const LINK_EMAILS = ['sign_in', 'apply'] // email_link_log purposes that are emails we sent

/** Too many emails to one address, or overall, in a short time? */
async function rateLimited(email: string) {
  const admin = createAdminClient()
  const [recent, hourly] = await Promise.all([
    admin.from('email_link_log').select('sent_at').eq('email', email).in('purpose', LINK_EMAILS).gte('sent_at', new Date(Date.now() - 60_000).toISOString()).limit(1),
    admin.from('email_link_log').select('sent_at', { count: 'exact', head: true }).in('purpose', LINK_EMAILS).gte('sent_at', new Date(Date.now() - 3_600_000).toISOString()),
  ])
  if (recent.data?.length) return 'A link was just sent. Please wait a minute before asking for another.'
  if ((hourly.count ?? 0) > 60) return 'Too many sign-in emails right now. Please try again later.'
  return null
}

async function logEmail(email: string, purpose: string) {
  await createAdminClient().from('email_link_log').insert({ email, purpose })
}

/** "Email me a sign-in link": the one way in for everyone, first time or
 *  not. Roster members (and applicants) get a link straight away; anyone
 *  else is asked for their name and team so they can apply. */
export async function emailSignIn(rawEmail: string): Promise<StartResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!EMAIL.test(email)) return { status: 'error', message: 'Please enter a valid email address.' }
  if (!hasServiceRole()) return { status: 'fallback' }

  const { data: member } = await createAdminClient()
    .from('members_directory')
    .select('name, email, status, onboarded_at')
    .eq('email', email)
    .maybeSingle()

  if (!isEmailConfigured()) {
    return member
      ? { status: 'error', message: "Email sign-in isn't set up. Use “First time signing in?” with the club code, or ask a co-president." }
      : { status: 'fallback' }
  }
  const limited = await rateLimited(email)
  if (limited) return { status: 'error', message: limited }

  if (member?.status === 'alumni') return { status: 'error', message: 'That membership is archived. Please contact a co-president.' }
  if (!member) {
    const settings = await signupSettings()
    if (!settings.open) return { status: 'error', message: "We couldn't find that email on the roster, and new member sign-up is closed right now. Ask a co-president to add you." }
    if (!domainAllowed(email, settings.domains)) {
      return { status: 'error', message: `Please use your school email (${settings.domains.map(d => `@${d}`).join(' or ')}).` }
    }
    return { status: 'join' }
  }

  try {
    await deliverSignInLink({ name: member.name, email, onboarded_at: member.onboarded_at }, member.status === 'pending' && !member.onboarded_at ? 'apply' : undefined)
    await logEmail(email, 'sign_in')
    return { status: 'sent', message: `Check your inbox: we sent a sign-in link to ${email}. It can take a minute, so check junk too.` }
  } catch (e) {
    console.error('sign-in link failed', e)
    return { status: 'error', message: "We couldn't send the email. Please try again, or ask a co-president for a link." }
  }
}

export type ClaimResult = { ok: true } | { ok: false; message: string; notMember?: boolean }

/** Wrong codes are limited per email and overall, so the code can't be guessed. */
async function codeAttemptsBlocked(email: string) {
  const admin = createAdminClient()
  const since = (ms: number) => new Date(Date.now() - ms).toISOString()
  const [mine, all] = await Promise.all([
    admin.from('email_link_log').select('sent_at', { count: 'exact', head: true }).eq('purpose', 'code_fail').eq('email', email).gte('sent_at', since(15 * 60_000)),
    admin.from('email_link_log').select('sent_at', { count: 'exact', head: true }).eq('purpose', 'code_fail').gte('sent_at', since(3_600_000)),
  ])
  if ((mine.count ?? 0) >= 5) return 'Too many tries. Wait 15 minutes, and check the code with a co-president.'
  if ((all.count ?? 0) >= 200) return 'Too many tries right now. Please try again in a little while.'
  return null
}

const passwordProblem = (message?: string) =>
  message && /password/i.test(message) ? message : 'We couldn’t save your password. Please try again, or tell a co-president.'

/** "First time signing in?": a roster member who hasn't chosen a password
 *  yet proves membership with the club code and chooses one; the browser
 *  then signs in with it. Never works for co-presidents, or for anyone who
 *  has already chosen a password, so the code can't take over an account. */
export async function claimAccount(input: { email: string; code: string; password: string }): Promise<ClaimResult> {
  const email = input.email.trim().toLowerCase()
  if (!EMAIL.test(email)) return { ok: false, message: 'Please enter your school email.' }
  if (input.password.length < 8) return { ok: false, message: 'Choose a password with at least 8 characters.' }
  if (!hasServiceRole()) return { ok: false, message: "Sign-in isn't fully set up yet. Please tell a co-president." }

  const blocked = await codeAttemptsBlocked(email)
  if (blocked) return { ok: false, message: blocked }
  const code = await getAccessCode()
  if (!code) return { ok: false, message: 'First sign-in codes are switched off right now. Ask a co-president.' }
  const admin = createAdminClient()
  if (!codeMatches(input.code, code.hash)) {
    await admin.from('email_link_log').insert({ email, purpose: 'code_fail' })
    return { ok: false, message: "That code isn't right. Use the club code from the first meeting." }
  }

  const { data: member } = await admin.from('members_directory').select('id, status, user_id').eq('email', email).maybeSingle()
  if (!member) return { ok: false, notMember: true, message: `We couldn't find ${email} on the roster.` }
  if (member.status === 'pending') return { ok: false, message: 'Your application is waiting for a co-president. Use the club code once you’re approved.' }
  if (member.status === 'alumni') return { ok: false, message: 'That membership is archived. Please contact a co-president.' }
  const { data: adminRole } = await admin.from('member_roles').select('id').eq('member_id', member.id).eq('role', 'admin').limit(1).maybeSingle()
  if (adminRole) return { ok: false, message: 'Co-presidents sign in with their own password, not the club code.' }

  let userId = member.user_id as string | null
  if (!userId) {
    // First time: create their login with the password they chose.
    const created = await admin.auth.admin.createUser({ email, password: input.password, email_confirm: true, user_metadata: { password_set: true } })
    if (created.data.user) {
      await ensureMemberLink(created.data.user.id, email)
      return { ok: true }
    }
    if (!/already|exists|registered/i.test(created.error?.message ?? '')) return { ok: false, message: passwordProblem(created.error?.message) }
    // A login from an earlier invite that never got linked. Generating a
    // link looks it up without sending anything.
    const found = await admin.auth.admin.generateLink({ type: 'recovery', email })
    userId = found.data.user?.id ?? null
    if (!userId) return { ok: false, message: 'We couldn’t set up your login. Please tell a co-president.' }
  }

  const { data: existing } = await admin.auth.admin.getUserById(userId)
  if (!existing.user) return { ok: false, message: 'We couldn’t find your login. Please tell a co-president.' }
  if (existing.user.user_metadata?.password_set) {
    return { ok: false, message: "You've already chosen a password. Sign in with it, or ask a co-president to reset it." }
  }
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email, // keep the login's email in step with the roster
    password: input.password,
    email_confirm: true,
    user_metadata: { ...existing.user.user_metadata, password_set: true },
  })
  if (error) return { ok: false, message: passwordProblem(error.message) }
  await ensureMemberLink(userId, email)
  return { ok: true }
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
  const hasCode = Boolean(await getAccessCode())
  const supabase = await createClient()
  const { error } = await supabase.rpc('request_access', {
    p_name: input.name,
    p_email: input.email,
    p_sector: input.sector,
    p_class_year: input.classYear ? Number(input.classYear) : null,
    p_note: input.note || null,
  })
  if (error) {
    if (/already on the roster/i.test(error.message)) {
      return { ok: false, message: hasCode ? "You're already on the roster. Go back and use “First time signing in?” with the club code." : "You're already on the roster. Ask a co-president to help you sign in." }
    }
    return { ok: false, message: error.message }
  }
  return {
    ok: true,
    message: hasCode
      ? 'Thanks! Once a co-president approves you, come back and use “First time signing in?” with the club code from the first meeting.'
      : 'Thanks! A co-president will review your request and help you set up your account.',
  }
}
