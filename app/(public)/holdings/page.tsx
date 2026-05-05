import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Holdings' }

export default function HoldingsPage() {
  return (
    <>
      <section className="holdings-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Website Assets/Holdings/Our Holdings Header Background.png" alt="Fairfield Investment Group - Portfolio Holdings" />
        <div className="holdings-hero-content">
          <h1>Portfolio Holdings</h1>
        </div>
      </section>

      <section className="google-sheet-section">
        <h2>Live Portfolio Tracker</h2>
        <div className="google-sheet-frame">
          <iframe
            src="https://docs.google.com/spreadsheets/d/e/2PACX-1vQDYPOaxpRAbVrWFUUrspX2DnOKFDemKW7J55Y93kM_n-wG2xzutbMdWIbZv6aip6CmzNmVh4YaVlKL/pubhtml?gid=706692621&single=true&widget=true&headers=false"
            title="FIG Live Portfolio Tracker"
          />
        </div>
      </section>
    </>
  )
}
