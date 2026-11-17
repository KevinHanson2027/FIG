'use client'
import { Fragment, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Download, ExternalLink, FileUp, Pencil, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AssetType, Holding } from '@/lib/types'
import { bondYields, PORTFOLIO_LEVEL, priceUnit, type Position } from '@/lib/portfolio'
import { day, money, num, pct, shortDate, todayET } from '@/lib/format'
import { Modal } from './Modal'
import { must, useConfirm, useMutation } from './feedback'
import { EmptyState } from './ui'
import { HoldingsImport } from './HoldingsImport'

type SortKey = 'ticker' | 'sector' | 'shares' | 'cost_basis' | 'dayChangePct' | 'value' | 'gainPct' | 'purchased_on'

/** The last Fidelity positions import, for the "as of" line. */
export type HoldingsSync = { label: string; stale: boolean } | null

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'equity', label: 'Stock' }, { value: 'etf', label: 'ETF' }, { value: 'bond', label: 'Bond' },
  { value: 'fund', label: 'Fund' }, { value: 'other', label: 'Other' },
]

const isBond = (h: Pick<Holding, 'asset_type' | 'ticker'>) => priceUnit(h) !== 1
const signedMoney = (v: number) => `${v >= 0 ? '+' : '−'}${money(Math.abs(v))}`

function Change({ v }: { v: number | null }) {
  if (v === null) return <span className="ui-muted">—</span>
  return <span className={v > 0 ? 'ui-up' : v < 0 ? 'ui-down' : 'ui-muted'}>{v > 0 ? '▲' : v < 0 ? '▼' : ''} {pct(v)}</span>
}

function Gain({ value, fraction }: { value: number | null; fraction: number | null }) {
  if (value === null) return <span className="ui-muted">—</span>
  return <span className={value >= 0 ? 'ui-up' : 'ui-down'}>{signedMoney(value)}<span className="cell-sub" style={{ color: 'inherit' }}>{pct(fraction)}</span></span>
}

/** "4y 8m", "7m", "12d" since a date. */
function heldFor(from: string, today: string) {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = today.split('-').map(Number)
  let months = (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0)
  if (months < 1) {
    const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
    return days <= 0 ? 'Bought today' : `${days}d`
  }
  const years = Math.floor(months / 12)
  months %= 12
  return years ? `${years}y${months ? ` ${months}m` : ''}` : `${months}m`
}

function subtitle(p: Position) {
  if (p.ticker) return p.name
  if (isBond(p)) return [p.coupon !== null && p.coupon !== undefined ? `${num(p.coupon, 3)}%` : null, p.maturity_on ? `due ${p.maturity_on.slice(0, 4)}` : null, 'Bond'].filter(Boolean).join(' · ')
  return ASSET_TYPES.find(t => t.value === p.asset_type)?.label ?? ''
}

function toCsv(rows: Position[]) {
  const head = ['Ticker', 'Name', 'Sector', 'Type', 'Shares or face', 'Avg cost', 'Total cost', 'Price', 'Day %', 'Value', 'Weight %',
    'Unrealized $', 'Unrealized %', 'First bought', 'CUSIP', 'Coupon %', 'Maturity', 'Thesis', 'Notes']
  const esc = (v: unknown) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const lines = rows.map(p => [
    p.ticker, p.name, p.sector ?? PORTFOLIO_LEVEL, p.asset_type, p.shares, p.cost_basis, p.cost?.toFixed(2), p.price?.toFixed(isBond(p) ? 3 : 2),
    p.dayChangePct !== null ? (p.dayChangePct * 100).toFixed(2) : '', p.value?.toFixed(2),
    p.weight !== null ? (p.weight * 100).toFixed(2) : '', p.gain?.toFixed(2), p.gainPct !== null ? (p.gainPct * 100).toFixed(2) : '',
    p.purchased_on, p.cusip, p.coupon, p.maturity_on, p.thesis_url, p.notes,
  ].map(esc).join(','))
  return [head.join(','), ...lines].join('\n')
}

export function HoldingsTable({ positions, hasValues, editableSectors, sectorOptions, canManageAll, showSector = true, title = 'Holdings', cash = 0, sync = null, canImport = false, spySince = {} }: {
  positions: Position[]
  hasValues: boolean
  editableSectors: string[]
  sectorOptions: string[]
  canManageAll: boolean
  showSector?: boolean
  title?: string
  /** Shown as its own row under "All" so the total matches the account. */
  cash?: number
  sync?: HoldingsSync
  canImport?: boolean
  /** S&P 500 change since each holding was first bought, by id. */
  spySince?: Record<string, number>
}) {
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: hasValues ? 'value' : 'ticker', asc: !hasValues })
  const [editing, setEditing] = useState<Holding | 'new' | null>(null)
  const [importing, setImporting] = useState(false)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const today = todayET()
  const canEdit = (sector: string | null) => canManageAll || (sector !== null && editableSectors.includes(sector))
  const canAdd = canManageAll || editableSectors.length > 0
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const sectorCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of positions) m.set(p.sector ?? PORTFOLIO_LEVEL, (m.get(p.sector ?? PORTFOLIO_LEVEL) ?? 0) + 1)
    return [...m.entries()]
  }, [positions])

  const rows = useMemo(() => {
    const list = filter === 'All' ? positions : positions.filter(p => (p.sector ?? PORTFOLIO_LEVEL) === filter)
    const val = (p: Position): string | number => {
      const v = sort.key === 'ticker' ? (p.ticker ?? p.name)
        : sort.key === 'sector' ? (p.sector ?? 'zzz')
        : sort.key === 'purchased_on' ? (p.purchased_on ? Date.parse(`${p.purchased_on}T00:00:00Z`) : null)
        : p[sort.key]
      return v === null || v === undefined ? (sort.asc ? Infinity : -Infinity) : v
    }
    return [...list].sort((a, b) => {
      const av = val(a), bv = val(b)
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv)
      return sort.asc ? cmp : -cmp
    })
  }, [positions, filter, sort])

  const totals = useMemo(() => {
    const withGain = rows.filter(p => p.gain !== null)
    const cost = withGain.reduce((s, p) => s + p.cost!, 0)
    const gain = withGain.reduce((s, p) => s + p.gain!, 0)
    return {
      value: rows.reduce((s, p) => s + (p.value ?? 0), 0),
      weight: rows.reduce((s, p) => s + (p.weight ?? 0), 0),
      gain: withGain.length ? gain : null,
      gainPct: cost ? gain / cost : null,
    }
  }, [rows])
  const showCash = filter === 'All' && cash > 0 && hasValues
  const grand = totals.value + (showCash ? cash : 0)
  const cols = showSector ? 9 : 8
  const missingDates = positions.filter(p => !p.purchased_on).length

  function header(key: SortKey, label: string, numeric = false, extra = '') {
    const active = sort.key === key
    return (
      <th className={`sortable${numeric ? ' num' : ''}${extra ? ` ${extra}` : ''}`} aria-sort={active ? (sort.asc ? 'ascending' : 'descending') : 'none'}
        onClick={() => setSort(s => ({ key, asc: s.key === key ? !s.asc : !numeric }))}>
        {label} {active && (sort.asc ? <ArrowUp size={12} style={{ verticalAlign: -1 }} /> : <ArrowDown size={12} style={{ verticalAlign: -1 }} />)}
      </th>
    )
  }

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fig-holdings-${today}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <div style={{ minWidth: 0 }}>
          <h2>{title}</h2>
          {sync ? (
            <p className={sync.stale ? 'holdings-stale' : undefined}>
              Shares and cost basis from Fidelity, {sync.label}{sync.stale ? '. Over a month old: download a fresh positions file.' : '. Prices are live.'}
            </p>
          ) : canImport ? <p>Bring in shares and cost basis with Update from Fidelity.</p> : null}
        </div>
        <div className="ui-row">
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={exportCsv}><Download size={15} /> CSV</button>
          {canImport && <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setImporting(true)}><FileUp size={15} /> Update from Fidelity</button>}
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
      {canImport && positions.length > 0 && missingDates > 0 && (
        <p className="ui-hint" style={{ padding: '10px 20px 0' }}>
          {missingDates === positions.length ? 'No purchase dates yet.' : `${missingDates} holding${missingDates === 1 ? ' has' : 's have'} no purchase date.`}{' '}
          Drop Fidelity&apos;s activity history into Update from Fidelity, or add a date with the pencil.
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState title="No holdings yet" action={canAdd ? <button type="button" className="ui-btn ui-btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Add a holding</button> : undefined}>
          {canImport ? 'Use Update from Fidelity to bring in every position at once.' : 'Positions added by PMs and the PPG manager appear here.'}
        </EmptyState>
      ) : (
        <div className="ui-table-wrap" style={{ marginTop: 8 }}>
          <table className="ui-table holdings-grid">
            <thead>
              <tr>
                {header('ticker', 'Holding')}
                {showSector && header('sector', 'Sector', false, 'hide-sm')}
                {header('shares', 'Shares', true, 'hide-sm')}
                {header('cost_basis', 'Avg cost', true, 'hide-sm')}
                {header('dayChangePct', 'Price · today', true, 'hide-sm')}
                {header('value', hasValues ? 'Value · weight' : 'Value', true)}
                {header('gainPct', 'Gain / loss', true)}
                {header('purchased_on', 'Bought', false, 'hide-sm')}
                <th aria-label="Actions" className="hide-sm" />
              </tr>
            </thead>
            <tbody>
              {rows.map(p => {
                const bond = isBond(p)
                const expanded = open.has(p.id)
                const label = p.ticker ?? p.name
                return (
                  <Fragment key={p.id}>
                    <tr className={`holding-row${expanded ? ' open' : ''}`} onClick={() => toggle(p.id)}>
                      <td>
                        <div className="holding-name">
                          <button type="button" className="holding-toggle" aria-expanded={expanded} aria-label={`${expanded ? 'Hide' : 'Show'} details for ${label}`}
                            onClick={e => { e.stopPropagation(); toggle(p.id) }}>
                            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                          <div style={{ minWidth: 0 }}>
                            <strong>{label}</strong>
                            <span className="cell-sub holding-sub">{subtitle(p)}</span>
                          </div>
                        </div>
                      </td>
                      {showSector && <td className="nowrap ui-small hide-sm">{p.sector ?? PORTFOLIO_LEVEL}</td>}
                      <td className="num hide-sm">
                        {bond ? <span title="Face amount">{money(p.shares)}</span>
                          : p.ticker ? (p.shares ? num(p.shares, 4) : <span className="ui-badge ui-badge-amber">Add</span>) : '—'}
                      </td>
                      <td className="num hide-sm" title={bond ? 'Per $100 of face' : undefined}>{p.cost_basis === null ? '—' : bond ? num(p.cost_basis, 3) : money(p.cost_basis, true)}</td>
                      <td className="num hide-sm">
                        <span title={bond ? 'Per $100 of face, from Fidelity' : undefined}>{p.price === null ? '—' : bond ? num(p.price, 3) : money(p.price, true)}</span>
                        <span className="cell-sub">{p.ticker ? <Change v={p.dayChangePct} /> : bond ? 'Fidelity price' : ''}</span>
                      </td>
                      <td className="num">
                        {money(p.value)}
                        {hasValues && <span className="cell-sub">{p.weight !== null ? `${(p.weight * 100).toFixed(1)}%` : '—'}</span>}
                      </td>
                      <td className="num"><Gain value={p.gain} fraction={p.gainPct} /></td>
                      <td className="nowrap hide-sm">
                        {p.purchased_on ? <>{day(p.purchased_on)}<span className="cell-sub">{heldFor(p.purchased_on, today)}</span></> : <span className="ui-muted">—</span>}
                      </td>
                      <td style={{ width: 44 }} className="hide-sm">
                        {canEdit(p.sector) && (
                          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={`Edit ${label}`} onClick={e => { e.stopPropagation(); setEditing(p) }}>
                            <Pencil size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="holding-detail">
                        <td colSpan={cols - 1}>
                          <HoldingDetails p={p} spy={spySince[p.id] ?? null} today={today} onEdit={canEdit(p.sector) ? () => setEditing(p) : undefined} />
                        </td>
                        <td className="hide-sm" />
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
            {hasValues && (
              <tfoot>
                {showCash && (
                  <tr>
                    <td><div className="holding-name"><span className="holding-toggle" aria-hidden /><div><strong>Cash</strong><span className="cell-sub">Money market</span></div></div></td>
                    {showSector && <td className="hide-sm" />}
                    <td className="hide-sm" /><td className="hide-sm" /><td className="hide-sm" />
                    <td className="num">{money(cash)}<span className="cell-sub">{grand ? `${((cash / grand) * 100).toFixed(1)}%` : ''}</span></td>
                    <td /><td className="hide-sm" /><td className="hide-sm" />
                  </tr>
                )}
                <tr>
                  <td><div className="holding-name"><span className="holding-toggle" aria-hidden /><strong>Total</strong></div></td>
                  {showSector && <td className="hide-sm" />}
                  <td className="hide-sm" /><td className="hide-sm" /><td className="hide-sm" />
                  <td className="num">{money(grand)}<span className="cell-sub">{`${((totals.weight + (showCash && grand ? cash / grand : 0)) * 100).toFixed(1)}%`}</span></td>
                  <td className="num"><Gain value={totals.gain} fraction={totals.gainPct} /></td>
                  <td className="hide-sm" /><td className="hide-sm" />
                </tr>
              </tfoot>
            )}
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
      {importing && <HoldingsImport sectors={sectorOptions} onClose={() => setImporting(false)} />}
    </section>
  )
}

/* ---------- Details under a row ---------- */

function Fact({ k, v, sub }: { k: string; v: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}{sub !== undefined && sub !== null && sub !== '' && <span className="cell-sub">{sub}</span>}</dd>
    </div>
  )
}

function HoldingDetails({ p, spy, today, onEdit }: { p: Position; spy: number | null; today: string; onEdit?: () => void }) {
  const bond = isBond(p)
  const yields = bond ? bondYields(p.price, p.coupon ?? null, p.maturity_on ?? null, today) : null
  const range = p.ticker && p.high52 && p.low52 && p.price !== null && p.high52 > p.low52
    ? Math.min(1, Math.max(0, (p.price - p.low52) / (p.high52 - p.low52))) : null
  const ahead = spy !== null && p.gainPct !== null ? p.gainPct - spy : null

  return (
    <div className="holding-detail-body">
      <dl className="holding-facts">
        <Fact k="First bought" v={p.purchased_on ? day(p.purchased_on) : 'Not recorded'}
          sub={p.purchased_on ? `Held ${heldFor(p.purchased_on, today)}` : 'Add it with the pencil'} />
        {ahead !== null && (
          <Fact k="vs. S&P 500 since then"
            v={<span className={ahead >= 0 ? 'ui-up' : 'ui-down'}>{ahead >= 0 ? 'Ahead' : 'Behind'} by {Math.abs(ahead * 100).toFixed(1)} pts</span>}
            sub={`${p.ticker ?? 'Holding'} ${pct(p.gainPct, 1)} · S&P 500 ${pct(spy, 1)}`} />
        )}
        <Fact k={bond ? 'Face amount' : 'Shares'} v={bond ? money(p.shares) : num(p.shares, 4)} />
        <Fact k="Average cost" v={p.cost_basis === null ? '—' : bond ? `${num(p.cost_basis, 3)} per $100` : money(p.cost_basis, true)}
          sub={p.cost !== null ? `${money(p.cost, true)} total` : undefined} />
        <Fact k="Market value" v={money(p.value, true)} sub={p.weight !== null ? `${(p.weight * 100).toFixed(2)}% of the portfolio` : undefined} />
        <Fact k="Unrealized gain" v={p.gain === null ? '—' : <span className={p.gain >= 0 ? 'ui-up' : 'ui-down'}>{p.gain >= 0 ? '+' : '−'}{money(Math.abs(p.gain), true)}</span>}
          sub={p.gainPct !== null ? pct(p.gainPct) : undefined} />
        <Fact k="Price" v={p.price === null ? '—' : bond ? `${num(p.price, 3)} per $100` : money(p.price, true)}
          sub={p.ticker ? <><Change v={p.dayChangePct} /> today{p.dayChange !== null ? ` (${signedMoney(p.dayChange)})` : ''}</> : bond ? 'From Fidelity' : undefined} />
        {range !== null && (
          <Fact k="52-week range"
            v={<span className="range52" role="img" aria-label={`${Math.round(range * 100)}% of the way from the 52-week low to the high`}><span style={{ left: `${range * 100}%` }} /></span>}
            sub={`${money(p.low52, true)} – ${money(p.high52, true)}`} />
        )}
        {bond && (
          <>
            <Fact k="Coupon" v={p.coupon !== null && p.coupon !== undefined ? `${num(p.coupon, 3)}%` : '—'}
              sub={p.coupon && p.shares ? `${money((p.shares * p.coupon) / 100)} a year` : undefined} />
            <Fact k="Matures" v={p.maturity_on ? day(p.maturity_on) : '—'} sub={yields?.years && yields.years > 0 ? `In ${yields.years.toFixed(1)} years` : undefined} />
            <Fact k="Yield to maturity" v={yields?.toMaturity !== null && yields?.toMaturity !== undefined ? `≈ ${(yields.toMaturity * 100).toFixed(2)}%` : '—'}
              sub={yields?.current ? `${(yields.current * 100).toFixed(2)}% current yield` : undefined} />
            {p.cusip && <Fact k="CUSIP" v={p.cusip} />}
          </>
        )}
        <Fact k="Last changed" v={shortDate(p.updated_at)} />
      </dl>
      {(p.notes || (p.thesis_url && /^https?:\/\//.test(p.thesis_url))) && (
        <div className="holding-extra">
          {p.thesis_url && /^https?:\/\//.test(p.thesis_url) && (
            <a href={p.thesis_url} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={e => e.stopPropagation()}>
              <ExternalLink size={14} /> Pitch / thesis
            </a>
          )}
          {p.notes && <p>{p.notes}</p>}
        </div>
      )}
      {onEdit && (
        <div className="show-sm" style={{ marginTop: 14 }}>
          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={e => { e.stopPropagation(); onEdit() }}><Pencil size={14} /> Edit holding</button>
        </div>
      )}
    </div>
  )
}

/* ---------- Add / edit ---------- */

function HoldingForm({ holding, sectorOptions, allowPortfolioLevel, canDelete, defaultSector, onClose }: {
  holding: Holding | null
  sectorOptions: string[]
  allowPortfolioLevel: boolean
  canDelete: boolean
  defaultSector: string | undefined
  onClose: () => void
}) {
  const bondPrice = holding && holding.manual_value !== null && holding.shares ? (Number(holding.manual_value) / Number(holding.shares)) * 100 : null
  const [f, setF] = useState({
    ticker: holding?.ticker ?? '',
    name: holding?.name ?? '',
    sector: holding ? holding.sector ?? '' : defaultSector ?? '',
    asset_type: holding?.asset_type ?? 'equity' as AssetType,
    shares: holding?.shares ? String(holding.shares) : '',
    cost_basis: holding?.cost_basis ? String(holding.cost_basis) : '',
    manual_value: holding?.manual_value ? String(holding.manual_value) : '',
    price: bondPrice !== null ? String(Math.round(bondPrice * 1000) / 1000) : '',
    cusip: holding?.cusip ?? '',
    coupon: holding?.coupon !== null && holding?.coupon !== undefined ? String(holding.coupon) : '',
    maturity_on: holding?.maturity_on ?? '',
    purchased_on: holding?.purchased_on ?? '',
    thesis_url: holding?.thesis_url ?? '',
    notes: holding?.notes ?? '',
  })
  const [lookup, setLookup] = useState('')
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  const hasTicker = Boolean(f.ticker.trim())
  const bond = !hasTicker && f.asset_type === 'bond'

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
    const shares = f.shares ? Number(f.shares) : 0
    const row: Record<string, unknown> = {
      ticker: f.ticker.trim().toUpperCase() || null,
      name: f.name.trim(),
      sector: f.sector || null,
      asset_type: f.asset_type,
      shares,
      cost_basis: f.cost_basis ? Number(f.cost_basis) : null,
      manual_value: bond
        ? (f.price && shares ? Math.round(shares * Number(f.price)) / 100 : null)
        : !hasTicker && f.manual_value ? Number(f.manual_value) : null,
      purchased_on: f.purchased_on || null,
      thesis_url: f.thesis_url.trim() || null,
      notes: f.notes.trim() || null,
    }
    if (bond) Object.assign(row, { cusip: f.cusip.trim().toUpperCase() || null, coupon: f.coupon ? Number(f.coupon) : null, maturity_on: f.maturity_on || null })
    const supabase = createClient()
    const ok = await run(async () => must(holding
      ? await supabase.from('holdings').update(row).eq('id', holding.id)
      : await supabase.from('holdings').insert(row)), { success: holding ? 'Holding updated' : 'Holding added' })
    if (ok) onClose()
  }

  async function markSold() {
    if (!holding || !(await confirm({ title: `Mark ${holding.ticker ?? holding.name} as sold?`, body: 'It moves to Sold holdings and stays in the history.', confirmLabel: 'Mark as sold' }))) return
    const ok = await run(async () => must(await createClient().from('holdings').update({ is_active: false, sold_on: todayET() }).eq('id', holding.id)), { success: 'Marked as sold' })
    if (ok) onClose()
  }

  async function remove() {
    if (!holding || !(await confirm({ title: 'Delete this holding?', body: 'Only do this for mistakes. Use "Mark as sold" for real sales so history is kept.', confirmLabel: 'Delete', danger: true }))) return
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
        {hasTicker ? (
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
        ) : bond ? (
          <>
            <div className="ui-field">
              <label htmlFor="h-face">Face amount ($)</label>
              <input id="h-face" className="ui-input" type="number" step="any" min="0" value={f.shares} onChange={set('shares')} placeholder="10000" />
            </div>
            <div className="ui-field">
              <label htmlFor="h-cusip">CUSIP</label>
              <input id="h-cusip" className="ui-input" value={f.cusip} onChange={set('cusip')} maxLength={9} style={{ textTransform: 'uppercase' }} />
            </div>
            <div className="ui-field">
              <label htmlFor="h-bcost">Cost (per $100 of face)</label>
              <input id="h-bcost" className="ui-input" type="number" step="any" min="0" value={f.cost_basis} onChange={set('cost_basis')} placeholder="98.50" />
            </div>
            <div className="ui-field">
              <label htmlFor="h-bprice">Current price (per $100 of face)</label>
              <input id="h-bprice" className="ui-input" type="number" step="any" min="0" value={f.price} onChange={set('price')} placeholder="99.25" />
            </div>
            <div className="ui-field">
              <label htmlFor="h-coupon">Coupon (%)</label>
              <input id="h-coupon" className="ui-input" type="number" step="any" min="0" max="30" value={f.coupon} onChange={set('coupon')} placeholder="4.25" />
            </div>
            <div className="ui-field">
              <label htmlFor="h-maturity">Maturity date</label>
              <input id="h-maturity" className="ui-input" type="date" value={f.maturity_on} onChange={set('maturity_on')} />
            </div>
            <p className="ui-hint span-2" style={{ marginTop: -6 }}>Update from Fidelity fills these in and keeps the price current.</p>
          </>
        ) : (
          <div className="ui-field span-2">
            <label htmlFor="h-value">Current market value</label>
            <input id="h-value" className="ui-input" type="number" step="any" min="0" value={f.manual_value} onChange={set('manual_value')} placeholder="$" />
            <span className="ui-hint">Update this when you get a new statement. There&apos;s no live price without a ticker.</span>
          </div>
        )}
        <div className="ui-field">
          <label htmlFor="h-date">First bought</label>
          <input id="h-date" className="ui-input" type="date" value={f.purchased_on} onChange={set('purchased_on')} max={todayET()} />
        </div>
        <div className="ui-field">
          <label htmlFor="h-thesis">Pitch / thesis link</label>
          <input id="h-thesis" className="ui-input" type="url" value={f.thesis_url} onChange={set('thesis_url')} placeholder="https://docs.google.com/…" />
        </div>
        <div className="ui-field span-2">
          <label htmlFor="h-notes">Notes</label>
          <textarea id="h-notes" className="ui-textarea" rows={3} value={f.notes} onChange={set('notes')} placeholder="Who pitched it, catalysts, price targets, things to watch…" />
        </div>
      </form>
    </Modal>
  )
}
