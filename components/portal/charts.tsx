'use client'
// Small, dependency-free charts that follow the portal's data-viz rules:
// thin marks, hairline grid, one axis, legend for 2+ series, direct end
// labels, crosshair tooltip that lists every series, and a table view.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Table2 } from 'lucide-react'

export const VIZ = {
  series: '#2a78d6',   // categorical slot 1 (FIG / primary series)
  context: '#898781',  // de-emphasis gray for benchmarks
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  label: '#6b7280',
  ink: '#0b0b0b',
  surface: '#ffffff',
}

// Diverging ramp (−1 → +1): blue ← gray → red, computed in OKLab from the
// documented poles; every step clears 4.5:1 for dark-ink labels.
export const DIVERGING = ['#2a78d6', '#6097de', '#90b5e4', '#c0d2e9', '#f0efec', '#f3c9c2', '#f1a299', '#ec7971', '#e34948']

export function divergingColor(v: number) {
  const clamped = Math.max(-1, Math.min(1, v))
  return DIVERGING[Math.round((clamped + 1) * 4)]
}

function niceStep(range: number, target = 4) {
  const raw = range / target
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export type LineSeries = { name: string; color: string; values: (number | null)[]; emphasis?: boolean }

/** Multi-series line chart over shared dates (one y-axis). */
export function LineChart({ dates, series, height = 260, format = (v: number) => v.toFixed(1), label }: {
  dates: string[]
  series: LineSeries[]
  height?: number
  format?: (v: number) => string
  label: string
}) {
  const [box, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const pad = { top: 12, right: 76, bottom: 28, left: 44 }
  const plotW = Math.max(0, width - pad.left - pad.right)
  const plotH = height - pad.top - pad.bottom

  const { min, max, ticks } = useMemo(() => {
    const all = series.flatMap(s => s.values).filter((v): v is number => v !== null && Number.isFinite(v))
    if (!all.length) return { min: 0, max: 1, ticks: [0, 1] }
    let lo = Math.min(...all), hi = Math.max(...all)
    if (lo === hi) { lo -= 1; hi += 1 }
    const step = niceStep(hi - lo)
    const start = Math.floor(lo / step) * step, end = Math.ceil(hi / step) * step
    const t: number[] = []
    for (let v = start; v <= end + step / 2; v += step) t.push(Number(v.toFixed(10)))
    return { min: start, max: end, ticks: t }
  }, [series])

  const x = (i: number) => pad.left + (dates.length <= 1 ? plotW / 2 : (i / (dates.length - 1)) * plotW)
  const y = (v: number) => pad.top + plotH - ((v - min) / (max - min)) * plotH

  const xTicks = useMemo(() => {
    if (dates.length < 2) return dates.map((_, i) => i)
    const n = Math.min(5, dates.length)
    return Array.from({ length: n }, (_, k) => Math.round((k / (n - 1)) * (dates.length - 1)))
  }, [dates])

  const fmtDate = (d: string, long = false) => {
    const [yy, mm, dd] = d.split('-').map(Number)
    return new Date(Date.UTC(yy, mm - 1, dd)).toLocaleDateString('en-US', long
      ? { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }
      : { timeZone: 'UTC', month: 'short', ...(dates.length > 400 ? { year: '2-digit' } : { day: 'numeric' }) })
  }

  function path(values: (number | null)[]) {
    let d = ''
    values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) return
      d += `${d && values[i - 1] !== null ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    })
    return d
  }

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / rect.width
    setHover(Math.max(0, Math.min(dates.length - 1, Math.round(rel * (dates.length - 1)))))
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') setHover(h => Math.min(dates.length - 1, (h ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setHover(h => Math.max(0, (h ?? dates.length) - 1))
    else if (e.key === 'Escape') setHover(null)
  }

  const lastIndex = (vals: (number | null)[]) => { for (let i = vals.length - 1; i >= 0; i--) if (vals[i] !== null) return i; return -1 }
  // End labels: nudge apart only if they'd overlap by a few px; otherwise rely on the legend.
  const endLabels = series.map(s => { const i = lastIndex(s.values); return i < 0 ? null : { s, i, ly: y(s.values[i]!) } })
  const collide = endLabels.length === 2 && endLabels[0] && endLabels[1] && Math.abs(endLabels[0].ly - endLabels[1].ly) < 14

  const ordered = [...series].sort((a, b) => Number(Boolean(a.emphasis)) - Number(Boolean(b.emphasis)))

  return (
    <figure style={{ margin: 0 }}>
      <div className="ui-spread" style={{ marginBottom: 10 }}>
        {series.length > 1 ? (
          <div className="ui-row" style={{ gap: 14 }} aria-label="Legend">
            {series.map(s => (
              <span key={s.name} className="ui-row" style={{ gap: 6, fontSize: '0.8125rem', color: 'var(--ui-text)' }}>
                <span style={{ width: 16, height: 2, borderRadius: 2, background: s.color, display: 'inline-block' }} />{s.name}
              </span>
            ))}
          </div>
        ) : <span />}
        <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setShowTable(t => !t)} aria-pressed={showTable}>
          <Table2 size={15} /> {showTable ? 'Chart' : 'Table'}
        </button>
      </div>

      {showTable ? (
        <div className="ui-table-wrap" style={{ maxHeight: height, overflowY: 'auto' }}>
          <table className="ui-table">
            <caption className="ui-sr-only">{label}</caption>
            <thead><tr><th>Date</th>{series.map(s => <th key={s.name} className="num">{s.name}</th>)}</tr></thead>
            <tbody>
              {dates.map((d, i) => ({ d, i })).filter(({ i }) => i % Math.max(1, Math.ceil(dates.length / 60)) === 0 || i === dates.length - 1).reverse().map(({ d, i }) => (
                <tr key={d}><td>{fmtDate(d, true)}</td>{series.map(s => <td key={s.name} className="num">{s.values[i] === null ? '—' : format(s.values[i]!)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={box} style={{ position: 'relative', height }}>
          {width > 0 && (
            <svg width={width} height={height} role="img" aria-label={label} style={{ display: 'block', overflow: 'visible' }}>
              {ticks.map(t => (
                <g key={t}>
                  <line x1={pad.left} x2={pad.left + plotW} y1={y(t)} y2={y(t)} stroke={VIZ.grid} strokeWidth={1} shapeRendering="crispEdges" />
                  <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={VIZ.label} style={{ fontVariantNumeric: 'tabular-nums' }}>{format(t)}</text>
                </g>
              ))}
              <line x1={pad.left} x2={pad.left + plotW} y1={pad.top + plotH} y2={pad.top + plotH} stroke={VIZ.axis} strokeWidth={1} shapeRendering="crispEdges" />
              {xTicks.map((i, k) => (
                <text key={i} x={x(i)} y={height - 8} fontSize={11} fill={VIZ.label}
                  textAnchor={k === 0 ? 'start' : k === xTicks.length - 1 ? 'end' : 'middle'}>{fmtDate(dates[i])}</text>
              ))}
              {ordered.map(s => (
                <path key={s.name} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {endLabels.map(e => e && (
                <g key={e.s.name}>
                  <circle cx={x(e.i)} cy={e.ly} r={4} fill={e.s.color} stroke={VIZ.surface} strokeWidth={2} />
                  {/* Converging lines: skip end labels and let the legend + tooltip carry values. */}
                  {!collide && (
                    <text x={x(e.i) + 8} y={e.ly} dy="0.32em" fontSize={12} fontWeight={600} fill={VIZ.ink}>{format(e.s.values[e.i]!)}</text>
                  )}
                </g>
              ))}
              {hover !== null && (
                <g pointerEvents="none">
                  <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + plotH} stroke={VIZ.axis} strokeWidth={1} />
                  {series.map(s => s.values[hover] !== null && (
                    <circle key={s.name} cx={x(hover)} cy={y(s.values[hover]!)} r={4} fill={s.color} stroke={VIZ.surface} strokeWidth={2} />
                  ))}
                </g>
              )}
              <rect
                x={pad.left} y={pad.top} width={plotW} height={plotH} fill="transparent"
                tabIndex={0} aria-label={`${label}. Use left and right arrow keys to read values.`}
                onPointerMove={onMove} onPointerLeave={() => setHover(null)} onKeyDown={onKey} onBlur={() => setHover(null)}
                style={{ outline: 'none', cursor: 'crosshair' }}
              />
            </svg>
          )}
          {hover !== null && width > 0 && (
            <div role="status" style={{
              position: 'absolute', top: 4, pointerEvents: 'none', background: '#fff', border: '1px solid var(--ui-line)',
              borderRadius: 8, boxShadow: 'var(--ui-shadow-2)', padding: '8px 10px', fontSize: '0.8125rem', minWidth: 140,
              ...(x(hover) > width / 2 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }),
            }}>
              <div style={{ color: 'var(--ui-muted)', marginBottom: 4 }}>{fmtDate(dates[hover], true)}</div>
              {series.map(s => (
                <div key={s.name} className="ui-row" style={{ gap: 8, flexWrap: 'nowrap', justifyContent: 'space-between' }}>
                  <span className="ui-row" style={{ gap: 6, color: 'var(--ui-muted)' }}>
                    <span style={{ width: 12, height: 2, background: s.color, display: 'inline-block', borderRadius: 2 }} />{s.name}
                  </span>
                  <strong style={{ color: 'var(--ui-ink)', fontVariantNumeric: 'tabular-nums' }}>{s.values[hover] === null ? '—' : format(s.values[hover]!)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  )
}

/** Horizontal bars for one series (e.g. allocation): one hue, value at the tip. */
export function BarList({ items, format, max: maxOverride }: {
  items: { label: string; value: number; note?: string }[]
  format: (v: number) => string
  max?: number
}) {
  const max = maxOverride ?? Math.max(...items.map(i => i.value), 0)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, max-content) minmax(0, 1fr)', gap: '10px 14px', alignItems: 'center' }}>
      {items.map(i => (
        <div key={i.label} style={{ display: 'contents' }} title={`${i.label}: ${format(i.value)}${i.note ? ` (${i.note})` : ''}`}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ui-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.label}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{
              height: 12, width: `${max > 0 ? Math.max(1.5, (i.value / max) * 100) : 0}%`, maxWidth: 'calc(100% - 64px)',
              background: VIZ.series, borderRadius: '0 4px 4px 0', flexShrink: 0,
            }} />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ui-ink)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{format(i.value)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

/** Correlation-style matrix with a diverging color scale and values in each cell. */
export function Heatmap({ labels, matrix, caption }: { labels: string[]; matrix: number[][]; caption: string }) {
  const n = labels.length
  return (
    <div>
      <div className="ui-table-wrap">
        <table style={{ borderCollapse: 'separate', borderSpacing: 2, fontSize: '0.72rem', margin: '0 auto' }}>
          <caption className="ui-sr-only">{caption}</caption>
          <thead>
            <tr>
              <th />
              {labels.map(l => <th key={l} scope="col" style={{ fontWeight: 600, color: 'var(--ui-muted)', padding: '0 2px 4px', writingMode: n > 10 ? 'vertical-rl' : undefined }}>{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {labels.map((row, i) => (
              <tr key={row}>
                <th scope="row" style={{ fontWeight: 600, color: 'var(--ui-muted)', textAlign: 'right', paddingRight: 6 }}>{row}</th>
                {labels.map((col, j) => {
                  const v = matrix[i][j]
                  return (
                    <td key={col} title={`${row} vs ${col}: ${v.toFixed(2)}`}
                      style={{ width: 38, height: 32, minWidth: 38, textAlign: 'center', background: divergingColor(v), color: VIZ.ink, borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>
                      {i === j ? '' : v.toFixed(2)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ui-row" style={{ justifyContent: 'center', gap: 8, marginTop: 12, fontSize: '0.75rem', color: 'var(--ui-muted)' }} aria-hidden>
        <span>−1 move opposite</span>
        <span style={{ display: 'flex' }}>{DIVERGING.map(c => <span key={c} style={{ width: 18, height: 10, background: c }} />)}</span>
        <span>+1 move together</span>
      </div>
    </div>
  )
}
