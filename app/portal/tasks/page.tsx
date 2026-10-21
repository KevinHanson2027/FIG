import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types'
import { PageHeader } from '@/components/portal/ui'
import MyTasks from './MyTasks'

export const metadata = { title: 'My Tasks' }

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
      <PageHeader title="My Tasks" description="Work assigned to you by your PM or the PPG manager. Attach a link to your doc or slides, then submit for review." />
      <MyTasks tasks={tasks} />
    </>
  )
}
