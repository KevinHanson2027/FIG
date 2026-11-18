import 'server-only'
// The "US economy" numbers on the portfolio snapshot, from free official data:
// CPI, PPI and unemployment from the BLS public API; PCE inflation and real GDP
// (BEA) through DBnomics, an open mirror. No API keys. Cached for 12 hours;
// any source that fails just shows a dash.
import { latestYoY, periodLabel, type Observation } from '@/lib/schedules'

export type Indicator = { key: string; label: string; value: number | null; period: string | null; kind: 'yoy' | 'level' | 'qoq' }

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'

async function bls(series: string): Promise<Observation[]> {
  try {
    const res = await fetch(`https://api.bls.gov/publicAPI/v1/timeseries/data/${series}`, { headers: { 'User-Agent': UA }, next: { revalidate: 43200 } })
    const json = await res.json()
    const data = json?.Results?.series?.[0]?.data ?? []
    return data
      .filter((d: { period: string; value: string }) => /^M(0[1-9]|1[0-2])$/.test(d.period) && Number.isFinite(Number(d.value)))
      .map((d: { year: string; period: string; value: string }) => ({ period: `${d.year}-${d.period.slice(1)}`, value: Number(d.value) }))
  } catch {
    return []
  }
}

async function dbnomics(path: string): Promise<Observation[]> {
  try {
    const res = await fetch(`https://api.db.nomics.world/v22/series/${path}?observations=1`, { headers: { 'User-Agent': UA }, next: { revalidate: 43200 } })
    const doc = (await res.json())?.series?.docs?.[0]
    const periods: string[] = doc?.period ?? []
    const values: (number | string)[] = doc?.value ?? []
    return periods.map((p, i) => ({ period: p, value: Number(values[i]) })).filter(o => Number.isFinite(o.value))
  } catch {
    return []
  }
}

const latest = (obs: Observation[]) => [...obs].sort((a, b) => b.period.localeCompare(a.period))[0] ?? null

export async function getEconomy(): Promise<Indicator[]> {
  const [cpi, ppi, unemployment, pce, gdp] = await Promise.all([
    bls('CUUR0000SA0'),      // CPI-U, all items
    bls('WPUFD4'),           // PPI, final demand
    bls('LNS14000000'),      // unemployment rate
    dbnomics('BEA/NIPA-T20804/DPCERG-M'),  // PCE price index
    dbnomics('BEA/NIPA-T10101/A191RL-Q'),  // real GDP, % change at an annual rate
  ])
  const yoy = (key: string, label: string, obs: Observation[]): Indicator => {
    const r = latestYoY(obs)
    return { key, label, value: r?.value ?? null, period: r ? periodLabel(r.period) : null, kind: 'yoy' }
  }
  const level = (key: string, label: string, obs: Observation[], kind: Indicator['kind']): Indicator => {
    const r = latest(obs)
    return { key, label, value: r ? r.value / 100 : null, period: r ? periodLabel(r.period) : null, kind }
  }
  return [
    yoy('pce', 'PCE inflation', pce),
    yoy('cpi', 'CPI inflation', cpi),
    yoy('ppi', 'PPI (final demand)', ppi),
    level('gdp', 'Real GDP growth', gdp, 'qoq'),
    level('unemployment', 'Unemployment', unemployment, 'level'),
  ]
}
