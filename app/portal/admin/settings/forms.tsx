'use client'
import { useEffect, useState } from 'react'
import { GraduationCap, HeartHandshake, Layers, Pencil, Plus, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DonationSettings, Sector, SectorKind, SignupSettings } from '@/lib/types'
import { Avatar } from '@/components/portal/Avatar'
import { Modal } from '@/components/portal/Modal'
import { must, useConfirm, useMutation } from '@/components/portal/feedback'
import { Badge, Card } from '@/components/portal/ui'

export type Senior = { id: string; name: string; sector: string; title: string | null; class_year: number; headshot_url: string | null; admin: boolean }

/** Seniors are listed ahead of June 1; one click moves them to alumni. */
export function GraduationCard({ seniors, nextClass, missingYear, viewerId }: { seniors: Senior[]; nextClass: number; missingYear: number; viewerId: string }) {
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(seniors.map(m => m.id)))
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  useEffect(() => setChosen(new Set(seniors.map(m => m.id))), [seniors])
  const toggle = (id: string) => setChosen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  async function graduate() {
    const ids = [...chosen]
    if (!(await confirm({
      title: `Move ${ids.length} member${ids.length === 1 ? '' : 's'} to alumni?`,
      body: 'They disappear from the website and lose their roles and portal access. Their profiles are kept, and you can restore anyone from Members & roles.',
      confirmLabel: 'Graduate them', danger: true,
    }))) return
    await run(async () => {
      const { error } = await createClient().rpc('graduate_members', { p_ids: ids })
      if (error) throw new Error(/at least one active admin/i.test(error.message) ? 'That would leave FIG with no admin. Make the incoming co-presidents admins in Members & roles first, then graduate yourself.' : error.message)
    }, { success: 'Congratulations, graduates! 🎓' })
  }

  return (
    <Card title={<><GraduationCap size={18} /> Graduation &amp; handoff</>} description={`The class of ${nextClass} graduates in May. The term and recruiting cycle update on their own.`} tight>
      {seniors.length === 0 ? (
        <p className="ui-small ui-muted" style={{ padding: '4px 20px 16px' }}>No active members in the class of {nextClass} or earlier.</p>
      ) : (
        <>
          <ul className="ui-list">
            {seniors.map(m => (
              <li key={m.id} className="ui-list-item">
                <input type="checkbox" aria-label={`Graduate ${m.name}`} checked={chosen.has(m.id)} onChange={() => toggle(m.id)} />
                <Avatar name={m.name} url={m.headshot_url} size="sm" />
                <div className="ui-list-main">
                  <div className="ui-list-title">{m.name}{m.id === viewerId ? ' (you)' : ''}</div>
                  <div className="ui-list-sub">{m.title ?? 'Analyst'} · Class of {m.class_year}</div>
                </div>
                {m.admin && <Badge tone="navy">Admin</Badge>}
              </li>
            ))}
          </ul>
          <div className="ui-card-foot ui-spread">
            <span className="ui-small ui-muted">Uncheck anyone staying on.</span>
            <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={graduate} disabled={pending || chosen.size === 0}><GraduationCap size={15} /> Graduate {chosen.size}</button>
          </div>
        </>
      )}
      <div className="ui-card-foot">
        <p className="ui-small ui-muted" style={{ lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--ui-ink)' }}>Handing off leadership:</strong> incoming leaders request their role under My Profile, and you approve it in the Inbox. You can also assign roles directly in Members &amp; roles. Graduate outgoing admins last.
          {missingYear > 0 && <> {missingYear} member{missingYear === 1 ? ' has' : 's have'} no graduation year and won&apos;t appear here.</>}
        </p>
      </div>
    </Card>
  )
}

const KIND_LABEL: Record<SectorKind, string> = { investment: 'Investment sector', leadership: 'Leadership', operations: 'Operations (no holdings)' }

export function SectorsEditor({ sectors }: { sectors: Sector[] }) {
  const [editing, setEditing] = useState<Sector | 'new' | null>(null)
  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <div><h2><Layers size={18} /> Sectors &amp; teams</h2><p>Used for member pages, the Members menu on the website, PM teams and holdings.</p></div>
        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setEditing('new')}><Plus size={15} /> Add sector</button>
      </div>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead><tr><th>Name</th><th>Web address</th><th>Type</th><th>Benchmark</th><th className="num">Order</th><th>Status</th><th aria-label="Edit" /></tr></thead>
          <tbody>
            {sectors.map(s => (
              <tr key={s.name}>
                <td style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{s.name}</td>
                <td className="ui-small"><code className="ui-code">/members/{s.slug}</code></td>
                <td className="ui-small">{KIND_LABEL[s.kind]}</td>
                <td>{s.benchmark ?? '—'}</td>
                <td className="num">{s.sort_order}</td>
                <td>{s.is_active ? <Badge tone="green">Active</Badge> : <Badge>Hidden</Badge>}</td>
                <td><button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={`Edit ${s.name}`} onClick={() => setEditing(s)}><Pencil size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <SectorForm sector={editing === 'new' ? null : editing} nextOrder={Math.max(0, ...sectors.map(s => s.sort_order)) + 1} onClose={() => setEditing(null)} />}
    </section>
  )
}

function SectorForm({ sector, nextOrder, onClose }: { sector: Sector | null; nextOrder: number; onClose: () => void }) {
  const [f, setF] = useState({
    name: sector?.name ?? '', slug: sector?.slug ?? '', kind: sector?.kind ?? 'investment' as SectorKind,
    benchmark: sector?.benchmark ?? '', sort_order: String(sector?.sort_order ?? nextOrder), is_active: sector?.is_active ?? true,
  })
  const { run, pending } = useMutation()
  const slugify = (v: string) => v.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const row = { name: f.name.trim(), slug: f.slug.trim() || slugify(f.name), kind: f.kind, benchmark: f.benchmark.trim().toUpperCase() || null, sort_order: Number(f.sort_order) || 0, is_active: f.is_active }
    const supabase = createClient()
    const ok = await run(async () => must(sector ? await supabase.from('sectors').update(row).eq('name', sector.name) : await supabase.from('sectors').insert(row)),
      { success: sector ? 'Sector saved' : 'Sector added' })
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title={sector ? `Edit ${sector.name}` : 'Add a sector'}
      description={sector ? 'Renaming updates every member, role and holding in this sector automatically.' : undefined}
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="sector-form" className="ui-btn ui-btn-primary" disabled={pending || !f.name.trim()}>Save</button>
      </>}>
      <form id="sector-form" onSubmit={save} className="ui-form-grid">
        <div className="ui-field"><label htmlFor="sf-name">Name</label><input id="sf-name" className="ui-input" required value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value, slug: sector ? x.slug : slugify(e.target.value) }))} /></div>
        <div className="ui-field"><label htmlFor="sf-slug">Web address</label><input id="sf-slug" className="ui-input" value={f.slug} onChange={e => setF(x => ({ ...x, slug: slugify(e.target.value) }))} /><span className="ui-hint">/members/{f.slug || '…'}</span></div>
        <div className="ui-field">
          <label htmlFor="sf-kind">Type</label>
          <select id="sf-kind" className="ui-select" value={f.kind} onChange={e => setF(x => ({ ...x, kind: e.target.value as SectorKind }))}>
            {(Object.keys(KIND_LABEL) as SectorKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </div>
        <div className="ui-field"><label htmlFor="sf-bench">Benchmark ETF</label><input id="sf-bench" className="ui-input" value={f.benchmark} onChange={e => setF(x => ({ ...x, benchmark: e.target.value }))} placeholder="XLK" style={{ textTransform: 'uppercase' }} /><span className="ui-hint">For sector news and PPG comparisons.</span></div>
        <div className="ui-field"><label htmlFor="sf-order">Order</label><input id="sf-order" className="ui-input" type="number" value={f.sort_order} onChange={e => setF(x => ({ ...x, sort_order: e.target.value }))} /></div>
        <label className="ui-check" style={{ alignSelf: 'end', paddingBottom: 10 }}><input type="checkbox" checked={f.is_active} onChange={e => setF(x => ({ ...x, is_active: e.target.checked }))} /> Show on the website</label>
      </form>
    </Modal>
  )
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function GivingForm({ initial }: { initial: DonationSettings }) {
  const [rate, setRate] = useState(String((initial.rate ?? 0.05) * 100))
  const [month, setMonth] = useState(String(initial.fy_start_month ?? 7))
  const { run, pending } = useMutation()
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const value: DonationSettings = { ...initial, rate: (Number(rate) || 0) / 100, fy_start_month: Number(month) }
    await run(async () => must(await createClient().from('settings').upsert({ key: 'donations', value }, { onConflict: 'key' })), { success: 'Giving policy saved' })
  }
  return (
    <Card title={<><HeartHandshake size={18} /> Giving policy</>} description="Used by Donor Relations for the annual giving target.">
      <form onSubmit={save} className="ui-row" style={{ alignItems: 'flex-end' }}>
        <div className="ui-field" style={{ width: 180 }}><label htmlFor="gf-rate">Annual giving rate (%)</label><input id="gf-rate" className="ui-input" type="number" step="0.1" min="0" max="100" value={rate} onChange={e => setRate(e.target.value)} /></div>
        <div className="ui-field" style={{ width: 220 }}>
          <label htmlFor="gf-month">Fiscal year starts in</label>
          <select id="gf-month" className="ui-select" value={month} onChange={e => setMonth(e.target.value)}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
        </div>
        <button type="submit" className="ui-btn ui-btn-primary" disabled={pending}>Save</button>
      </form>
    </Card>
  )
}

export function SignupForm({ initial, emailReady }: { initial: SignupSettings; emailReady: boolean }) {
  const [open, setOpen] = useState(initial.open)
  const [domains, setDomains] = useState(initial.domains.join(', '))
  const { run, pending } = useMutation()
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const value: SignupSettings = { open, domains: domains.split(/[,\s]+/).map(d => d.trim().replace(/^@/, '').toLowerCase()).filter(Boolean) }
    await run(async () => must(await createClient().from('settings').upsert({ key: 'signup', value, is_public: true }, { onConflict: 'key' })), { success: 'Sign-up settings saved' })
  }
  return (
    <Card title={<><UserPlus size={18} /> Self sign-up</>} description="New members create their own account from the login page, pick their roles, and wait for your approval.">
      <form onSubmit={save} className="ui-form">
        {!emailReady && <p className="ui-small" style={{ color: 'var(--ui-amber)' }}>Needs outgoing email and the service role key. Until then, new people use “Request access” instead.</p>}
        <label className="ui-switch"><input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} /><span className="track" />Allow new members to sign up</label>
        <div className="ui-field">
          <label htmlFor="sg-domains">Allowed email domains</label>
          <input id="sg-domains" className="ui-input" value={domains} onChange={e => setDomains(e.target.value)} placeholder="student.fairfield.edu, fairfield.edu" />
          <span className="ui-hint">Only these school emails can sign up. Leave blank to allow any email (not recommended).</span>
        </div>
        <div><button type="submit" className="ui-btn ui-btn-primary" disabled={pending}>Save</button></div>
      </form>
    </Card>
  )
}
