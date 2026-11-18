'use server'
import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { assertMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/data'
import { todayET } from '@/lib/format'
import type { PortfolioSettings } from '@/lib/types'

// Portfolio → Calendar edits: dates added by hand and extra tickers whose
// earnings the club follows. Stored in the 'portfolio' setting, which
// co-presidents and the PPG manager can change (Row Level Security).

type Result = { ok: true } | { ok: false; error: string }

async function save(change: (p: PortfolioSettings) => PortfolioSettings): Promise<Result> {
  try {
    const viewer = await assertMember()
    if (!viewer.access.canManagePpg) return { ok: false, error: 'Only co-presidents and the PPG manager can edit the calendar.' }
    const current = (await getSettings()).portfolio
    const supabase = await createClient()
    const { error } = await supabase.from('settings').upsert({ key: 'portfolio', value: change(current) }, { onConflict: 'key' })
    if (error) return { ok: false, error: error.message }
    revalidatePath('/portal/portfolio')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`))

export async function addCalendarNote(input: { date: string; title: string }): Promise<Result> {
  const title = String(input?.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
  const date = String(input?.date ?? '')
  if (!title) return { ok: false, error: 'Give the date a short name.' }
  if (!isDay(date)) return { ok: false, error: 'Pick a date.' }
  // Keep about a year of history so the list doesn't grow forever.
  const cutoff = new Date(Date.parse(`${todayET()}T00:00:00Z`) - 400 * 86_400_000).toISOString().slice(0, 10)
  return save(p => ({
    ...p,
    events: [...(p.events ?? []).filter(e => e.date >= cutoff), { id: randomUUID(), date, title }]
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-200),
  }))
}

export async function removeCalendarNote(id: string): Promise<Result> {
  return save(p => ({ ...p, events: (p.events ?? []).filter(e => e.id !== id) }))
}

export async function setFollowedTickers(tickers: string[]): Promise<Result> {
  const clean = [...new Set((Array.isArray(tickers) ? tickers : []).map(t => String(t).trim().toUpperCase()))]
    .filter(t => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(t)).slice(0, 30)
  return save(p => ({ ...p, watch: clean }))
}
