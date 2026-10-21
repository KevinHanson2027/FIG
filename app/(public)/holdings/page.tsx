import type { Metadata } from 'next'
import { getPageContent } from '@/lib/getPageContent'
import { createClient } from '@/lib/supabase/server'
import { getQuotes } from '@/lib/market'
import { money, pct } from '@/lib/format'

export const metadata: Metadata = { title: 'Holdings' }

type PublicHolding = { ticker: string | null; name: string; sector: string | null; asset_type: string }

export default async function HoldingsPage() {
  const db = await getPageContent('holdings')
  const c = (key: string, fallback: string) => db[key] || fallback
  const showTable = c('display', 'sheet') === 'table'

  let holdings: PublicHolding[] = []
  let quotes: Awaited<ReturnType<typeof getQuotes>> = {}
  if (showTable) {
    const supabase = await createClient()
    const { data } = await supabase.rpc('public_holdings')
    holdings = (data ?? []) as PublicHolding[]
    quotes = await getQuotes(holdings.map(h => h.ticker))
  }
  const groups = new Map<string, PublicHolding[]>()
  for (const h of holdings) groups.set(h.sector ?? 'Other', [...(groups.get(h.sector ?? 'Other') ?? []), h])

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
        {showTable ? (
          <div className="holdings-table-wrap">
            <table className="holdings-table">
              <thead>
                <tr><th>Symbol</th><th>Company</th><th className="num">Price</th><th className="num">Change</th><th className="num">% Change</th></tr>
              </thead>
              {[...groups.entries()].map(([sector, list]) => (
                <tbody key={sector}>
                  <tr className="sector-row"><td colSpan={5}>{sector}</td></tr>
                  {list.map(h => {
                    const q = h.ticker ? quotes[h.ticker.toUpperCase()] : undefined
                    const cls = q?.change ? (q.change > 0 ? 'up' : 'down') : ''
                    return (
                      <tr key={`${sector}-${h.ticker ?? h.name}`}>
                        <td className="sym">{h.ticker ?? '—'}</td>
                        <td>{h.name}</td>
                        <td className="num">{q?.price ? money(q.price, true) : '—'}</td>
                        <td className={`num ${cls}`}>{q?.change !== null && q?.change !== undefined ? `${q.change > 0 ? '+' : ''}${q.change.toFixed(2)}` : '—'}</td>
                        <td className={`num ${cls}`}>{q?.changePct !== null && q?.changePct !== undefined ? pct(q.changePct) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              ))}
            </table>
            <p className="holdings-note">Prices are delayed and refresh about every minute.</p>
          </div>
        ) : (
          <div className="google-sheet-frame">
            <iframe
              src={c('sheet_url', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQDYPOaxpRAbVrWFUUrspX2DnOKFDemKW7J55Y93kM_n-wG2xzutbMdWIbZv6aip6CmzNmVh4YaVlKL/pubhtml?gid=706692621&single=true&widget=true&headers=false')}
              title="FIG Live Portfolio Tracker"
            />
          </div>
        )}
      </section>
    </>
  )
}
