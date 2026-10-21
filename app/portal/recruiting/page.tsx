import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors, getSettings } from '@/lib/data'
import { isEmailConfigured } from '@/lib/email'
import type { Candidate, Interview } from '@/lib/types'
import { Badge, NoAccess, PageHeader, Tabs } from '@/components/portal/ui'
import { SelectNav } from '@/components/portal/SelectNav'
import Pipeline, { type CandidateView, type InterviewView } from './Pipeline'
import InterviewsTable from './InterviewsTable'
import RecruitingSettingsForm from './RecruitingSettingsForm'

export const metadata = { title: 'Recruiting' }

export default async function RecruitingPage({ searchParams }: { searchParams: { tab?: string; cycle?: string } }) {
  const { access } = await requireMember()
  if (!access.canRecruit) return <NoAccess what="Recruiting is for the recruiting team and co-presidents." />
  const tab = ['pipeline', 'interviews', 'settings'].includes(searchParams.tab ?? '') ? searchParams.tab! : 'pipeline'
  const supabase = await createClient()
  const [settings, sectors] = await Promise.all([getSettings(), getSectors()])

  const { data: cycleRows } = await supabase.from('candidates').select('cycle')
  const cycles = [...new Set([settings.recruiting.cycle, ...(cycleRows ?? []).map(r => r.cycle as string)].filter(Boolean))]
  const cycle = searchParams.cycle && cycles.includes(searchParams.cycle) ? searchParams.cycle : settings.recruiting.cycle

  const [candRes, ivRes, membersRes, pmRes] = await Promise.all([
    supabase.from('candidates').select('*, referrer:members_directory!candidates_referred_by_fkey(name)').eq('cycle', cycle).order('created_at', { ascending: false }),
    supabase.from('interviews').select('*, interviewer:members_directory!interviews_interviewer_id_fkey(name)').order('scheduled_at', { ascending: true }),
    supabase.from('members_directory').select('id, name, sector').eq('status', 'active').order('name'),
    supabase.from('member_roles').select('member_id').in('role', ['portfolio_manager', 'admin', 'recruiting']),
  ])
  const candidates = ((candRes.data ?? []) as (Candidate & { referrer: { name: string } | null })[]).map(c => ({ ...c, referrer: c.referrer?.name ?? null })) as CandidateView[]
  const ids = new Set(candidates.map(c => c.id))
  const interviews = ((ivRes.data ?? []) as (Interview & { interviewer: { name: string } | null })[])
    .filter(i => ids.has(i.candidate_id))
    .map(i => ({ ...i, interviewer: i.interviewer?.name ?? null })) as InterviewView[]
  const leaders = new Set((pmRes.data ?? []).map(r => r.member_id))
  const interviewers = (membersRes.data ?? []).map(m => ({ id: m.id as string, name: m.name as string, sector: m.sector as string, leader: leaders.has(m.id) }))
    .sort((a, b) => Number(b.leader) - Number(a.leader) || a.name.localeCompare(b.name))

  return (
    <>
      <PageHeader
        title="Recruiting"
        description={<>Cycle: <strong>{cycle || 'not set'}</strong> · Applications {settings.recruiting.applications_open ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>}</>}
        actions={
          <>
            {cycles.length > 1 && <SelectNav param="cycle" value={cycle} label="Recruiting cycle" options={cycles.map(c => ({ value: c, label: c }))} />}
            <Link href="/apply" target="_blank" className="ui-btn ui-btn-secondary"><ExternalLink size={15} /> Application page</Link>
          </>
        }
      />
      <Tabs basePath="/portal/recruiting" params={{ cycle: searchParams.cycle }} active={tab} tabs={[
        { id: 'pipeline', label: 'Pipeline', count: candidates.filter(c => !['rejected', 'withdrawn', 'accepted'].includes(c.stage)).length },
        { id: 'interviews', label: 'Interviews', count: interviews.filter(i => i.status === 'scheduled').length },
        { id: 'settings', label: 'Settings' },
      ]} />
      {tab === 'pipeline' && (
        <Pipeline candidates={candidates} interviews={interviews} interviewers={interviewers}
          sectors={sectors.filter(s => s.kind !== 'leadership').map(s => s.name)} emailConfigured={isEmailConfigured()} isAdmin={access.isAdmin} cycle={cycle} />
      )}
      {tab === 'interviews' && <InterviewsTable interviews={interviews} candidates={candidates} />}
      {tab === 'settings' && <RecruitingSettingsForm initial={settings.recruiting} />}
    </>
  )
}
