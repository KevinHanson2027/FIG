'use server'
import { revalidatePath } from 'next/cache'
import { assertAdmin, assertMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { hasServiceRole } from '@/lib/supabase/admin'
import { brandedEmail, isEmailConfigured, sendEmail } from '@/lib/email'
import { mailtoLink, googleCalendarLink } from '@/lib/mailto'
import { deliverSignInLink, getOrigin, type LinkDelivery } from '@/lib/accounts'
import { dateTime, firstName } from '@/lib/format'
import type { Candidate } from '@/lib/types'

export type EmailResult = { ok: true; sent: true } | { ok: true; sent: false; mailto: string } | { ok: false; error: string }

async function loadCandidate(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('candidates').select('*').eq('id', id).maybeSingle<Candidate>()
  return { supabase, candidate: data }
}

/** Invite someone on the interest list to apply. */
export async function sendApplicationInvite(candidateId: string): Promise<EmailResult> {
  const viewer = await assertMember()
  if (!viewer.access.canRecruit) return { ok: false, error: 'Only recruiting can send applications.' }
  const { supabase, candidate } = await loadCandidate(candidateId)
  if (!candidate) return { ok: false, error: 'Candidate not found.' }

  const origin = await getOrigin()
  const url = `${origin}/apply?email=${encodeURIComponent(candidate.email)}`
  const heading = 'Your Fairfield Investment Group application'
  const paragraphs = [
    `Hi ${firstName(candidate.name)},`,
    'Thanks for your interest in the Fairfield Investment Group! Applications are open — you can apply using the link below. It takes about 10 minutes, and you can attach your résumé as a PDF.',
    `Questions? Just reply to this email.`,
  ]
  let result: EmailResult
  if (isEmailConfigured()) {
    try {
      await sendEmail({ to: candidate.email, subject: heading, replyTo: viewer.email, ...brandedEmail({ heading, paragraphs, button: { label: 'Start my application', url } }) })
      result = { ok: true, sent: true }
    } catch (e) {
      console.error(e)
      return { ok: false, error: "Couldn't send the email. Check the SMTP settings or try again." }
    }
  } else {
    result = { ok: true, sent: false, mailto: mailtoLink({ to: candidate.email, subject: heading, body: `${paragraphs.join('\n\n')}\n\n${url}` }) }
  }
  if (candidate.stage === 'interested') await supabase.from('candidates').update({ stage: 'invited' }).eq('id', candidate.id)
  revalidatePath('/portal/recruiting')
  return result
}

/** Tell a candidate when and where their interview is. */
export async function sendInterviewInvite(interviewId: string): Promise<EmailResult> {
  const viewer = await assertMember()
  if (!viewer.access.canRecruit) return { ok: false, error: 'Only recruiting can send interview invites.' }
  const supabase = await createClient()
  const { data: iv } = await supabase
    .from('interviews')
    .select('scheduled_at, location, candidate:candidates(name, email), interviewer:members_directory!interviews_interviewer_id_fkey(name)')
    .eq('id', interviewId)
    .maybeSingle()
  const row = iv as unknown as { scheduled_at: string | null; location: string | null; candidate: { name: string; email: string } | null; interviewer: { name: string } | null } | null
  if (!row?.candidate || !row.scheduled_at) return { ok: false, error: 'Schedule a time first.' }

  const when = dateTime(row.scheduled_at)
  const cal = googleCalendarLink({ title: 'FIG interview', start: row.scheduled_at, minutes: 30, location: row.location ?? undefined, details: `Interview with ${row.interviewer?.name ?? 'the Fairfield Investment Group'}` })
  const heading = 'Your FIG interview'
  const paragraphs = [
    `Hi ${firstName(row.candidate.name)},`,
    `Thanks for applying to the Fairfield Investment Group! Your interview is scheduled for ${when} (Eastern)${row.location ? ` at ${row.location}` : ''}${row.interviewer ? ` with ${row.interviewer.name}` : ''}.`,
    'If that time no longer works, reply to this email and we will find another slot.',
  ]
  if (isEmailConfigured()) {
    try {
      await sendEmail({ to: row.candidate.email, subject: heading, replyTo: viewer.email, ...brandedEmail({ heading, paragraphs, button: { label: 'Add to Google Calendar', url: cal } }) })
      return { ok: true, sent: true }
    } catch (e) {
      console.error(e)
      return { ok: false, error: "Couldn't send the email. Check the SMTP settings or try again." }
    }
  }
  return { ok: true, sent: false, mailto: mailtoLink({ to: row.candidate.email, subject: heading, body: `${paragraphs.join('\n\n')}\n\nAdd it to your calendar: ${cal}` }) }
}

export type OnboardResult = { ok: true; added: number; links: { name: string; delivery: LinkDelivery | null }[] } | { ok: false; error: string }

/** Admins: add accepted candidates to the roster and send them account links. */
export async function onboardCandidates(candidateIds: string[], sector: string): Promise<OnboardResult> {
  await assertAdmin()
  const supabase = await createClient()
  const { data: rows } = await supabase.from('candidates').select('*').in('id', candidateIds)
  const candidates = (rows ?? []) as Candidate[]
  const links: { name: string; delivery: LinkDelivery | null }[] = []
  let added = 0

  for (const c of candidates) {
    if (c.member_id) continue
    const title = `${sector} Analyst`
    const { data: existing } = await supabase.from('members_directory').select('id, status').eq('email', c.email).maybeSingle()
    let memberId = existing?.id as string | undefined
    if (existing) {
      const { error } = await supabase.from('members_directory').update({ status: 'active', sector, title, class_year: c.class_year }).eq('id', existing.id)
      if (error) return { ok: false, error: error.message }
    } else {
      const { data: created, error } = await supabase.from('members_directory').insert({
        name: c.name, email: c.email, sector, title, class_year: c.class_year, linkedin_url: c.linkedin_url,
        status: 'active', is_public: true, sort_order: 10,
      }).select('id').single()
      if (error) return { ok: false, error: error.message }
      memberId = created.id
    }
    await supabase.from('candidates').update({ member_id: memberId, stage: 'accepted' }).eq('id', c.id)
    added++
    let delivery: LinkDelivery | null = null
    if (hasServiceRole()) {
      try { delivery = await deliverSignInLink({ name: c.name, email: c.email }) } catch (e) { console.error(e) }
    }
    links.push({ name: c.name, delivery })
  }
  revalidatePath('/portal/recruiting')
  revalidatePath('/portal/admin/members')
  return { ok: true, added, links }
}
