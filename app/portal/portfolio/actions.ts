'use server'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { assertMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors, getSettings } from '@/lib/data'
import { getSecurityInfo } from '@/lib/market'
import { money, todayET } from '@/lib/format'
import {
  planDates, planPositions, readFidelityFile,
  type CurrentHolding, type DatesFile, type ImportChoices, type ImportPlan, type PositionFields, type PositionsFile,
} from '@/lib/fidelity'

// "Update from Fidelity" on Portfolio → Holdings. The browser sends the CSV
// text; the server reads it, compares it with the portal's holdings and
// returns a preview. Applying re-reads the same text, so only the choices made
// in the preview come from the browser. Writes go through the member's own
// session, so Row Level Security still decides what they may change.

const MAX_CHARS = 900_000
const SCHEMA = 'The database needs the latest update first: open Supabase → SQL Editor, paste supabase/schema.sql from the repo, and run it. Then try again.'

type Input = { text: string; filename: string; account?: number }
export type PreviewResult = { ok: true; plan: ImportPlan } | { ok: false; error: string }
export type ApplyResult = { ok: true; message: string } | { ok: false; error: string }

type Row = PositionFields & {
  id: string
  name: string
  sector: string | null
  purchased_on: string | null
  is_active: boolean
  sold_on: string | null
}

function friendly(message: string) {
  if (/cusip|coupon|maturity_on/.test(message) && /column|schema cache/i.test(message)) return SCHEMA
  if (/holdings_active_(ticker|cusip)|duplicate key/i.test(message)) return 'Two current holdings would end up with the same ticker or CUSIP. Mark the old one as sold, then try again.'
  if (/row-level security|permission denied/i.test(message)) return 'Your roles don’t allow changing every holding. Ask a co-president to run the import.'
  return message
}

async function prepare(input: Input) {
  const viewer = await assertMember()
  if (!viewer.access.canManagePpg) throw new Error('Only co-presidents and the PPG manager can update holdings from Fidelity.')
  const text = typeof input?.text === 'string' ? input.text : ''
  if (!text.trim()) throw new Error('That file is empty.')
  if (text.length > MAX_CHARS) throw new Error('That file is too large to be a Fidelity export.')
  const file = readFidelityFile(text, String(input.filename ?? '').slice(0, 200))
  if (!file) throw new Error('This doesn’t look like a Fidelity file. Use the CSV from Positions → Download, or from Activity & Orders → History → Download.')

  const supabase = await createClient()
  const { data, error } = await supabase.from('holdings').select('*').eq('is_active', true)
  if (error) throw new Error(error.message)
  if (data?.length && !('cusip' in data[0])) throw new Error(SCHEMA)
  const current = (data ?? []) as CurrentHolding[]
  return { viewer, supabase, file, current }
}

async function positionsPlan(file: PositionsFile, account: number | undefined, current: CurrentHolding[]) {
  const [sectorRows, settings] = await Promise.all([getSectors(), getSettings()])
  const sectors = sectorRows.filter(s => s.kind === 'investment').map(s => s.name)
  const cash = Number(settings.portfolio.cash) || 0
  // Look up names and sectors only for tickers the portal doesn't hold yet.
  const first = planPositions(file, account, current, {}, sectors, cash)
  const fresh = first.added.filter(a => a.fields.ticker).map(a => a.key)
  const info = fresh.length ? await getSecurityInfo(fresh) : {}
  return { plan: planPositions(file, account, current, info, sectors, cash), sectors, settings }
}

export async function previewHoldingsImport(input: Input): Promise<PreviewResult> {
  try {
    const { file, current } = await prepare(input)
    if (file.kind === 'dates') return { ok: true, plan: planDates(file, current) }
    const { plan } = await positionsPlan(file, input.account, current)
    return { ok: true, plan }
  } catch (e) {
    return { ok: false, error: friendly((e as Error).message) }
  }
}

function rowFor(h: CurrentHolding, changes: Partial<Row> = {}): Row {
  return {
    id: h.id, ticker: h.ticker ?? null, cusip: h.cusip ?? null, name: h.name, sector: h.sector ?? null,
    asset_type: h.asset_type, shares: Number(h.shares ?? 0), cost_basis: h.cost_basis ?? null,
    manual_value: h.manual_value ?? null, coupon: h.coupon ?? null, maturity_on: h.maturity_on ?? null,
    purchased_on: h.purchased_on ?? null, is_active: true, sold_on: null, ...changes,
  }
}

const validDay = (d: unknown, today: string) =>
  typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && d <= today ? d : null

export async function applyHoldingsImport(input: Input & { choices?: ImportChoices }): Promise<ApplyResult> {
  try {
    const { viewer, supabase, file, current } = await prepare(input)
    const choices = input.choices ?? {}
    const today = todayET()
    const byId = new Map(current.map(h => [h.id, h]))
    const rows: Row[] = []

    if (file.kind === 'dates') {
      const plan = planDates(file as DatesFile, current)
      const chosen = new Set(Array.isArray(choices.dates) ? choices.dates : plan.items.filter(i => i.ok).map(i => i.id))
      for (const item of plan.items) {
        const date = validDay(item.date, today)
        if (chosen.has(item.id) && date) rows.push(rowFor(byId.get(item.id)!, { purchased_on: date }))
      }
      if (rows.length === 0) return { ok: true, message: 'Nothing to change.' }
      const { error } = await supabase.from('holdings').upsert(rows, { onConflict: 'id' })
      if (error) return { ok: false, error: friendly(error.message) }
      revalidatePath('/portal', 'layout')
      return { ok: true, message: `Added purchase dates to ${rows.length} holding${rows.length === 1 ? '' : 's'}.` }
    }

    const { plan, sectors, settings } = await positionsPlan(file, choices.account ?? input.account, current)
    const missingIds = new Set(plan.missing.map(m => m.id))
    const claimed = new Set<string>()
    let added = 0
    let linked = 0

    for (const u of plan.updates) rows.push(rowFor(byId.get(u.id)!, u.after))
    for (const a of plan.added) {
      const choice = choices.added?.[a.key]
      const matchId = choice ? choice.matchId : a.suggest
      const purchased = validDay(choice ? choice.purchased_on : a.purchased_on, today)
      if (matchId && missingIds.has(matchId) && !claimed.has(matchId)) {
        // Same security the portal already lists (a bond entered by hand, a new ticker): keep its name and sector.
        claimed.add(matchId)
        const h = byId.get(matchId)!
        rows.push(rowFor(h, { ...a.fields, asset_type: a.fields.asset_type === 'bond' ? 'bond' : h.asset_type, ...(purchased ? { purchased_on: purchased } : {}) }))
        linked++
        continue
      }
      const sector = choice ? choice.sector : a.sector
      rows.push({
        id: randomUUID(), name: a.name.slice(0, 200), sector: sector && sectors.includes(sector) ? sector : null,
        ...a.fields, purchased_on: purchased, is_active: true, sold_on: null,
      })
      added++
    }
    const sell = new Set(Array.isArray(choices.sell) ? choices.sell : plan.sellByDefault ? plan.missing.map(m => m.id) : [])
    let sold = 0
    for (const m of plan.missing) {
      if (claimed.has(m.id) || !sell.has(m.id)) continue
      rows.push(rowFor(byId.get(m.id)!, { is_active: false, sold_on: validDay(plan.asOf.date, today) ?? today }))
      sold++
    }

    if (rows.length) {
      const { error } = await supabase.from('holdings').upsert(rows, { onConflict: 'id' })
      if (error) return { ok: false, error: friendly(error.message) }
    }
    const portfolio = {
      ...settings.portfolio,
      cash: plan.cash.after,
      fidelity: { as_of: plan.asOf.date, label: plan.asOf.label, imported_at: new Date().toISOString(), imported_by: viewer.member.name, prices: plan.prices },
    }
    const { error: cashError } = await supabase.from('settings').upsert({ key: 'portfolio', value: portfolio }, { onConflict: 'key' })
    if (cashError) return { ok: false, error: `Holdings were updated, but cash wasn’t: ${friendly(cashError.message)}` }

    revalidatePath('/portal', 'layout')
    revalidatePath('/holdings')
    const parts = [
      `updated ${plan.updates.length + linked} holding${plan.updates.length + linked === 1 ? '' : 's'}`,
      added ? `added ${added}` : '',
      sold ? `marked ${sold} as sold` : '',
      `cash is ${money(plan.cash.after, true)}`,
    ].filter(Boolean)
    return { ok: true, message: `Done: ${parts.join(', ')}.` }
  } catch (e) {
    return { ok: false, error: friendly((e as Error).message) }
  }
}
