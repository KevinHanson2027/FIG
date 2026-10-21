import Link from 'next/link'
import { Hourglass } from 'lucide-react'
import { ROLES } from '@/lib/roles'
import { firstName } from '@/lib/format'
import type { Member, RoleRequest } from '@/lib/types'
import { Badge } from '@/components/portal/ui'

const TONE = { pending: 'amber', approved: 'green', denied: 'red', cancelled: 'gray' } as const

/** What applicants see after finishing setup, until a co-president approves them. */
export default function Waiting({ member, requests }: { member: Member; requests: RoleRequest[] }) {
  return (
    <div className="onboard-card">
      <div className="onboard-card-body" style={{ textAlign: 'center' }}>
        <div className="ui-empty-icon" style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--ui-amber-soft)', color: 'var(--ui-amber)' }}>
          <Hourglass size={26} />
        </div>
        <h1>Thanks, {firstName(member.name)}! You&apos;re all set.</h1>
        <p className="lead">Your application is with the co-presidents. You&apos;ll be able to use the full portal as soon as they approve it — usually within a day or two.</p>

        <div style={{ textAlign: 'left', border: '1px solid var(--ui-line)', borderRadius: 12, padding: 16, margin: '0 auto', maxWidth: 440 }}>
          <dl className="ui-dl">
            <dt>Sector</dt><dd>{member.sector}</dd>
            <dt>Graduation</dt><dd>{member.class_year ?? '—'}</dd>
            <dt>Roles</dt>
            <dd>
              <div className="ui-row" style={{ gap: 6 }}>
                <Badge tone="navy">Analyst</Badge>
                {requests.map(r => (
                  <Badge key={r.id} tone={TONE[r.status]}>{ROLES[r.role].label}{r.sector ? ` · ${r.sector}` : ''}{r.status === 'pending' ? ' (requested)' : ''}</Badge>
                ))}
              </div>
            </dd>
          </dl>
        </div>
      </div>
      <div className="onboard-foot">
        <Link href="/portal/welcome?edit=1" className="ui-btn ui-btn-secondary">Edit my answers</Link>
        <Link href="/" className="ui-btn ui-btn-ghost">Back to the website</Link>
      </div>
    </div>
  )
}
