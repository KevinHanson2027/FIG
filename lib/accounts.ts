import 'server-only'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { brandedEmail, isEmailConfigured, sendEmail } from '@/lib/email'
import { mailtoLink } from '@/lib/mailto'

/** Absolute site origin for links in emails. On Vercel it never comes from
 *  request headers, so a forged Host can't point sign-in links elsewhere. */
export async function getOrigin() {
  const configured = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, '')
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** Only allow redirects back into this site. */
export function safeNext(next: string | null | undefined, fallback = '/portal') {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}

/** One-time link that signs the person in. New accounts get an invite;
 *  existing ones a recovery link. `next` is where they land afterwards. */
export async function createSignInLink(email: string, next = '/portal/welcome') {
  const admin = createAdminClient()
  let kind: 'invite' | 'recovery' = 'invite'
  let { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email })
  if (error) {
    kind = 'recovery'
    ;({ data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email }))
  }
  if (error || !data?.properties?.hashed_token) {
    throw new Error(error?.message ?? 'Could not create a sign-in link.')
  }
  const origin = await getOrigin()
  const params = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: data.properties.verification_type,
    next,
  })
  return { url: `${origin}/auth/confirm?${params}`, kind }
}

/** After a verified email link, make sure the login is attached to the
 *  roster entry (or application) with the same email. */
export async function ensureMemberLink(userId: string, email: string | undefined) {
  if (!email) return
  const admin = createAdminClient()
  await admin
    .from('members_directory')
    .update({ user_id: userId })
    .eq('email', email.toLowerCase())
    .in('status', ['active', 'pending'])
    .is('user_id', null)
}

export type LinkDelivery =
  | { sent: true }
  | { sent: false; url: string; mailto: string }

type Purpose = 'activate' | 'signin' | 'apply'

const COPY: Record<Purpose, { heading: string; body: string; button: string }> = {
  activate: {
    heading: 'Your FIG member account is ready',
    body: 'You have been added to the Fairfield Investment Group member portal. Use the button below to sign in and set up your profile. It takes about two minutes, and you don’t need a password.',
    button: 'Set up my account',
  },
  signin: {
    heading: 'Your FIG sign-in link',
    body: 'Use the button below to sign in to the FIG member portal. No password needed.',
    button: 'Sign in',
  },
  apply: {
    heading: 'Confirm your email to join FIG',
    body: 'Thanks for signing up for the Fairfield Investment Group member portal. Confirm your email with the button below, then tell us your team and roles. A co-president will approve your account.',
    button: 'Confirm and continue',
  },
}

/** Email the sign-in link if SMTP is set up; otherwise return it so a
 *  co-president can share it (copy, or open their own email app).
 *  The link signs the member in; anyone who hasn't finished setup lands in
 *  onboarding, everyone else on the portal home page. */
export async function deliverSignInLink(member: { name: string; email: string; onboarded_at?: string | null }, purpose?: Purpose): Promise<LinkDelivery> {
  const next = member.onboarded_at ? '/portal' : '/portal/welcome'
  const { url } = await createSignInLink(member.email, next)
  const copy = COPY[purpose ?? (member.onboarded_at ? 'signin' : 'activate')]
  const first = member.name.split(' ')[0]
  const paragraphs = [`Hi ${first},`, copy.body]
  const footnote = 'This link works once and expires soon. If it stops working, request a new one from the login page.'

  if (isEmailConfigured()) {
    await sendEmail({ to: member.email, subject: copy.heading, ...brandedEmail({ heading: copy.heading, paragraphs, button: { label: copy.button, url }, footnote }) })
    return { sent: true }
  }
  return {
    sent: false,
    url,
    mailto: mailtoLink({ to: member.email, subject: copy.heading, body: `${paragraphs.join('\n\n')}\n\n${url}\n\n${footnote}` }),
  }
}
