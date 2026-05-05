import type { Metadata } from 'next'
import { getPageContent } from '@/lib/getPageContent'

export const metadata: Metadata = { title: 'Portfolio Reporting' }

export default async function PortfolioReportingPage() {
  const db = await getPageContent('portfolio-reporting')
  const c = (key: string, fallback: string) => db[key] || fallback

  const reports = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
    label: c(`report_${n}_label`, n === 1 ? 'November 2025 Report' : `Report ${n}`),
    url:   c(`report_${n}_url`,   n === 1 ? '/Website Assets/Portfolio Reporting/Novemeber Report.pdf' : ''),
  })).filter(r => r.label)

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
        <div className="reporting-grid">
          {reports.map(r =>
            r.url ? (
              <a key={r.label} className="report-btn" href={r.url} target="_blank" rel="noopener noreferrer">
                {r.label}
              </a>
            ) : (
              <span key={r.label} className="report-btn" style={{ opacity: 0.5, cursor: 'default' }}>
                {r.label}
              </span>
            )
          )}
        </div>
      </section>
    </>
  )
}
