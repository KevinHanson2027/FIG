// Reads the CSV files Fidelity exports, so nobody retypes numbers:
//  • Positions (Accounts → Positions → Download): shares, cost basis, bond
//    values and cash.
//  • Activity history (Activity & Orders → History → Download), or any
//    spreadsheet saved as CSV with Symbol and Date columns: when each holding
//    was bought.
// Pure functions with no server or browser APIs, so the import preview, the
// apply step and tests all read files the same way. Account numbers never
// leave this module; accounts are labelled like "Rollover IRA (…1151)".
import { day } from '@/lib/format'
import type { AssetType } from '@/lib/types'

/* ---------------------------------------------------------------------
 * CSV and values
 * ------------------------------------------------------------------- */

export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field.trim() === '') { field = ''; quoted = true }
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

/** "$6,500.02", "+$0.05", "-43.97%", "(12.50)", "--" → number or null. */
export function parseNumber(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  let s = raw.trim().replace(/[$,%\s]/g, '')
  if (!s || /^(-+|n\/?a)$/i.test(s)) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  if (s.startsWith('+')) s = s.slice(1)
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1) }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? (negative ? -n : n) : null
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function isoDay(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCMonth() !== m - 1) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** "11/17/2026", "2026-11-17", "Nov-17-2026", "Nov 17, 2026" → "2026-11-17". */
export function parseDate(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return isoDay(+m[1], +m[2], +m[3])
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/)
  if (m) return isoDay(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2])
  m = s.match(/^([A-Za-z]{3})[a-z]*\.?[- ](\d{1,2}),?[- ](\d{4})\b/)
  if (m) {
    const month = MONTHS.indexOf(m[1].toLowerCase())
    return month >= 0 ? isoDay(+m[3], month + 1, +m[2]) : null
  }
  return null
}

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits

/* ---------------------------------------------------------------------
 * Symbols and securities
 * ------------------------------------------------------------------- */

/** Fidelity, Yahoo and people write class shares differently (BRK/B, BRK.B, BRK-B). */
export function normalizeSymbol(raw: string | null | undefined): string {
  return (raw ?? '').trim().toUpperCase().replace(/\*+$/, '').replace(/[./]/g, '-')
}

/** Bonds and CDs show a 9-character CUSIP where stocks show a ticker. */
export function isCusip(symbol: string) {
  return /^[0-9A-Z]{8}[0-9]$/.test(symbol)
}

/** Coupon and maturity from a description like "… 4.00000% 02/15/2034 NTS NOTE". */
export function bondTerms(description: string): { coupon: number | null; maturity: string | null } {
  const coupon = description.match(/(\d{1,2}(?:\.\d+)?)\s*%/)
  const maturity = description.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  return {
    coupon: coupon ? round(Number(coupon[1]), 4) : null,
    maturity: maturity ? isoDay(+maturity[3], +maturity[1], +maturity[2]) : null,
  }
}

const SMALL_WORDS = new Set(['of', 'and', 'the', 'for', 'de'])
const KEEP_UPPER = new Set(['US', 'USA', 'ETF', 'SPDR', 'REIT', 'NV', 'SA', 'AG', 'PLC', 'LP', 'LLC', 'CD', 'FDIC', 'NA'])

/** "BLUE OWL CAPITAL CORPORATION NOTE" → "Blue Owl Capital Corporation Note". */
export function titleCase(s: string) {
  return s.toLowerCase().split(/\s+/).filter(Boolean).map((w, i) => {
    if (KEEP_UPPER.has(w.toUpperCase()) || /\d/.test(w)) return w.toUpperCase()
    if (i > 0 && SMALL_WORDS.has(w)) return w
    return w[0].toUpperCase() + w.slice(1)
  }).join(' ')
}

/** A readable name for a new bond: "Blue Owl Capital Corporation 5.95% 2029". */
export function bondName(description: string) {
  const { coupon, maturity } = bondTerms(description)
  const issuer = description.split(/\d{1,2}(?:\.\d+)?\s*%/)[0]
    .replace(/\bTREAS\b/gi, 'TREASURY')
    .replace(/\b(NOTES?|NTS|BONDS?|DEBS?|SR|SER\s+\S+|CALL|MAKE|WHOLE)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim()
  const parts = [titleCase(issuer || description)]
  if (coupon !== null) parts.push(`${coupon.toFixed(2)}%`)
  if (maturity) parts.push(maturity.slice(0, 4))
  return parts.join(' ')
}

/* ---------------------------------------------------------------------
 * Reading a file
 * ------------------------------------------------------------------- */

export type AsOf = { date: string | null; label: string | null }

export type FidelityPosition = {
  symbol: string            // normalized ticker or CUSIP
  bond: boolean             // CUSIP-identified (bonds, notes, CDs)
  description: string
  quantity: number          // shares, or face amount for bonds
  lastPrice: number | null  // per share, or per $100 of face for bonds
  value: number | null
  costTotal: number | null
}

export type FidelityAccount = {
  label: string
  positions: FidelityPosition[]
  cash: number
  cashSources: string[]
  skipped: { symbol: string; reason: string }[]
}

export type PositionsFile = { kind: 'positions'; asOf: AsOf; accounts: FidelityAccount[] }

export type DatedSymbol = {
  symbol: string
  /** Start of the current holding period (history) or the date given (list). */
  first: string | null
  /** Shares the file accounts for, so the date can be checked (history only). */
  net: number | null
  /** How the current holding period started (history only). */
  via: 'buy' | 'other' | 'list'
}

export type DatesFile = {
  kind: 'dates'
  source: 'history' | 'list'
  range: { from: string | null; to: string | null }
  symbols: DatedSymbol[]
}

export type FidelityFile = PositionsFile | DatesFile

const norm = (s: string) => s.toLowerCase().replace(/\((\$|%)\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

function columns(header: string[]) {
  const names = header.map(norm)
  const find = (...options: (string | RegExp)[]) => {
    for (const o of options) {
      const i = names.findIndex(n => (typeof o === 'string' ? n === o : o.test(n)))
      if (i >= 0) return i
    }
    return -1
  }
  return { names, find }
}

const DATE_COLUMN = /\b(acquired|acquisition|bought|purchased?|open date|trade date|run date|date)\b/

/** Positions, purchase dates, or null if it isn't a file we understand. */
export function readFidelityFile(text: string, filename = ''): FidelityFile | null {
  const rows = parseCsv(text)
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const { names, find } = columns(rows[i])
    const symbol = find('symbol', 'ticker', /\bsymbol\b/, /\bticker\b/)
    if (symbol < 0) continue
    const action = find('action')
    const acquired = find(/\b(acquired|acquisition|bought|purchased?)\b/)
    const isPositions = action < 0 && acquired < 0 && names.includes('quantity')
      && (names.includes('current value') || names.includes('cost basis total') || names.includes('last price'))
    if (isPositions) return readPositions(rows, i, filename)
    const dateCol = action >= 0 ? find('run date', 'trade date', 'date', DATE_COLUMN) : acquired >= 0 ? acquired : find(DATE_COLUMN)
    if (dateCol >= 0 && dateCol !== symbol) return readDates(rows, i, symbol, dateCol, action)
  }
  return null
}

function readAsOf(rows: string[][], filename: string): AsOf {
  for (const row of rows) {
    const line = row.join(' ')
    const m = line.match(/date downloaded[:\s]+(.+)$/i)
    if (!m) continue
    const date = parseDate(m[1])
    const t = m[1].match(/(\d{1,2}):(\d{2})\s*([ap])\.?\s*m/i)
    const time = t ? `${+t[1]}:${t[2]} ${t[3].toUpperCase()}M ET` : null
    if (date) return { date, label: time ? `${day(date)}, ${time}` : day(date) }
  }
  const fromName = filename.match(/([A-Za-z]{3}-\d{1,2}-\d{4})/)
  const date = fromName ? parseDate(fromName[1]) : null
  return { date, label: date ? day(date) : null }
}

const MONEY_MARKET = new Set(['CORE', 'FCASH', 'SPAXX', 'FDRXX', 'FZFXX', 'SPRXX', 'FZDXX', 'FTEXX', 'FMPXX'])

function readPositions(rows: string[][], headerIndex: number, filename: string): PositionsFile {
  const { find } = columns(rows[headerIndex])
  const col = {
    number: find('account number'),
    name: find('account name', 'account'),
    symbol: find('symbol'),
    description: find('description', 'security description'),
    quantity: find('quantity'),
    lastPrice: find('last price', 'price'),
    value: find('current value', 'market value'),
    costTotal: find('cost basis total', 'cost basis'),
    avgCost: find('average cost basis', 'avg cost basis', 'average cost'),
  }
  const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? '').trim() : '')

  const accounts = new Map<string, FidelityAccount & { bySymbol: Map<string, FidelityPosition> }>()
  for (const row of rows.slice(headerIndex + 1)) {
    const rawSymbol = cell(row, col.symbol)
    if (!rawSymbol || row.length < 3) continue
    const number = cell(row, col.number)
    const name = col.name !== col.number ? cell(row, col.name) : ''
    const key = number || name || 'account'
    let acct = accounts.get(key)
    if (!acct) {
      const label = [name, number ? `(…${number.slice(-4)})` : ''].filter(Boolean).join(' ') || 'Fidelity account'
      acct = { label, positions: [], cash: 0, cashSources: [], skipped: [], bySymbol: new Map() }
      accounts.set(key, acct)
    }

    const description = cell(row, col.description)
    const value = parseNumber(cell(row, col.value))
    const symbol = normalizeSymbol(rawSymbol)

    if (/^pending/i.test(rawSymbol)) {
      if (value) { acct.cash += value; acct.cashSources.push('Pending activity') }
      continue
    }
    if (/\*\*$/.test(rawSymbol) || MONEY_MARKET.has(symbol) || /money market/i.test(description)) {
      const amount = value ?? parseNumber(cell(row, col.quantity)) ?? 0
      acct.cash += amount
      if (!acct.cashSources.includes(symbol)) acct.cashSources.push(symbol)
      continue
    }
    if (rawSymbol.startsWith('-') || /^[A-Z]{1,6}\d{6}[CP]\d/.test(symbol)) {
      acct.skipped.push({ symbol: rawSymbol, reason: 'Options aren’t tracked in the portal.' })
      continue
    }
    const quantity = parseNumber(cell(row, col.quantity))
    if (quantity === null || quantity === 0) {
      acct.skipped.push({ symbol: rawSymbol, reason: 'No quantity in the file.' })
      continue
    }
    if (quantity < 0) {
      acct.skipped.push({ symbol: rawSymbol, reason: 'Short positions aren’t tracked in the portal.' })
      continue
    }
    if (!/^[A-Z0-9-]{1,12}$/.test(symbol)) {
      acct.skipped.push({ symbol: rawSymbol, reason: 'Unrecognized symbol.' })
      continue
    }

    let costTotal = parseNumber(cell(row, col.costTotal))
    const avgCost = parseNumber(cell(row, col.avgCost))
    if (costTotal === null && avgCost !== null) costTotal = round(avgCost * quantity, 2)

    // Fidelity lists a security once per account type (cash / margin): add them up.
    const existing = acct.bySymbol.get(symbol)
    if (existing) {
      existing.quantity = round(existing.quantity + quantity, 6)
      existing.value = existing.value !== null && value !== null ? round(existing.value + value, 2) : null
      existing.costTotal = existing.costTotal !== null && costTotal !== null ? round(existing.costTotal + costTotal, 2) : null
      continue
    }
    const position: FidelityPosition = {
      symbol,
      bond: isCusip(symbol),
      description,
      quantity,
      lastPrice: parseNumber(cell(row, col.lastPrice)),
      value,
      costTotal,
    }
    acct.bySymbol.set(symbol, position)
    acct.positions.push(position)
  }

  return {
    kind: 'positions',
    asOf: readAsOf(rows, filename),
    accounts: [...accounts.values()].map(({ bySymbol: _unused, ...a }) => ({ ...a, cash: round(a.cash, 2) })),
  }
}

/** Shares added (+) or removed (−) by one activity row. */
function signedQuantity(action: string, quantity: number) {
  const a = action.toUpperCase()
  if (/\bSOLD\b|\bSELL\b|REDEMPTION|REDEEMED|MATURED|MATURITY|\bCALLED\b|EXPIRED/.test(a)) return -Math.abs(quantity)
  if (/\bBOUGHT\b|\bBUY\b|REINVEST/.test(a)) return Math.abs(quantity)
  return quantity // transfers, splits ("DISTRIBUTION"), mergers: Fidelity signs these itself
}

const isBuy = (action: string) => /\bBOUGHT\b|\bBUY\b/i.test(action)

function readDates(rows: string[][], headerIndex: number, symbolCol: number, dateCol: number, actionCol: number): DatesFile {
  const { find } = columns(rows[headerIndex])
  const quantityCol = find('quantity')
  const history = actionCol >= 0
  type Entry = { date: string; action: string; quantity: number; order: number }
  const bySymbol = new Map<string, Entry[]>()
  let lastSymbol = ''
  let from: string | null = null
  let to: string | null = null

  rows.slice(headerIndex + 1).forEach((row, order) => {
    const date = parseDate(row[dateCol])
    if (!date) return
    const action = history ? (row[actionCol] ?? '').trim() : ''
    let symbol = normalizeSymbol(row[symbolCol])
    if (!symbol && history) symbol = normalizeSymbol(action.match(/\(([A-Z0-9./]{1,12})\)\s*(?:\((?:cash|margin)\))?\s*$/i)?.[1])
    if (!symbol && !history) symbol = lastSymbol // lot rows listed under their security
    if (!symbol || !/^[A-Z0-9-]{1,12}$/.test(symbol)) return
    lastSymbol = symbol
    if (!from || date < from) from = date
    if (!to || date > to) to = date
    const list = bySymbol.get(symbol) ?? []
    list.push({ date, action, quantity: parseNumber(quantityCol >= 0 ? row[quantityCol] : '') ?? 0, order })
    bySymbol.set(symbol, list)
  })

  const symbols: DatedSymbol[] = []
  for (const [symbol, entries] of bySymbol) {
    if (!history) {
      symbols.push({ symbol, first: entries.map(e => e.date).sort()[0], net: null, via: 'list' })
      continue
    }
    // Oldest first; Fidelity lists newest first, so same-day rows are reversed too.
    entries.sort((a, b) => a.date.localeCompare(b.date) || b.order - a.order)
    let held = 0
    let start: string | null = null
    let via: DatedSymbol['via'] = 'other'
    for (const e of entries) {
      const q = signedQuantity(e.action, e.quantity)
      if (!q) continue
      if (held <= 1e-6 && q > 0) { start = e.date; via = isBuy(e.action) ? 'buy' : 'other' }
      held = round(held + q, 6)
      if (held <= 1e-6) { held = 0; start = null }
    }
    symbols.push({ symbol, first: start, net: held, via })
  }
  return { kind: 'dates', source: history ? 'history' : 'list', range: { from, to }, symbols }
}

/* ---------------------------------------------------------------------
 * Planning an import against the portal's holdings
 * ------------------------------------------------------------------- */

export type CurrentHolding = {
  id: string
  ticker: string | null
  cusip: string | null
  name: string
  sector: string | null
  asset_type: AssetType
  shares: number
  cost_basis: number | null
  manual_value: number | null
  coupon: number | null
  maturity_on: string | null
  purchased_on: string | null
}

/** What Yahoo says about a new ticker (name, sector, ETF or not). */
export type SecurityInfo = { name: string | null; sector: string | null; type: 'equity' | 'etf' | 'fund' | null }

export type PositionFields = Pick<CurrentHolding, 'ticker' | 'cusip' | 'asset_type' | 'shares' | 'cost_basis' | 'manual_value' | 'coupon' | 'maturity_on'>

export type PlanUpdate = { id: string; label: string; sector: string | null; before: PositionFields; after: PositionFields; changed: (keyof PositionFields)[] }
export type PlanNew = { key: string; label: string; name: string; description: string; fields: PositionFields; value: number | null; sector: string | null; suggest: string | null }
export type PlanMissing = { id: string; label: string; sector: string | null; bond: boolean }

export type PositionsPlan = {
  kind: 'positions'
  asOf: AsOf
  accounts: string[]
  account: number
  cash: { before: number; after: number; sources: string[] }
  updates: PlanUpdate[]
  unchanged: number
  added: PlanNew[]
  missing: PlanMissing[]
  sellByDefault: boolean
  skipped: { symbol: string; reason: string }[]
  fileValue: number
}

export type PlanDate = { id: string; label: string; current: string | null; date: string; ok: boolean; note: string }

export type DatesPlan = {
  kind: 'dates'
  source: 'history' | 'list'
  range: { from: string | null; to: string | null }
  items: PlanDate[]
  unchanged: number
  unmatched: number
}

export type ImportPlan = PositionsPlan | DatesPlan

/** Choices made in the preview. The server re-reads the file and re-plans, so
 *  only these decisions travel from the browser, never the numbers. */
export type ImportChoices = {
  account?: number
  added?: Record<string, { sector: string | null; purchased_on: string | null; matchId: string | null }>
  sell?: string[]
  dates?: string[]
}

const label = (h: { ticker: string | null; name: string }) => h.ticker ?? h.name

const sameNumber = (a: number | null, b: number | null, tolerance: number) =>
  a === null || b === null ? a === b : Math.abs(a - b) <= tolerance

function changedFields(before: PositionFields, after: PositionFields): (keyof PositionFields)[] {
  const out: (keyof PositionFields)[] = []
  if ((before.ticker ?? null) !== (after.ticker ?? null)) out.push('ticker')
  if ((before.cusip ?? null) !== (after.cusip ?? null)) out.push('cusip')
  if (before.asset_type !== after.asset_type) out.push('asset_type')
  if (!sameNumber(Number(before.shares ?? 0), after.shares, 1e-6)) out.push('shares')
  if (!sameNumber(before.cost_basis === null ? null : Number(before.cost_basis), after.cost_basis, 0.00005)) out.push('cost_basis')
  if (!sameNumber(before.manual_value === null ? null : Number(before.manual_value), after.manual_value, 0.005)) out.push('manual_value')
  if (!sameNumber(before.coupon === null ? null : Number(before.coupon), after.coupon, 0.00005)) out.push('coupon')
  if ((before.maturity_on ?? null) !== (after.maturity_on ?? null)) out.push('maturity_on')
  return out
}

function fieldsOf(h: CurrentHolding): PositionFields {
  return {
    ticker: h.ticker ?? null, cusip: h.cusip ?? null, asset_type: h.asset_type,
    shares: Number(h.shares ?? 0), cost_basis: h.cost_basis === null || h.cost_basis === undefined ? null : Number(h.cost_basis),
    manual_value: h.manual_value === null || h.manual_value === undefined ? null : Number(h.manual_value),
    coupon: h.coupon === null || h.coupon === undefined ? null : Number(h.coupon), maturity_on: h.maturity_on ?? null,
  }
}

/** The holding's fields after taking this file's numbers. Bonds keep prices
 *  and cost per $100 of face, the way statements quote them. */
export function fieldsFromFile(p: FidelityPosition, base: PositionFields | null): PositionFields {
  const perUnit = p.costTotal !== null && p.quantity > 0 ? p.costTotal / p.quantity : null
  if (p.bond) {
    const terms = bondTerms(p.description)
    return {
      ticker: base?.ticker ?? null,
      cusip: p.symbol,
      asset_type: 'bond',
      shares: p.quantity,
      cost_basis: perUnit !== null ? round(perUnit * 100, 4) : base?.cost_basis ?? null,
      manual_value: p.value !== null ? round(p.value, 2) : base?.manual_value ?? null,
      coupon: terms.coupon ?? base?.coupon ?? null,
      maturity_on: terms.maturity ?? base?.maturity_on ?? null,
    }
  }
  return {
    ticker: base?.ticker ?? p.symbol,
    cusip: base?.cusip ?? null,
    asset_type: base?.asset_type ?? 'equity',
    shares: p.quantity,
    cost_basis: perUnit !== null ? round(perUnit, 4) : base?.cost_basis ?? null,
    manual_value: base?.manual_value ?? null,
    coupon: base?.coupon ?? null,
    maturity_on: base?.maturity_on ?? null,
  }
}

const NAME_NOISE = new Set(['NOTE', 'NOTES', 'NTS', 'BOND', 'BONDS', 'CORP', 'CORPORATION', 'INC', 'CO', 'COMPANY', 'THE',
  'AND', 'SER', 'SERIES', 'CALL', 'MAKE', 'WHOLE', 'SR', 'DEB', 'FUND', 'TRUST', 'CLASS', 'COM'])

function nameTokens(s: string) {
  return new Set(s.toUpperCase().replace(/\bTREAS\b/g, 'TREASURY').replace(/\bU\.?S\.?\b/g, 'UNITED STATES')
    .split(/[^A-Z]+/).filter(w => w.length >= 3 && !NAME_NOISE.has(w)))
}

/** Club sector for a new position, from Yahoo's sector. ETFs stay portfolio-level. */
export function guessSector(position: { bond: boolean }, info: SecurityInfo | undefined, sectors: string[]): string | null {
  const pick = (re: RegExp) => sectors.find(s => re.test(s)) ?? null
  if (position.bond) return pick(/fixed income|bond|credit/i)
  if (!info?.sector || info.type === 'etf' || info.type === 'fund') return null
  const rules: [RegExp, RegExp][] = [
    [/technology|communication/i, /tech/i],
    [/consumer/i, /consumer/i],
    [/energy|utilit/i, /energy|utilit/i],
    [/financial/i, /financ/i],
    [/health/i, /health/i],
    [/industrial|basic materials/i, /industr|material/i],
    [/real estate/i, /real estate/i],
  ]
  const rule = rules.find(([yahoo]) => yahoo.test(info.sector!))
  return rule ? pick(rule[1]) : null
}

export function planPositions(file: PositionsFile, accountChoice: number | undefined, current: CurrentHolding[],
  info: Record<string, SecurityInfo>, sectors: string[], cashBefore: number): PositionsPlan {
  // Default to the account holding the most positions.
  const account = accountChoice !== undefined && file.accounts[accountChoice]
    ? accountChoice
    : file.accounts.reduce((best, a, i) => (a.positions.length > file.accounts[best].positions.length ? i : best), 0)
  const acct = file.accounts[account]
  if (!acct || acct.positions.length === 0) throw new Error('No positions found in this file.')

  const byTicker = new Map(current.filter(h => h.ticker).map(h => [normalizeSymbol(h.ticker), h]))
  const byCusip = new Map(current.filter(h => h.cusip).map(h => [normalizeSymbol(h.cusip), h]))
  const used = new Set<string>()
  const updates: PlanUpdate[] = []
  const unmatched: FidelityPosition[] = []
  let unchanged = 0

  for (const p of acct.positions) {
    const h = (p.bond ? byCusip.get(p.symbol) : byTicker.get(p.symbol))
    if (!h || used.has(h.id)) { unmatched.push(p); continue }
    used.add(h.id)
    const before = fieldsOf(h)
    const after = fieldsFromFile(p, before)
    const changed = changedFields(before, after)
    if (changed.length) updates.push({ id: h.id, label: label(h), sector: h.sector, before, after, changed })
    else unchanged++
  }

  // Bonds entered by hand have no CUSIP yet: suggest the closest name.
  const open = current.filter(h => !used.has(h.id))
  const added: PlanNew[] = unmatched.map(p => {
    let suggest: string | null = null
    if (p.bond) {
      const want = nameTokens(p.description)
      let best = 0
      for (const h of open.filter(x => !x.ticker && !x.cusip)) {
        const score = [...nameTokens(h.name)].filter(t => want.has(t)).length
        if (score > best) { best = score; suggest = h.id } else if (score === best && score > 0) suggest = null
      }
    }
    const yahoo = info[p.symbol]
    const name = p.bond ? bondName(p.description) : yahoo?.name || titleCase(p.description) || p.symbol
    const fields = fieldsFromFile(p, null)
    if (!p.bond && (yahoo?.type === 'etf' || /\bETF\b/i.test(p.description))) fields.asset_type = 'etf'
    else if (!p.bond && yahoo?.type === 'fund') fields.asset_type = 'fund'
    return {
      key: p.symbol,
      label: p.bond ? name : p.symbol,
      name,
      description: p.description,
      fields,
      value: p.value,
      sector: guessSector(p, yahoo, sectors),
      suggest,
    }
  })
  const suggested = new Set(added.map(a => a.suggest).filter(Boolean))
  const missing: PlanMissing[] = open.map(h => ({ id: h.id, label: label(h), sector: h.sector, bond: !h.ticker }))
  // If most holdings are missing, it's probably the wrong account or a filtered view.
  const sellByDefault = !(current.length >= 4 && missing.length - suggested.size > current.length / 2)

  return {
    kind: 'positions',
    asOf: file.asOf,
    accounts: file.accounts.map(a => a.label),
    account,
    cash: { before: cashBefore, after: acct.cash, sources: acct.cashSources },
    updates,
    unchanged,
    added,
    missing,
    sellByDefault,
    skipped: acct.skipped,
    fileValue: round(acct.positions.reduce((s, p) => s + (p.value ?? 0), 0) + acct.cash, 2),
  }
}

export function planDates(file: DatesFile, current: CurrentHolding[]): DatesPlan {
  const bySymbol = new Map(file.symbols.map(s => [s.symbol, s]))
  const items: PlanDate[] = []
  let unchanged = 0
  const matched = new Set<string>()
  for (const h of current) {
    const key = h.cusip ? normalizeSymbol(h.cusip) : normalizeSymbol(h.ticker)
    const entry = key ? bySymbol.get(key) ?? (h.ticker ? bySymbol.get(normalizeSymbol(h.ticker)) : undefined) : undefined
    if (!entry) continue
    matched.add(entry.symbol)
    if (!entry.first) continue
    if (entry.first === h.purchased_on) { unchanged++; continue }

    let ok = true
    let note = ''
    if (file.source === 'history') {
      const shares = Number(h.shares ?? 0)
      const covered = entry.net !== null && shares > 0 && Math.abs(entry.net - shares) <= Math.max(0.001, shares * 0.005)
      if (entry.via !== 'buy') { ok = false; note = `Came into the account on ${day(entry.first)} without a purchase (e.g. a transfer).` }
      else if (shares <= 0) { ok = false; note = 'Update positions first so the share count can be checked.' }
      else if (!covered) { ok = false; note = `This file accounts for ${entry.net ?? 0} of ${shares} shares, so the first buy was before it starts.` }
      else note = `Bought then; covers all ${shares} ${h.cusip ? 'face' : 'shares'}.`
    }
    items.push({ id: h.id, label: label(h), current: h.purchased_on ?? null, date: entry.first, ok, note })
  }
  items.sort((a, b) => Number(b.ok) - Number(a.ok) || a.label.localeCompare(b.label))
  return {
    kind: 'dates',
    source: file.source,
    range: file.range,
    items,
    unchanged,
    unmatched: file.symbols.filter(s => !matched.has(s.symbol)).length,
  }
}
