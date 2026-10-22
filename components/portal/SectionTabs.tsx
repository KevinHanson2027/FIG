// Tab bars for nav items that group several pages: My Work and Portfolio.
import { createClient } from '@/lib/supabase/server'
import { SubNav } from './ui'

export async function WorkTabs({ active, memberId }: { active: 'tasks' | 'attendance' | 'interviews'; memberId: string }) {
  const supabase = await createClient()
  const [tasks, interviews] = await Promise.all([
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('assigned_to', memberId).in('status', ['todo', 'in_progress']),
    supabase.from('interviews').select('status').eq('interviewer_id', memberId).neq('status', 'cancelled'),
  ])
  const ivs = interviews.data ?? []
  return (
    <SubNav label="My Work" items={[
      { href: '/portal/tasks', label: 'Tasks', active: active === 'tasks', count: tasks.count ?? 0 },
      { href: '/portal/attendance', label: 'Attendance', active: active === 'attendance' },
      ...(ivs.length || active === 'interviews'
        ? [{ href: '/portal/interviews', label: 'Interviews', active: active === 'interviews', count: ivs.filter(i => i.status === 'scheduled').length }]
        : []),
    ]} />
  )
}

export function PortfolioTabs({ active }: { active: 'overview' | 'holdings' | 'markets' }) {
  return (
    <SubNav label="Portfolio" items={[
      { href: '/portal/portfolio', label: 'Overview', active: active === 'overview' },
      { href: '/portal/portfolio?tab=holdings', label: 'Holdings', active: active === 'holdings' },
      { href: '/portal/tools', label: 'Markets', active: active === 'markets' },
    ]} />
  )
}
