'use client'
import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Check, Download, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Donation, DonationSettings } from '@/lib/types'
import { day, money, todayET } from '@/lib/format'
import { Modal } from '@/components/portal/Modal'
import { must, useConfirm, useMutation } from '@/components/portal/feedback'
import { Badge, Card, EmptyState, Notice, Stat } from '@/components/portal/ui'

const ACK_THRESHOLD = 250

export default function DonorDashboard({ fy, donations, settings, assigned }: {
  fy: { label: string; start: string; end: string }
  donations: Donation[]
  settings: DonationSettings
  assigned: boolean
}) {
  const [editing, setEditing] = useState<Donation | { direction: 'in' | 'out' } | null>(null)
  const [base, setBase] = useState(settings.asset_bases?.[fy.label] ? String(settings.asset_bases[fy.label]) : '')
  const { run, pending } = useMutation()
  const confirm = useConfirm()

  const received = donations.filter(d => d.direction === 'in')
  const given = donations.filter(d => d.direction === 'out')
  const totalIn = received.reduce((s, d) => s + d.amount, 0)
  const totalOut = given.reduce((s, d) => s + d.amount, 0)
  const assetBase = settings.asset_bases?.[fy.label] ?? null
  const rate = settings.rate || 0.05
  const target = assetBase ? assetBase * rate : null
  const progress = target ? Math.min(1, totalOut / target) : 0
  const needAck = received.filter(d => d.amount >= ACK_THRESHOLD && !d.acknowledged_on)

  async function saveBase(e: React.FormEvent) {
    e.preventDefault()
    const value: DonationSettings = { ...settings, asset_bases: { ...(settings.asset_bases ?? {}), [fy.label]: Number(base) || 0 } }
    await run(async () => must(await createClient().from('settings').upsert({ key: 'donations', value }, { onConflict: 'key' })), { success: 'Asset base saved' })
  }

  async function acknowledge(d: Donation) {
    await run(async () => must(await createClient().from('donations').update({ acknowledged_on: todayET() }).eq('id', d.id)), { success: 'Marked as acknowledged' })
  }

  async function remove(d: Donation) {
    if (!(await confirm({ title: 'Delete this entry?', body: `${d.party} · ${money(d.amount, true)}`, confirmLabel: 'Delete', danger: true }))) return
    await run(async () => must(await createClient().from('donations').delete().eq('id', d.id)), { success: 'Deleted' })
  }

  function exportCsv() {
    const head = ['Direction', 'Date', 'Party', 'Amount', 'Method', 'Designation', 'EIN', 'Acknowledged', 'Notes']
    const esc = (v: unknown) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
    const lines = donations.map(d => [d.direction === 'in' ? 'Received' : 'Given', d.txn_date, d.party, d.amount.toFixed(2), d.method, d.designation, d.ein, d.acknowledged_on, d.notes].map(esc).join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }))
    a.download = `fig-donations-${fy.label}.csv`
    a.click()
  }

  return (
    <div className="ui-stack">
      <Notice tone="info">
        <strong>Beta.</strong> {assigned ? 'Thanks for running Donor Relations!' : 'No one holds the Donor Relations role yet — co-presidents can use this page in the meantime and assign the role in Members & Roles.'}{' '}
        Confirm how the 5% target is calculated with your faculty advisor or accountant.
      </Notice>

      <div className="ui-grid ui-grid-4">
        <Stat label={`Received in ${fy.label}`} icon={<ArrowDownLeft size={15} />} value={money(totalIn)} sub={`${received.length} gift${received.length === 1 ? '' : 's'}`} />
        <Stat label={`Given in ${fy.label}`} icon={<ArrowUpRight size={15} />} value={money(totalOut)} sub={`${given.length} donation${given.length === 1 ? '' : 's'}`} />
        <Stat label={`${(rate * 100).toFixed(0)}% giving target`} icon={<Target size={15} />} value={target === null ? '—' : money(target)}
          sub={target === null ? 'Enter the asset base below' : `${money(assetBase)} × ${(rate * 100).toFixed(0)}%`} />
        <Stat label="Still to give" value={target === null ? '—' : money(Math.max(0, target - totalOut))}
          sub={target === null ? `By ${day(fy.end)}` : totalOut >= target ? 'Target met' : `By ${day(fy.end)}`} />
      </div>

      <div className="ui-grid ui-grid-main">
        <Card title={<><Target size={18} /> Progress toward the {(rate * 100).toFixed(0)}% target</>}>
          {target === null ? (
            <p className="ui-small ui-muted">Set this year&apos;s asset base to track the target.</p>
          ) : (
            <>
              <div className="ui-meter" style={{ height: 12 }} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Giving progress">
                <span style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="ui-spread" style={{ marginTop: 8 }}>
                <span className="ui-small"><strong>{money(totalOut)}</strong> given</span>
                <span className="ui-small ui-muted">{Math.round(progress * 100)}% of {money(target)}</span>
              </div>
            </>
          )}
          <form onSubmit={saveBase} className="ui-row" style={{ marginTop: 16, alignItems: 'flex-end' }}>
            <div className="ui-field" style={{ flex: '1 1 220px' }}>
              <label htmlFor="d-base">{fy.label} asset base ($)</label>
              <input id="d-base" className="ui-input" type="number" min="0" step="1" value={base} onChange={e => setBase(e.target.value)} placeholder="e.g. 250000" />
            </div>
            <button type="submit" className="ui-btn ui-btn-secondary" disabled={pending}>Save</button>
          </form>
          <p className="ui-hint" style={{ marginTop: 8 }}>The fund value the 5% applies to (for example, the average portfolio value over the year).</p>
        </Card>
        <Card title="Receipts to send" description={`Gifts of ${money(ACK_THRESHOLD)} or more need a written acknowledgment for the donor's tax records.`} tight>
          {needAck.length === 0 ? <EmptyState title="All caught up" /> : (
            <ul className="ui-list">
              {needAck.map(d => (
                <li key={d.id} className="ui-list-item">
                  <div className="ui-list-main"><div className="ui-list-title">{d.party}</div><div className="ui-list-sub">{money(d.amount, true)} · {day(d.txn_date)}</div></div>
                  <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => acknowledge(d)} disabled={pending}><Check size={14} /> Sent</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="ui-card">
        <div className="ui-card-head">
          <h2>Transactions · {fy.label}</h2>
          <div className="ui-row">
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={exportCsv} disabled={donations.length === 0}><Download size={15} /> CSV</button>
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setEditing({ direction: 'out' })}><ArrowUpRight size={15} /> Record donation made</button>
            <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setEditing({ direction: 'in' })}><Plus size={15} /> Record gift received</button>
          </div>
        </div>
        {donations.length === 0 ? <EmptyState title={`Nothing recorded for ${fy.label} yet`} /> : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead><tr><th>Date</th><th>Type</th><th>From / to</th><th className="num">Amount</th><th>Purpose</th><th>Status</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {donations.map(d => (
                  <tr key={d.id}>
                    <td className="nowrap">{day(d.txn_date)}</td>
                    <td>{d.direction === 'in' ? <Badge tone="green">Received</Badge> : <Badge tone="blue">Given</Badge>}</td>
                    <td><div style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{d.party}</div>{d.method && <div className="ui-small ui-muted">{d.method}</div>}</td>
                    <td className="num">{money(d.amount, true)}</td>
                    <td className="ui-small">{d.designation ?? '—'}{d.ein ? <div className="ui-muted">EIN {d.ein}</div> : null}</td>
                    <td>
                      {d.direction === 'in'
                        ? d.acknowledged_on ? <Badge tone="green">Thanked {day(d.acknowledged_on, false)}</Badge>
                          : d.amount >= ACK_THRESHOLD ? <Badge tone="amber">Receipt needed</Badge> : <Badge>—</Badge>
                        : <Badge tone="blue">Paid</Badge>}
                    </td>
                    <td className="nowrap">
                      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label="Edit" onClick={() => setEditing(d)}><Pencil size={15} /></button>
                      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label="Delete" onClick={() => remove(d)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && <DonationForm entry={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function DonationForm({ entry, onClose }: { entry: Donation | { direction: 'in' | 'out' }; onClose: () => void }) {
  const existing = 'id' in entry ? entry : null
  const [f, setF] = useState({
    direction: entry.direction, party: existing?.party ?? '', amount: existing ? String(existing.amount) : '',
    txn_date: existing?.txn_date ?? todayET(), method: existing?.method ?? '', designation: existing?.designation ?? '',
    ein: existing?.ein ?? '', acknowledged_on: existing?.acknowledged_on ?? '', notes: existing?.notes ?? '',
  })
  const { run, pending } = useMutation()
  const incoming = f.direction === 'in'

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const row = {
      direction: f.direction, party: f.party.trim(), amount: Number(f.amount), txn_date: f.txn_date,
      method: f.method.trim() || null, designation: f.designation.trim() || null, ein: incoming ? null : f.ein.trim() || null,
      acknowledged_on: incoming ? f.acknowledged_on || null : null, notes: f.notes.trim() || null,
    }
    const supabase = createClient()
    const ok = await run(async () => must(existing ? await supabase.from('donations').update(row).eq('id', existing.id) : await supabase.from('donations').insert(row)),
      { success: existing ? 'Updated' : 'Recorded' })
    if (ok) onClose()
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }))
  return (
    <Modal open onClose={onClose} title={existing ? 'Edit entry' : incoming ? 'Record a gift received' : 'Record a donation made'}
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="donation-form" className="ui-btn ui-btn-primary" disabled={pending || !f.party.trim() || !(Number(f.amount) > 0)}>Save</button>
      </>}>
      <form id="donation-form" onSubmit={save} className="ui-form-grid">
        <div className="ui-field span-2">
          <label htmlFor="dn-party">{incoming ? 'Donor' : 'Recipient organization'}</label>
          <input id="dn-party" className="ui-input" required value={f.party} onChange={set('party')} placeholder={incoming ? 'Name or organization' : 'e.g. Connecticut Food Bank'} />
        </div>
        <div className="ui-field"><label htmlFor="dn-amt">Amount ($)</label><input id="dn-amt" className="ui-input" type="number" min="0.01" step="0.01" required value={f.amount} onChange={set('amount')} /></div>
        <div className="ui-field"><label htmlFor="dn-date">Date</label><input id="dn-date" className="ui-input" type="date" required value={f.txn_date} onChange={set('txn_date')} /></div>
        <div className="ui-field"><label htmlFor="dn-method">Method</label><input id="dn-method" className="ui-input" value={f.method} onChange={set('method')} placeholder="Check, ACH, card, stock…" /></div>
        <div className="ui-field"><label htmlFor="dn-des">{incoming ? 'Designation / restriction' : 'Cause'}</label><input id="dn-des" className="ui-input" value={f.designation} onChange={set('designation')} placeholder={incoming ? 'Unrestricted' : 'e.g. Financial literacy'} /></div>
        {incoming ? (
          <div className="ui-field"><label htmlFor="dn-ack">Acknowledgment sent</label><input id="dn-ack" className="ui-input" type="date" value={f.acknowledged_on} onChange={set('acknowledged_on')} /></div>
        ) : (
          <div className="ui-field"><label htmlFor="dn-ein">Recipient EIN</label><input id="dn-ein" className="ui-input" value={f.ein} onChange={set('ein')} placeholder="12-3456789" /></div>
        )}
        <div className="ui-field span-2"><label htmlFor="dn-notes">Notes</label><textarea id="dn-notes" className="ui-textarea" rows={2} value={f.notes} onChange={set('notes')} /></div>
      </form>
    </Modal>
  )
}
