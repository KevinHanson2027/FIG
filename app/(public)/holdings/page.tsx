import type { Metadata } from 'next'
import { getPageContent } from '@/lib/getPageContent'

export const metadata: Metadata = { title: 'Holdings' }

export default async function HoldingsPage() {
  const db = await getPageContent('holdings')
  const c = (key: string, fallback: string) => db[key] || fallback

  return (
    <>
      <section className="holdings-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c('hero_image', '/Website Assets/Holdings/Our Holdings Header Background.png')} alt="FIG Portfolio Holdings" />
        <div className="holdings-hero-content">
          <h1>{c('hero_title', 'Portfolio Holdings')}</h1>
        </div>
      </section>

      <section className="google-sheet-section">
        <h2>{c('sheet_title', 'Live Portfolio Tracker')}</h2>
        <div className="google-sheet-frame">
          <iframe
            src={c('sheet_url', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDYPOaxpRAbVrWFUUrspX2DnOKFDemKW7J55Y93kM_n-wG2xzutbMdWIbZv6aip6CmzNmVh4YaVlKL/pubhtml?gid=706692621&single=true&widget=true&headers=false')}
            title="FIG Live Portfolio Tracker"
          />
        </div>
      </section>
    </>
  )
}
