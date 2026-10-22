'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { REQUESTABLE_ROLES, ROLES } from '@/lib/roles'
import { classYearOptions, firstName, todayET } from '@/lib/format'
import { publishProfile, requestSectorChange } from '@/lib/profile'
import type { Member, MemberInternal, ProfileChange, RoleGrant, RoleRequest, SectorKind } from '@/lib/types'
import { ImageUpload } from '@/components/portal/ImageUpload'
import { must, useMutation } from '@/components/portal/feedback'
import { Badge } from '@/components/portal/ui'
import { finishOnboarding } from './actions'

type StepId = 'password' | 'about' | 'roles' | 'profile' | 'plans' | 'review'
const STEP_LABELS: Record<StepId, string> = { password: 'Password', about: 'About you', roles: 'Your roles', profile: 'Public profile', plans: 'Plans', review: 'Finish' }
const BIO_MAX = 1500

const keyOf = (role: string, sector: string | null) => (role === 'portfolio_manager' ? `portfolio_manager:${sector}` : role)

function upcomingTerms() {
  const now = new Date()
  let season: 'Spring' | 'Fall' = now.getMonth() < 6 ? 'Spring' : 'Fall'
  let year = now.getFullYear()
  return Array.from({ length: 5 }, () => {
    const t = `${season} ${year}`
    if (season === 'Spring') season = 'Fall'; else { season = 'Spring'; year++ }
    return t
  })
}

export default function Onboarding({ member, heldRoles, requests, internal, pendingChange, sectors, needsPassword, initialStep }: {
  member: Member
  heldRoles: RoleGrant[]
  requests: RoleRequest[]
  internal: MemberInternal | null
  pendingChange: ProfileChange | null
  sectors: { name: string; kind: SectorKind }[]
  needsPassword: boolean
  initialStep?: string
}) {
  const router = useRouter()
  const applicant = member.status === 'pending'
  const steps: StepId[] = (['password', 'about', 'roles', 'profile', 'plans', 'review'] as StepId[]).filter(s => s !== 'password' || needsPassword)
  const [index, setIndex] = useState(() => Math.max(0, steps.indexOf(initialStep as StepId)))
  const step = steps[index]
  const { run, pending } = useMutation()
  const supabase = createClient()
  const investment = sectors.filter(s => s.kind === 'investment').map(s => s.name)

  // ── form state ─────────────────────────────────────────────────
  const [pw, setPw] = useState({ password: '', confirm: '' })
  const start = pendingChange?.changes ?? {}
  const [about, setAbout] = useState({
    name: start.name ?? member.name,
    sector: start.sector ?? member.sector,
    classYear: member.class_year ? String(member.class_year) : '',
  })
  const held = useMemo(() => new Set(heldRoles.map(r => keyOf(r.role, r.sector))), [heldRoles])
  const [requested, setRequested] = useState<Map<string, string>>(() => new Map(requests.map(r => [keyOf(r.role, r.sector), r.id])))
  const [wanted, setWanted] = useState<Set<string>>(() => new Set([...held, ...requests.map(r => keyOf(r.role, r.sector))]))
  const [roleNote, setRoleNote] = useState(requests[0]?.note ?? '')
  const [profile, setProfile] = useState({
    headshot_url: start.headshot_url ?? member.headshot_url ?? '',
    linkedin_url: start.linkedin_url ?? member.linkedin_url ?? '',
    bio: start.bio ?? member.bio ?? '',
  })
  const [changeId, setChangeId] = useState(pendingChange?.id ?? null)
  const terms = useMemo(upcomingTerms, [])
  const [plans, setPlans] = useState({
    abroad: Boolean(internal?.abroad_term),
    abroadTerm: internal?.abroad_term ?? terms[1],
    leader: internal?.leadership_interest ?? false,
    leaderNote: internal?.leadership_note ?? '',
  })

  const pmWanted = [...wanted].some(k => k.startsWith('portfolio_manager:'))
  function toggle(key: string) {
    if (held.has(key)) return
    setWanted(w => { const n = new Set(w); if (n.has(key)) n.delete(key); else n.add(key); return n })
  }
  function togglePm(on: boolean) {
    setWanted(w => {
      const n = new Set([...w].filter(k => !k.startsWith('portfolio_manager:') || held.has(k)))
      if (on) n.add(`portfolio_manager:${investment.includes(about.sector) ? about.sector : investment[0]}`)
      return n
    })
  }

  // ── saving each step ───────────────────────────────────────────
  async function save(s: StepId): Promise<boolean> {
    const ok = await run(async () => {
      if (s === 'password') {
        if (pw.password.length < 8) throw new Error('Use at least 8 characters for your password.')
        if (pw.password !== pw.confirm) throw new Error("The passwords don't match.")
        const { error } = await supabase.auth.updateUser({ password: pw.password, data: { password_set: true } })
        if (error) throw new Error(error.message)
      }
      if (s === 'about') {
        if (!about.name.trim()) throw new Error('Please enter your name.')
        if (!/^20\d{2}$/.test(about.classYear)) throw new Error('Please choose your graduation year.')
        const patch = applicant
          ? { name: about.name.trim(), sector: about.sector, class_year: Number(about.classYear) }
          : { name: about.name.trim(), class_year: Number(about.classYear) }
        must(await supabase.from('members_directory').update(patch).eq('id', member.id))
        // Active members' sector moves wait for a co-president.
        if (!applicant && about.sector !== member.sector) {
          await requestSectorChange(supabase, member.id, about.sector, changeId)
          if (!changeId) {
            const { data } = await supabase.from('profile_changes').select('id').eq('member_id', member.id).eq('status', 'pending').maybeSingle()
            setChangeId(data?.id ?? null)
          }
        }
      }
      if (s === 'roles') {
        const toAdd = [...wanted].filter(k => !held.has(k) && !requested.has(k))
        const toCancel = [...requested.entries()].filter(([k]) => !wanted.has(k))
        if (toAdd.length) {
          const { data, error } = await supabase.from('role_requests').insert(toAdd.map(k => {
            const [role, sector] = k.split(':')
            return { member_id: member.id, role, sector: sector ?? null, note: roleNote.trim() || null }
          })).select('id, role, sector')
          if (error) throw new Error(error.message)
          setRequested(r => { const n = new Map(r); for (const row of data ?? []) n.set(keyOf(row.role, row.sector), row.id); return n })
        }
        if (toCancel.length) {
          must(await supabase.from('role_requests').update({ status: 'cancelled' }).in('id', toCancel.map(([, id]) => id)))
          setRequested(r => { const n = new Map(r); for (const [k] of toCancel) n.delete(k); return n })
        }
      }
      if (s === 'profile') {
        const li = profile.linkedin_url.trim()
        if (li && !/^https?:\/\/(www\.)?linkedin\.com\//i.test(li)) throw new Error('LinkedIn links should start with https://www.linkedin.com/')
        if (profile.bio.length > BIO_MAX) throw new Error(`Please keep your bio under ${BIO_MAX} characters.`)
        if (applicant) {
          must(await supabase.from('members_directory').update({ bio: profile.bio.trim() || null, linkedin_url: li || null, headshot_url: profile.headshot_url || null }).eq('id', member.id))
        } else {
          await publishProfile(supabase, member.id, { name: about.name, headshot_url: profile.headshot_url, linkedin_url: li, bio: profile.bio })
        }
      }
      if (s === 'plans') {
        must(await supabase.from('member_internal').upsert({
          member_id: member.id,
          abroad_term: plans.abroad ? plans.abroadTerm : null,
          leadership_interest: plans.leader,
          leadership_note: plans.leader ? plans.leaderNote.trim() || null : null,
        }, { onConflict: 'member_id' }))
      }
      return true
    }, { refresh: false })
    return Boolean(ok)
  }

  async function next() {
    if (await save(step)) { setIndex(i => i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }
  function back() { setIndex(i => Math.max(0, i - 1)); window.scrollTo({ top: 0 }) }
  function skip() {
    setIndex(i => i + 1)
    window.scrollTo({ top: 0 })
  }
  function goTo(s: StepId) { setIndex(steps.indexOf(s)) }

  async function finish() {
    const ok = await run(async () => {
      const res = await finishOnboarding()
      if (!res.ok) throw new Error(res.error ?? 'Could not finish setup.')
      return true
    }, { success: applicant ? 'Sent to the co-presidents!' : "You're all set — welcome to the portal!", refresh: false })
    if (ok) { router.replace(applicant ? '/portal/welcome' : '/portal'); router.refresh() }
  }

  // ── step content ───────────────────────────────────────────────
  const wantedRequests = [...wanted].filter(k => !held.has(k))
  const label = (k: string) => { const [role, sector] = k.split(':'); return `${ROLES[role as keyof typeof ROLES].label}${sector ? ` · ${sector}` : ''}` }

  let title = '', lead = '', body: React.ReactNode = null
  if (step === 'password') {
    title = `Welcome to FIG, ${firstName(member.name)}!`
    lead = "First, create a password. You'll use it with your email to sign in from now on."
    body = (
      <div className="ui-form">
        <input type="email" autoComplete="username" value={member.email ?? ''} readOnly hidden />
        <div className="ui-field">
          <label htmlFor="ob-pw">Password</label>
          <input id="ob-pw" className="ui-input" type="password" autoComplete="new-password" autoFocus value={pw.password} onChange={e => setPw(p => ({ ...p, password: e.target.value }))} />
          <span className="ui-hint">At least 8 characters.</span>
        </div>
        <div className="ui-field">
          <label htmlFor="ob-pw2">Confirm password</label>
          <input id="ob-pw2" className="ui-input" type="password" autoComplete="new-password" value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
        </div>
      </div>
    )
  }
  if (step === 'about') {
    title = needsPassword ? 'About you' : `Welcome, ${firstName(member.name)}!`
    lead = applicant ? 'Tell us where you fit in FIG. A co-president will confirm your details.' : "Let's make sure your details are right. This takes about two minutes."
    body = (
      <div className="ui-form">
        <div className="ui-field">
          <label htmlFor="ob-name">Full name</label>
          <input id="ob-name" className="ui-input" autoComplete="name" value={about.name} onChange={e => setAbout(a => ({ ...a, name: e.target.value }))} />
        </div>
        <div className="ui-form-grid">
          <div className="ui-field">
            <label htmlFor="ob-sector">Sector / team</label>
            <select id="ob-sector" className="ui-select" value={about.sector} onChange={e => setAbout(a => ({ ...a, sector: e.target.value }))}>
              {sectors.map(s => <option key={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="ob-year">Graduation year</label>
            <select id="ob-year" className="ui-select" value={about.classYear} onChange={e => setAbout(a => ({ ...a, classYear: e.target.value }))}>
              <option value="" disabled>Choose…</option>
              {classYearOptions(todayET()).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        {!applicant && about.sector !== member.sector && (
          <span className="ui-hint">A co-president will confirm your move to {about.sector}.</span>
        )}
        {!applicant && member.title && <span className="ui-hint">Your title is <strong>{member.title}</strong> (set by the co-presidents).</span>}
      </div>
    )
  }
  if (step === 'roles') {
    title = 'What do you do in FIG?'
    lead = applicant
      ? 'Pick everything that applies. The co-presidents confirm roles when they approve you.'
      : 'Your current roles are checked. Add anything that’s missing and a co-president will confirm it.'
    body = (
      <div className="ui-stack" style={{ gap: 10 }}>
        <label className="role-option locked on">
          <input type="checkbox" checked disabled />
          <div><strong>Analyst</strong> <Badge tone="navy">Everyone</Badge><p>Portfolio, sector news, tasks from your PM, attendance and resources.</p></div>
        </label>
        {REQUESTABLE_ROLES.map(role => {
          if (role === 'portfolio_manager') {
            const pmKeys = investment.map(s => `portfolio_manager:${s}`)
            const heldPm = pmKeys.filter(k => held.has(k))
            return (
              <div key={role} className={`role-option${pmWanted ? ' on' : ''}${heldPm.length ? ' locked' : ''}`} onClick={() => !heldPm.length && togglePm(!pmWanted)} role="presentation">
                <input type="checkbox" checked={pmWanted} disabled={heldPm.length > 0} onChange={e => togglePm(e.target.checked)} onClick={e => e.stopPropagation()} aria-label="Portfolio Manager" />
                <div style={{ flex: 1 }}>
                  <strong>{ROLES[role].label}</strong> {heldPm.length > 0 && <Badge tone="green">You have this role</Badge>}
                  <p>{ROLES[role].description}</p>
                  {pmWanted && (
                    <div className="ui-chips" style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                      {investment.map(s => {
                        const k = `portfolio_manager:${s}`
                        return (
                          <button key={s} type="button" className={`ui-chip${wanted.has(k) ? ' on' : ''}`} disabled={held.has(k)} onClick={() => toggle(k)}>
                            {wanted.has(k) && <Check size={13} />} {s}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          }
          const isHeld = held.has(role)
          const on = wanted.has(role)
          return (
            <label key={role} className={`role-option${on ? ' on' : ''}${isHeld ? ' locked' : ''}`}>
              <input type="checkbox" checked={on} disabled={isHeld} onChange={() => toggle(role)} />
              <div>
                <strong>{ROLES[role].label}</strong>{' '}
                {isHeld ? <Badge tone="green">You have this role</Badge> : requested.has(role) ? <Badge tone="amber">Requested</Badge> : null}
                <p>{ROLES[role].description}</p>
              </div>
            </label>
          )
        })}
        {wantedRequests.length > 0 && (
          <div className="ui-field" style={{ marginTop: 6 }}>
            <label htmlFor="ob-note">Anything the co-presidents should know? <span className="ui-muted">(optional)</span></label>
            <textarea id="ob-note" className="ui-textarea" rows={2} value={roleNote} onChange={e => setRoleNote(e.target.value)} placeholder="e.g. I was added to PPG by Matt last spring." />
          </div>
        )}
      </div>
    )
  }
  if (step === 'profile') {
    title = 'Your public profile'
    lead = applicant ? 'This appears on the FIG website once you’re approved. You can skip this and add it later.' : 'This is how you appear on the FIG website. It goes live when you continue, and you can change it any time under My Profile.'
    body = (
      <div className="ui-form">
        <div className="profile-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={`photo${profile.headshot_url ? '' : ' is-placeholder'}`} src={profile.headshot_url || '/Website Assets/Logos/FIG Logo.png'} alt="" />
          <div><h3>{about.name || member.name}</h3><div className="ui-small ui-muted">{member.title ?? `${about.sector} Analyst`}</div></div>
        </div>
        <ImageUpload value={profile.headshot_url} onChange={v => setProfile(p => ({ ...p, headshot_url: v }))} bucket="headshots" pathPrefix={`members/${member.id}/`} maxSize={900} label="Upload headshot" />
        <div className="ui-field">
          <label htmlFor="ob-li">LinkedIn URL</label>
          <input id="ob-li" className="ui-input" type="url" placeholder="https://www.linkedin.com/in/your-name" value={profile.linkedin_url} onChange={e => setProfile(p => ({ ...p, linkedin_url: e.target.value }))} />
        </div>
        <div className="ui-field">
          <div className="ui-spread"><label htmlFor="ob-bio" className="ui-label">Bio</label><span className="ui-hint">{profile.bio.length}/{BIO_MAX}</span></div>
          <textarea id="ob-bio" className="ui-textarea" rows={6} value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
            placeholder="Year, majors, your role in FIG, internships, and a little about you. Third person, like the other bios." />
        </div>
      </div>
    )
  }
  if (step === 'plans') {
    title = 'A couple of quick questions'
    lead = 'Only your PM and the co-presidents see this. It helps with planning teams and leadership.'
    body = (
      <div className="ui-form">
        <div className="ui-field">
          <label className="ui-switch"><input type="checkbox" checked={plans.abroad} onChange={e => setPlans(p => ({ ...p, abroad: e.target.checked }))} /><span className="track" />I&apos;m planning to study abroad</label>
          {plans.abroad && (
            <select className="ui-select" style={{ maxWidth: 220, marginTop: 6 }} aria-label="Semester abroad" value={plans.abroadTerm} onChange={e => setPlans(p => ({ ...p, abroadTerm: e.target.value }))}>
              {[...new Set([plans.abroadTerm, ...terms])].map(t => <option key={t}>{t}</option>)}
            </select>
          )}
        </div>
        <div className="ui-field">
          <label className="ui-switch"><input type="checkbox" checked={plans.leader} onChange={e => setPlans(p => ({ ...p, leader: e.target.checked }))} /><span className="track" />I&apos;d like to be considered for a leadership role</label>
          {plans.leader && (
            <textarea className="ui-textarea" rows={3} style={{ marginTop: 6 }} aria-label="Leadership interest" value={plans.leaderNote}
              onChange={e => setPlans(p => ({ ...p, leaderNote: e.target.value }))} placeholder="Which role(s) and why — e.g. Consumers PM next year." />
          )}
        </div>
      </div>
    )
  }
  if (step === 'review') {
    title = applicant ? 'Ready to send?' : "You're all set"
    lead = applicant ? 'Check your answers, then send your application to the co-presidents.' : 'Here’s what will happen next.'
    const Row = ({ s, label: l, children }: { s: StepId; label: string; children: React.ReactNode }) => (
      <div className="ui-spread" style={{ padding: '12px 0', borderBottom: '1px solid #f0f1f4', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}><div className="ui-label">{l}</div><div className="ui-small" style={{ marginTop: 4 }}>{children}</div></div>
        <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => goTo(s)}><Pencil size={14} /> Edit</button>
      </div>
    )
    body = (
      <div>
        <Row s="about" label="About you">{about.name} · {about.sector} · Class of {about.classYear}</Row>
        <Row s="roles" label="Roles">
          <div className="ui-row" style={{ gap: 6 }}>
            <Badge tone="navy">Analyst</Badge>
            {[...held].map(k => <Badge key={k} tone="green">{label(k)}</Badge>)}
            {wantedRequests.map(k => <Badge key={k} tone="amber">{label(k)} · needs approval</Badge>)}
          </div>
        </Row>
        <Row s="profile" label="Public profile">{profile.bio ? `${profile.bio.slice(0, 120)}${profile.bio.length > 120 ? '…' : ''}` : <span className="ui-muted">No bio yet — you can add one later from My Profile.</span>}</Row>
        <Row s="plans" label="Plans">{[plans.abroad ? `Abroad ${plans.abroadTerm}` : 'Not going abroad', plans.leader ? 'Interested in leadership' : null].filter(Boolean).join(' · ')}</Row>
        {!applicant && (wantedRequests.length > 0 || changeId) && (
          <p className="ui-small ui-muted" style={{ marginTop: 14 }}>Your requests are with the co-presidents. You can use the portal right away — new roles appear once they&apos;re approved.</p>
        )}
      </div>
    )
  }

  const optional = step === 'profile' || step === 'plans'
  return (
    <>
      <div className="onboard-progress" aria-hidden>{steps.map((s, i) => <span key={s} className={i <= index ? 'on' : ''} />)}</div>
      <div className="onboard-step-label">Step {index + 1} of {steps.length} · {STEP_LABELS[step]}</div>
      <section className="onboard-card" aria-labelledby="ob-title">
        <div className="onboard-card-body">
          <h1 id="ob-title">{title}</h1>
          <p className="lead">{lead}</p>
          {body}
        </div>
        <div className="onboard-foot">
          {index > 0 ? <button type="button" className="ui-btn ui-btn-ghost" onClick={back} disabled={pending}><ArrowLeft size={16} /> Back</button> : <span />}
          <div className="ui-row">
            {optional && <button type="button" className="ui-btn ui-btn-ghost" onClick={skip} disabled={pending}>Skip for now</button>}
            {step === 'review' ? (
              <button type="button" className="ui-btn ui-btn-primary" onClick={finish} disabled={pending}>
                <Check size={16} /> {pending ? 'Finishing…' : applicant ? 'Send application' : 'Go to my portal'}
              </button>
            ) : (
              <button type="button" className="ui-btn ui-btn-primary" onClick={next} disabled={pending}>
                {pending ? 'Saving…' : 'Continue'} <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
