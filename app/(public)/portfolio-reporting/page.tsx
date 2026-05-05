import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Portfolio Reporting' }

const reports = [
  { label: 'November 2025 Report', href: '/Website Assets/Portfolio Reporting/Novemeber Report.pdf', available: true },
  { label: 'December 2025 Report', href: null, available: false },
  { label: 'January 2026 Report',  href: null, available: false },
  { label: 'February 2026 Report', href: null, available: false },
]

export default function PortfolioReportingPage() {
  return (
    <>
      <section className="reporting-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Website Assets/Home/Dolan.jpeg" alt="FIG Portfolio Reporting" />
        <div className="reporting-hero-text">
          <h1>Portfolio Reporting</h1>
        </div>
      </section>

      <section className="reporting-title-section">
        <h2>Quarterly &amp; Annual Reports</h2>
      </section>

      <section className="reporting-grid-section">
        <div className="reporting-grid">
          {reports.map((report) =>
            report.available && report.href ? (
              <a key={report.label} className="report-btn" href={report.href} target="_blank" rel="noopener noreferrer">
                {report.label}
              </a>
            ) : (
              <span
                key={report.label}
                className="report-btn"
                style={{ opacity: 0.5, cursor: 'default' }}
              >
                {report.label}
              </span>
            )
          )}
        </div>
      </section>
    </>
  )
}
