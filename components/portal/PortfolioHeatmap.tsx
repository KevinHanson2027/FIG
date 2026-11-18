'use client'
// Portfolio → Heatmap: every holding as a tile sized by its value and grouped
// by sector, colored by today's move or the return since it was bought.
// Each tile also prints its signed change, so color is never the only cue.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { squarify, type Tile } from '@/lib/treemap'
import { money, pct } from '@/lib/format'

export type HeatItem = {
  id: string
  label: string
  name: string
  sector: string
  value: number | null
  weight: number | null
  day: number | null
  dayChange: number | null
  total: number | null
  cost: number | null
  gain: number | null
}

type Mode = 'day' | 'total'

const SCALE: Record<Mode, number[]> = {
  day: [0.005, 0.01, 0.02, 0.03],
  total: [0.05, 0.15, 0.3, 0.6],
}
// Light → strong. The two strong steps carry white text (≥ 4.5:1).
const UP = ['#d3efda', '#8fd1a2', '#2b7f45', '#1b6332']
const DOWN = ['#f8d3cf', '#f0a19a', '#c43c33', '#9e2219']
const FLAT = '#e4e6ec'
const NONE = '#eef0f4'

function step(v: number, mode: Mode) {
  let i = -1
  for (let s = 0; s < SCALE[mode].length; s++) if (Math.abs(v) >= SCALE[mode][s]) i = s
  return i
}

function colors(v: number | null, mode: Mode) {
  if (v === null || !Number.isFinite(v)) return { bg: NONE, fg: 'var(--ui-muted)' }
  const i = step(v, mode)
  if (i < 0) return { bg: FLAT, fg: 'var(--ui-ink)' }
  return { bg: (v > 0 ? UP : DOWN)[i], fg: i >= 2 ? '#fff' : 'var(--ui-ink)' }
}

const signed = (v: number | null, digits = 2) => (v === null || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(digits)}%`)

type Sector = { sector: string; items: HeatItem[]; value: number; move: number | null }

export function PortfolioHeatmap({ items, sized }: { items: HeatItem[]; sized: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [mode, setMode] = useState<Mode>('day')
  const [tip, setTip] = useState<{ item: HeatItem; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!box.current) return
    const ro = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  const height = width ? (width < 640 ? Math.round(width * 1.3) : Math.round(Math.min(640, Math.max(440, width * 0.56)))) : 0
  const weightOf = (i: HeatItem) => (sized ? i.value ?? 0 : 1)

  const sectors: Sector[] = useMemo(() => {
    const map = new Map<string, HeatItem[]>()
    for (const i of items) if (weightOf(i) > 0) map.set(i.sector, [...(map.get(i.sector) ?? []), i])
    return [...map.entries()].map(([sector, list]) => {
      const value = list.reduce((s, i) => s + weightOf(i), 0)
      let move: number | null = null
      if (mode === 'day') {
        const change = list.reduce((s, i) => s + (i.dayChange ?? 0), 0)
        const base = list.reduce((s, i) => s + (i.dayChange !== null && i.value !== null ? i.value - i.dayChange : 0), 0)
        move = base > 0 ? change / base : null
      } else {
        const gain = list.reduce((s, i) => s + (i.gain ?? 0), 0)
        const cost = list.reduce((s, i) => s + (i.gain !== null ? i.cost ?? 0 : 0), 0)
        move = cost > 0 ? gain / cost : null
      }
      return { sector, items: list, value, move }
    })
    // weightOf only depends on `sized`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, mode, sized])

  const layout = useMemo(() => {
    if (!width || !height) return []
    return squarify(sectors.map(s => ({ weight: s.value, data: s })), { x: 0, y: 0, w: width, h: height }).map(t => {
      const head = t.h > 64 && t.w > 84 ? 20 : 0
      const inner = { x: t.x + 1, y: t.y + head + 1, w: Math.max(0, t.w - 2), h: Math.max(0, t.h - head - 2) }
      return { ...t, head, tiles: squarify(t.data.items.map(i => ({ weight: weightOf(i), data: i })), inner) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectors, width, height])

  function show(item: HeatItem, e: { clientX: number; clientY: number } | null, tile?: Tile<HeatItem>) {
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return
    const x = e ? e.clientX - rect.left : (tile ? tile.x + tile.w / 2 : 0)
    const y = e ? e.clientY - rect.top : (tile ? tile.y + tile.h / 2 : 0)
    setTip({ item, x, y })
  }

  const move = (i: HeatItem) => (mode === 'day' ? i.day : i.total)

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <div style={{ minWidth: 0 }}>
          <h2>Portfolio heatmap</h2>
          <p>Box size is the position&apos;s value; color is {mode === 'day' ? 'today’s move' : 'the return since it was bought'}.</p>
        </div>
        <div className="ui-segmented" role="group" aria-label="Color by">
          <button type="button" className={mode === 'day' ? 'on' : ''} aria-pressed={mode === 'day'} onClick={() => setMode('day')}>Today</button>
          <button type="button" className={mode === 'total' ? 'on' : ''} aria-pressed={mode === 'total'} onClick={() => setMode('total')}>Since bought</button>
        </div>
      </div>
      <div className="ui-card-body">
        {!sized && (
          <p className="ui-hint" style={{ marginBottom: 10 }}>
            Boxes are all the same size until share counts are in. Use Update from Fidelity on the <Link href="/portal/portfolio?tab=holdings" className="ui-link">Holdings</Link> tab.
          </p>
        )}
        <div ref={box} className="heatmap" style={{ height: height || 440 }} onMouseLeave={() => setTip(null)}
          role="group" aria-label={`Holdings colored by ${mode === 'day' ? 'today’s change' : 'return since bought'}`}>
          {layout.map(s => (
            <div key={s.data.sector} className="heatmap-sector" style={{ left: s.x, top: s.y, width: s.w, height: s.h }}>
              {s.head > 0 && (
                <div className="heatmap-sector-head" style={{ height: s.head }}>
                  <span>{s.data.sector}</span>
                  <span>{signed(s.data.move, 1)}</span>
                </div>
              )}
              {s.tiles.map(t => {
                const v = move(t.data)
                const c = colors(v, mode)
                const w = t.w - 2, h = t.h - 2
                // Shrink labels to fit; a box too small for a readable label shows details on hover/tap.
                const fit = Math.min(22, (w - 6) / (t.data.label.length * 0.62), h / 2.4)
                const size = Math.max(10, fit)
                const showTicker = fit >= 9 && h >= 14
                const showMove = showTicker && w >= 38 && h >= 30
                return (
                  <button key={t.data.id} type="button" className="heatmap-tile"
                    style={{ left: t.x - s.x + 1, top: t.y - s.y + 1, width: Math.max(0, w), height: Math.max(0, h), background: c.bg, color: c.fg }}
                    aria-label={`${t.data.label}, ${t.data.name}. ${t.data.weight !== null ? `${(t.data.weight * 100).toFixed(1)}% of the portfolio. ` : ''}Today ${signed(t.data.day)}. Since bought ${signed(t.data.total)}.`}
                    onMouseMove={e => show(t.data, e)} onFocus={() => show(t.data, null, t)} onBlur={() => setTip(null)}
                    onClick={e => show(t.data, e.detail ? e : null, t)}>
                    {showTicker && <span className="heatmap-ticker" style={{ fontSize: size }}>{t.data.label}</span>}
                    {showMove && <span className="heatmap-move" style={{ fontSize: Math.max(10, size * 0.62) }}>{signed(v)}</span>}
                  </button>
                )
              })}
            </div>
          ))}
          {tip && (
            <div className="heatmap-tip" style={{ left: Math.min(Math.max(8, tip.x + 14), Math.max(8, width - 236)), top: Math.min(tip.y + 14, Math.max(8, (height || 440) - 150)) }}>
              <div className="heatmap-tip-head"><strong>{tip.item.label}</strong><span>{tip.item.sector}</span></div>
              <div className="heatmap-tip-name">{tip.item.name}</div>
              <dl>
                <div><dt>Value</dt><dd>{money(tip.item.value)}{tip.item.weight !== null ? ` · ${(tip.item.weight * 100).toFixed(1)}%` : ''}</dd></div>
                <div><dt>Today</dt><dd>{signed(tip.item.day)}{tip.item.dayChange !== null ? ` (${tip.item.dayChange >= 0 ? '+' : '−'}${money(Math.abs(tip.item.dayChange))})` : ''}</dd></div>
                <div><dt>Since bought</dt><dd>{tip.item.total !== null ? pct(tip.item.total) : '—'}</dd></div>
              </dl>
            </div>
          )}
        </div>
        <div className="heatmap-legend" aria-label="Color scale">
          {[...DOWN].reverse().map((bg, i) => <span key={`d${i}`} style={{ background: bg, color: i < 2 ? '#fff' : 'var(--ui-ink)' }}>{`−${(SCALE[mode][SCALE[mode].length - 1 - i] * 100).toFixed(mode === 'day' ? 1 : 0)}%`}</span>)}
          <span style={{ background: FLAT }}>0</span>
          {UP.map((bg, i) => <span key={`u${i}`} style={{ background: bg, color: i >= 2 ? '#fff' : 'var(--ui-ink)' }}>{`+${(SCALE[mode][i] * 100).toFixed(mode === 'day' ? 1 : 0)}%`}</span>)}
        </div>
        <p className="ui-hint" style={{ marginTop: 8 }}>
          Hover or tap a box for details. Cash and holdings without a value aren&apos;t shown. Full numbers are on the <Link href="/portal/portfolio?tab=holdings" className="ui-link">Holdings</Link> tab.
        </p>
      </div>
    </section>
  )
}
