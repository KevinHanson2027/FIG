'use client'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Download, ExternalLink, Pencil, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, Holding } from '@/lib/types'
import type { Position } from '@/lib/portfolio'
import { PORTFOLIO_LEVEL } from '@/lib/portfolio'
import { money, num, pct, todayET } from '@/lib/format'
import { Modal } from './Modal'
import { must, useConfirm, useMutation } from './feedback'
import { EmptyState } from './ui'

type SortKey = 'ticker' | 'sector' | 'price' | 'dayChangePct' | 'shares' | 'value' | 'weight' | 'gainPct'

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'equity', label: 'Stock' }, { value: 'etf', label: 'ETF' }, { value: 'bond', label: 'Bond' },
  { value: 'fund', label: 'Fund' }, { value: 'other', label: 'Other' },
]

function Change({ v }: { v: number | null }) {
  if (v === null) return <span className="ui-muted">—</span>
  return <span className={v > 0 ? 'ui-up' : v < 0 ? 'ui-down' : 'ui-muted'}>{v > 0 ? '▲' : v < 0 ? '▼' : ''} {pct(v)}</span>
}

function toCsv(rows: Position[]) {
  const head = ['Ticker', 'Name', 'Sector', 'Type', 'Shares', 'Avg cost', 'Price', 'Day %', 'Value', 'Weight %', 'Unrealized $', 'Unrealized %', 'Purchased', 'Thesis']
  const esc = (v: unknown) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const lines = rows.map(p => [
    p.ticker, p.name, p.sector ?? PORTFOLIO_LEVEL, p.asset_type, p.shares, p.cost_basis, p.price?.toFixed(2),
    p.dayChangePct !== null ? (p.dayChangePct * 100).toFixed(2) : '', p.value?.toFixed(2),
    p.weight !== null ? (p.weight * 100).toFixed(2) : '', p.gain?.toFixed(2), p.gainPct !== null ? (p.gainPct * 100).toFixed(2) : '',
    p.purchased_on, p.thesis_url,
  ].map(esc).join(','))
  return [head.join(','), ...lines].join('\n')
}

export function HoldingsTable({ positions, hasValues, editableSectors, sectorOptions, canManageAll, showSector = true, title = 'Holdings' }: {
  positions: Position[]
  hasValues: boolean
  editableSectors: string[]
  sectorOptions: string[]
  canManageAll: boolean
  showSector?: boolean
  title?: string
}) {
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: hasValues ? 'value' : 'ticker', asc: !hasValues })
  const [editing, setEditing] = useState<Holding | 'new' | null>(null)
  const canEdit = (sector: string | null) => canManageAll || (sector !== null && editableSectors.includes(sector))
  const canAdd = canManageAll || editableSectors.length > 0

  const sectorCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of positions) m.set(p.sector ?? PORTFOLIO_LEVEL, (m.get(p.sector ?? PORTFOLIO_LEVEL) ?? 0) + 1)
    return [...m.entries()]
  }, [positions])

  const rows = useMemo(() => {
    const list = filter === 'All' ? positions : positions.filter(p => (p.sector ?? PORTFOLIO_LEVEL) === filter)
    const val = (p: Position): string | number => {
      const v = sort.key === 'ticker' ? (p.ticker ?? p.name) : sort.key === 'sector' ? (p.sector ?? 'zzz') : p[sort.key]
      return v === null || v === undefined ? (sort.asc ? Infinity : -Infinity) : v
    }
    return [...list].sort((a, b) => {
      const av = val(a), bv = val(b)
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv)
      return sort.asc ? cmp : -cmp
    })
  }, [positions, filter, sort])

  function header(key: SortKey, label: string, numeric = false) {
    const active = sort.key === key
    return (
      <th className={`sortable${numeric ? ' num' : ''}`} aria-sort={active ? (sort.asc ? 'ascending' : 'descending') : 'none'}
        onClick={() => setSort(s => ({ key, asc: s.key === key ? !s.asc : !numeric }))}>
        {label} {active && (sort.asc ? <ArrowUp size={12} style={{ verticalAlign: -1 }} /> : <ArrowDown size={12} style={{ verticalAlign: -1 }} />)}
      </th>
    )
  }

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fig-holdings-${todayET()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <h2>{title}</h2>
        <div className="ui-row">
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={exportCsv}><Download size={15} /> CSV</button>
          {canAdd && <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setEditing('new')}><Plus size={15} /> Add holding</button>}
        </div>
      </div>
      {showSector && sectorCounts.length > 1 && (
        <div className="ui-chips" style={{ padding: '12px 20px 0' }}>
          <button type="button" className={`ui-chip${filter === 'All' ? ' on' : ''}`} onClick={() => setFilter('All')}>All <span className="count">{positions.length}</span></button>
          {sectorCounts.map(([s, n]) => (
            <button key={s} type="button" className={`ui-chip${filter === s ? ' on' : ''}`} onClick={() => setFilter(s)}>{s} <span className="count">{n}</span></button>
          ))}
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState title="No holdings yet" action={canAdd ? <button type="button" className="ui-btn ui-btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Add a holding</button> : undefined}>
          Positions added by PMs and the PPG manager appear here.
        </EmptyState>
      ) : (
        <div className="ui-table-wrap" style={{ marginTop: 8 }}>
          <table className="ui-table">
            <thead>
              <tr>
                {header('ticker', 'Holding')}
                {showSector && header('sector', 'Sector')}
                {header('price', 'Price', true)}
                {header('dayChangePct', 'Today', true)}
                {header('shares', 'Shares', true)}
                {header('value', 'Value', true)}
                {hasValues && header('weight', 'Weight', true)}
                {header('gainPct', 'Gain / loss', true)}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="ui-row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <strong style={{ color: 'var(--ui-ink)' }}>{p.ticker ?? p.name}</strong>
                      {p.thesis_url && /^https?:\/\//.test(p.thesis_url) && (
                        <a href={p.thesis_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.ticker ?? p.name} thesis`} style={{ color: 'var(--ui-faint)', display: 'inline-flex' }}><ExternalLink size={13} /></a>
                      )}
                    </div>
                    <div className="ui-small ui-muted" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.ticker ? p.name : ASSET_TYPES.find(t => t.value === p.asset_type)?.label}</div>
                  </td>
                  {showSector && <td className="nowrap ui-small">{p.sector ?? PORTFOLIO_LEVEL}</td>}
                  <td className="num">{p.price !== null ? money(p.price, true) : '—'}</td>
                  <td className="num"><Change v={p.dayChangePct} /></td>
                  <td className="num">{p.ticker ? (p.shares ? num(p.shares, 4) : <span className="ui-badge ui-badge-amber">Add</span>) : '—'}</td>
                  <td className="num">{money(p.value)}</td>
                  {hasValues && <td className="num">{p.weight !== null ? `${(p.weight * 100).toFixed(1)}%` : '—'}</td>}
                  <td className="num">
                    {p.gain !== null ? <span className={p.gain >= 0 ? 'ui-up' : 'ui-down'}>{p.gain >= 0 ? '+' : '−'}{money(Math.abs(p.gain))} <span className="ui-small">({pct(p.gainPct)})</span></span> : <span className="ui-muted">—</span>}
                  </td>
                  <td style={{ width: 44 }}>
                    {canEdit(p.sector) && (
                      <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={`Edit ${p.ticker ?? p.name}`} onClick={() => setEditing(p)}>
                        <Pencil size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <HoldingForm
          holding={editing === 'new' ? null : editing}
          sectorOptions={canManageAll ? sectorOptions : sectorOptions.filter(s => editableSectors.includes(s))}
          allowPortfolioLevel={canManageAll}
          canDelete={canManageAll}
          defaultSector={filter !== 'All' && filter !== PORTFOLIO_LEVEL && canEdit(filter) ? filter : (canManageAll ? sectorOptions[0] : editableSectors[0])}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

function HoldingForm({ holding, sectorOptions, allowPortfolioLevel, canDelete, defaultSector, onClose }: {
  holding: Holding | null
  sectorOptions: string[]
  allowPortfolioLevel: boolean
  canDelete: boolean
  defaultSector: string | undefined
  onClose: () => void
}) {
  const [f, setF] = useState({
    ticker: holding?.ticker ?? '',
    name: holding?.name ?? '',
    sector: holding ? holding.sector ?? '' : defaultSector ?? '',
    asset_type: holding?.asset_type ?? 'equity' as AssetType,
    shares: holding?.shares ? String(holding.shares) : '',
    cost_basis: holding?.cost_basis ? String(holding.cost_basis) : '',
    manual_value: holding?.manual_value ? String(holding.manual_value) : '',
    purchased_on: holding?.purchased_on ?? '',
    thesis_url: holding?.thesis_url ?? '',
    notes: holding?.notes ?? '',
  })
  const [lookup, setLookup] = useState('')
  const { run, pending } = useMutation()
  const confirm = useConfirm()

  async function lookupTicker() {
    const t = f.ticker.trim().toUpperCase()
    if (!t) return
    try {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(t)}`)
      const q = (await res.json()).quotes?.[t]
      if (q) {
        setLookup(`${q.name ?? t} · ${money(q.price, true)}`)
        if (!f.name) setF(x => ({ ...x, name: q.name ?? x.name }))
      } else setLookup('No quote found for that ticker.')
    } catch { setLookup('') }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const row = {
      ticker: f.ticker.trim().toUpperCase() || null,
      name: f.name.trim(),
      sector: f.sector || null,
      asset_type: f.asset_type,
      shares: f.shares ? Number(f.shares) : 0,
      cost_basis: f.cost_basis ? Number(f.cost_basis) : null,
      manual_value: !f.ticker.trim() && f.manual_value ? Number(f.manual_value) : null,
      purchased_on: f.purchased_on || null,
      thesis_url: f.thesis_url.trim() || null,
      notes: f.notes.trim() || null,
    }
    const supabase = createClient()
    const ok = await run(async () => must(holding
      ? await supabase.from('holdings').update(row).eq('id', holding.id)
      : await supabase.from('holdings').insert(row)), { success: holding ? 'Holding updated' : 'Holding added' })
    if (ok) onClose()
  }

  async function markSold() {
    if (!holding || !(await confirm({ title: `Mark ${holding.ticker ?? holding.name} as sold?`, body: 'It moves out of current holdings but stays in the history.', confirmLabel: 'Mark as sold' }))) return
    const ok = await run(async () => must(await createClient().from('holdings').update({ is_active: false, sold_on: todayET() }).eq('id', holding.id)), { success: 'Marked as sold' })
    if (ok) onClose()
  }

  async function remove() {
    if (!holding || !(await confirm({ title: 'Delete this holding?', body: 'Only do this for mistakes — use "Mark as sold" for real sales so history is kept.', confirmLabel: 'Delete', danger: true }))) return
    const ok = await run(async () => must(await createClient().from('holdings').delete().eq('id', holding.id)), { success: 'Deleted' })
    if (ok) onClose()
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }))

  return (
    <Modal
      open
      onClose={onClose}
      title={holding ? `Edit ${holding.ticker ?? holding.name}` : 'Add a holding'}
      wide
      footer={
        <>
          {holding && <button type="button" className="ui-btn ui-btn-ghost" onClick={markSold} style={{ marginRight: 'auto' }}>Mark as sold</button>}
          {holding && canDelete && <button type="button" className="ui-btn ui-btn-danger" onClick={remove}>Delete</button>}
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="holding-form" className="ui-btn ui-btn-primary" disabled={pending || !f.name.trim()}>{pending ? 'Saving…' : 'Save'}</button>
        </>
      }
    >
      <form id="holding-form" onSubmit={save} className="ui-form-grid">
        <div className="ui-field">
          <label htmlFor="h-ticker">Ticker</label>
          <input id="h-ticker" className="ui-input" value={f.ticker} onChange={set('ticker')} onBlur={lookupTicker} placeholder="AAPL" style={{ textTransform: 'uppercase' }} />
          <span className="ui-hint">{lookup || 'Leave blank for bonds or positions without a ticker.'}</span>
        </div>
        <div className="ui-field">
          <label htmlFor="h-name">Name</label>
          <input id="h-name" className="ui-input" required value={f.name} onChange={set('name')} placeholder="Apple Inc." />
        </div>
        <div className="ui-field">
          <label htmlFor="h-sector">Sector</label>
          <select id="h-sector" className="ui-select" value={f.sector} onChange={set('sector')}>
            {allowPortfolioLevel && <option value="">{PORTFOLIO_LEVEL}</option>}
            {sectorOptions.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="ui-field">
          <label htmlFor="h-type">Type</label>
          <select id="h-type" className="ui-select" value={f.asset_type} onChange={set('asset_type')}>
            {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {f.ticker.trim() ? (
          <>
            <div className="ui-field">
              <label htmlFor="h-shares">Shares</label>
              <input id="h-shares" className="ui-input" type="number" step="any" min="0" value={f.shares} onChange={set('shares')} />
            </div>
            <div className="ui-field">
              <label htmlFor="h-cost">Average cost per share</label>
              <input id="h-cost" className="ui-input" type="number" step="any" min="0" value={f.cost_basis} onChange={set('cost_basis')} placeholder="$" />
            </div>
          </>
        ) : (
          <div className="ui-field span-2">
            <label htmlFor="h-value">Current market value</label>
            <input id="h-value" className="ui-input" type="number" step="any" min="0" value={f.manual_value} onChange={set('manual_value')} placeholder="$" />
            <span className="ui-hint">Update this when you get a new statement — there&apos;s no live price without a ticker.</span>
          </div>
        )}
        <div className="ui-field">
          <label htmlFor="h-date">Purchased on</label>
          <input id="h-date" className="ui-input" type="date" value={f.purchased_on} onChange={set('purchased_on')} />
        </div>
        <div className="ui-field">
          <label htmlFor="h-thesis">Pitch / thesis link</label>
          <input id="h-thesis" className="ui-input" type="url" value={f.thesis_url} onChange={set('thesis_url')} placeholder="https://docs.google.com/…" />
        </div>
        <div className="ui-field span-2">
          <label htmlFor="h-notes">Notes</label>
          <textarea id="h-notes" className="ui-textarea" rows={3} value={f.notes} onChange={set('notes')} placeholder="Catalysts, price targets, things to watch…" />
        </div>
      </form>
    </Modal>
  )
}
