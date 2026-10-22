// Presentational building blocks for portal pages (safe in Server Components).
import Link from 'next/link'
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react'
import { pct } from '@/lib/format'

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="ui-page-head">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </div>
  )
}

export function Card({ title, description, actions, children, footer, tight, className = '' }: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  tight?: boolean
  className?: string
}) {
  return (
    <section className={`ui-card ${className}`}>
      {(title || actions) && (
        <div className="ui-card-head">
          <div style={{ minWidth: 0 }}>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="ui-row">{actions}</div>}
        </div>
      )}
      <div className={`ui-card-body${tight ? ' tight' : ''}`}>{children}</div>
      {footer && <div className="ui-card-foot">{footer}</div>}
    </section>
  )
}

type Tone = 'gray' | 'red' | 'green' | 'amber' | 'blue' | 'navy'

export function Badge({ tone = 'gray', children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return <span className={`ui-badge${tone === 'gray' ? '' : ` ui-badge-${tone}`}`} title={title}>{children}</span>
}

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="ui-empty">
      {icon && <div className="ui-empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Stat({ label, value, sub, icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="ui-card ui-stat">
      <div className="ui-stat-label">{icon}{label}</div>
      <div className="ui-stat-value">{value}</div>
      {sub && <div className="ui-stat-sub">{sub}</div>}
    </div>
  )
}

/** Signed change with direction arrow; color is never the only cue. */
export function Delta({ value, money: moneyText }: { value: number | null | undefined; money?: string }) {
  if (value === null || value === undefined || Number.isNaN(value)) return <span className="ui-muted">—</span>
  const up = value > 0, down = value < 0
  return (
    <span className={up ? 'ui-up' : down ? 'ui-down' : 'ui-muted'} style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
      {up ? '▲' : down ? '▼' : '•'} {moneyText ? `${moneyText} ` : ''}{pct(value)}
    </span>
  )
}

const noticeIcons = { info: Info, warn: TriangleAlert, error: CircleX, success: CircleCheck }

export function Notice({ tone = 'info', children }: { tone?: keyof typeof noticeIcons; children: React.ReactNode }) {
  const Icon = noticeIcons[tone]
  return (
    <div className={`ui-notice ui-notice-${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <Icon size={18} aria-hidden />
      <div>{children}</div>
    </div>
  )
}

/** Link-based tabs: the active tab lives in the URL (?tab=…). */
export function Tabs({ tabs, active, basePath, params = {} }: {
  tabs: { id: string; label: string; count?: number }[]
  active: string
  basePath: string
  params?: Record<string, string | undefined>
}) {
  return (
    <nav className="ui-tabs" aria-label="Sections">
      {tabs.map(t => {
        const q = new URLSearchParams()
        for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
        q.set('tab', t.id)
        return (
          <Link key={t.id} href={`${basePath}?${q}`} className={`ui-tab${t.id === active ? ' active' : ''}`} aria-current={t.id === active ? 'page' : undefined} scroll={false}>
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="count">{t.count}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

/** Tabs that link to separate pages, e.g. the sections of Portfolio or My Work. */
export function SubNav({ items, label = 'Sections' }: { items: { href: string; label: string; active: boolean; count?: number }[]; label?: string }) {
  return (
    <nav className="ui-tabs" aria-label={label}>
      {items.map(t => (
        <Link key={t.href} href={t.href} className={`ui-tab${t.active ? ' active' : ''}`} aria-current={t.active ? 'page' : undefined} scroll={false}>
          {t.label}
          {t.count !== undefined && t.count > 0 && <span className="count">{t.count}</span>}
        </Link>
      ))}
    </nav>
  )
}

export function NoAccess({ what }: { what: string }) {
  return (
    <div className="ui-card">
      <EmptyState title="You don't have access to this page" icon={<CircleX size={22} />}>
        {what} If you think you should, request the role from your profile or ask a co-president.
      </EmptyState>
    </div>
  )
}
