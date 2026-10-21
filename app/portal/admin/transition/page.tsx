import Link from 'next/link'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { hasServiceRole } from '@/lib/supabase/admin'
import { isEmailConfigured } from '@/lib/email'
import { getSectors, getSettings } from '@/lib/data'
import type { Candidate, Member, MemberInternal, RoleGrant } from '@/lib/types'
import { NoAccess, PageHeader } from '@/components/portal/ui'
import { SelectNav } from '@/components/portal/SelectNav'
import { GraduateStep, LeadershipStep, NewMembersStep, TermStep } from './steps'

export const metadata = { title: 'Year-End Transition' }

const STEPS = [
  { n: 1, label: 'Graduate seniors' },
  { n: 2, label: 'Hand off leadership' },
  { n: 3, label: 'Welcome new members' },
  { n: 4, label: 'Start the new term' },
]

/** Class year graduating at the end of the current academic year. */
function graduatingClass() {
  const now = new Date()
  return now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear()
}

export default async function TransitionPage({ searchParams }: { searchParams: { step?: string; year?: string } }) {
  const { access, member: me } = await requireMember()
  if (!access.isAdmin) return <NoAccess what="The year-end transition is run by the co-presidents." />
  const step = Math.min(4, Math.max(1, Number(searchParams.step) || 1))
  const supabase = await createClient()
  const [sectors, settings] = await Promise.all([getSectors(), getSettings()])

  let body: React.ReactNode = null
  if (step === 1) {
    const year = Number(searchParams.year) || graduatingClass()
    const { data } = await supabase.from('members_directory').select('*').eq('status', 'active').order('name')
    const active = (data ?? []) as Member[]
    const years = [...new Set(active.map(m => m.class_year).filter(Boolean) as number[])].sort()
    body = (
      <>
        <div className="ui-row" style={{ marginBottom: 16 }}>
          <span className="ui-small">Graduating class</span>
          <SelectNav param="year" value={String(year)} label="Graduating class" options={[...new Set([year, ...years])].sort().map(y => ({ value: String(y), label: `Class of ${y}` }))} />
        </div>
        <GraduateStep year={year} graduating={active.filter(m => m.class_year === year)} missingYear={active.filter(m => !m.class_year)} viewerId={me.id} />
      </>
    )
  }
  if (step === 2) {
    const [membersRes, rolesRes, internalRes] = await Promise.all([
      supabase.from('members_directory').select('*').eq('status', 'active').order('name'),
      supabase.from('member_roles').select('member_id, role, sector'),
      supabase.from('member_internal').select('*').eq('leadership_interest', true),
    ])
    body = (
      <LeadershipStep
        members={(membersRes.data ?? []) as Member[]}
        roles={(rolesRes.data ?? []) as (RoleGrant & { member_id: string })[]}
        interested={(internalRes.data ?? []) as MemberInternal[]}
        investmentSectors={sectors.filter(s => s.kind === 'investment').map(s => s.name)}
        hasExecutiveBoard={sectors.some(s => s.name === 'Executive Board')}
        viewerId={me.id}
      />
    )
  }
  if (step === 3) {
    const [candRes, inactiveRes] = await Promise.all([
      supabase.from('candidates').select('*').eq('stage', 'accepted').is('member_id', null).order('name'),
      supabase.from('members_directory').select('id').eq('status', 'active').is('user_id', null).not('email', 'is', null),
    ])
    body = (
      <NewMembersStep
        candidates={(candRes.data ?? []) as Candidate[]}
        sectors={sectors.filter(s => s.kind !== 'leadership').map(s => s.name)}
        notActivated={(inactiveRes.data ?? []).map(r => r.id as string)}
        canSendLinks={hasServiceRole()}
        emailConfigured={isEmailConfigured()}
      />
    )
  }
  if (step === 4) body = <TermStep term={settings.term} recruiting={settings.recruiting} />

  return (
    <>
      <PageHeader
        title="Year-End Transition"
        description="Run this when leadership changes at the end of the year. Work through the steps in order — each one saves as you go."
      />
      <nav className="steps" aria-label="Transition steps">
        {STEPS.map(s => (
          <Link key={s.n} href={`/portal/admin/transition?step=${s.n}`} className={`step${s.n === step ? ' active' : s.n < step ? ' done' : ''}`} aria-current={s.n === step ? 'step' : undefined}>
            <span className="n">{s.n}</span>{s.label}
          </Link>
        ))}
      </nav>
      {body}
      <div className="ui-spread" style={{ marginTop: 20 }}>
        {step > 1 ? <Link href={`/portal/admin/transition?step=${step - 1}`} className="ui-btn ui-btn-ghost">← Back</Link> : <span />}
        {step < 4 && <Link href={`/portal/admin/transition?step=${step + 1}`} className="ui-btn ui-btn-secondary">Next: {STEPS[step].label} →</Link>}
      </div>
    </>
  )
}
