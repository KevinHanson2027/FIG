// Squarified treemap layout (Bruls, Huizing & van Wijk): splits a rectangle
// into tiles whose areas match the weights while keeping them close to
// square, so small positions stay readable. Pure; used by the heatmap.

export type Box = { x: number; y: number; w: number; h: number }
export type Tile<T> = Box & { data: T }

type Sized<T> = { area: number; data: T }

function worst<T>(row: Sized<T>[], side: number) {
  const sum = row.reduce((s, r) => s + r.area, 0)
  let max = 0, min = Infinity
  for (const r of row) { if (r.area > max) max = r.area; if (r.area < min) min = r.area }
  const s2 = sum * sum, side2 = side * side
  return Math.max((side2 * max) / s2, s2 / (side2 * min))
}

/** Places one row along the shorter side of `box`; returns the space left. */
function place<T>(row: Sized<T>[], box: Box, out: Tile<T>[]): Box {
  const sum = row.reduce((s, r) => s + r.area, 0)
  if (box.w >= box.h) {
    const width = sum / box.h
    let y = box.y
    for (const r of row) { const h = r.area / width; out.push({ x: box.x, y, w: width, h, data: r.data }); y += h }
    return { x: box.x + width, y: box.y, w: box.w - width, h: box.h }
  }
  const height = sum / box.w
  let x = box.x
  for (const r of row) { const w = r.area / height; out.push({ x, y: box.y, w, h: height, data: r.data }); x += w }
  return { x: box.x, y: box.y + height, w: box.w, h: box.h - height }
}

export function squarify<T>(items: { weight: number; data: T }[], box: Box): Tile<T>[] {
  const list = items.filter(i => i.weight > 0 && Number.isFinite(i.weight)).sort((a, b) => b.weight - a.weight)
  const total = list.reduce((s, i) => s + i.weight, 0)
  const out: Tile<T>[] = []
  if (!total || box.w <= 0 || box.h <= 0) return out
  const scale = (box.w * box.h) / total
  const sized = list.map(i => ({ area: i.weight * scale, data: i.data }))
  let rest = { ...box }
  let row: Sized<T>[] = []
  for (let i = 0; i < sized.length;) {
    const side = Math.min(rest.w, rest.h)
    const next = [...row, sized[i]]
    if (row.length === 0 || worst(next, side) <= worst(row, side)) { row = next; i++ }
    else { rest = place(row, rest, out); row = [] }
  }
  if (row.length) place(row, rest, out)
  return out
}
