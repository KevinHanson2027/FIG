import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/data'
import { todayET } from '@/lib/format'
import type { Donation } from '@/lib/types'
import { NoAccess, PageHeader } from '@/components/portal/ui'
import { SelectNav } from '@/components/portal/SelectNav'
import DonorDashboard from './DonorDashboard'

export const metadata = { title: 'Donor Relations' }

/** Fiscal year named by the calendar year it ends in (FY2027 = Jul 2026 – Jun 2027 when it starts in July). */
function fiscalYear(isoDate: string, startMonth: number) {
  const [y, m] = isoDate.split('-').map(Number)
  const endYear = startMonth === 1 ? y : m >= startMonth ? y + 1 : y
  const startYear = startMonth === 1 ? endYear : endYear - 1
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${startYear}-${pad(startMonth)}-01`
  const endMonth = startMonth === 1 ? 12 : startMonth - 1
  const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate()
  return { label: `FY${endYear}`, start, end: `${endYear}-${pad(endMonth)}-${pad(lastDay)}` }
}

export default async function DonorsPage({ searchParams }: { searchParams: { fy?: string } }) {
  const { access } = await requireMember()
  if (!access.canManageDonations) return <NoAccess what="Donor Relations is for the Donor Relations lead and co-presidents." />

  const supabase = await createClient()
  const [settings, { data }] = await Promise.all([
    getSettings(),
    supabase.from('donations').select('*').order('txn_date', { ascending: false }),
  ])
  const donations = (data ?? []) as Donation[]
  const startMonth = settings.donations.fy_start_month || 7
  const current = fiscalYear(todayET(), startMonth)
  const years = new Map<string, ReturnType<typeof fiscalYear>>([[current.label, current]])
  for (const d of donations) { const fy = fiscalYear(d.txn_date, startMonth); years.set(fy.label, fy) }
  const sorted = [...years.values()].sort((a, b) => b.label.localeCompare(a.label))
  const selected = years.get(searchParams.fy ?? '') ?? current

  return (
    <>
      <PageHeader
        title="Donor Relations"
        description={`Money coming into the fund and going out as donations · ${selected.label} runs ${selected.start} to ${selected.end}`}
        actions={sorted.length > 1 ? <SelectNav param="fy" value={selected.label} label="Fiscal year" options={sorted.map(y => ({ value: y.label, label: y.label }))} /> : null}
      />
      <DonorDashboard
        fy={selected}
        donations={donations.filter(d => d.txn_date >= selected.start && d.txn_date <= selected.end)}
        settings={settings.donations}
        assigned={access.isDonorRelations}
      />
    </>
  )
}
