import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Candidate, Interview } from '@/lib/types'
import { PageHeader } from '@/components/portal/ui'
import { WorkTabs } from '@/components/portal/SectionTabs'
import InterviewList from './InterviewList'

export const metadata = { title: 'Interviews' }

export default async function InterviewsPage() {
  const { member } = await requireMember()
  const supabase = await createClient()
  const { data } = await supabase
    .from('interviews')
    .select('*, candidate:candidates(*)')
    .eq('interviewer_id', member.id)
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: true })
  const interviews = (data ?? []) as (Interview & { candidate: Candidate | null })[]

  return (
    <>
      <PageHeader title="My Work" description="Candidates you're interviewing. Fill in the scorecard right after each interview; recruiting sees it right away." />
      <WorkTabs active="interviews" memberId={member.id} />
      <InterviewList interviews={interviews} />
    </>
  )
}
