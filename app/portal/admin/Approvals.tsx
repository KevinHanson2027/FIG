'use client'
import { useState } from 'react'
import { BadgeCheck, Check, CheckCheck, Inbox, ShieldCheck, UserPlus, UserRound, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROLES } from '@/lib/roles'

import type { Member, MemberInternal, ProfileChange, ProfileFields, RoleGrant, RoleRequest } from '@/lib/types'
import { Avatar } from '@/components/portal/Avatar'
import { LinkResults, type LinkList } from '@/components/portal/LinkResults'
import { useConfirm, useMutation, useToast } from '@/components/portal/feedback'
import { Badge, EmptyState } from '@/components/portal/ui'
import { approveMembers, denyApplication, type ApproveResult } from './actions'
import { TimeAgo } from '@/components/portal/TimeAgo'

export type Application = { member: Member; internal: MemberInternal | null; requests: RoleGrant[] }
type RoleReq = RoleRequest & { member: Pick<Member, 'name' | 'sector' | 'title' | 'headshot_url'> | null }
type Change = ProfileChange & { member: Member | null }

const FIELD: Record<keyof ProfileFields, string> = { name: 'Name', sector: 'Sector', linkedin_url: 'LinkedIn', headshot_url: 'Photo', bio: 'Bio' }

function useApprovalFeedback() {
  const toast = useToast()
  const [links, setLinks] = useState<LinkList | null>(null)
  function report(res: Extract<ApproveResult, { ok: true }>) {
    const parts = [`Approved ${res.approved}`]
    if (res.emailed) parts.push(`${res.emailed} emailed`)
    if (res.failed.length) parts.push(`couldn't approve ${res.failed.join(', ')}`)
    if (res.failed.length) toast.error(parts.join(' · ')); else toast.success(parts.join(' · '))
    if (res.links.length) setLinks({ sent: res.emailed, links: res.links, failed: [] })
  }
  return { report, links, clear: () => setLinks(null) }
}

export default function Approvals({ applications, roleRequests, profileChanges, pmBySector }: {
  applications: Application[]
  roleRequests: RoleReq[]
  profileChanges: Change[]
  pmBySector: Record<string, string[]>
}) {
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  const feedback = useApprovalFeedback()
  const total = applications.length + roleRequests.length + profileChanges.length

  async function approveAll() {
    // Only people who proved their email and finished setup; review the rest one by one.
    const ready = applications.filter(a => a.member.user_id && a.member.onboarded_at)
    if (ready.length === 0) return feedback.report({ ok: true, approved: 0, emailed: 0, links: [], failed: [] })
    if (!(await confirm({
      title: `Approve ${ready.length} new member${ready.length === 1 ? '' : 's'}?`,
      body: 'Each verified applicant is added to the roster with the roles they requested. Anyone unverified or still setting up is skipped so you can review them individually.',
      confirmLabel: 'Approve all',
    }))) return
    const res = await run(async () => { const r = await approveMembers(ready.map(a => a.member.id), true); if (!r.ok) throw new Error(r.error); return r })
    if (res) feedback.report(res)
  }
  if (total === 0) {
    return (
      <div className="ui-card">
        <EmptyState icon={<Inbox size={22} />} title="You're all caught up">New member applications, role requests and sector moves will appear here.</EmptyState>
      </div>
    )
  }
  return (
    <div className="ui-stack">
      {applications.length > 0 && (
        <Section icon={<UserPlus size={18} />} title={`New member applications (${applications.length})`}
          description="People who set up their own account. Approving adds them to the roster with the roles they picked."
          action={applications.length > 1 ? <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={approveAll} disabled={pending}><CheckCheck size={15} /> Approve all</button> : null}>
          {applications.map(a => <ApplicationRow key={a.member.id} app={a} onResult={feedback.report} />)}
        </Section>
      )}
      {roleRequests.length > 0 && (
        <Section icon={<ShieldCheck size={18} />} title="Role requests" description="Approving grants the role immediately.">
          {roleRequests.map(r => <RoleRequestRow key={r.id} req={r} currentPms={r.sector ? pmBySector[r.sector] ?? [] : []} />)}
        </Section>
      )}
      {profileChanges.length > 0 && (
        <Section icon={<UserRound size={18} />} title="Change requests" description="Members asking to switch sectors. Approving moves them right away.">
          {profileChanges.map(c => <ProfileChangeRow key={c.id} change={c} />)}
        </Section>
      )}
      {feedback.links && <LinkResults result={feedback.links} onClose={feedback.clear} />}
    </div>
  )
}

function Section({ icon, title, description, action, children }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ui-card">
      <div className="ui-card-head"><div><h2>{icon} {title}</h2><p>{description}</p></div>{action}</div>
      <div>{children}</div>
    </section>
  )
}

function ReviewButtons({ onApprove, onDeny, pending, approveLabel = 'Approve' }: { onApprove: (note: string) => void; onDeny: (note: string) => void; pending: boolean; approveLabel?: string }) {
  const [note, setNote] = useState('')
  return (
    <div className="ui-row" style={{ marginTop: 12 }}>
      <input className="ui-input" style={{ flex: '1 1 220px', height: 34 }} placeholder="Optional note to the member" aria-label="Note" value={note} onChange={e => setNote(e.target.value)} />
      <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" disabled={pending} onClick={() => onApprove(note)}><Check size={15} /> {approveLabel}</button>
      <button type="button" className="ui-btn ui-btn-danger ui-btn-sm" disabled={pending} onClick={() => onDeny(note)}><X size={15} /> Deny</button>
    </div>
  )
}

const rowStyle: React.CSSProperties = { padding: '16px 20px', borderBottom: '1px solid #f0f1f4' }

function ApplicationRow({ app, onResult }: { app: Application; onResult: (r: Extract<ApproveResult, { ok: true }>) => void }) {
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  const [showBio, setShowBio] = useState(false)
  const m = app.member
  const verified = Boolean(m.user_id)
  const settingUp = verified && !m.onboarded_at

  async function approve(withRoles: boolean) {
    const res = await run(async () => { const r = await approveMembers([m.id], withRoles); if (!r.ok) throw new Error(r.error); return r })
    if (res) onResult(res)
  }
  async function deny() {
    if (!(await confirm({ title: `Deny ${m.name}?`, body: 'Their application and login are removed. They can apply again later.', confirmLabel: 'Deny', danger: true }))) return
    await run(async () => { const r = await denyApplication(m.id); if (!r.ok) throw new Error(r.error) }, { success: 'Application denied' })
  }

  return (
    <div style={rowStyle}>
      <div className="ui-spread" style={{ alignItems: 'flex-start' }}>
        <div className="ui-row" style={{ flexWrap: 'nowrap', gap: 12, alignItems: 'flex-start' }}>
          <Avatar name={m.name} url={m.headshot_url} size="lg" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 650, color: 'var(--ui-ink)' }}>{m.name}</div>
            <div className="ui-small ui-muted">{m.email} · {m.sector}{m.class_year ? ` · Class of ${m.class_year}` : ''}</div>
            <div className="ui-row" style={{ gap: 6, marginTop: 6 }}>
              {verified ? <Badge tone="green"><BadgeCheck size={12} /> Email verified</Badge> : <Badge tone="amber">Email not verified</Badge>}
              {settingUp && <Badge tone="amber">Still setting up</Badge>}
              {app.internal?.leadership_interest && <Badge tone="blue">Leadership interest</Badge>}
              {app.internal?.abroad_term && <Badge tone="blue">Abroad {app.internal.abroad_term}</Badge>}
            </div>
          </div>
        </div>
        <span className="ui-small ui-muted"><TimeAgo iso={m.created_at} /></span>
      </div>

      <div className="ui-row" style={{ gap: 6, marginTop: 12 }}>
        <span className="ui-small">Roles:</span>
        <Badge tone="navy">Analyst</Badge>
        {app.requests.map(r => <Badge key={`${r.role}${r.sector}`} tone="red">{ROLES[r.role].label}{r.sector ? ` · ${r.sector}` : ''}</Badge>)}
      </div>
      {app.internal?.notes && <p className="ui-small" style={{ marginTop: 8, whiteSpace: 'pre-line' }}>“{app.internal.notes}”</p>}
      {app.internal?.leadership_note && <p className="ui-small ui-muted" style={{ marginTop: 6 }}>Leadership: {app.internal.leadership_note}</p>}
      {m.bio && (
        <p className="ui-small" style={{ marginTop: 8, whiteSpace: 'pre-line', color: 'var(--ui-text)' }}>
          {showBio || m.bio.length <= 180 ? m.bio : `${m.bio.slice(0, 180)}… `}
          {m.bio.length > 180 && <button type="button" className="login-text-btn" onClick={() => setShowBio(b => !b)}>{showBio ? ' Show less' : 'Read more'}</button>}
        </p>
      )}

      <div className="ui-row" style={{ marginTop: 12 }}>
        <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" disabled={pending || settingUp} onClick={() => approve(true)}
          title={settingUp ? 'Wait until they finish setting up' : undefined}>
          <Check size={15} /> {app.requests.length ? `Approve + ${app.requests.length} role${app.requests.length === 1 ? '' : 's'}` : 'Approve'}
        </button>
        {app.requests.length > 0 && <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" disabled={pending || settingUp} onClick={() => approve(false)}>Analyst only</button>}
        <button type="button" className="ui-btn ui-btn-danger ui-btn-sm" disabled={pending} onClick={deny}><X size={15} /> Deny</button>
      </div>
    </div>
  )
}

function RoleRequestRow({ req, currentPms }: { req: RoleReq; currentPms: string[] }) {
  const { run, pending } = useMutation()
  const review = (approve: boolean) => (note: string) =>
    run(async () => {
      const { error } = await createClient().rpc('review_role_request', { p_id: req.id, p_approve: approve, p_note: note || null })
      if (error) throw new Error(error.message)
    }, { success: approve ? 'Role granted' : 'Request denied' })

  return (
    <div style={rowStyle}>
      <div className="ui-spread" style={{ alignItems: 'flex-start' }}>
        <div className="ui-row" style={{ flexWrap: 'nowrap', gap: 12 }}>
          <Avatar name={req.member?.name ?? '?'} url={req.member?.headshot_url} />
          <div>
            <div style={{ fontWeight: 650, color: 'var(--ui-ink)' }}>{req.member?.name}</div>
            <div className="ui-small ui-muted">{req.member?.title ?? 'Analyst'} · {req.member?.sector}</div>
          </div>
        </div>
        <span className="ui-small ui-muted"><TimeAgo iso={req.created_at} /></span>
      </div>
      <div className="ui-row" style={{ marginTop: 10 }}>
        <span className="ui-small">Requests</span>
        <Badge tone="red">{ROLES[req.role].label}{req.sector ? ` · ${req.sector}` : ''}</Badge>
        {req.role === 'portfolio_manager' && currentPms.length > 0 && <span className="ui-small ui-muted">Current PM: {currentPms.join(', ')}</span>}
      </div>
      {req.note && <p className="ui-small" style={{ marginTop: 8, whiteSpace: 'pre-line' }}>“{req.note}”</p>}
      <ReviewButtons pending={pending} onApprove={review(true)} onDeny={review(false)} />
    </div>
  )
}

function ProfileChangeRow({ change }: { change: Change }) {
  const { run, pending } = useMutation()
  const m = change.member
  const review = (approve: boolean) => (note: string) =>
    run(async () => {
      const { error } = await createClient().rpc('review_profile_change', { p_id: change.id, p_approve: approve, p_note: note || null })
      if (error) throw new Error(error.message)
    }, { success: approve ? 'Profile updated on the website' : 'Update denied' })

  const keys = (Object.keys(FIELD) as (keyof ProfileFields)[]).filter(k => k in change.changes)
  const show = (k: keyof ProfileFields, v: string | null | undefined) => {
    if (k === 'headshot_url') {
      // eslint-disable-next-line @next/next/no-img-element
      return v ? <img src={v} alt="" /> : <span className="ui-muted">No photo</span>
    }
    return v ? v : <span className="ui-muted">(empty)</span>
  }

  return (
    <div style={rowStyle}>
      <div className="ui-spread" style={{ alignItems: 'flex-start', marginBottom: 10 }}>
        <div className="ui-row" style={{ flexWrap: 'nowrap', gap: 12 }}>
          <Avatar name={m?.name ?? '?'} url={m?.headshot_url} />
          <div>
            <div style={{ fontWeight: 650, color: 'var(--ui-ink)' }}>{m?.name}</div>
            <div className="ui-small ui-muted">{m?.title ?? 'Analyst'} · {m?.sector}</div>
          </div>
        </div>
        <span className="ui-small ui-muted"><TimeAgo iso={change.created_at} /></span>
      </div>
      <div className="diff">
        <div className="head">Field</div><div className="head">Now</div><div className="head">Proposed</div>
        {keys.map(k => (
          <div key={k} style={{ display: 'contents' }}>
            <div className="k">{FIELD[k]}</div>
            <div className="old">{show(k, m?.[k] as string | null)}</div>
            <div className="new">{show(k, change.changes[k] as string | undefined)}</div>
          </div>
        ))}
      </div>
      <ReviewButtons pending={pending} onApprove={review(true)} onDeny={review(false)} />
    </div>
  )
}
