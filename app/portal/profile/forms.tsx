'use client'
import { useMemo, useState } from 'react'
import { Plane, ShieldCheck, Sparkles, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { REQUESTABLE_ROLES, ROLES } from '@/lib/roles'
import { requestSectorChange } from '@/lib/profile'
import { classYearOptions, todayET } from '@/lib/format'
import type { Member, MemberInternal, RoleGrant, RoleRequest } from '@/lib/types'
import { Badge, Card } from '@/components/portal/ui'
import { must, useMutation } from '@/components/portal/feedback'
import { TimeAgo } from '@/components/portal/TimeAgo'

// ── Team & plans (visible to your PM and the co-presidents) ───────
function upcomingTerms() {
  const [y, m] = todayET().split('-').map(Number)
  const list: string[] = []
  let season: 'Spring' | 'Fall' = m >= 8 ? 'Fall' : 'Spring'
  let year = y
  for (let i = 0; i < 5; i++) {
    list.push(`${season} ${year}`)
    if (season === 'Spring') season = 'Fall'
    else { season = 'Spring'; year++ }
  }
  return list
}

export function PlansForm({ member, internal, sectors, pendingSector }: {
  member: Member
  internal: MemberInternal | null
  sectors: string[]
  pendingSector: { id: string; sector: string } | null
}) {
  const terms = useMemo(upcomingTerms, [])
  const years = useMemo(() => {
    const opts = classYearOptions(todayET())
    return member.class_year && !opts.includes(member.class_year) ? [member.class_year, ...opts] : opts
  }, [member.class_year])
  const [sector, setSector] = useState(pendingSector?.sector ?? member.sector)
  const [classYear, setClassYear] = useState(member.class_year ? String(member.class_year) : '')
  const [abroad, setAbroad] = useState(Boolean(internal?.abroad_term))
  const [abroadTerm, setAbroadTerm] = useState(internal?.abroad_term ?? terms[1])
  const [leader, setLeader] = useState(internal?.leadership_interest ?? false)
  const [leaderNote, setLeaderNote] = useState(internal?.leadership_note ?? '')
  const { run, pending } = useMutation()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const movingTo = sector !== member.sector && sector !== pendingSector?.sector ? sector : null
    await run(async () => {
      const year = classYear ? Number(classYear) : null
      if (year !== member.class_year) must(await supabase.from('members_directory').update({ class_year: year }).eq('id', member.id))
      must(await supabase.from('member_internal').upsert({
        member_id: member.id,
        abroad_term: abroad ? abroadTerm : null,
        leadership_interest: leader,
        leadership_note: leader ? leaderNote.trim() || null : null,
      }, { onConflict: 'member_id' }))
      if (movingTo) await requestSectorChange(supabase, member.id, movingTo, pendingSector?.id ?? null)
      else if (pendingSector && sector === member.sector) must(await supabase.from('profile_changes').update({ status: 'cancelled' }).eq('id', pendingSector.id))
    }, { success: movingTo ? 'Saved. Your sector move is waiting for a co-president.' : 'Saved' })
  }

  return (
    <Card title={<><Plane size={18} /> Team &amp; plans</>} description="Only your PM and the co-presidents see your plans.">
      <form onSubmit={save} className="ui-form">
        <div className="ui-form-grid">
          <div className="ui-field">
            <label htmlFor="pl-sector">Sector</label>
            <select id="pl-sector" className="ui-select" value={sector} onChange={e => setSector(e.target.value)}>
              {sectors.map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="ui-hint">{pendingSector ? `Move to ${pendingSector.sector} is waiting for approval.` : 'Switching sectors needs a co-president’s OK.'}</span>
          </div>
          <div className="ui-field">
            <label htmlFor="pl-year">Graduation year</label>
            <select id="pl-year" className="ui-select" value={classYear} onChange={e => setClassYear(e.target.value)}>
              <option value="">Choose…</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
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
              placeholder="Which role(s), e.g. Consumers PM or PPG Manager, and why?" aria-label="Leadership interest details" />
          )}
        </div>

        <div><button type="submit" className="ui-btn ui-btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button></div>
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
  const recent = requests.filter(r => r.status === 'pending' || Date.now() - new Date(r.created_at).getTime() < 60 * 86_400_000)

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
    <Card title={<><ShieldCheck size={18} /> Roles</>} description="Roles unlock workspaces in the portal. A co-president approves requests.">
      <div className="ui-stack" style={{ gap: 18 }}>
        <div className="ui-row">
          <Badge tone="navy">Analyst</Badge>
          {roles.map(r => <Badge key={`${r.role}:${r.sector}`} tone="red" title={ROLES[r.role].description}>{ROLES[r.role].label}{r.sector ? ` · ${r.sector}` : ''}</Badge>)}
        </div>

        {recent.length > 0 && (
          <ul className="ui-list">
            {recent.map(r => (
              <li key={r.id} className="ui-spread" style={{ padding: '8px 0', borderTop: '1px solid #f0f1f4' }}>
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
        )}

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
                <label htmlFor="rr-note">Why you? <span className="ui-muted">(optional)</span></label>
                <textarea id="rr-note" className="ui-textarea" rows={3} value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div><button type="submit" className="ui-btn ui-btn-primary ui-btn-sm" disabled={pending}><Sparkles size={15} /> Send request</button></div>
            </>
          )}
        </form>
      </div>
    </Card>
  )
}
