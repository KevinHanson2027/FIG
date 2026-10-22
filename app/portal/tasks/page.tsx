import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types'
import { PageHeader } from '@/components/portal/ui'
import { WorkTabs } from '@/components/portal/SectionTabs'
import MyTasks from './MyTasks'

export const metadata = { title: 'My Work' }

export default async function TasksPage() {
  const { member } = await requireMember()
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('*, assigner:members_directory!tasks_assigned_by_fkey(name)')
    .eq('assigned_to', member.id)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  const tasks = ((data ?? []) as (Task & { assigner: { name: string } | null })[]).map(t => ({ ...t, assigner: t.assigner?.name ?? null }))

  return (
    <>
      <PageHeader title="My Work" description="Assignments from your PM or the PPG manager. Attach a link to your work, then submit it for review." />
      <WorkTabs active="tasks" memberId={member.id} />
      <MyTasks tasks={tasks} />
    </>
  )
}
