'use client'
import { useState } from 'react'
import { Crown, Mail, Plane, Users } from 'lucide-react'
import type { Member, MemberInternal, RoleGrant } from '@/lib/types'
import { ROLES } from '@/lib/roles'
import { pct } from '@/lib/format'
import { mailtoLink } from '@/lib/mailto'
import { Avatar } from '@/components/portal/Avatar'
import { Modal } from '@/components/portal/Modal'
import { Badge, EmptyState } from '@/components/portal/ui'

export type RosterRow = {
  member: Member
  internal: MemberInternal | null
  roles: RoleGrant[]
  attendance: { rate: number | null; present: number; late: number; excused: number; absent: number }
  openTasks: number
}

function rateTone(rate: number | null) {
  if (rate === null) return 'gray' as const
  return rate >= 0.85 ? 'green' as const : rate >= 0.7 ? 'amber' as const : 'red' as const
}

export default function Roster({ rows, sector, termName }: { rows: RosterRow[]; sector: string; termName: string }) {
  const [open, setOpen] = useState<RosterRow | null>(null)
  const emails = rows.map(r => r.member.email).filter(Boolean) as string[]
  const abroad = rows.filter(r => r.internal?.abroad_term).length
  const leaders = rows.filter(r => r.internal?.leadership_interest).length

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <div>
          <h2><Users size={18} /> Roster</h2>
          <p>{abroad} going abroad · {leaders} interested in leadership</p>
        </div>
        {emails.length > 0 && (
          <a className="ui-btn ui-btn-secondary ui-btn-sm" href={mailtoLink({ bcc: emails, subject: `${sector} team`, body: '' })}><Mail size={15} /> Email team</a>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No active members in this sector" />
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr><th>Member</th><th>Class</th><th className="num">Attendance</th><th className="num">Open tasks</th><th>Plans</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.member.id} className="is-clickable" onClick={() => setOpen(r)} tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(r) } }}>
                  <td>
                    <div className="ui-row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                      <Avatar name={r.member.name} url={r.member.headshot_url} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{r.member.name}</div>
                        <div className="ui-small ui-muted">{r.member.title ?? 'Analyst'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="nowrap">{r.member.class_year ?? <span className="ui-muted">—</span>}</td>
                  <td className="num"><Badge tone={rateTone(r.attendance.rate)}>{r.attendance.rate === null ? 'No data' : pct(r.attendance.rate, 0, false)}</Badge></td>
                  <td className="num">{r.openTasks}</td>
                  <td>
                    <div className="ui-row" style={{ gap: 4 }}>
                      {r.internal?.abroad_term && <Badge tone="blue"><Plane size={12} /> {r.internal.abroad_term}</Badge>}
                      {r.internal?.leadership_interest && <Badge tone="amber"><Crown size={12} /> Leadership</Badge>}
                      {r.roles.filter(g => g.role !== 'portfolio_manager').map(g => <Badge key={g.role}>{ROLES[g.role].short}</Badge>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open !== null} onClose={() => setOpen(null)} drawer title={open?.member.name ?? ''} description={open ? `${open.member.title ?? 'Analyst'} · ${sector}` : undefined}>
        {open && (
          <div className="ui-stack">
            <div className="ui-row" style={{ gap: 14 }}>
              <Avatar name={open.member.name} url={open.member.headshot_url} size="lg" />
              <div>
                {open.member.email && <a className="ui-link" href={`mailto:${open.member.email}`}>{open.member.email}</a>}
                <div className="ui-small ui-muted">Class of {open.member.class_year ?? '—'}</div>
              </div>
            </div>
            <dl className="ui-dl">
              <dt>Attendance ({termName})</dt>
              <dd>{open.attendance.rate === null ? 'No meetings yet' : `${pct(open.attendance.rate, 0, false)} · ${open.attendance.present} present, ${open.attendance.late} late, ${open.attendance.excused} excused, ${open.attendance.absent} absent`}</dd>
              <dt>Open tasks</dt><dd>{open.openTasks}</dd>
              <dt>Going abroad</dt><dd>{open.internal?.abroad_term ?? 'No'}</dd>
              <dt>Leadership</dt>
              <dd>{open.internal?.leadership_interest ? (open.internal.leadership_note || 'Interested') : 'Not interested right now'}</dd>
              <dt>Roles</dt>
              <dd>{['Analyst', ...open.roles.map(g => `${ROLES[g.role].label}${g.sector ? ` (${g.sector})` : ''}`)].join(', ')}</dd>
            </dl>
          </div>
        )}
      </Modal>
    </section>
  )
}
