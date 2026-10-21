import type { TaskKind, TaskStatus } from '@/lib/types'

export const TASK_KINDS: Record<TaskKind, string> = {
  earnings_report: 'Earnings report',
  one_pager: 'One-pager',
  stock_pitch: 'Stock pitch',
  research: 'Research',
  presentation: 'Presentation',
  ppg_report: 'PPG report',
  other: 'Task',
}

export const TASK_STATUS: Record<TaskStatus, { label: string; tone: 'gray' | 'blue' | 'amber' | 'green' }> = {
  todo: { label: 'To do', tone: 'gray' },
  in_progress: { label: 'In progress', tone: 'blue' },
  submitted: { label: 'Submitted', tone: 'amber' },
  done: { label: 'Done', tone: 'green' },
}
