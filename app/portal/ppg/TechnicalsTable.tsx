'use client'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Download } from 'lucide-react'
import type { Technicals } from '@/lib/analytics'
import { money, pct, todayET } from '@/lib/format'

type Row = Technicals & { weight: number | null; sector: string }
type Key = keyof Row

const COLS: { key: Key; label: string; title?: string }[] = [
  { key: 'weight', label: 'Weight' },
  { key: 'price', label: 'Price' },
  { key: 'ret1M', label: '1M' },
  { key: 'ret3M', label: '3M' },
  { key: 'retYTD', label: 'YTD' },
  { key: 'ret1Y', label: '1Y' },
  { key: 'rsi', label: 'RSI', title: '14-day Relative Strength Index. Above 70 = overbought, below 30 = oversold.' },
  { key: 'vsSma50', label: 'vs 50D', title: 'Price vs. 50-day moving average' },
  { key: 'vsSma200', label: 'vs 200D', title: 'Price vs. 200-day moving average' },
  { key: 'rangePos', label: '52W range', title: 'Where the price sits between its 52-week low and high' },
  { key: 'vol', label: 'Volatility', title: 'Annualized standard deviation of daily returns (1Y)' },
  { key: 'beta', label: 'Beta', title: 'Sensitivity to the S&P 500 (1Y daily returns)' },
  { key: 'drawdown', label: 'Max DD', title: 'Largest peak-to-trough decline over the year' },
]

function Ret({ v }: { v: number | null }) {
  if (v === null) return <span className="ui-muted">—</span>
  return <span className={v > 0 ? 'ui-up' : v < 0 ? 'ui-down' : ''}>{pct(v, 1)}</span>
}

export default function TechnicalsTable({ rows }: { rows: Row[] }) {
  const [sort, setSort] = useState<{ key: Key; asc: boolean }>({ key: 'weight', asc: false })
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const av = a[sort.key] ?? -Infinity, bv = b[sort.key] ?? -Infinity
    const cmp = typeof av === 'string' ? String(av).localeCompare(String(bv)) : Number(av) - Number(bv)
    return sort.asc ? cmp : -cmp
  }), [rows, sort])

  function exportCsv() {
    const head = ['Ticker', 'Sector', ...COLS.map(c => c.label)]
    const lines = sorted.map(r => [r.ticker, r.sector, ...COLS.map(c => { const v = r[c.key]; return typeof v === 'number' ? v.toFixed(4) : v ?? '' })].join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }))
    a.download = `fig-technicals-${todayET()}.csv`
    a.click()
  }

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <div><h2>Technicals by holding</h2><p>Click a column to sort. Hover a header for what it means.</p></div>
        <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={exportCsv}><Download size={15} /> CSV</button>
      </div>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => setSort(s => ({ key: 'ticker', asc: s.key === 'ticker' ? !s.asc : true }))}>Holding</th>
              {COLS.map(c => (
                <th key={c.key} className="sortable num" title={c.title} aria-sort={sort.key === c.key ? (sort.asc ? 'ascending' : 'descending') : 'none'}
                  onClick={() => setSort(s => ({ key: c.key, asc: s.key === c.key ? !s.asc : false }))}>
                  {c.label} {sort.key === c.key && (sort.asc ? <ArrowUp size={12} style={{ verticalAlign: -1 }} /> : <ArrowDown size={12} style={{ verticalAlign: -1 }} />)}
                </th>
              ))}
              <th title="50-day vs 200-day moving average">Trend</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.ticker}>
                <td><strong style={{ color: 'var(--ui-ink)' }}>{r.ticker}</strong><div className="ui-small ui-muted" style={{ whiteSpace: 'nowrap' }}>{r.sector}</div></td>
                <td className="num">{r.weight !== null ? `${(r.weight * 100).toFixed(1)}%` : '—'}</td>
                <td className="num">{money(r.price, true)}</td>
                <td className="num"><Ret v={r.ret1M} /></td>
                <td className="num"><Ret v={r.ret3M} /></td>
                <td className="num"><Ret v={r.retYTD} /></td>
                <td className="num"><Ret v={r.ret1Y} /></td>
                <td className="num">
                  {r.rsi === null ? '—' : (
                    <span className={`ui-badge ${r.rsi >= 70 ? 'ui-badge-amber' : r.rsi <= 30 ? 'ui-badge-blue' : ''}`} title={r.rsi >= 70 ? 'Overbought' : r.rsi <= 30 ? 'Oversold' : 'Neutral'}>
                      {r.rsi.toFixed(0)}{r.rsi >= 70 ? ' OB' : r.rsi <= 30 ? ' OS' : ''}
                    </span>
                  )}
                </td>
                <td className="num"><Ret v={r.vsSma50} /></td>
                <td className="num"><Ret v={r.vsSma200} /></td>
                <td className="num" style={{ minWidth: 96 }}>
                  {r.rangePos === null ? '—' : (
                    <span title={`${(r.rangePos * 100).toFixed(0)}% of the way from the 52-week low to the high`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="ui-meter" style={{ width: 56, display: 'inline-block' }}><span style={{ width: `${Math.max(4, r.rangePos * 100)}%` }} /></span>
                      <span className="ui-small">{(r.rangePos * 100).toFixed(0)}%</span>
                    </span>
                  )}
                </td>
                <td className="num">{pct(r.vol, 1, false)}</td>
                <td className="num">{r.beta === null ? '—' : r.beta.toFixed(2)}</td>
                <td className="num ui-down">{pct(r.drawdown, 1, false)}</td>
                <td className="nowrap">
                  {r.trend === 'up' ? <span className="ui-up">▲ Up</span> : r.trend === 'down' ? <span className="ui-down">▼ Down</span> : <span className="ui-muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
