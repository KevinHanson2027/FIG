import Link from 'next/link'
import { History } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ROLES } from '@/lib/roles'
import { relative, shortDate } from '@/lib/format'
import type { ActivityEntry, Role } from '@/lib/types'
import { EmptyState, NoAccess, PageHeader } from '@/components/portal/ui'
import { AdminTabs } from '../AdminTabs'

export const metadata = { title: 'Activity Log' }

const AREAS: Record<string, { label: string; tables: string[] }> = {
  all: { label: 'Everything', tables: [] },
  people: { label: 'Members & roles', tables: ['members_directory', 'member_roles'] },
  approvals: { label: 'Requests', tables: ['role_requests', 'profile_changes'] },
  portfolio: { label: 'Holdings', tables: ['holdings'] },
  website: { label: 'Website', tables: ['page_content', 'reports'] },
  recruiting: { label: 'Recruiting', tables: ['candidates'] },
  money: { label: 'Donations & settings', tables: ['donations', 'settings'] },
}

type Entry = ActivityEntry & { actor: { name: string } | null }
type Data = Record<string, unknown> & Record<string, { from: unknown; to: unknown } | unknown>

const roleName = (r: unknown, s: unknown) => `${ROLES[r as Role]?.label ?? String(r)}${s ? ` (${s})` : ''}`
const changed = (d: Data) => Object.keys(d ?? {}).map(k => k.replace(/_/g, ' ')).join(', ')
const to = (d: Data, k: string) => (d?.[k] as { to?: unknown } | undefined)?.to

/** One readable sentence per change. */
function describe(e: Entry): string {
  const d = (e.data ?? {}) as Data
  const who = e.label ?? 'someone'
  switch (e.table_name) {
    case 'members_directory':
      if (e.action === 'insert') return `added ${who} to the roster`
      if (e.action === 'delete') return `deleted ${who}`
      if (to(d, 'user_id') && Object.keys(d).length === 1) return `linked ${who}'s login`
      if (to(d, 'status')) return `moved ${who} to ${to(d, 'status')}`
      return `updated ${who}'s profile (${changed(d)})`
    case 'member_roles':
      return e.action === 'insert' ? `made ${who} ${roleName(d.role, d.sector)}` : e.action === 'delete' ? `removed ${roleName(d.role, d.sector)} from ${who}` : `changed a role for ${who}`
    case 'role_requests':
      if (e.action === 'insert') return `${who} requested ${roleName(d.role, d.sector)}`
      return to(d, 'status') ? `${to(d, 'status') === 'cancelled' ? 'cancelled' : to(d, 'status')} ${who}'s role request` : `updated ${who}'s role request`
    case 'profile_changes':
      if (e.action === 'insert') return `${who} asked to switch sectors`
      return to(d, 'status') ? `${to(d, 'status')} ${who}'s sector change` : `${who} edited their sector change request`
    case 'holdings':
      if (e.action === 'insert') return `added ${who} to holdings`
      if (e.action === 'delete') return `deleted holding ${who}`
      if (to(d, 'is_active') === false) return `marked ${who} as sold`
      return `updated ${who} (${changed(d)})`
    case 'page_content': return `edited the ${who} page`
    case 'reports': return e.action === 'insert' ? `added report “${who}”` : e.action === 'delete' ? `deleted report “${who}”` : `updated report “${who}”`
    case 'settings': return `changed ${who} settings`
    case 'donations': return e.action === 'insert' ? `recorded ${d.direction === 'in' ? 'a gift from' : 'a donation to'} ${who}` : `${e.action === 'delete' ? 'deleted' : 'edited'} a donation record (${who})`
    case 'candidates':
      if (e.action === 'insert') return e.actor_id ? `added candidate ${who}` : `${who} joined the recruiting pipeline from the website`
      if (to(d, 'stage')) return `moved ${who} to ${String(to(d, 'stage'))}`
      return e.action === 'delete' ? `deleted candidate ${who}` : `updated candidate ${who}`
    default: return `${e.action} on ${e.table_name}`
  }
}

export default async function ActivityPage({ searchParams }: { searchParams: { area?: string } }) {
  const { access } = await requireMember()
  if (!access.isAdmin) return <NoAccess what="The activity log is for the co-presidents." />
  const area = searchParams.area && AREAS[searchParams.area] ? searchParams.area : 'all'
  const supabase = await createClient()
  let query = supabase.from('activity_log').select('*, actor:members_directory(name)').order('created_at', { ascending: false }).limit(300)
  if (AREAS[area].tables.length) query = query.in('table_name', AREAS[area].tables)
  const { data } = await query
  const entries = (data ?? []) as Entry[]

  // Group by day for scanning.
  const days = new Map<string, Entry[]>()
  for (const e of entries) { const k = shortDate(e.created_at); days.set(k, [...(days.get(k) ?? []), e]) }

  return (
    <>
      <PageHeader title="Control Panel" description="Who changed what, most recent first. Useful for spotting and undoing mistakes." />
      <AdminTabs active="activity" />
      <div className="ui-chips" style={{ marginBottom: 16 }}>
        {Object.entries(AREAS).map(([k, v]) => (
          <Link key={k} href={`/portal/admin/activity?area=${k}`} className={`ui-chip${k === area ? ' on' : ''}`}>{v.label}</Link>
        ))}
      </div>
      <section className="ui-card">
        {entries.length === 0 ? <EmptyState icon={<History size={22} />} title="Nothing logged yet" /> : (
          [...days.entries()].map(([dayLabel, list]) => (
            <div key={dayLabel}>
              <div style={{ padding: '10px 20px', background: '#fafbfc', borderBottom: '1px solid var(--ui-line)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ui-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dayLabel}</div>
              <ul className="ui-list">
                {list.map(e => (
                  <li key={e.id} className="ui-list-item">
                    <div className="ui-list-main">
                      <span style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{e.actor?.name ?? (e.table_name === 'candidates' || e.table_name === 'members_directory' ? 'Website / system' : 'System')}</span>{' '}
                      <span style={{ fontSize: '0.875rem' }}>{describe(e)}</span>
                    </div>
                    <span className="ui-small ui-muted" style={{ whiteSpace: 'nowrap' }}>{relative(e.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </>
  )
}
