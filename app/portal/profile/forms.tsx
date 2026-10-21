'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Globe, Plane, Send, ShieldCheck, Sparkles, UserPlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { REQUESTABLE_ROLES, ROLES } from '@/lib/roles'

import type { Member, MemberInternal, ProfileChange, ProfileFields, RoleGrant, RoleRequest } from '@/lib/types'
import { Badge, Card, Notice } from '@/components/portal/ui'
import { ImageUpload } from '@/components/portal/ImageUpload'
import { must, useConfirm, useMutation } from '@/components/portal/feedback'
import { TimeAgo } from '@/components/portal/TimeAgo'

const FIELD_LABELS: Record<keyof ProfileFields, string> = {
  name: 'Name', bio: 'Bio', headshot_url: 'Photo', linkedin_url: 'LinkedIn', sector: 'Sector',
}
const BIO_MAX = 1500

// ── Public profile (needs approval) ───────────────────────────────
export function PublicProfileForm({ member, pending, sectors, publicUrl }: {
  member: Member
  pending: ProfileChange | null
  sectors: string[]
  publicUrl: string | null
}) {
  const start = { name: member.name, bio: member.bio ?? '', headshot_url: member.headshot_url ?? '', linkedin_url: member.linkedin_url ?? '', sector: member.sector, ...pending?.changes }
  const [form, setForm] = useState({ ...start, bio: start.bio ?? '', headshot_url: start.headshot_url ?? '', linkedin_url: start.linkedin_url ?? '' })
  const { run, pending: saving } = useMutation()
  const confirm = useConfirm()

  const changes = useMemo(() => {
    const out: ProfileFields = {}
    const cur = { name: member.name, bio: member.bio ?? '', headshot_url: member.headshot_url ?? '', linkedin_url: member.linkedin_url ?? '', sector: member.sector }
    for (const k of Object.keys(FIELD_LABELS) as (keyof ProfileFields)[]) {
      const next = (form[k] ?? '').trim()
      if (next !== (cur[k] ?? '').trim()) (out as Record<string, string>)[k] = next
    }
    return out
  }, [form, member])
  const changed = Object.keys(changes) as (keyof ProfileFields)[]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.linkedin_url && !/^https?:\/\/(www\.)?linkedin\.com\//i.test(form.linkedin_url.trim())) {
      return run(async () => { throw new Error('LinkedIn links should start with https://www.linkedin.com/') }, { refresh: false })
    }
    const supabase = createClient()
    await run(async () => {
      if (pending) {
        if (changed.length === 0) must(await supabase.from('profile_changes').update({ status: 'cancelled' }).eq('id', pending.id))
        else must(await supabase.from('profile_changes').update({ changes }).eq('id', pending.id))
      } else {
        if (changed.length === 0) throw new Error('Nothing has changed yet.')
        must(await supabase.from('profile_changes').insert({ member_id: member.id, changes }))
      }
    }, { success: changed.length ? 'Sent to the co-presidents for approval' : 'Request withdrawn' })
  }

  async function withdraw() {
    if (!pending) return
    if (!(await confirm({ title: 'Withdraw your update?', body: 'Your public profile will stay as it is now.', confirmLabel: 'Withdraw' }))) return
    const ok = await run(async () => must(await createClient().from('profile_changes').update({ status: 'cancelled' }).eq('id', pending.id)), { success: 'Request withdrawn' })
    if (ok) setForm({ name: member.name, bio: member.bio ?? '', headshot_url: member.headshot_url ?? '', linkedin_url: member.linkedin_url ?? '', sector: member.sector })
  }

  return (
    <Card
      title={<><Globe size={18} /> Public profile</>}
      description="Shown on the Members pages of the FIG website. Changes are reviewed by a co-president."
      actions={publicUrl ? <Link href={publicUrl} target="_blank" className="ui-btn ui-btn-ghost ui-btn-sm"><ExternalLink size={15} /> View</Link> : null}
    >
      <form onSubmit={submit} className="ui-form">
        {pending && (
          <Notice tone="warn">
            <strong>Waiting for approval</strong> · sent <TimeAgo iso={pending.created_at} />. You can keep editing — saving updates the same request.{' '}
            <button type="button" className="login-text-btn" onClick={withdraw}>Withdraw request</button>
          </Notice>
        )}

        <div className="profile-preview" aria-label="Preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`photo${form.headshot_url ? '' : ' is-placeholder'}`} src={form.headshot_url || '/Website Assets/Logos/FIG Logo.png'} alt="" />
          <div>
            <h3>{form.name || 'Your name'}</h3>
            <div className="ui-muted ui-small">{member.title ?? `${form.sector} Analyst`}</div>
            <div className="ui-muted ui-small">{form.sector}</div>
          </div>
        </div>

        <div className="ui-field">
          <span className="ui-label">Headshot</span>
          <ImageUpload value={form.headshot_url} onChange={v => setForm(f => ({ ...f, headshot_url: v }))} bucket="headshots" pathPrefix={`members/${member.id}/`} maxSize={900} label="Upload photo" />
        </div>

        <div className="ui-form-grid">
          <div className="ui-field">
            <label htmlFor="p-name">Full name</label>
            <input id="p-name" className="ui-input" required maxLength={120} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="ui-field">
            <label htmlFor="p-sector">Sector</label>
            <select id="p-sector" className="ui-select" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
              {sectors.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="ui-field span-2">
            <label htmlFor="p-li">LinkedIn URL</label>
            <input id="p-li" className="ui-input" type="url" placeholder="https://www.linkedin.com/in/your-name" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
          </div>
        </div>

        <div className="ui-field">
          <div className="ui-spread">
            <label htmlFor="p-bio" className="ui-label">Bio</label>
            <span className="ui-hint" style={{ color: form.bio.length > BIO_MAX ? 'var(--ui-down)' : undefined }}>{form.bio.length}/{BIO_MAX}</span>
          </div>
          <textarea id="p-bio" className="ui-textarea" rows={8} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            placeholder="Year, majors, your role in FIG, internships, and a little about you outside class. Write in the third person, like the other bios." />
          <span className="ui-hint">Leave a blank line between paragraphs. Your title ({member.title ?? 'Analyst'}) is set by the co-presidents.</span>
        </div>

        <div className="ui-spread">
          <span className="ui-hint">{changed.length ? `Changed: ${changed.map(k => FIELD_LABELS[k]).join(', ')}` : 'No changes yet'}</span>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={saving || form.bio.length > BIO_MAX || (!pending && changed.length === 0)}>
            <Send size={15} /> {saving ? 'Sending…' : pending ? 'Update request' : 'Submit for approval'}
          </button>
        </div>
      </form>
    </Card>
  )
}

// ── Plans (visible to PM + co-presidents, saves immediately) ──────
function upcomingTerms() {
  const now = new Date()
  const y = now.getFullYear()
  const springNow = now.getMonth() < 6
  const list: string[] = []
  let season: 'Spring' | 'Fall' = springNow ? 'Spring' : 'Fall'
  let year = y
  for (let i = 0; i < 5; i++) {
    list.push(`${season} ${year}`)
    if (season === 'Spring') season = 'Fall'
    else { season = 'Spring'; year++ }
  }
  return list
}

export function PlansForm({ member, internal }: { member: Member; internal: MemberInternal | null }) {
  const terms = useMemo(upcomingTerms, [])
  const [classYear, setClassYear] = useState(member.class_year ? String(member.class_year) : '')
  const [abroad, setAbroad] = useState(Boolean(internal?.abroad_term))
  const [abroadTerm, setAbroadTerm] = useState(internal?.abroad_term ?? terms[1])
  const [leader, setLeader] = useState(internal?.leadership_interest ?? false)
  const [leaderNote, setLeaderNote] = useState(internal?.leadership_note ?? '')
  const { run, pending } = useMutation()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    await run(async () => {
      const year = classYear ? Number(classYear) : null
      if (year !== member.class_year) must(await supabase.from('members_directory').update({ class_year: year }).eq('id', member.id))
      must(await supabase.from('member_internal').upsert({
        member_id: member.id,
        abroad_term: abroad ? abroadTerm : null,
        leadership_interest: leader,
        leadership_note: leader ? leaderNote.trim() || null : null,
      }, { onConflict: 'member_id' }))
    }, { success: 'Saved' })
  }

  return (
    <Card title={<><Plane size={18} /> My plans</>} description="Only your PM and the co-presidents can see this. It helps with planning teams and leadership.">
      <form onSubmit={save} className="ui-form">
        <div className="ui-field" style={{ maxWidth: 220 }}>
          <label htmlFor="pl-year">Graduation year</label>
          <input id="pl-year" className="ui-input" inputMode="numeric" pattern="20[0-9]{2}" placeholder="2028" value={classYear} onChange={e => setClassYear(e.target.value)} />
        </div>

        <div className="ui-field">
          <label className="ui-switch">
            <input type="checkbox" checked={abroad} onChange={e => setAbroad(e.target.checked)} />
            <span className="track" />
            I&apos;m going abroad
          </label>
          {abroad && (
            <select className="ui-select" style={{ maxWidth: 220, marginTop: 6 }} value={abroadTerm} onChange={e => setAbroadTerm(e.target.value)} aria-label="Semester abroad">
              {[...new Set([abroadTerm, ...terms])].map(t => <option key={t}>{t}</option>)}
            </select>
          )}
        </div>

        <div className="ui-field">
          <label className="ui-switch">
            <input type="checkbox" checked={leader} onChange={e => setLeader(e.target.checked)} />
            <span className="track" />
            I&apos;d like to be considered for a leadership role
          </label>
          {leader && (
            <textarea className="ui-textarea" rows={3} style={{ marginTop: 6 }} value={leaderNote} onChange={e => setLeaderNote(e.target.value)}
              placeholder="Which role(s) — e.g. Consumers PM, PPG Manager, Recruiting — and why?" aria-label="Leadership interest details" />
          )}
        </div>

        <div><button type="submit" className="ui-btn ui-btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save plans'}</button></div>
      </form>
    </Card>
  )
}

// ── Roles & role requests ─────────────────────────────────────────
const STATUS_TONE = { pending: 'amber', approved: 'green', denied: 'red', cancelled: 'gray' } as const

export function RolesCard({ roles, requests, investmentSectors, memberId }: {
  roles: RoleGrant[]
  requests: RoleRequest[]
  investmentSectors: string[]
  memberId: string
}) {
  const pendingKeys = new Set(requests.filter(r => r.status === 'pending').map(r => `${r.role}:${r.sector ?? ''}`))
  const held = new Set(roles.map(r => `${r.role}:${r.sector ?? ''}`))
  const options = REQUESTABLE_ROLES.filter(r => r === 'portfolio_manager' || (!held.has(`${r}:`) && !pendingKeys.has(`${r}:`)))
  const [role, setRole] = useState<string>('')
  const [sector, setSector] = useState(investmentSectors[0] ?? '')
  const [note, setNote] = useState('')
  const { run, pending } = useMutation()

  async function request(e: React.FormEvent) {
    e.preventDefault()
    const isPm = role === 'portfolio_manager'
    if (isPm && (held.has(`portfolio_manager:${sector}`) || pendingKeys.has(`portfolio_manager:${sector}`))) {
      return run(async () => { throw new Error(`You already have or requested PM for ${sector}.`) }, { refresh: false })
    }
    const ok = await run(async () => must(await createClient().from('role_requests').insert({
      member_id: memberId, role, sector: isPm ? sector : null, note: note.trim() || null,
    })), { success: 'Request sent to the co-presidents' })
    if (ok) { setRole(''); setNote('') }
  }

  async function cancel(id: string) {
    await run(async () => must(await createClient().from('role_requests').update({ status: 'cancelled' }).eq('id', id)), { success: 'Request cancelled' })
  }

  return (
    <Card title={<><ShieldCheck size={18} /> My roles</>} description="Roles unlock workspaces in the portal.">
      <div className="ui-stack" style={{ gap: 16 }}>
        <ul className="ui-list" style={{ margin: '-4px 0' }}>
          <li style={{ padding: '6px 0' }}>
            <div className="ui-row"><Badge tone="navy">Analyst</Badge><span className="ui-small ui-muted">Every member</span></div>
          </li>
          {roles.map(r => (
            <li key={`${r.role}:${r.sector}`} style={{ padding: '6px 0' }}>
              <div className="ui-row">
                <Badge tone="red">{ROLES[r.role].label}{r.sector ? ` · ${r.sector}` : ''}</Badge>
              </div>
              <div className="ui-small ui-muted" style={{ marginTop: 4 }}>{ROLES[r.role].description}</div>
            </li>
          ))}
        </ul>

        <hr className="ui-divider" />

        <form onSubmit={request} className="ui-form" style={{ gap: 12 }}>
          <div className="ui-field">
            <label htmlFor="rr-role">Request a role</label>
            <select id="rr-role" className="ui-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="">Choose a role…</option>
              {options.map(r => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </select>
            {role && <span className="ui-hint">{ROLES[role as keyof typeof ROLES].description}</span>}
          </div>
          {role === 'portfolio_manager' && (
            <div className="ui-field">
              <label htmlFor="rr-sector">Sector</label>
              <select id="rr-sector" className="ui-select" value={sector} onChange={e => setSector(e.target.value)}>
                {investmentSectors.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          {role && (
            <>
              <div className="ui-field">
                <label htmlFor="rr-note">Why are you a good fit? <span className="ui-muted">(optional)</span></label>
                <textarea id="rr-note" className="ui-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div><button type="submit" className="ui-btn ui-btn-primary ui-btn-sm" disabled={pending}><Sparkles size={15} /> Send request</button></div>
            </>
          )}
        </form>

        {requests.length > 0 && (
          <div>
            <div className="ui-label" style={{ marginBottom: 6 }}>My requests</div>
            <ul className="ui-list">
              {requests.map(r => (
                <li key={r.id} className="ui-spread" style={{ padding: '8px 0', borderBottom: '1px solid #f0f1f4' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="ui-small" style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{ROLES[r.role].label}{r.sector ? ` · ${r.sector}` : ''}</div>
                    <div className="ui-hint"><TimeAgo iso={r.created_at} />{r.review_note ? ` · “${r.review_note}”` : ''}</div>
                  </div>
                  <div className="ui-row" style={{ flexWrap: 'nowrap' }}>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status[0].toUpperCase() + r.status.slice(1)}</Badge>
                    {r.status === 'pending' && (
                      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label="Cancel request" onClick={() => cancel(r.id)}><X size={15} /></button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Referral to recruiting ────────────────────────────────────────
export function ReferralForm({ sectors }: { sectors: string[] }) {
  const empty = { name: '', email: '', classYear: '', sector: '', note: '' }
  const [form, setForm] = useState(empty)
  const { run, pending } = useMutation()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(async () => {
      const { error } = await createClient().rpc('submit_referral', {
        p_name: form.name, p_email: form.email, p_class_year: form.classYear ? Number(form.classYear) : null,
        p_sector: form.sector || null, p_note: form.note || null,
      })
      if (error) throw new Error(error.message)
      return true
    }, { success: 'Thanks! Recruiting will reach out.', refresh: false })
    if (ok) setForm(empty)
  }

  return (
    <section className="ui-card" id="refer">
      <div className="ui-card-head"><div><h2><UserPlus size={18} /> Refer someone</h2><p>Know someone who&apos;d be great in FIG? Recruiting will invite them to apply.</p></div></div>
      <form onSubmit={submit} className="ui-card-body ui-form" style={{ gap: 12 }}>
        <div className="ui-form-grid">
          <div className="ui-field"><label htmlFor="rf-name">Name</label><input id="rf-name" className="ui-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="ui-field"><label htmlFor="rf-email">Email</label><input id="rf-email" className="ui-input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div className="ui-field"><label htmlFor="rf-year">Class year</label><input id="rf-year" className="ui-input" inputMode="numeric" placeholder="2029" value={form.classYear} onChange={e => setForm(f => ({ ...f, classYear: e.target.value }))} /></div>
          <div className="ui-field">
            <label htmlFor="rf-sector">Interest</label>
            <select id="rf-sector" className="ui-select" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
              <option value="">Not sure</option>
              {sectors.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="ui-field"><label htmlFor="rf-note">Why them? <span className="ui-muted">(optional)</span></label><textarea id="rf-note" className="ui-textarea" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
        <div><button type="submit" className="ui-btn ui-btn-secondary ui-btn-sm" disabled={pending}><Send size={15} /> Send referral</button></div>
      </form>
    </section>
  )
}
