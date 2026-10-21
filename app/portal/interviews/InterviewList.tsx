'use client'
import { useState } from 'react'
import { CalendarPlus, ChevronDown, ChevronRight, ExternalLink, FileText, MapPin, MessagesSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Candidate, Interview, Recommendation } from '@/lib/types'
import { dateTime } from '@/lib/format'
import { googleCalendarLink } from '@/lib/mailto'
import { Badge, EmptyState } from '@/components/portal/ui'
import { friendlyError, must, useMutation, useToast } from '@/components/portal/feedback'

type Row = Interview & { candidate: Candidate | null }
const RECS: { value: Recommendation; label: string; cls: string }[] = [
  { value: 'strong_yes', label: 'Strong yes', cls: 'good' }, { value: 'yes', label: 'Yes', cls: 'good' },
  { value: 'maybe', label: 'Maybe', cls: 'warn' }, { value: 'no', label: 'No', cls: 'bad' },
]
const LABELS: Record<string, string> = { why: 'Why FIG?', idea: 'A stock or trend they find interesting', experience: 'Relevant experience', availability: 'Availability' }

export default function InterviewList({ interviews }: { interviews: Row[] }) {
  if (interviews.length === 0) {
    return <div className="ui-card"><EmptyState icon={<MessagesSquare size={22} />} title="No interviews assigned to you">When recruiting schedules you to interview a candidate, it will show up here.</EmptyState></div>
  }
  const upcoming = interviews.filter(i => i.status === 'scheduled')
  const done = interviews.filter(i => i.status !== 'scheduled')
  return (
    <div className="ui-stack">
      {upcoming.length > 0 && <h2 className="ui-label" style={{ fontSize: '0.9rem' }}>Upcoming ({upcoming.length})</h2>}
      {upcoming.map(i => <InterviewCard key={i.id} row={i} />)}
      {done.length > 0 && <h2 className="ui-label" style={{ fontSize: '0.9rem', marginTop: 8 }}>Completed ({done.length})</h2>}
      {done.map(i => <InterviewCard key={i.id} row={i} />)}
    </div>
  )
}

function InterviewCard({ row }: { row: Row }) {
  const c = row.candidate
  const [showApp, setShowApp] = useState(false)
  const [f, setF] = useState({ rating: row.rating ?? 0, recommendation: row.recommendation ?? '', feedback: row.feedback ?? '' })
  const { run, pending } = useMutation()
  const toast = useToast()
  const answers = c?.application ? Object.entries(c.application).filter(([, v]) => v) : []

  async function save(status: 'completed' | 'no_show') {
    await run(async () => must(await createClient().from('interviews').update({
      status, rating: status === 'completed' && f.rating ? f.rating : null,
      recommendation: status === 'completed' && f.recommendation ? f.recommendation : null,
      feedback: f.feedback.trim() || null,
    }).eq('id', row.id)), { success: status === 'completed' ? 'Scorecard saved' : 'Marked as no-show' })
  }

  async function openResume() {
    if (!c) return
    if (c.resume_url && !c.resume_path) { window.open(c.resume_url, '_blank', 'noopener'); return }
    const w = window.open('', '_blank')
    const { data, error } = await createClient().storage.from('applications').createSignedUrl(c.resume_path!, 600)
    if (error || !data) { w?.close(); toast.error(error ? friendlyError(error) : 'Could not open résumé'); return }
    if (w) w.location.href = data.signedUrl; else window.location.href = data.signedUrl
  }

  return (
    <article className="ui-card">
      <div className="ui-card-head">
        <div>
          <h2>{c?.name ?? 'Candidate'}</h2>
          <p>
            {row.scheduled_at ? dateTime(row.scheduled_at) : 'Time to be confirmed'}
            {row.location && <> · <MapPin size={12} style={{ verticalAlign: -1 }} /> {row.location}</>}
          </p>
        </div>
        <Badge tone={row.status === 'completed' ? 'green' : row.status === 'scheduled' ? 'blue' : 'gray'}>
          {row.status === 'no_show' ? 'No-show' : row.status === 'completed' ? 'Completed' : 'Scheduled'}
        </Badge>
      </div>
      <div className="ui-card-body ui-stack" style={{ gap: 14 }}>
        <div className="ui-row" style={{ gap: 6 }}>
          {c?.class_year && <Badge>Class of {c.class_year}</Badge>}
          {c?.major && <Badge>{c.major}</Badge>}
          {c?.sector_interest && <Badge tone="blue">{c.sector_interest}</Badge>}
          {(c?.resume_path || c?.resume_url) && <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={openResume}><FileText size={14} /> Résumé</button>}
          {c?.linkedin_url && /^https?:\/\//.test(c.linkedin_url) && <a className="ui-btn ui-btn-secondary ui-btn-sm" href={c.linkedin_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> LinkedIn</a>}
          {row.scheduled_at && row.status === 'scheduled' && (
            <a className="ui-btn ui-btn-ghost ui-btn-sm" target="_blank" rel="noopener noreferrer"
              href={googleCalendarLink({ title: `FIG interview: ${c?.name ?? 'candidate'}`, start: row.scheduled_at, location: row.location ?? undefined })}>
              <CalendarPlus size={14} /> Add to calendar
            </a>
          )}
        </div>

        {answers.length > 0 && (
          <div>
            <button type="button" className="login-text-btn ui-row" style={{ gap: 4 }} onClick={() => setShowApp(s => !s)} aria-expanded={showApp}>
              {showApp ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {showApp ? 'Hide application' : 'View application'}
            </button>
            {showApp && (
              <dl className="ui-dl" style={{ gridTemplateColumns: '1fr', marginTop: 8 }}>
                {answers.map(([k, v]) => (
                  <div key={k}><dt style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{LABELS[k] ?? k}</dt><dd style={{ whiteSpace: 'pre-line', marginTop: 2 }}>{v}</dd></div>
                ))}
              </dl>
            )}
          </div>
        )}

        <hr className="ui-divider" />
        <div className="ui-form" style={{ gap: 12 }}>
          <div className="ui-field">
            <span className="ui-label">Overall rating</span>
            <div className="ui-seg" role="radiogroup" aria-label="Rating from 1 to 5">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" role="radio" aria-checked={f.rating === n} className={f.rating === n ? 'on' : ''} onClick={() => setF(x => ({ ...x, rating: n }))}>
                  {n}{n === 1 ? ' · weak' : n === 5 ? ' · excellent' : ''}
                </button>
              ))}
            </div>
          </div>
          <div className="ui-field">
            <span className="ui-label">Recommendation</span>
            <div className="ui-seg" role="radiogroup" aria-label="Recommendation">
              {RECS.map(r => (
                <button key={r.value} type="button" role="radio" aria-checked={f.recommendation === r.value} className={f.recommendation === r.value ? `on ${r.cls}` : ''} onClick={() => setF(x => ({ ...x, recommendation: r.value }))}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ui-field">
            <label htmlFor={`fb-${row.id}`}>Notes</label>
            <textarea id={`fb-${row.id}`} className="ui-textarea" rows={4} value={f.feedback} onChange={e => setF(x => ({ ...x, feedback: e.target.value }))}
              placeholder="Strengths, concerns, how they answered the technical questions…" />
          </div>
          <div className="ui-row">
            <button type="button" className="ui-btn ui-btn-primary" disabled={pending || !f.rating || !f.recommendation} onClick={() => save('completed')}>
              {row.status === 'completed' ? 'Update scorecard' : 'Submit scorecard'}
            </button>
            {row.status === 'scheduled' && <button type="button" className="ui-btn ui-btn-ghost" disabled={pending} onClick={() => save('no_show')}>Candidate didn&apos;t show</button>}
          </div>
        </div>
      </div>
    </article>
  )
}
