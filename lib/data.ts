import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { termFor, todayET } from '@/lib/format'
import type { Sector, SettingsMap } from '@/lib/types'

export const DEFAULT_SETTINGS: SettingsMap = {
  term: { name: 'Current term', starts_on: '2026-08-31' },
  recruiting: { cycle: '', applications_open: false, deadline: null, intro: '' },
  portfolio: { cash: 0, risk_free_rate: 0.04, benchmark: 'SPY' },
  donations: { rate: 0.05, fy_start_month: 7, asset_bases: {} },
  signup: { open: true, domains: ['student.fairfield.edu', 'fairfield.edu'] },
}

// Used only if the sectors table can't be read (e.g. before schema.sql has run).
const FALLBACK_SECTORS: Sector[] = ([
  ['Executive Board', 'executive-board', 'leadership', null],
  ['Consumers', 'consumers', 'investment', 'XLY'],
  ['Energy & Utilities', 'energy-utilities', 'investment', 'XLE'],
  ['Financials', 'financials', 'investment', 'XLF'],
  ['Fixed Income', 'fixed-income', 'investment', 'AGG'],
  ['Healthcare', 'healthcare', 'investment', 'XLV'],
  ['Industrials & Materials', 'industrials', 'investment', 'XLI'],
  ['Real Estate', 'real-estate', 'investment', 'XLRE'],
  ['Technology', 'technology', 'investment', 'XLK'],
  ['Marketing', 'marketing', 'operations', null],
] as const).map(([name, slug, kind, benchmark], i) => ({ name, slug, kind, benchmark, sort_order: i, is_active: true }))

/** Active sectors in display order. */
export const getSectors = cache(async (includeInactive = false): Promise<Sector[]> => {
  const supabase = await createClient()
  let query = supabase.from('sectors').select('*').order('sort_order').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error || !data?.length) return FALLBACK_SECTORS
  return data as Sector[]
})

/** Settings the viewer can read, merged over defaults. The term always comes
 *  from the calendar, and the recruiting cycle follows it unless recruiting
 *  names one. */
export const getSettings = cache(async (): Promise<SettingsMap> => {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('key, value')
  const merged = structuredClone(DEFAULT_SETTINGS) as Record<string, Record<string, unknown>>
  for (const row of data ?? []) {
    if (row.key in merged) merged[row.key] = { ...merged[row.key], ...(row.value as object) }
  }
  const settings = merged as unknown as SettingsMap
  settings.term = termFor(todayET())
  if (!settings.recruiting.cycle?.trim()) settings.recruiting.cycle = settings.term.name
  return settings
})
