// Portfolio → Overview: the KPIs FIG follows. Server Component; market and
// economy data come from free sources and are cached, so this is quick after
// the first load. Wrap it in <Suspense>.
import Link from 'next/link'
import { money, todayET } from '@/lib/format'
import { fundKpis, getMarketSnapshot, type MarketLine } from '@/lib/snapshot'
import type { Indicator } from '@/lib/economy'
import type { Portfolio } from '@/lib/portfolio'
import type { PortfolioSettings, Snapshot } from '@/lib/types'

function Signed({ v, points = false }: { v: number | null; points?: boolean }) {
  if (v === null || !Number.isFinite(v)) return <span className="ui-muted">—</span>
  const up = v > 0, down = v < 0
  const text = points ? `${up ? '+' : down ? '−' : ''}${Math.abs(v * 100).toFixed(2)} pts` : `${up ? '+' : down ? '−' : ''}${Math.abs(v * 100).toFixed(2)}%`
  return <span className={up ? 'ui-up' : down ? 'ui-down' : 'ui-muted'}>{up ? '▲' : down ? '▼' : ''} {text}</span>
}

function SignedMoney({ v }: { v: number }) {
  return <span className={v > 0 ? 'ui-up' : v < 0 ? 'ui-down' : 'ui-muted'}>{v > 0 ? '+' : v < 0 ? '−' : ''}{money(Math.abs(v))}</span>
}

function marketValue(l: MarketLine) {
  if (l.price === null) return '—'
  if (l.unit === 'yield') return `${l.price.toFixed(2)}%`
  if (l.unit === 'usd') return money(l.price, l.price < 1000)
  if (l.unit === 'plain') return l.price.toFixed(2)
  return l.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function marketMove(l: MarketLine) {
  // Yields move in basis points; everything else in percent.
  if (l.unit === 'yield') {
    if (l.change === null) return <span className="ui-muted">—</span>
    const bp = l.change * 100
    return <span className={bp > 0 ? 'ui-up' : bp < 0 ? 'ui-down' : 'ui-muted'}>{bp > 0 ? '▲' : bp < 0 ? '▼' : ''} {Math.abs(bp).toFixed(1)} bp</span>
  }
  return <Signed v={l.changePct} />
}

function indicatorValue(i: Indicator) {
  return i.value === null ? '—' : `${(i.value * 100).toFixed(1)}%`
}

export async function PortfolioSnapshot({ portfolio, snapshots, settings, canEdit }: {
  portfolio: Portfolio
  snapshots: Snapshot[]
  settings: PortfolioSettings
  canEdit: boolean
}) {
  const market = await getMarketSnapshot()
  const k = fundKpis(portfolio, snapshots, settings, market.spxNow, market.spxYearStart)
  const year = Number(todayET().slice(0, 4))
  const offline = portfolio.unpriced + portfolio.fallbackPriced

  return (
    <section className="ui-card snapshot" aria-label="Portfolio and market snapshot">
      <div className="snapshot-fund">
        <div className="snapshot-total">
          <div className="snapshot-label">Fund value</div>
          <div className="snapshot-value">{k.value !== null ? money(k.value) : '—'}</div>
          <div className="snapshot-sub">
            {portfolio.hasValues
              ? <>{portfolio.costCovered ? <>Cost basis {money(portfolio.cost)} · </> : null}Cash {money(portfolio.cash)}</>
              : 'Update from Fidelity on the Holdings tab to show values.'}
          </div>
        </div>
        <dl className="snapshot-returns">
          <div><dt>Today</dt><dd><Signed v={k.oneDay} />{k.dayChange !== null && <span className="snapshot-dollars"><SignedMoney v={k.dayChange} /></span>}</dd></div>
          <div title="Unrealized gain on today's holdings against their Fidelity cost basis"><dt>Total gain</dt><dd><Signed v={k.gainPct} />{k.gain !== null && <span className="snapshot-dollars"><SignedMoney v={k.gain} /></span>}</dd></div>
          <div><dt>1M</dt><dd><Signed v={k.oneMonth} /></dd></div>
          <div><dt>YTD</dt><dd><Signed v={k.ytd} /></dd></div>
          <div><dt>vs S&amp;P 500 (YTD)</dt><dd><Signed v={k.vsSpx} points /></dd></div>
        </dl>
      </div>
      {offline > 0 && (
        <p className="snapshot-note">
          {portfolio.fallbackPriced > 0 && `Live prices didn’t load for ${portfolio.fallbackPriced} holding${portfolio.fallbackPriced === 1 ? '' : 's'}, so ${portfolio.fallbackPriced === 1 ? 'it uses' : 'they use'} the price from the last Fidelity file. `}
          {portfolio.unpriced > 0 && `${portfolio.unpriced} holding${portfolio.unpriced === 1 ? ' has' : 's have'} no price right now and ${portfolio.unpriced === 1 ? 'is' : 'are'} left out of the total. `}
          The page tries again on its next refresh.
        </p>
      )}
      {(k.oneMonth === null || k.ytd === null) && portfolio.hasValues && (
        <p className="snapshot-note">
          {k.oneMonth === null && 'The month return fills in once a month of daily values has been recorded. '}
          {k.ytd === null && (canEdit
            ? <>For YTD, enter the fund&apos;s value on Dec 31, {year - 1} in <Link href="/portal/ppg?tab=settings" className="ui-link">Performance Group → Settings</Link> (once; after that it&apos;s automatic).</>
            : 'YTD appears once the year-start value is set.')}
        </p>
      )}
      {(k.best || k.worst) && (
        <div className="snapshot-movers">
          {k.best && <span><span className="snapshot-label">Best holding</span> <strong>{k.best.ticker ?? k.best.name}</strong> <Signed v={k.best.gainPct} /></span>}
          {k.worst && <span><span className="snapshot-label">Worst holding</span> <strong>{k.worst.ticker ?? k.worst.name}</strong> <Signed v={k.worst.gainPct} /></span>}
          <span className="ui-muted ui-small">since bought</span>
        </div>
      )}
      <div className="snapshot-cols">
        <div>
          <h3>Wall St.</h3>
          <ul>{market.wallSt.map(l => <li key={l.symbol}><span>{l.label}</span><span>{marketMove(l)}</span></li>)}</ul>
        </div>
        <div>
          <h3>Hard assets</h3>
          <ul>
            {market.assets.map(l => (
              <li key={l.symbol}><span>{l.label}</span><span><strong>{marketValue(l)}</strong> <span className="ui-small">{marketMove(l)}</span></span></li>
            ))}
          </ul>
        </div>
        <div>
          <h3>US economy</h3>
          <ul>
            {market.economy.map(i => (
              <li key={i.key} title={i.kind === 'qoq' ? 'Change from the previous quarter, at an annual rate' : i.kind === 'yoy' ? 'Change from a year earlier' : undefined}>
                <span>{i.label}{i.kind === 'yoy' ? ' (YoY)' : i.kind === 'qoq' ? ' (QoQ)' : ''}</span>
                <span><strong>{indicatorValue(i)}</strong> {i.period && <span className="ui-small ui-muted">{i.period}</span>}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function SnapshotSkeleton() {
  return <div className="ui-skeleton" style={{ height: 300, marginBottom: 20, borderRadius: 12 }} />
}
