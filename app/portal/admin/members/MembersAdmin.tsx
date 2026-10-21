'use client'
import { useMemo, useState } from 'react'
import { Archive, ArchiveRestore, KeyRound, Pencil, Plus, Search, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROLES } from '@/lib/roles'
import { pct } from '@/lib/format'
import type { Member, MemberStatus, Role, RoleGrant, SectorKind } from '@/lib/types'
import { Avatar } from '@/components/portal/Avatar'
import { ImageUpload } from '@/components/portal/ImageUpload'
import { Menu } from '@/components/portal/Menu'
import { Modal } from '@/components/portal/Modal'
import { must, useConfirm, useMutation, useToast } from '@/components/portal/feedback'
import { Badge, EmptyState, Notice } from '@/components/portal/ui'
import { LinkResults } from '@/components/portal/LinkResults'
import { addMembers, approveMembers, sendSignInLink, sendSignInLinks, type BulkLinkResult, type NewMember } from '../actions'

export type AdminRow = { member: Member; roles: RoleGrant[]; attendance: number | null }
type SectorInfo = { name: string; slug: string; kind: SectorKind }

const ROLE_ORDER: Role[] = ['admin', 'portfolio_manager', 'ppg_manager', 'ppg_member', 'marketing', 'recruiting', 'donor_relations']

function accountState(m: Member) {
  if (!m.email) return { key: 'no-email', label: 'No email', tone: 'red' as const }
  if (m.user_id) return { key: 'activated', label: 'Activated', tone: 'green' as const }
  return { key: 'not-activated', label: 'Not activated', tone: 'amber' as const }
}

export default function MembersAdmin({ rows, sectors, initialAccount, canSendLinks, emailConfigured, viewerId }: {
  rows: AdminRow[]
  sectors: SectorInfo[]
  initialAccount: string
  canSendLinks: boolean
  emailConfigured: boolean
  viewerId: string
}) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<MemberStatus | 'all'>('active')
  const [sector, setSector] = useState('all')
  const [role, setRole] = useState('all')
  const [account, setAccount] = useState(initialAccount)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<AdminRow | null>(null)
  const [rolesFor, setRolesFor] = useState<AdminRow | null>(null)
  const [adding, setAdding] = useState(false)
  const [linkResult, setLinkResult] = useState<BulkLinkResult | null>(null)
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  const toast = useToast()

  const filtered = useMemo(() => rows.filter(({ member: m, roles }) => {
    if (status !== 'all' && m.status !== status) return false
    if (sector !== 'all' && m.sector !== sector) return false
    if (role === 'none' && roles.length) return false
    if (role !== 'all' && role !== 'none' && !roles.some(r => r.role === role)) return false
    if (account === 'no-year' ? m.class_year : account !== 'all' && accountState(m).key !== account) return false
    const s = q.trim().toLowerCase()
    return !s || m.name.toLowerCase().includes(s) || (m.email ?? '').includes(s) || (m.title ?? '').toLowerCase().includes(s)
  }), [rows, status, sector, role, account, q])

  const allChecked = filtered.length > 0 && filtered.every(r => selected.has(r.member.id))
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  async function linkOne(r: AdminRow) {
    const res = await run(async () => { const x = await sendSignInLink(r.member.id); if (!x.ok) throw new Error(x.error); return x }, { refresh: false })
    if (!res) return
    if (res.delivery.sent) toast.success(`Sign-in email sent to ${r.member.name}`)
    else setLinkResult({ ok: true, sent: 0, failed: [], links: [{ name: r.member.name, email: r.member.email!, url: res.delivery.url }] })
  }

  async function linkSelected() {
    const ids = rows.filter(r => selected.has(r.member.id) && r.member.status === 'active' && r.member.email).map(r => r.member.id)
    if (ids.length === 0) return toast.error('Select active members who have an email.')
    const res = await run(async () => { const x = await sendSignInLinks(ids); if (!x.ok) throw new Error(x.error); return x }, { refresh: false })
    if (!res) return
    if (res.links.length || res.failed.length) setLinkResult(res)
    else toast.success(`Sent ${res.sent} sign-in email${res.sent === 1 ? '' : 's'}`)
  }

  async function setMemberStatus(ids: string[], next: MemberStatus) {
    const names = rows.filter(r => ids.includes(r.member.id)).map(r => r.member.name)
    if (next === 'alumni' && !(await confirm({
      title: `Move ${ids.length === 1 ? names[0] : `${ids.length} members`} to alumni?`,
      body: 'They are hidden from the website, lose all roles, and can no longer use the portal. You can restore them later.',
      confirmLabel: 'Move to alumni', danger: true,
    }))) return
    await run(async () => {
      const supabase = createClient()
      if (next === 'alumni') {
        const { error } = await supabase.rpc('graduate_members', { p_ids: ids })
        if (error) throw new Error(error.message)
      } else {
        must(await supabase.from('members_directory').update({ status: next, is_public: true }).in('id', ids))
      }
    }, { success: next === 'alumni' ? 'Moved to alumni' : 'Restored to active' })
    setSelected(new Set())
  }

  async function approvePending(r: AdminRow) {
    const res = await run(async () => { const x = await approveMembers([r.member.id], true); if (!x.ok) throw new Error(x.error); return x }, { success: `${r.member.name} approved` })
    if (res?.links.length) setLinkResult({ ok: true, sent: res.emailed, links: res.links, failed: res.failed })
  }

  async function remove(r: AdminRow) {
    if (!(await confirm({ title: `Permanently delete ${r.member.name}?`, body: 'This removes their profile, tasks and attendance history. Archiving as alumni is usually better.', confirmLabel: 'Delete forever', danger: true }))) return
    await run(async () => must(await createClient().from('members_directory').delete().eq('id', r.member.id)), { success: 'Member deleted' })
  }

  const counts = { active: rows.filter(r => r.member.status === 'active').length, pending: rows.filter(r => r.member.status === 'pending').length, alumni: rows.filter(r => r.member.status === 'alumni').length }

  return (
    <section className="ui-card">
      <div className="ui-card-head" style={{ flexWrap: 'wrap' }}>
        <div className="ui-row">
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--ui-faint)' }} />
            <input className="ui-input" style={{ paddingLeft: 32, width: 200 }} placeholder="Search" aria-label="Search members" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <select className="ui-select" style={{ width: 'auto' }} aria-label="Status" value={status} onChange={e => setStatus(e.target.value as MemberStatus | 'all')}>
            <option value="active">Active ({counts.active})</option>
            <option value="pending">Pending ({counts.pending})</option>
            <option value="alumni">Alumni ({counts.alumni})</option>
            <option value="all">Everyone</option>
          </select>
          <select className="ui-select" style={{ width: 'auto' }} aria-label="Sector" value={sector} onChange={e => setSector(e.target.value)}>
            <option value="all">All sectors</option>
            {sectors.map(s => <option key={s.name}>{s.name}</option>)}
          </select>
          <select className="ui-select" style={{ width: 'auto' }} aria-label="Role" value={role} onChange={e => setRole(e.target.value)}>
            <option value="all">Any role</option>
            {ROLE_ORDER.map(r => <option key={r} value={r}>{ROLES[r].label}</option>)}
            <option value="none">Analysts only</option>
          </select>
          <select className="ui-select" style={{ width: 'auto' }} aria-label="Account" value={account} onChange={e => setAccount(e.target.value)}>
            <option value="all">Any account</option>
            <option value="activated">Activated</option>
            <option value="not-activated">Not activated</option>
            <option value="no-email">No email</option>
            <option value="no-year">No graduation year</option>
          </select>
        </div>
        <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setAdding(true)}><UserPlus size={15} /> Add members</button>
      </div>

      {selected.size > 0 && (
        <div className="ui-row" style={{ padding: '10px 20px', background: '#f6f8fd', borderBottom: '1px solid var(--ui-line)' }}>
          <strong className="ui-small">{selected.size} selected</strong>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={linkSelected} disabled={pending || !canSendLinks} title={canSendLinks ? undefined : 'Needs SUPABASE_SERVICE_ROLE_KEY'}>
            <KeyRound size={14} /> {emailConfigured ? 'Email sign-in links' : 'Get sign-in links'}
          </button>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setMemberStatus([...selected], 'alumni')} disabled={pending}><Archive size={14} /> Move to alumni</button>
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={22} />} title="No members match these filters" />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" aria-label="Select all" checked={allChecked} onChange={() => setSelected(allChecked ? new Set() : new Set(filtered.map(r => r.member.id)))} />
                </th>
                <th>Member</th><th>Sector</th><th>Roles</th><th>Account</th><th className="num">Attendance</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const m = r.member
                const acct = accountState(m)
                return (
                  <tr key={m.id}>
                    <td><input type="checkbox" aria-label={`Select ${m.name}`} checked={selected.has(m.id)} onChange={() => toggle(m.id)} /></td>
                    <td>
                      <div className="ui-row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                        <Avatar name={m.name} url={m.headshot_url} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{m.name}{m.status !== 'active' && <> <Badge tone={m.status === 'pending' ? 'amber' : 'gray'}>{m.status}</Badge></>}</div>
                          <div className="ui-small ui-muted">{m.title ?? 'Analyst'}{m.class_year ? ` · ’${String(m.class_year).slice(2)}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="nowrap ui-small">{m.sector}</td>
                    <td>
                      <div className="ui-row" style={{ gap: 4 }}>
                        {r.roles.length === 0 ? <span className="ui-small ui-muted">Analyst</span> : r.roles.map(g => (
                          <Badge key={`${g.role}${g.sector}`} tone={g.role === 'admin' ? 'red' : 'gray'}>{g.role === 'portfolio_manager' ? `PM · ${g.sector}` : ROLES[g.role].short}</Badge>
                        ))}
                      </div>
                    </td>
                    <td><Badge tone={acct.tone}>{acct.label}</Badge><div className="ui-small ui-muted" style={{ marginTop: 2 }}>{m.email ?? ''}</div></td>
                    <td className="num">{r.attendance === null ? '—' : pct(r.attendance, 0, false)}</td>
                    <td>
                      <Menu label={`Actions for ${m.name}`}>
                        {close => (
                          <>
                            <button type="button" role="menuitem" onClick={() => { close(); setEditing(r) }}><Pencil size={15} /> Edit profile</button>
                            {m.status === 'active' && <button type="button" role="menuitem" onClick={() => { close(); setRolesFor(r) }}><ShieldCheck size={15} /> Roles &amp; title</button>}
                            {m.status === 'active' && m.email && (
                              <button type="button" role="menuitem" disabled={!canSendLinks} onClick={() => { close(); linkOne(r) }}>
                                <KeyRound size={15} /> {m.user_id ? 'Send password reset' : 'Send sign-in link'}
                              </button>
                            )}
                            <hr />
                            {m.status === 'active'
                              ? m.id !== viewerId && <button type="button" role="menuitem" onClick={() => { close(); setMemberStatus([m.id], 'alumni') }}><Archive size={15} /> Move to alumni</button>
                              : m.status === 'pending'
                                ? <button type="button" role="menuitem" onClick={() => { close(); approvePending(r) }}><ArchiveRestore size={15} /> Approve with requested roles</button>
                                : <button type="button" role="menuitem" onClick={() => { close(); setMemberStatus([m.id], 'active') }}><ArchiveRestore size={15} /> Restore to active</button>}
                            {m.status !== 'active' && <button type="button" role="menuitem" className="danger" onClick={() => { close(); remove(r) }}><Trash2 size={15} /> Delete</button>}
                          </>
                        )}
                      </Menu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!canSendLinks && (
        <div style={{ padding: '12px 20px' }}>
          <Notice tone="warn">Sign-in links are off until <code className="ui-code">SUPABASE_SERVICE_ROLE_KEY</code> is added in Vercel (SETUP.md, step 3). Members can still sign in once they have a password.</Notice>
        </div>
      )}

      {editing && <EditMember row={editing} sectors={sectors} onClose={() => setEditing(null)} />}
      {rolesFor && <RolesEditor row={rolesFor} sectors={sectors} onClose={() => setRolesFor(null)} />}
      {adding && <AddMembers sectors={sectors} canSendLinks={canSendLinks} emailConfigured={emailConfigured} onDone={res => { setAdding(false); if (res) setLinkResult(res) }} onClose={() => setAdding(false)} />}
      {linkResult && linkResult.ok && <LinkResults result={linkResult} onClose={() => setLinkResult(null)} />}
    </section>
  )
}

function EditMember({ row, sectors, onClose }: { row: AdminRow; sectors: SectorInfo[]; onClose: () => void }) {
  const m = row.member
  const [f, setF] = useState({
    name: m.name, email: m.email ?? '', title: m.title ?? '', sector: m.sector, class_year: m.class_year ? String(m.class_year) : '',
    linkedin_url: m.linkedin_url ?? '', bio: m.bio ?? '', headshot_url: m.headshot_url ?? '', is_public: m.is_public, sort_order: String(m.sort_order ?? 0),
  })
  const { run, pending } = useMutation()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(async () => must(await createClient().from('members_directory').update({
      name: f.name.trim(), email: f.email.trim().toLowerCase() || null, title: f.title.trim() || null, sector: f.sector,
      class_year: f.class_year ? Number(f.class_year) : null, linkedin_url: f.linkedin_url.trim() || null, bio: f.bio.trim() || null,
      headshot_url: f.headshot_url || null, is_public: f.is_public, sort_order: Number(f.sort_order) || 0,
    }).eq('id', m.id)), { success: 'Profile saved' })
    if (ok) onClose()
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title={`Edit ${m.name}`} description="Changes go live immediately (no approval needed for co-presidents)." wide
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="edit-member" className="ui-btn ui-btn-primary" disabled={pending || !f.name.trim()}>{pending ? 'Saving…' : 'Save'}</button>
      </>}>
      <form id="edit-member" onSubmit={save} className="ui-form">
        <ImageUpload value={f.headshot_url} onChange={v => setF(x => ({ ...x, headshot_url: v }))} bucket="headshots" pathPrefix={`members/${m.id}/`} maxSize={900} label="Upload photo" />
        <div className="ui-form-grid">
          <div className="ui-field"><label htmlFor="em-name">Name</label><input id="em-name" className="ui-input" required value={f.name} onChange={set('name')} /></div>
          <div className="ui-field">
            <label htmlFor="em-email">Email (used to sign in)</label>
            <input id="em-email" className="ui-input" type="email" value={f.email} onChange={set('email')} />
            {m.user_id && f.email.trim().toLowerCase() !== (m.email ?? '') && <span className="ui-hint" style={{ color: 'var(--ui-amber)' }}>Their existing login stays linked; this only changes the contact email.</span>}
          </div>
          <div className="ui-field"><label htmlFor="em-title">Title</label><input id="em-title" className="ui-input" value={f.title} onChange={set('title')} placeholder={`${f.sector} Analyst`} /></div>
          <div className="ui-field">
            <label htmlFor="em-sector">Sector</label>
            <select id="em-sector" className="ui-select" value={f.sector} onChange={set('sector')}>{sectors.map(s => <option key={s.name}>{s.name}</option>)}</select>
          </div>
          <div className="ui-field"><label htmlFor="em-year">Graduation year</label><input id="em-year" className="ui-input" inputMode="numeric" value={f.class_year} onChange={set('class_year')} /></div>
          <div className="ui-field"><label htmlFor="em-order">Order on sector page</label><input id="em-order" className="ui-input" type="number" value={f.sort_order} onChange={set('sort_order')} /><span className="ui-hint">Lower numbers show first (PMs usually 0).</span></div>
          <div className="ui-field span-2"><label htmlFor="em-li">LinkedIn</label><input id="em-li" className="ui-input" value={f.linkedin_url} onChange={set('linkedin_url')} /></div>
          <div className="ui-field span-2"><label htmlFor="em-bio">Bio</label><textarea id="em-bio" className="ui-textarea" rows={6} value={f.bio} onChange={set('bio')} /></div>
        </div>
        <label className="ui-check"><input type="checkbox" checked={f.is_public} onChange={e => setF(x => ({ ...x, is_public: e.target.checked }))} /> Show on the public website</label>
      </form>
    </Modal>
  )
}

function RolesEditor({ row, sectors, onClose }: { row: AdminRow; sectors: SectorInfo[]; onClose: () => void }) {
  const m = row.member
  const investment = sectors.filter(s => s.kind === 'investment').map(s => s.name)
  const has = (r: Role, s: string | null = null) => row.roles.some(g => g.role === r && (g.sector ?? null) === s)
  const [flags, setFlags] = useState<Record<string, boolean>>(() => Object.fromEntries(
    [...ROLE_ORDER.filter(r => r !== 'portfolio_manager').map(r => [r, has(r)]), ...investment.map(s => [`pm:${s}`, has('portfolio_manager', s)])]))
  const [retitle, setRetitle] = useState(true)
  const { run, pending } = useMutation()

  async function save() {
    const changes: Record<string, unknown>[] = []
    for (const r of ROLE_ORDER.filter(r => r !== 'portfolio_manager')) {
      if (flags[r] && !has(r)) changes.push({ op: 'grant', member_id: m.id, role: r })
      if (!flags[r] && has(r)) changes.push({ op: 'revoke', member_id: m.id, role: r })
    }
    const pmNow = investment.filter(s => flags[`pm:${s}`])
    for (const s of investment) {
      if (flags[`pm:${s}`] && !has('portfolio_manager', s)) changes.push({ op: 'grant', member_id: m.id, role: 'portfolio_manager', sector: s })
      if (!flags[`pm:${s}`] && has('portfolio_manager', s)) changes.push({ op: 'revoke', member_id: m.id, role: 'portfolio_manager', sector: s })
    }
    const pmChanged = investment.some(s => flags[`pm:${s}`] !== has('portfolio_manager', s))
    if (retitle && pmChanged && !flags.admin) {
      changes.push({ op: 'title', member_id: m.id, title: pmNow.length ? `${pmNow[0]} Portfolio Manager` : `${m.sector} Analyst` })
    }
    if (changes.length === 0) return onClose()
    const ok = await run(async () => {
      const { error } = await createClient().rpc('apply_role_changes', { p_changes: changes })
      if (error) throw new Error(error.message)
      return true
    }, { success: 'Roles updated' })
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Roles for ${m.name}`} description="Every member is an Analyst. Add roles to unlock workspaces."
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="ui-btn ui-btn-primary" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save roles'}</button>
      </>}>
      <div className="ui-stack" style={{ gap: 14 }}>
        {ROLE_ORDER.filter(r => r !== 'portfolio_manager').map(r => (
          <label key={r} className="ui-check">
            <input type="checkbox" checked={flags[r]} onChange={e => setFlags(x => ({ ...x, [r]: e.target.checked }))} />
            <span><strong>{ROLES[r].label}</strong><br /><span className="ui-small ui-muted">{ROLES[r].description}</span></span>
          </label>
        ))}
        <div>
          <div className="ui-label">Portfolio Manager of…</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6, marginTop: 6 }}>
            {investment.map(s => (
              <label key={s} className="ui-check" style={{ alignItems: 'center' }}>
                <input type="checkbox" checked={flags[`pm:${s}`]} onChange={e => setFlags(x => ({ ...x, [`pm:${s}`]: e.target.checked }))} style={{ marginTop: 0 }} /> {s}
              </label>
            ))}
          </div>
        </div>
        <label className="ui-check"><input type="checkbox" checked={retitle} onChange={e => setRetitle(e.target.checked)} /> Update their public title when PM changes (e.g. “Consumers Portfolio Manager”)</label>
      </div>
    </Modal>
  )
}

function parseRows(text: string, sectors: SectorInfo[]) {
  const find = (raw: string) => {
    const v = raw.trim().toLowerCase()
    return sectors.find(s => s.name.toLowerCase() === v || s.slug === v)?.name
      ?? sectors.find(s => s.name.toLowerCase().startsWith(v) || v.startsWith(s.name.toLowerCase().split(' ')[0]))?.name
  }
  const rows: NewMember[] = []
  const errors: string[] = []
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach((line, i) => {
    const parts = (line.includes('\t') ? line.split('\t') : line.split(',')).map(p => p.trim())
    const [name, email, sectorRaw, yearRaw, title] = parts
    if (/^name$/i.test(name ?? '')) return // header row
    const sector = sectorRaw ? find(sectorRaw) : undefined
    if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push(`Line ${i + 1}: needs a name and a valid email`)
    else if (!sector) errors.push(`Line ${i + 1}: unknown sector "${sectorRaw ?? ''}"`)
    else rows.push({ name, email, sector, class_year: yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null, title })
  })
  return { rows, errors }
}

function AddMembers({ sectors, canSendLinks, emailConfigured, onDone, onClose }: {
  sectors: SectorInfo[]; canSendLinks: boolean; emailConfigured: boolean
  onDone: (links: BulkLinkResult | null) => void; onClose: () => void
}) {
  const [mode, setMode] = useState<'one' | 'many'>('one')
  const [one, setOne] = useState({ name: '', email: '', sector: sectors.find(s => s.kind === 'investment')?.name ?? sectors[0].name, class_year: '', title: '' })
  const [text, setText] = useState('')
  const [sendLinks, setSendLinks] = useState(canSendLinks)
  const { run, pending } = useMutation()
  const toast = useToast()
  const parsed = useMemo(() => parseRows(text, sectors), [text, sectors])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const rows: NewMember[] = mode === 'one'
      ? [{ name: one.name.trim(), email: one.email.trim(), sector: one.sector, class_year: one.class_year ? Number(one.class_year) : null, title: one.title }]
      : parsed.rows
    const res = await run(async () => { const r = await addMembers(rows, sendLinks && canSendLinks); if (!r.ok) throw new Error(r.error); return r })
    if (!res) return
    toast.success(`Added ${res.added} member${res.added === 1 ? '' : 's'}${res.skipped.length ? ` · ${res.skipped.length} already on the roster` : ''}`)
    onDone(res.links && res.links.ok && (res.links.links.length || res.links.failed.length) ? res.links : null)
  }

  return (
    <Modal open onClose={onClose} title="Add members" wide
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="add-members" className="ui-btn ui-btn-primary"
          disabled={pending || (mode === 'one' ? !one.name.trim() || !one.email.trim() : parsed.rows.length === 0)}>
          <Plus size={15} /> {pending ? 'Adding…' : mode === 'one' ? 'Add member' : `Add ${parsed.rows.length}`}
        </button>
      </>}>
      <form id="add-members" onSubmit={submit} className="ui-form">
        <div className="ui-seg" style={{ alignSelf: 'flex-start' }}>
          <button type="button" className={mode === 'one' ? 'on' : ''} onClick={() => setMode('one')}>One person</button>
          <button type="button" className={mode === 'many' ? 'on' : ''} onClick={() => setMode('many')}>Paste a list</button>
        </div>
        {mode === 'one' ? (
          <div className="ui-form-grid">
            <div className="ui-field"><label htmlFor="am-name">Name</label><input id="am-name" className="ui-input" required value={one.name} onChange={e => setOne(x => ({ ...x, name: e.target.value }))} /></div>
            <div className="ui-field"><label htmlFor="am-email">School email</label><input id="am-email" className="ui-input" type="email" required value={one.email} onChange={e => setOne(x => ({ ...x, email: e.target.value }))} /></div>
            <div className="ui-field">
              <label htmlFor="am-sector">Sector</label>
              <select id="am-sector" className="ui-select" value={one.sector} onChange={e => setOne(x => ({ ...x, sector: e.target.value }))}>{sectors.map(s => <option key={s.name}>{s.name}</option>)}</select>
            </div>
            <div className="ui-field"><label htmlFor="am-year">Graduation year</label><input id="am-year" className="ui-input" inputMode="numeric" value={one.class_year} onChange={e => setOne(x => ({ ...x, class_year: e.target.value }))} /></div>
            <div className="ui-field span-2"><label htmlFor="am-title">Title <span className="ui-muted">(optional)</span></label><input id="am-title" className="ui-input" value={one.title} onChange={e => setOne(x => ({ ...x, title: e.target.value }))} placeholder={`${one.sector} Analyst`} /></div>
          </div>
        ) : (
          <div className="ui-field">
            <label htmlFor="am-list">One person per line: <span className="ui-muted">Name, email, sector, graduation year</span></label>
            <textarea id="am-list" className="ui-textarea" rows={8} value={text} onChange={e => setText(e.target.value)}
              placeholder={'Jane Doe, jane.doe@student.fairfield.edu, Technology, 2029\nSam Smith, sam.smith@student.fairfield.edu, Healthcare, 2028'} />
            <span className="ui-hint">Tip: copy columns straight from a Google Sheet or Excel — tabs work too.</span>
            {text.trim() && (
              <div className="ui-small" style={{ marginTop: 6 }}>
                <span style={{ color: 'var(--ui-green)', fontWeight: 600 }}>{parsed.rows.length} ready</span>
                {parsed.errors.length > 0 && <ul style={{ color: 'var(--ui-down)', margin: '6px 0 0 18px' }}>{parsed.errors.slice(0, 6).map(e => <li key={e}>{e}</li>)}</ul>}
              </div>
            )}
          </div>
        )}
        <label className="ui-check">
          <input type="checkbox" checked={sendLinks && canSendLinks} disabled={!canSendLinks} onChange={e => setSendLinks(e.target.checked)} />
          {emailConfigured ? 'Email them a link to set up their account now' : 'Create sign-up links I can share (email isn’t set up)'}
          {!canSendLinks && <span className="ui-muted"> — needs the service role key</span>}
        </label>
      </form>
    </Modal>
  )
}
