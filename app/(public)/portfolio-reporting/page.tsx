import type { Metadata } from 'next'
import { getPageContent } from '@/lib/getPageContent'
import { createClient } from '@/lib/supabase/server'
import { academicYear } from '@/lib/format'
import type { Report } from '@/lib/types'

export const metadata: Metadata = { title: 'Portfolio Reporting' }

export default async function PortfolioReportingPage() {
  const supabase = await createClient()
  const [db, { data, error }] = await Promise.all([
    getPageContent('portfolio-reporting'),
    supabase.from('reports').select('*').eq('is_published', true).order('period_date', { ascending: false, nullsFirst: false }),
  ])
  const c = (key: string, fallback: string) => db[key] || fallback
  // Before supabase/schema.sql has run there is no reports table yet.
  const reports = error
    ? [{ id: 'legacy', title: 'November 2025 Report', file_url: '/Website Assets/Portfolio Reporting/Novemeber Report.pdf', period_date: '2025-11-01', summary: null } as Report]
    : (data ?? []) as Report[]

  // Group by academic year (Aug–Jul), newest first.
  const groups = new Map<string, Report[]>()
  for (const r of reports) {
    const key = r.period_date ? academicYear(r.period_date) : 'Other'
    groups.set(key, [...(groups.get(key) ?? []), r])
  }

  return (
    <>
      <section className="reporting-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c('hero_image', '/Website Assets/Home/Dolan.jpeg')} alt="FIG Portfolio Reporting" />
        <div className="reporting-hero-text">
          <h1>{c('hero_title', 'Portfolio Reporting')}</h1>
        </div>
      </section>

      <section className="reporting-title-section">
        <h2>{c('section_title', 'Quarterly & Annual Reports')}</h2>
      </section>

      <section className="reporting-grid-section">
        {reports.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>Reports are coming soon.</p>
        ) : (
          [...groups.entries()].map(([year, list]) => (
            <div key={year} className="reporting-group">
              {groups.size > 1 && <h3 className="reporting-year">{year === 'Other' ? 'More reports' : `${year} academic year`}</h3>}
              <div className="reporting-grid">
                {list.map(r => (
                  <a key={r.id} className="report-btn" href={r.file_url} target="_blank" rel="noopener noreferrer" title={r.summary ?? undefined}>
                    {r.title}
                  </a>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  )
}
