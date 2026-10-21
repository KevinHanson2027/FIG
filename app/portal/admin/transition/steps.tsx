'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Crown, GraduationCap, KeyRound, ListChecks, Plus, UserPlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Candidate, Member, MemberInternal, RecruitingSettings, Role, RoleGrant, TermSettings } from '@/lib/types'
import { Avatar } from '@/components/portal/Avatar'
import { LinkResults, type LinkList } from '@/components/portal/LinkResults'
import { must, useConfirm, useMutation, useToast } from '@/components/portal/feedback'
import { Badge, Card, EmptyState, Notice } from '@/components/portal/ui'
import { sendSignInLinks } from '../actions'
import { onboardCandidates } from '../../recruiting/actions'

// ── Step 1: graduate seniors ─────────────────────────────────────
export function GraduateStep({ year, graduating, missingYear, viewerId }: { year: number; graduating: Member[]; missingYear: Member[]; viewerId: string }) {
  const [chosen, setChosen] = useState<Set<string>>(new Set(graduating.map(m => m.id)))
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  useEffect(() => setChosen(new Set(graduating.map(m => m.id))), [graduating])

  async function graduate() {
    const ids = [...chosen]
    if (!(await confirm({
      title: `Move ${ids.length} member${ids.length === 1 ? '' : 's'} to alumni?`,
      body: 'They disappear from the website and lose their roles and portal access. Their profiles are kept, and you can restore anyone from Members & Roles.',
      confirmLabel: 'Graduate them', danger: true,
    }))) return
    await run(async () => {
      const { error } = await createClient().rpc('graduate_members', { p_ids: ids })
      if (error) throw new Error(/at least one active admin/i.test(error.message) ? 'That would leave FIG with no admin. Make the incoming co-presidents admins in step 2 first, then graduate yourself.' : error.message)
    }, { success: 'Congratulations, graduates! 🎓' })
  }

  return (
    <div className="ui-stack">
      <Card title={<><GraduationCap size={18} /> Class of {year}</>} description="Graduating members become alumni: hidden from the website, no roles, no portal access." tight>
        {graduating.length === 0 ? (
          <EmptyState title={`No active members in the class of ${year}`}>Pick another class above, or set graduation years in Members &amp; Roles.</EmptyState>
        ) : (
          <>
            <ul className="ui-list">
              {graduating.map(m => (
                <li key={m.id} className="ui-list-item">
                  <input type="checkbox" aria-label={`Graduate ${m.name}`} checked={chosen.has(m.id)}
                    onChange={() => setChosen(s => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n })} />
                  <Avatar name={m.name} url={m.headshot_url} size="sm" />
                  <div className="ui-list-main"><div className="ui-list-title">{m.name}{m.id === viewerId ? ' (you)' : ''}</div><div className="ui-list-sub">{m.title ?? 'Analyst'} · {m.sector}</div></div>
                </li>
              ))}
            </ul>
            <div className="ui-card-foot ui-spread">
              <span className="ui-small ui-muted">{chosen.size} selected. Uncheck anyone staying another semester.</span>
              <button type="button" className="ui-btn ui-btn-primary" onClick={graduate} disabled={pending || chosen.size === 0}><GraduationCap size={16} /> Graduate {chosen.size}</button>
            </div>
          </>
        )}
      </Card>
      {missingYear.length > 0 && (
        <Notice tone="warn">
          <strong>{missingYear.length} member{missingYear.length === 1 ? ' has' : 's have'} no graduation year:</strong>{' '}
          {missingYear.slice(0, 12).map(m => m.name).join(', ')}{missingYear.length > 12 ? '…' : ''}. Set it in <Link className="ui-link" href="/portal/admin/members?account=no-year">Members &amp; Roles</Link> so they show up here.
        </Notice>
      )}
    </div>
  )
}

// ── Step 2: leadership handoff ───────────────────────────────────
type Position = { key: string; label: string; role: Role; sector: string | null }

export function LeadershipStep({ members, roles, interested, investmentSectors, hasExecutiveBoard, viewerId }: {
  members: Member[]
  roles: (RoleGrant & { member_id: string })[]
  interested: MemberInternal[]
  investmentSectors: string[]
  hasExecutiveBoard: boolean
  viewerId: string
}) {
  const positions: Position[] = useMemo(() => [
    { key: 'admin', label: 'Co-Presidents (admins)', role: 'admin', sector: null },
    ...investmentSectors.map(s => ({ key: `pm:${s}`, label: `${s} PM`, role: 'portfolio_manager' as Role, sector: s })),
    { key: 'ppg_manager', label: 'PPG Manager', role: 'ppg_manager', sector: null },
    { key: 'marketing', label: 'Marketing', role: 'marketing', sector: null },
    { key: 'recruiting', label: 'Recruiting', role: 'recruiting', sector: null },
    { key: 'donor_relations', label: 'Donor Relations', role: 'donor_relations', sector: null },
  ], [investmentSectors])

  const initial = useMemo(() => Object.fromEntries(positions.map(p => [p.key,
    roles.filter(r => r.role === p.role && (r.sector ?? null) === p.sector).map(r => r.member_id)])), [positions, roles])
  const [assign, setAssign] = useState<Record<string, string[]>>(initial)
  const [retitle, setRetitle] = useState(true)
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  useEffect(() => setAssign(initial), [initial])

  const byId = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const interest = new Map(interested.map(i => [i.member_id, i]))
  const sortedMembers = [...members].sort((a, b) => Number(interest.has(b.id)) - Number(interest.has(a.id)) || a.name.localeCompare(b.name))

  const changes = useMemo(() => {
    const out: Record<string, unknown>[] = []
    const newTitle = new Map<string, string>()
    const newSector = new Map<string, string>()
    for (const p of positions) {
      const before = new Set(initial[p.key]), after = new Set(assign[p.key])
      for (const id of after) if (!before.has(id)) {
        out.push({ op: 'grant', member_id: id, role: p.role, sector: p.sector })
        if (p.role === 'portfolio_manager' && p.sector) { newTitle.set(id, `${p.sector} Portfolio Manager`); if (byId.get(id)?.sector !== p.sector) newSector.set(id, p.sector) }
        if (p.role === 'admin') { newTitle.set(id, 'Co-President'); if (hasExecutiveBoard) newSector.set(id, 'Executive Board') }
      }
      for (const id of before) if (!after.has(id)) {
        out.push({ op: 'revoke', member_id: id, role: p.role, sector: p.sector })
        // A PM stepping down (and not taking another leadership spot) goes back to analyst.
        if (p.role === 'portfolio_manager' && !newTitle.has(id)) {
          const stillLeads = positions.some(q => (q.role === 'admin' || q.role === 'portfolio_manager') && assign[q.key].includes(id))
          if (!stillLeads) newTitle.set(id, `${byId.get(id)?.sector ?? ''} Analyst`.trim())
        }
      }
    }
    if (retitle) {
      for (const [id, title] of newTitle) out.push({ op: 'title', member_id: id, title })
      for (const [id, sector] of newSector) out.push({ op: 'sector', member_id: id, sector })
    }
    return out
  }, [assign, initial, positions, retitle, byId, hasExecutiveBoard])

  const grantsAndRevokes = changes.filter(c => c.op === 'grant' || c.op === 'revoke').length
  const removingSelf = initial.admin.includes(viewerId) && !assign.admin.includes(viewerId)
  const inactiveAdmins = assign.admin.filter(id => !byId.get(id)?.user_id).map(id => byId.get(id)?.name ?? '')

  async function apply() {
    if (removingSelf && !(await confirm({ title: 'Remove yourself as an admin?', body: 'You will lose access to the Control Panel as soon as this is applied.', confirmLabel: 'Yes, hand it over', danger: true }))) return
    await run(async () => {
      const { error } = await createClient().rpc('apply_role_changes', { p_changes: changes })
      if (error) throw new Error(error.message)
    }, { success: `Applied ${grantsAndRevokes} role change${grantsAndRevokes === 1 ? '' : 's'}` })
  }

  return (
    <div className="ui-grid ui-grid-main">
      <Card title={<><Crown size={18} /> Positions</>} description="Changes are staged until you press Apply." tight
        footer={
          <div className="ui-spread">
            <label className="ui-check" style={{ alignItems: 'center' }}>
              <input type="checkbox" checked={retitle} onChange={e => setRetitle(e.target.checked)} style={{ marginTop: 0 }} />
              Update public titles &amp; sectors (e.g. “Technology Portfolio Manager”)
            </label>
            <div className="ui-row">
              <button type="button" className="ui-btn ui-btn-ghost" onClick={() => setAssign(initial)} disabled={pending || grantsAndRevokes === 0}>Undo</button>
              <button type="button" className="ui-btn ui-btn-primary" onClick={apply} disabled={pending || grantsAndRevokes === 0 || assign.admin.length === 0}>
                Apply {grantsAndRevokes || ''} change{grantsAndRevokes === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        }>
        <ul className="ui-list">
          {positions.map(p => (
            <li key={p.key} className="ui-list-item" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ width: 170, flexShrink: 0, fontWeight: 600, color: 'var(--ui-ink)', fontSize: '0.875rem', paddingTop: 6 }}>{p.label}</div>
              <div className="ui-row" style={{ flex: 1, minWidth: 220, gap: 6 }}>
                {assign[p.key].map(id => (
                  <span key={id} className="ui-chip" style={{ cursor: 'default', background: initial[p.key].includes(id) ? '#fff' : '#eef6ee', borderColor: initial[p.key].includes(id) ? undefined : '#bfe6cc' }}>
                    {byId.get(id)?.name ?? 'Former member'}
                    <button type="button" aria-label={`Remove ${byId.get(id)?.name}`} onClick={() => setAssign(a => ({ ...a, [p.key]: a[p.key].filter(x => x !== id) }))}
                      style={{ border: 0, background: 'none', cursor: 'pointer', display: 'inline-flex', padding: 0, color: 'var(--ui-muted)' }}><X size={14} /></button>
                  </span>
                ))}
                <select className="ui-select" style={{ width: 220, height: 32, fontSize: '0.8125rem' }} aria-label={`Add ${p.label}`} value=""
                  onChange={e => { const id = e.target.value; if (id) setAssign(a => ({ ...a, [p.key]: [...new Set([...a[p.key], id])] })) }}>
                  <option value="">+ Add…</option>
                  {sortedMembers.filter(m => !assign[p.key].includes(m.id)).map(m => (
                    <option key={m.id} value={m.id}>{interest.has(m.id) ? '★ ' : ''}{m.name} — {m.sector}</option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <div className="ui-stack">
        {assign.admin.length === 0 && <Notice tone="error">Choose at least one co-president — FIG always needs an admin.</Notice>}
        {inactiveAdmins.length > 0 && <Notice tone="warn"><strong>{inactiveAdmins.join(', ')}</strong> {inactiveAdmins.length === 1 ? "hasn't" : "haven't"} activated an account yet. Send sign-in links in step 3 so they can get into the Control Panel.</Notice>}
        {removingSelf && <Notice tone="warn">You&apos;re removing yourself as an admin. Do this last, after the new co-presidents have signed in.</Notice>}
        <Card title={<>★ Interested in leadership ({interested.length})</>} description="From members' “My plans” on their profile." tight>
          {interested.length === 0 ? <EmptyState title="No one has raised their hand yet" /> : (
            <ul className="ui-list">
              {interested.map(i => {
                const m = byId.get(i.member_id)
                if (!m) return null
                return (
                  <li key={i.member_id} className="ui-list-item" style={{ alignItems: 'flex-start' }}>
                    <Avatar name={m.name} url={m.headshot_url} size="sm" />
                    <div className="ui-list-main">
                      <div className="ui-list-title">{m.name} <span className="ui-muted" style={{ fontWeight: 400 }}>· {m.sector}{m.class_year ? ` · ’${String(m.class_year).slice(2)}` : ''}</span></div>
                      {i.leadership_note && <div className="ui-list-sub" style={{ whiteSpace: 'pre-line' }}>{i.leadership_note}</div>}
                      {i.abroad_term && <Badge tone="blue">Abroad {i.abroad_term}</Badge>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// ── Step 3: new members ──────────────────────────────────────────
export function NewMembersStep({ candidates, sectors, notActivated, canSendLinks, emailConfigured }: {
  candidates: Candidate[]; sectors: string[]; notActivated: string[]; canSendLinks: boolean; emailConfigured: boolean
}) {
  const [sectorFor, setSectorFor] = useState<Record<string, string>>(() => Object.fromEntries(candidates.map(c => [c.id, c.sector_interest && sectors.includes(c.sector_interest) ? c.sector_interest : sectors[0]])))
  const [links, setLinks] = useState<LinkList | null>(null)
  const { run, pending } = useMutation()
  const toast = useToast()

  async function onboardAll() {
    const groups = new Map<string, string[]>()
    for (const c of candidates) groups.set(sectorFor[c.id], [...(groups.get(sectorFor[c.id]) ?? []), c.id])
    const res = await run(async () => {
      const collected: LinkList = { sent: 0, links: [], failed: [] }
      for (const [sector, ids] of groups) {
        const r = await onboardCandidates(ids, sector)
        if (!r.ok) throw new Error(r.error)
        for (const l of r.links) {
          if (l.delivery?.sent) collected.sent++
          else if (l.delivery) collected.links.push({ name: l.name, email: candidates.find(c => c.name === l.name)?.email ?? '', url: l.delivery.url })
        }
      }
      return collected
    }, { success: `Added ${candidates.length} new member${candidates.length === 1 ? '' : 's'}` })
    if (res && res.links.length) setLinks(res)
  }

  async function linkEveryone() {
    const res = await run(async () => { const r = await sendSignInLinks(notActivated); if (!r.ok) throw new Error(r.error); return r }, { refresh: false })
    if (!res) return
    if (res.links.length || res.failed.length) setLinks(res)
    else toast.success(`Emailed ${res.sent} sign-in link${res.sent === 1 ? '' : 's'}`)
  }

  return (
    <div className="ui-stack">
      <Card title={<><UserPlus size={18} /> Accepted from recruiting ({candidates.length})</>} description="Candidates marked Accepted who aren't on the roster yet. Pick a sector for each." tight>
        {candidates.length === 0 ? (
          <EmptyState title="No accepted candidates waiting">Mark candidates Accepted in Recruiting, or add people directly in <Link className="ui-link" href="/portal/admin/members">Members &amp; Roles</Link>.</EmptyState>
        ) : (
          <>
            <ul className="ui-list">
              {candidates.map(c => (
                <li key={c.id} className="ui-list-item" style={{ flexWrap: 'wrap' }}>
                  <div className="ui-list-main" style={{ minWidth: 180 }}><div className="ui-list-title">{c.name}</div><div className="ui-list-sub">{c.email}{c.class_year ? ` · Class of ${c.class_year}` : ''}</div></div>
                  <select className="ui-select" style={{ width: 220 }} aria-label={`Sector for ${c.name}`} value={sectorFor[c.id]} onChange={e => setSectorFor(s => ({ ...s, [c.id]: e.target.value }))}>
                    {sectors.map(s => <option key={s}>{s}</option>)}
                  </select>
                </li>
              ))}
            </ul>
            <div className="ui-card-foot ui-spread">
              <span className="ui-small ui-muted">{canSendLinks ? (emailConfigured ? 'Each new member gets an email to set up their account.' : "You'll get sign-up links to share.") : 'They can activate their accounts from the login page.'}</span>
              <button type="button" className="ui-btn ui-btn-primary" onClick={onboardAll} disabled={pending}><Plus size={16} /> Add {candidates.length} to the roster</button>
            </div>
          </>
        )}
      </Card>
      <Card title={<><KeyRound size={18} /> Accounts not activated ({notActivated.length})</>} description="Members on the roster who haven't set a password yet — including any new co-presidents.">
        {notActivated.length === 0 ? <p className="ui-small ui-muted">Everyone has activated their account. 🎉</p> : (
          <div className="ui-row">
            <button type="button" className="ui-btn ui-btn-secondary" onClick={linkEveryone} disabled={pending || !canSendLinks}>
              <KeyRound size={16} /> {emailConfigured ? `Email sign-in links to ${notActivated.length}` : `Get ${notActivated.length} sign-in links`}
            </button>
            {!canSendLinks && <span className="ui-small ui-muted">Needs SUPABASE_SERVICE_ROLE_KEY (SETUP.md, step 3).</span>}
          </div>
        )}
      </Card>
      {links && <LinkResults result={links} onClose={() => setLinks(null)} />}
    </div>
  )
}

// ── Step 4: new term ─────────────────────────────────────────────
const CHECKLIST = [
  'Incoming co-presidents are admins and have signed in (steps 2–3)',
  'Supabase project: add the incoming co-presidents (or a shared FIG account) as Owners — Dashboard → Organization → Team',
  'Vercel project and GitHub repository: add the incoming co-presidents',
  'Shared FIG Gmail (used for emails): pass on the login and update the App Password if it changed',
  'Read SETUP.md together so the new team knows where everything lives',
  'Outgoing co-presidents remove their own admin role (step 2) — last',
]

export function TermStep({ term, recruiting }: { term: TermSettings; recruiting: RecruitingSettings }) {
  const [t, setT] = useState(term)
  const [cycle, setCycle] = useState(recruiting.cycle)
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false))
  const { run, pending } = useMutation()

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('fig-handoff-checklist') ?? '[]'); if (Array.isArray(saved) && saved.length === CHECKLIST.length) setChecked(saved) } catch { /* private mode */ }
  }, [])
  function toggle(i: number) {
    setChecked(c => { const n = c.map((v, j) => (j === i ? !v : v)); try { localStorage.setItem('fig-handoff-checklist', JSON.stringify(n)) } catch { /* ignore */ }; return n })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const supabase = createClient()
      must(await supabase.from('settings').upsert({ key: 'term', value: { name: t.name.trim(), starts_on: t.starts_on } }, { onConflict: 'key' }))
      if (cycle.trim() !== recruiting.cycle) {
        must(await supabase.from('settings').upsert({ key: 'recruiting', is_public: true, value: { ...recruiting, cycle: cycle.trim(), applications_open: false } }, { onConflict: 'key' }))
      }
    }, { success: 'New term saved' })
  }

  return (
    <div className="ui-grid ui-grid-2">
      <Card title="New term" description="Attendance rates count meetings from the term start date.">
        <form onSubmit={save} className="ui-form">
          <div className="ui-form-grid">
            <div className="ui-field"><label htmlFor="ts-name">Term name</label><input id="ts-name" className="ui-input" required value={t.name} onChange={e => setT(x => ({ ...x, name: e.target.value }))} placeholder="Fall 2027" /></div>
            <div className="ui-field"><label htmlFor="ts-start">First day of classes</label><input id="ts-start" className="ui-input" type="date" required value={t.starts_on} onChange={e => setT(x => ({ ...x, starts_on: e.target.value }))} /></div>
          </div>
          <div className="ui-field">
            <label htmlFor="ts-cycle">Next recruiting cycle</label>
            <input id="ts-cycle" className="ui-input" value={cycle} onChange={e => setCycle(e.target.value)} placeholder="Spring 2028" />
            <span className="ui-hint">Changing it starts a fresh pipeline and closes applications until Recruiting reopens them.</span>
          </div>
          <div><button type="submit" className="ui-btn ui-btn-primary" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button></div>
        </form>
      </Card>
      <Card title={<><ListChecks size={18} /> Handoff checklist</>} description="Things the website can't do for you. Saved on this device.">
        <div className="ui-stack" style={{ gap: 10 }}>
          {CHECKLIST.map((item, i) => (
            <label key={item} className="ui-check">
              <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} />
              <span style={checked[i] ? { textDecoration: 'line-through', color: 'var(--ui-muted)' } : undefined}>{item}</span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  )
}
