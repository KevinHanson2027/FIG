'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileSpreadsheet, Upload } from 'lucide-react'
import { applyHoldingsImport, previewHoldingsImport } from '@/app/portal/portfolio/actions'
import type { DatesPlan, ImportChoices, ImportPlan, PlanUpdate, PositionsPlan } from '@/lib/fidelity'
import { day, money, num } from '@/lib/format'
import { PORTFOLIO_LEVEL } from '@/lib/portfolio'
import { Modal } from './Modal'
import { useToast } from './feedback'
import { Notice } from './ui'

type AddChoices = NonNullable<ImportChoices['added']>
type LoadedFile = { name: string; text: string }

const MAX_BYTES = 900_000

/** "Update from Fidelity": drop a Fidelity CSV, review what changes, apply. */
export function HoldingsImport({ sectors, onClose }: { sectors: string[]; onClose: () => void }) {
  const router = useRouter()
  const toast = useToast()
  const [file, setFile] = useState<LoadedFile | null>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [busy, setBusy] = useState<'' | 'reading' | 'saving'>('')
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)
  const [added, setAdded] = useState<AddChoices>({})
  const [sell, setSell] = useState<Set<string>>(new Set())
  const [dates, setDates] = useState<Set<string>>(new Set())

  async function preview(f: LoadedFile, account?: number) {
    setBusy('reading')
    setError('')
    try {
      const res = await previewHoldingsImport({ text: f.text, filename: f.name, account })
      if (!res.ok) { setError(res.error); return }
      setFile(f)
      setPlan(res.plan)
      if (res.plan.kind === 'positions') {
        setAdded(Object.fromEntries(res.plan.added.map(a => [a.key, { sector: a.sector, purchased_on: a.purchased_on, matchId: a.suggest }])))
        setSell(new Set(res.plan.sellByDefault ? res.plan.missing.map(m => m.id) : []))
      } else {
        setDates(new Set(res.plan.items.filter(i => i.ok).map(i => i.id)))
      }
    } catch {
      setError('Couldn’t read that file. Check your connection and try again.')
    } finally {
      setBusy('')
    }
  }

  async function choose(f: File | undefined | null) {
    if (!f) return
    if (f.size > MAX_BYTES) { setError('That file is too large to be a Fidelity export.'); return }
    await preview({ name: f.name, text: await f.text() })
  }

  async function apply() {
    if (!file || !plan) return
    setBusy('saving')
    setError('')
    try {
      const choices: ImportChoices = plan.kind === 'positions'
        ? { account: plan.account, added, sell: [...sell] }
        : { dates: [...dates] }
      const res = await applyHoldingsImport({ text: file.text, filename: file.name, account: plan.kind === 'positions' ? plan.account : undefined, choices })
      if (!res.ok) { setError(res.error); return }
      toast.success(res.message)
      router.refresh()
      onClose()
    } catch {
      setError('Couldn’t save. Check your connection and try again.')
    } finally {
      setBusy('')
    }
  }

  function reset() {
    setFile(null)
    setPlan(null)
    setError('')
  }

  const changes = plan?.kind === 'positions'
    ? plan.updates.length + plan.added.length + [...sell].filter(id => !Object.values(added).some(a => a.matchId === id)).length + (plan.cash.before !== plan.cash.after ? 1 : 0)
    : plan?.kind === 'dates' ? dates.size : 0

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title="Update from Fidelity"
      description={plan ? <><FileSpreadsheet size={13} style={{ verticalAlign: -2 }} /> {file?.name}</> : 'Bring in shares, cost basis, cash and purchase dates from a Fidelity download.'}
      footer={plan ? (
        <>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={reset} style={{ marginRight: 'auto' }} disabled={busy !== ''}>Use another file</button>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
          {/* A positions file with no changes still records that holdings were checked against Fidelity. */}
          <button type="button" className="ui-btn ui-btn-primary" onClick={apply} disabled={busy !== '' || (plan.kind === 'dates' && changes === 0)}>
            {busy === 'saving' ? 'Saving…' : changes > 0 ? 'Apply update' : plan.kind === 'positions' ? 'Mark as up to date' : 'Nothing to change'}
          </button>
        </>
      ) : undefined}
    >
      {error && <div style={{ marginBottom: 16 }}><Notice tone="error">{error}</Notice></div>}

      {!plan ? (
        <>
          <label
            className={`import-drop${over ? ' over' : ''}`}
            onDragOver={e => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); choose(e.dataTransfer.files?.[0]) }}
          >
            <Upload size={22} aria-hidden />
            <strong>{busy === 'reading' ? 'Reading…' : 'Choose a Fidelity CSV'}</strong>
            <span>or drop it here</span>
            <input type="file" accept=".csv,text/csv" className="ui-sr-only" disabled={busy !== ''}
              onChange={e => { choose(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <ol className="import-steps">
            <li><strong>Shares, cost basis, bonds and cash:</strong> on Fidelity.com open <em>Accounts → Positions</em> and use the download icon. Do this after every trade, or at least monthly.</li>
            <li><strong>When each holding was bought:</strong> open <em>Activity &amp; Orders → History</em>, choose the longest date range, and download. A spreadsheet with <em>Symbol</em> and <em>Date</em> columns, saved as CSV, works too.</li>
          </ol>
          <p className="ui-hint" style={{ marginTop: 12 }}>You review every change before anything is saved. Account numbers are never stored.</p>
        </>
      ) : plan.kind === 'positions' ? (
        <PositionsPreview plan={plan} sectors={sectors} added={added} setAdded={setAdded} sell={sell} setSell={setSell}
          onAccount={i => file && preview(file, i)} busy={busy !== ''} />
      ) : (
        <DatesPreview plan={plan} dates={dates} setDates={setDates} />
      )}
    </Modal>
  )
}

/* ---------- Positions ---------- */

function arrow(from: string, to: string, changed: boolean) {
  if (!changed) return <span>{to}</span>
  return <span className="nowrap"><span className="ui-muted">{from}</span><ArrowRight size={12} className="import-arrow" aria-label="becomes" />{to}</span>
}

function UpdateRow({ u }: { u: PlanUpdate }) {
  const bond = u.after.asset_type === 'bond' && !u.after.ticker
  const has = (k: keyof PlanUpdate['after']) => u.changed.includes(k)
  const qty = (v: number) => (bond ? money(v) : num(v, 4))
  const cost = (v: number | null) => (v === null ? '—' : bond ? num(v, 3) : money(v, true))
  return (
    <tr>
      <td><strong style={{ color: 'var(--ui-ink)' }}>{u.label}</strong>{has('cusip') && <span className="cell-sub">CUSIP {u.after.cusip}</span>}</td>
      <td className="num">{arrow(qty(u.before.shares), qty(u.after.shares), has('shares'))}</td>
      <td className="num">{arrow(cost(u.before.cost_basis), cost(u.after.cost_basis), has('cost_basis'))}</td>
      <td className="num">{bond ? arrow(money(u.before.manual_value, true), money(u.after.manual_value, true), has('manual_value')) : <span className="ui-muted">live</span>}</td>
    </tr>
  )
}

export function PositionsPreview({ plan, sectors, added, setAdded, sell, setSell, onAccount, busy }: {
  plan: PositionsPlan
  sectors: string[]
  added: AddChoices
  setAdded: React.Dispatch<React.SetStateAction<AddChoices>>
  sell: Set<string>
  setSell: React.Dispatch<React.SetStateAction<Set<string>>>
  onAccount: (i: number) => void
  busy: boolean
}) {
  const matched = useMemo(() => new Set(Object.values(added).map(a => a.matchId).filter(Boolean) as string[]), [added])
  const missing = plan.missing.filter(m => !matched.has(m.id))
  const setChoice = (key: string, patch: Partial<AddChoices[string]>) => setAdded(a => ({ ...a, [key]: { ...a[key], ...patch } }))
  const toggleSell = (id: string) => setSell(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const soldOn = plan.asOf.date ? day(plan.asOf.date) : 'today'

  return (
    <div>
      <div className="import-summary">
        <span><strong>Positions</strong>{plan.asOf.label ? ` as of ${plan.asOf.label}` : ''}</span>
        {plan.accounts.length > 1 ? (
          <label className="ui-row" style={{ gap: 6 }}>
            <span>Account</span>
            <select className="ui-select" style={{ height: 30, width: 'auto' }} value={plan.account} disabled={busy} onChange={e => onAccount(Number(e.target.value))}>
              {plan.accounts.map((a, i) => <option key={a} value={i}>{a}</option>)}
            </select>
          </label>
        ) : <span>{plan.accounts[0]}</span>}
        <span>{money(plan.fileValue, true)} in the account</span>
      </div>

      <section className="import-section">
        <h3>Cash</h3>
        <p style={{ marginBottom: 0 }}>
          {plan.cash.before === plan.cash.after
            ? <>Stays at {money(plan.cash.after, true)}.</>
            : <>{money(plan.cash.before, true)} <ArrowRight size={12} className="import-arrow" aria-label="becomes" /> <strong style={{ color: 'var(--ui-ink)' }}>{money(plan.cash.after, true)}</strong></>}
          {plan.cash.sources.length > 0 && <> ({plan.cash.sources.join(' + ')})</>}
        </p>
      </section>

      <section className="import-section">
        <h3>{plan.updates.length ? `${plan.updates.length} holding${plan.updates.length === 1 ? '' : 's'} updated` : 'No changes to current holdings'}</h3>
        <p>{plan.unchanged > 0 ? `${plan.unchanged} already match Fidelity. ` : ''}Values for stocks and ETFs stay live; bonds take Fidelity&apos;s price.</p>
        {plan.updates.length > 0 && (
          <div className="import-scroll">
            <table className="ui-table">
              <thead><tr><th>Holding</th><th className="num">Shares</th><th className="num">Avg cost</th><th className="num">Value</th></tr></thead>
              <tbody>{plan.updates.map(u => <UpdateRow key={u.id} u={u} />)}</tbody>
            </table>
          </div>
        )}
      </section>

      {plan.added.length > 0 && (
        <section className="import-section">
          <h3>
            {[
              plan.added.length - matched.size > 0 ? `${plan.added.length - matched.size} new in Fidelity` : '',
              matched.size > 0 ? `${matched.size} linked to holdings already listed` : '',
            ].filter(Boolean).join(', ')}
          </h3>
          <p>
            Pick a sector for each new one. Holdings the portal lists without a ticker or CUSIP (like bonds entered by hand)
            are linked by name, so check that each <em>Same as</em> is right.
          </p>
          <div className="import-new">
            {plan.added.map(a => {
              const c = added[a.key] ?? { sector: a.sector, purchased_on: a.purchased_on, matchId: a.suggest }
              const bond = a.fields.asset_type === 'bond'
              return (
                <div key={a.key} className="import-new-row">
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ color: 'var(--ui-ink)' }}>{a.fields.ticker ?? a.name}</strong>
                    <span className="cell-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.fields.ticker ? a.name : `CUSIP ${a.fields.cusip}`}</span>
                    <span className="cell-sub">{bond ? `${money(a.fields.shares)} face` : `${num(a.fields.shares, 4)} shares`} · {money(a.value, true)}</span>
                  </div>
                  {plan.missing.length > 0 && (
                    <div className="ui-field">
                      <label htmlFor={`m-${a.key}`}>Portal holding</label>
                      <select id={`m-${a.key}`} className="ui-select" value={c.matchId ?? ''} onChange={e => setChoice(a.key, { matchId: e.target.value || null })}>
                        <option value="">Add as new</option>
                        {plan.missing.map(m => (
                          <option key={m.id} value={m.id} disabled={matched.has(m.id) && c.matchId !== m.id}>Same as {m.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!c.matchId && (
                    <div className="ui-field">
                      <label htmlFor={`s-${a.key}`}>Sector</label>
                      <select id={`s-${a.key}`} className="ui-select" value={c.sector ?? ''} onChange={e => setChoice(a.key, { sector: e.target.value || null })}>
                        <option value="">{PORTFOLIO_LEVEL}</option>
                        {sectors.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="ui-field">
                    <label htmlFor={`d-${a.key}`}>First bought <span className="ui-muted">(optional)</span></label>
                    <input id={`d-${a.key}`} className="ui-input" type="date" value={c.purchased_on ?? ''} max={new Date().toISOString().slice(0, 10)}
                      onChange={e => setChoice(a.key, { purchased_on: e.target.value || null })} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {missing.length > 0 && (
        <section className="import-section">
          <h3>{missing.length} not in this file</h3>
          <p>
            {plan.sellByDefault
              ? `Checked holdings are marked as sold on ${soldOn} and move to Sold holdings. Uncheck anything FIG still owns.`
              : 'Most current holdings are missing from this file. Check that it’s the right account before marking anything as sold.'}
          </p>
          <ul className="ui-list" style={{ border: '1px solid var(--ui-line)', borderRadius: 10 }}>
            {missing.map(m => (
              <li key={m.id} className="ui-list-item" style={{ padding: '8px 12px' }}>
                <label className="ui-check" style={{ flex: 1, alignItems: 'center' }}>
                  <input type="checkbox" checked={sell.has(m.id)} onChange={() => toggleSell(m.id)} style={{ marginTop: 0 }} />
                  <span><strong style={{ color: 'var(--ui-ink)' }}>{m.label}</strong> <span className="ui-muted">· {m.sector ?? PORTFOLIO_LEVEL}</span></span>
                </label>
                <span className="ui-small ui-muted">{sell.has(m.id) ? 'Mark as sold' : 'Keep'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.skipped.length > 0 && (
        <section className="import-section">
          <h3>Skipped</h3>
          <ul className="ui-small ui-muted" style={{ paddingLeft: 18, lineHeight: 1.6 }}>
            {plan.skipped.map((s, i) => <li key={i}><strong>{s.symbol}</strong>: {s.reason}</li>)}
          </ul>
        </section>
      )}
    </div>
  )
}

/* ---------- Purchase dates ---------- */

export function DatesPreview({ plan, dates, setDates }: { plan: DatesPlan; dates: Set<string>; setDates: React.Dispatch<React.SetStateAction<Set<string>>> }) {
  const toggle = (id: string) => setDates(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const range = plan.range.from && plan.range.to ? `${day(plan.range.from)} – ${day(plan.range.to)}` : null
  return (
    <div>
      <div className="import-summary">
        <span><strong>Purchase dates</strong> from {plan.source === 'history' ? 'Fidelity activity' : 'your spreadsheet'}</span>
        {range && <span>{range}</span>}
        {plan.unchanged > 0 && <span>{plan.unchanged} already match</span>}
      </div>
      {plan.items.length === 0 ? (
        <p className="ui-small ui-muted" style={{ lineHeight: 1.6 }}>
          No new purchase dates for current holdings in this file.
          {plan.source === 'history' && ' Fidelity only lets you download recent activity, so older purchases need a date added by hand (pencil on the holding).'}
        </p>
      ) : (
        <>
          {plan.source === 'history' && (
            <p className="ui-small ui-muted" style={{ marginBottom: 10, lineHeight: 1.55 }}>
              Dates are checked against today&apos;s share counts. Holdings bought before this file starts are left unchecked, so add their dates by hand.
            </p>
          )}
          <div className="import-scroll" style={{ maxHeight: 380 }}>
            <table className="ui-table">
              <thead><tr><th aria-label="Use" /><th>Holding</th><th>Now</th><th>From the file</th><th>Check</th></tr></thead>
              <tbody>
                {plan.items.map(i => (
                  <tr key={i.id}>
                    <td style={{ width: 36 }}><input type="checkbox" aria-label={`Use ${day(i.date)} for ${i.label}`} checked={dates.has(i.id)} onChange={() => toggle(i.id)} /></td>
                    <td><strong style={{ color: 'var(--ui-ink)' }}>{i.label}</strong></td>
                    <td className="nowrap ui-muted">{i.current ? day(i.current) : '—'}</td>
                    <td className="nowrap">{day(i.date)}</td>
                    <td className="ui-small" style={{ color: i.ok ? 'var(--ui-green)' : 'var(--ui-amber)' }}>{i.note || 'From your sheet'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {plan.unmatched > 0 && <p className="ui-hint" style={{ marginTop: 10 }}>{plan.unmatched} other symbol{plan.unmatched === 1 ? '' : 's'} in the file (sold holdings, the money market) {plan.unmatched === 1 ? 'was' : 'were'} ignored.</p>}
    </div>
  )
}
