'use client'
import { useMemo, useState } from 'react'
import {
  CalendarPlus, Check, Copy, ExternalLink, FileText, Mail, Plus, Search, Send, Star, Trash2, UserPlus, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Candidate, CandidateStage, Interview } from '@/lib/types'
import {dateTime} from '@/lib/format'
import { googleCalendarLink, mailtoLink } from '@/lib/mailto'
import { Modal } from '@/components/portal/Modal'
import { friendlyError, must, useConfirm, useMutation, useToast } from '@/components/portal/feedback'
import { Badge, EmptyState } from '@/components/portal/ui'
import { onboardCandidates, sendApplicationInvite, sendInterviewInvite, type EmailResult } from './actions'
import { TimeAgo } from '@/components/portal/TimeAgo'

export type CandidateView = Candidate & { referrer: string | null }
export type InterviewView = Interview & { interviewer: string | null }
type Interviewer = { id: string; name: string; sector: string; leader: boolean }

export const STAGES: { id: CandidateStage; label: string }[] = [
  { id: 'interested', label: 'Interested' },
  { id: 'invited', label: 'Invited to apply' },
  { id: 'applied', label: 'Applied' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offered', label: 'Offered' },
  { id: 'accepted', label: 'Accepted' },
]
const CLOSED: { id: CandidateStage; label: string }[] = [{ id: 'rejected', label: 'Not selected' }, { id: 'withdrawn', label: 'Withdrew' }]
const ALL_STAGES = [...STAGES, ...CLOSED]
const SOURCE: Record<Candidate['source'], string> = { interest_form: 'Interest form', referral: 'Referral', application: 'Applied directly', event: 'Event', other: 'Other' }
const RECOMMEND: Record<string, string> = { strong_yes: 'Strong yes', yes: 'Yes', maybe: 'Maybe', no: 'No' }

function avgRating(ivs: InterviewView[]) {
  const r = ivs.map(i => i.rating).filter((x): x is number => x !== null)
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null
}

export default function Pipeline({ candidates, interviews, interviewers, sectors, emailConfigured, isAdmin, cycle }: {
  candidates: CandidateView[]
  interviews: InterviewView[]
  interviewers: Interviewer[]
  sectors: string[]
  emailConfigured: boolean
  isAdmin: boolean
  cycle: string
}) {
  const [query, setQuery] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const toast = useToast()
  const { run, pending } = useMutation()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? candidates.filter(c => c.name.toLowerCase().includes(q) || c.email.includes(q)) : candidates
  }, [candidates, query])
  const byStage = (s: CandidateStage) => filtered.filter(c => c.stage === s)
  const ivFor = (id: string) => interviews.filter(i => i.candidate_id === id)
  const open = candidates.find(c => c.id === openId) ?? null
  const interested = candidates.filter(c => c.stage === 'interested')

  async function inviteAllInterested() {
    if (interested.length === 0) return
    if (emailConfigured) {
      await run(async () => {
        let sent = 0
        for (const c of interested) { const r = await sendApplicationInvite(c.id); if (r.ok) sent++ }
        if (sent < interested.length) throw new Error(`Sent ${sent} of ${interested.length}. Try the rest again.`)
      }, { success: `Sent ${interested.length} application invite${interested.length === 1 ? '' : 's'}` })
    } else {
      window.location.href = mailtoLink({
        bcc: interested.map(c => c.email),
        subject: 'Your Fairfield Investment Group application',
        body: `Hi!\n\nThanks for your interest in the Fairfield Investment Group. Applications are open — apply here:\n${window.location.origin}/apply\n\nQuestions? Just reply to this email.`,
      })
      await run(async () => must(await createClient().from('candidates').update({ stage: 'invited' }).in('id', interested.map(c => c.id))), { success: 'Marked as invited' })
    }
  }

  async function copyEmails(stage: CandidateStage) {
    const emails = byStage(stage).map(c => c.email).join(', ')
    try { await navigator.clipboard.writeText(emails); toast.success('Emails copied') } catch { toast.error('Could not copy') }
  }

  const columns = showClosed ? [...STAGES, { id: 'closed' as const, label: 'Closed' }] : STAGES

  return (
    <>
      <div className="ui-spread" style={{ marginBottom: 14 }}>
        <div className="ui-row">
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--ui-faint)' }} />
            <input className="ui-input" style={{ paddingLeft: 32, width: 220 }} placeholder="Search candidates" aria-label="Search candidates" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <label className="ui-check" style={{ alignItems: 'center' }}>
            <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} style={{ marginTop: 0 }} />
            Show closed ({candidates.filter(c => c.stage === 'rejected' || c.stage === 'withdrawn').length})
          </label>
        </div>
        <div className="ui-row">
          {interested.length > 0 && (
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={inviteAllInterested} disabled={pending}>
              <Send size={15} /> Invite {interested.length} to apply
            </button>
          )}
          <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setAdding(true)}><Plus size={15} /> Add candidate</button>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="ui-card">
          <EmptyState icon={<UserPlus size={22} />} title={`No candidates in ${cycle || 'this cycle'} yet`}>
            People who fill out the interest form on the Get Involved page, members&apos; referrals, and applications all land here.
          </EmptyState>
        </div>
      ) : (
        <div className="board">
          {columns.map(col => {
            const items = col.id === 'closed' ? filtered.filter(c => c.stage === 'rejected' || c.stage === 'withdrawn') : byStage(col.id)
            return (
              <div key={col.id} className="board-col">
                <div className="board-col-head">
                  <span>{col.label} <span className="count">{items.length}</span></span>
                  {col.id !== 'closed' && items.length > 0 && (
                    <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={`Copy ${col.label} emails`} title="Copy emails" onClick={() => copyEmails(col.id as CandidateStage)}>
                      <Copy size={14} />
                    </button>
                  )}
                </div>
                {items.map(c => {
                  const ivs = ivFor(c.id)
                  const rating = avgRating(ivs)
                  const next = ivs.find(i => i.status === 'scheduled')
                  return (
                    <button key={c.id} type="button" className="board-card" onClick={() => setOpenId(c.id)}>
                      <div className="board-card-name">{c.name}</div>
                      <div className="board-card-meta">
                        {c.class_year && <span>’{String(c.class_year).slice(2)}</span>}
                        {c.sector_interest && <span>· {c.sector_interest}</span>}
                        {(c.resume_path || c.resume_url) && <FileText size={12} aria-label="Has résumé" />}
                      </div>
                      <div className="board-card-meta">
                        {c.source === 'referral' && <Badge tone="green">Referral{c.referrer ? ` · ${c.referrer.split(' ')[0]}` : ''}</Badge>}
                        {rating !== null && <Badge tone="amber"><Star size={11} /> {rating.toFixed(1)}</Badge>}
                        {next && <span>{dateTime(next.scheduled_at)}</span>}
                        {c.member_id && <Badge tone="navy">On roster</Badge>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <CandidateDrawer key={open.id} candidate={open} interviews={ivFor(open.id)} interviewers={interviewers} sectors={sectors}
          emailConfigured={emailConfigured} isAdmin={isAdmin} onClose={() => setOpenId(null)} />
      )}
      {adding && <AddCandidate sectors={sectors} cycle={cycle} onClose={() => setAdding(false)} />}
    </>
  )
}

function useEmailAction() {
  const toast = useToast()
  return (result: EmailResult | undefined, sentMessage: string) => {
    if (!result) return
    if (!result.ok) toast.error(result.error)
    else if (result.sent) toast.success(sentMessage)
    else window.location.href = result.mailto
  }
}

function CandidateDrawer({ candidate: c, interviews, interviewers, sectors, emailConfigured, isAdmin, onClose }: {
  candidate: CandidateView
  interviews: InterviewView[]
  interviewers: Interviewer[]
  sectors: string[]
  emailConfigured: boolean
  isAdmin: boolean
  onClose: () => void
}) {
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  const toast = useToast()
  const handleEmail = useEmailAction()
  const [notes, setNotes] = useState(c.notes ?? '')
  const [schedule, setSchedule] = useState({ interviewer: interviewers[0]?.id ?? '', at: '', location: '' })
  const [onboardSector, setOnboardSector] = useState(c.sector_interest && sectors.includes(c.sector_interest) ? c.sector_interest : sectors[0])
  const [onboardLink, setOnboardLink] = useState<{ url: string; mailto: string } | null>(null)

  const update = (patch: Partial<Candidate>, message: string) =>
    run(async () => must(await createClient().from('candidates').update(patch).eq('id', c.id)), { success: message })

  async function openResume() {
    if (c.resume_url && !c.resume_path) { window.open(c.resume_url, '_blank', 'noopener'); return }
    const w = window.open('', '_blank')
    const { data, error } = await createClient().storage.from('applications').createSignedUrl(c.resume_path!, 600)
    if (error || !data) { w?.close(); toast.error(error ? friendlyError(error) : 'Could not open résumé'); return }
    if (w) w.location.href = data.signedUrl; else window.location.href = data.signedUrl
  }

  async function scheduleInterview(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(async () => {
      const supabase = createClient()
      must(await supabase.from('interviews').insert({
        candidate_id: c.id, interviewer_id: schedule.interviewer,
        scheduled_at: schedule.at ? new Date(schedule.at).toISOString() : null, location: schedule.location.trim() || null,
      }))
      if (['interested', 'invited', 'applied'].includes(c.stage)) must(await supabase.from('candidates').update({ stage: 'interviewing' }).eq('id', c.id))
      return true
    }, { success: 'Interview scheduled — the interviewer will see it in My Interviews' })
    if (ok) setSchedule(s => ({ ...s, at: '', location: '' }))
  }

  async function cancelInterview(iv: InterviewView) {
    if (!(await confirm({ title: 'Cancel this interview?', confirmLabel: 'Cancel interview', danger: true }))) return
    await run(async () => must(await createClient().from('interviews').update({ status: 'cancelled' }).eq('id', iv.id)), { success: 'Interview cancelled' })
  }

  async function remove() {
    if (!(await confirm({ title: `Delete ${c.name}?`, body: 'This removes the candidate and their interviews. Use "Not selected" to keep a record instead.', confirmLabel: 'Delete', danger: true }))) return
    const ok = await run(async () => must(await createClient().from('candidates').delete().eq('id', c.id)), { success: 'Candidate deleted' })
    if (ok) onClose()
  }

  async function onboard() {
    const res = await run(async () => {
      const r = await onboardCandidates([c.id], onboardSector)
      if (!r.ok) throw new Error(r.error)
      return r
    })
    if (!res) return
    const d = res.links[0]?.delivery
    if (d && !d.sent) setOnboardLink({ url: d.url, mailto: d.mailto })
    toast.success(d?.sent ? `${c.name} added — account email sent` : `${c.name} added to the roster`)
  }

  const answers = c.application ? Object.entries(c.application).filter(([, v]) => v) : []
  const labels: Record<string, string> = { why: 'Why FIG?', idea: 'A stock or trend they find interesting', experience: 'Relevant experience', availability: 'Interview availability' }

  return (
    <Modal open onClose={onClose} drawer title={c.name} description={<a className="ui-link" href={`mailto:${c.email}`}>{c.email}</a>}>
      <div className="ui-stack" style={{ gap: 18 }}>
        <div className="ui-row" style={{ gap: 6 }}>
          {c.class_year && <Badge>Class of {c.class_year}</Badge>}
          {c.major && <Badge>{c.major}</Badge>}
          {c.sector_interest && <Badge tone="blue">{c.sector_interest}</Badge>}
          <Badge tone={c.source === 'referral' ? 'green' : 'gray'}>{SOURCE[c.source]}{c.referrer ? ` · ${c.referrer}` : ''}</Badge>
          <span className="ui-small ui-muted">Added <TimeAgo iso={c.created_at} /></span>
        </div>

        <div className="ui-field">
          <label htmlFor="cd-stage">Stage</label>
          <div className="ui-row" style={{ flexWrap: 'nowrap' }}>
            <select id="cd-stage" className="ui-select" value={c.stage} onChange={e => update({ stage: e.target.value as CandidateStage }, 'Stage updated')} disabled={pending}>
              {ALL_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="ui-row">
          {(c.stage === 'interested' || c.stage === 'invited') && (
            <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" disabled={pending}
              onClick={async () => handleEmail(await run(() => sendApplicationInvite(c.id), { refresh: true }), 'Application invite sent')}>
              <Send size={15} /> {c.stage === 'invited' ? 'Resend application' : 'Send application'}{emailConfigured ? '' : ' (email app)'}
            </button>
          )}
          {c.stage === 'interviewing' && <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => update({ stage: 'offered' }, 'Marked as offered')}><Check size={15} /> Make offer</button>}
          {c.stage === 'offered' && <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => update({ stage: 'accepted' }, 'Marked as accepted')}><Check size={15} /> Accepted</button>}
          {(c.resume_path || c.resume_url) && <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={openResume}><FileText size={15} /> Résumé</button>}
          {c.linkedin_url && /^https?:\/\//.test(c.linkedin_url) && <a className="ui-btn ui-btn-secondary ui-btn-sm" href={c.linkedin_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} /> LinkedIn</a>}
          {!['rejected', 'withdrawn', 'accepted'].includes(c.stage) && (
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => update({ stage: 'rejected' }, 'Marked not selected')}><X size={15} /> Not selected</button>
          )}
        </div>

        {c.stage === 'accepted' && (
          <div className="ui-notice ui-notice-success" style={{ display: 'block' }}>
            {c.member_id ? <><strong>On the roster.</strong> They can activate their account from the login page.</> : isAdmin ? (
              <div className="ui-stack" style={{ gap: 10 }}>
                <div><strong>Add {c.name.split(' ')[0]} to FIG.</strong> Creates their member profile and sends a link to set up their account.</div>
                <div className="ui-row" style={{ flexWrap: 'nowrap' }}>
                  <select className="ui-select" aria-label="Sector" value={onboardSector} onChange={e => setOnboardSector(e.target.value)} style={{ maxWidth: 240 }}>
                    {sectors.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={onboard} disabled={pending}><UserPlus size={15} /> Add to roster</button>
                </div>
              </div>
            ) : <>A co-president will add {c.name.split(' ')[0]} to the roster.</>}
            {onboardLink && (
              <div className="ui-row" style={{ marginTop: 10 }}>
                <span className="ui-small">Email isn&apos;t set up, so share this sign-up link:</span>
                <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={async () => { await navigator.clipboard.writeText(onboardLink.url); toast.success('Link copied') }}><Copy size={14} /> Copy link</button>
                <a className="ui-btn ui-btn-secondary ui-btn-sm" href={onboardLink.mailto}><Mail size={14} /> Email it</a>
              </div>
            )}
          </div>
        )}

        {c.referral_note && (
          <div>
            <div className="ui-label">{c.source === 'referral' ? `Referral note${c.referrer ? ` from ${c.referrer}` : ''}` : 'Note from the candidate'}</div>
            <p className="ui-small" style={{ marginTop: 4, whiteSpace: 'pre-line' }}>{c.referral_note}</p>
          </div>
        )}

        {answers.length > 0 && (
          <div>
            <div className="ui-label" style={{ marginBottom: 6 }}>Application {c.applied_at ? <span className="ui-muted" style={{ fontWeight: 400 }}>· <TimeAgo iso={c.applied_at} /></span> : null}</div>
            <dl className="ui-dl" style={{ gridTemplateColumns: '1fr' }}>
              {answers.map(([k, v]) => (
                <div key={k}>
                  <dt style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{labels[k] ?? k}</dt>
                  <dd style={{ whiteSpace: 'pre-line', marginTop: 2 }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div>
          <div className="ui-label" style={{ marginBottom: 6 }}>Interviews</div>
          {interviews.length === 0 && <p className="ui-small ui-muted">No interviews yet.</p>}
          <ul className="ui-list">
            {interviews.map(iv => (
              <li key={iv.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f1f4' }}>
                <div className="ui-spread">
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--ui-ink)', fontSize: '0.875rem' }}>{iv.interviewer ?? 'Interviewer'}</div>
                    <div className="ui-small ui-muted">{iv.scheduled_at ? dateTime(iv.scheduled_at) : 'Time TBD'}{iv.location ? ` · ${iv.location}` : ''}</div>
                  </div>
                  <Badge tone={iv.status === 'completed' ? 'green' : iv.status === 'scheduled' ? 'blue' : 'gray'}>
                    {iv.status === 'no_show' ? 'No-show' : iv.status[0].toUpperCase() + iv.status.slice(1)}
                  </Badge>
                </div>
                {iv.status === 'completed' && (
                  <div className="ui-small" style={{ marginTop: 6 }}>
                    {iv.rating !== null && <><Star size={12} style={{ verticalAlign: -1 }} /> {iv.rating}/5 · </>}
                    {iv.recommendation ? RECOMMEND[iv.recommendation] : 'No recommendation'}
                    {iv.feedback && <p style={{ marginTop: 4, whiteSpace: 'pre-line', color: 'var(--ui-text)' }}>{iv.feedback}</p>}
                  </div>
                )}
                {iv.status === 'scheduled' && (
                  <div className="ui-row" style={{ marginTop: 8 }}>
                    <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" disabled={pending || !iv.scheduled_at}
                      onClick={async () => handleEmail(await run(() => sendInterviewInvite(iv.id), { refresh: false }), 'Interview details sent')}>
                      <Mail size={14} /> Email candidate
                    </button>
                    {iv.scheduled_at && (
                      <a className="ui-btn ui-btn-ghost ui-btn-sm" target="_blank" rel="noopener noreferrer"
                        href={googleCalendarLink({ title: `FIG interview: ${c.name}`, start: iv.scheduled_at, location: iv.location ?? undefined, details: `Candidate: ${c.name} (${c.email})` })}>
                        <CalendarPlus size={14} /> Calendar
                      </a>
                    )}
                    <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => cancelInterview(iv)}>Cancel</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {!['rejected', 'withdrawn', 'accepted'].includes(c.stage) && (
            <form onSubmit={scheduleInterview} className="ui-form" style={{ gap: 10, marginTop: 10, padding: 12, background: '#fafbfc', borderRadius: 10, border: '1px solid var(--ui-line)' }}>
              <div className="ui-label">Schedule an interview</div>
              <select className="ui-select" aria-label="Interviewer" required value={schedule.interviewer} onChange={e => setSchedule(s => ({ ...s, interviewer: e.target.value }))}>
                {interviewers.map(m => <option key={m.id} value={m.id}>{m.name}{m.leader ? ' ★' : ''} — {m.sector}</option>)}
              </select>
              <div className="ui-form-grid">
                <input className="ui-input" type="datetime-local" aria-label="Date and time" value={schedule.at} onChange={e => setSchedule(s => ({ ...s, at: e.target.value }))} />
                <input className="ui-input" placeholder="Location or Zoom link" aria-label="Location" value={schedule.location} onChange={e => setSchedule(s => ({ ...s, location: e.target.value }))} />
              </div>
              <div><button type="submit" className="ui-btn ui-btn-primary ui-btn-sm" disabled={pending || !schedule.interviewer}><CalendarPlus size={15} /> Schedule</button></div>
            </form>
          )}
        </div>

        <div className="ui-field">
          <label htmlFor="cd-notes">Recruiting notes</label>
          <textarea id="cd-notes" className="ui-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Only the recruiting team and co-presidents see these." />
          {notes !== (c.notes ?? '') && <div><button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => update({ notes: notes.trim() || null }, 'Notes saved')} disabled={pending}>Save notes</button></div>}
        </div>

        <div><button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={remove}><Trash2 size={14} /> Delete candidate</button></div>
      </div>
    </Modal>
  )
}

function AddCandidate({ sectors, cycle, onClose }: { sectors: string[]; cycle: string; onClose: () => void }) {
  const [f, setF] = useState({ name: '', email: '', class_year: '', major: '', sector_interest: '', source: 'event' as Candidate['source'], referral_note: '' })
  const { run, pending } = useMutation()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(async () => must(await createClient().from('candidates').insert({
      name: f.name.trim(), email: f.email.trim().toLowerCase(), class_year: f.class_year ? Number(f.class_year) : null,
      major: f.major.trim() || null, sector_interest: f.sector_interest || null, source: f.source,
      referral_note: f.referral_note.trim() || null, stage: 'interested', cycle,
    })), { success: 'Candidate added' })
    if (ok) onClose()
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title="Add a candidate" description={`Adds them to the ${cycle || 'current'} pipeline as Interested.`}
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="cand-form" className="ui-btn ui-btn-primary" disabled={pending || !f.name.trim() || !f.email.trim()}>Add</button>
      </>}>
      <form id="cand-form" onSubmit={save} className="ui-form-grid">
        <div className="ui-field"><label htmlFor="c-name">Name</label><input id="c-name" className="ui-input" required value={f.name} onChange={set('name')} /></div>
        <div className="ui-field"><label htmlFor="c-email">Email</label><input id="c-email" className="ui-input" type="email" required value={f.email} onChange={set('email')} /></div>
        <div className="ui-field"><label htmlFor="c-year">Class year</label><input id="c-year" className="ui-input" inputMode="numeric" placeholder="2029" value={f.class_year} onChange={set('class_year')} /></div>
        <div className="ui-field"><label htmlFor="c-major">Major</label><input id="c-major" className="ui-input" value={f.major} onChange={set('major')} /></div>
        <div className="ui-field">
          <label htmlFor="c-sector">Sector interest</label>
          <select id="c-sector" className="ui-select" value={f.sector_interest} onChange={set('sector_interest')}>
            <option value="">Not sure</option>{sectors.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="ui-field">
          <label htmlFor="c-source">How did we meet them?</label>
          <select id="c-source" className="ui-select" value={f.source} onChange={set('source')}>
            <option value="event">Event / club fair</option><option value="referral">Referral</option><option value="other">Other</option>
          </select>
        </div>
        <div className="ui-field span-2"><label htmlFor="c-note">Notes</label><textarea id="c-note" className="ui-textarea" rows={2} value={f.referral_note} onChange={set('referral_note')} /></div>
      </form>
    </Modal>
  )
}
