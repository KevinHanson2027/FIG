'use client'
import { useState } from 'react'
import { CircleCheck, ExternalLink, ListChecks, MessageSquareText, Play, Send, Undo2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus } from '@/lib/types'
import { TASK_KINDS, TASK_STATUS } from '@/lib/tasks'
import { dueLabel, shortDate, todayET } from '@/lib/format'
import { Badge, EmptyState } from '@/components/portal/ui'
import { must, useMutation } from '@/components/portal/feedback'

type TaskView = Task & { assigner: string | null }

export default function MyTasks({ tasks }: { tasks: TaskView[] }) {
  const [tab, setTab] = useState<'open' | 'done'>('open')
  const open = tasks.filter(t => t.status !== 'done')
  const done = tasks.filter(t => t.status === 'done').sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
  const list = tab === 'open' ? open : done

  return (
    <>
      <div className="ui-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'open'} className={`ui-tab${tab === 'open' ? ' active' : ''}`} onClick={() => setTab('open')}>
          Open <span className="count">{open.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'done'} className={`ui-tab${tab === 'done' ? ' active' : ''}`} onClick={() => setTab('done')}>
          Completed <span className="count">{done.length}</span>
        </button>
      </div>
      {list.length === 0 ? (
        <div className="ui-card">
          <EmptyState icon={<ListChecks size={22} />} title={tab === 'open' ? "You're all caught up" : 'Nothing completed yet'}>
            {tab === 'open' ? 'When your PM assigns an earnings report, one-pager or pitch, it shows up here.' : 'Finished work will be listed here.'}
          </EmptyState>
        </div>
      ) : (
        <div className="ui-stack" style={{ gap: 12 }}>
          {list.map(t => <TaskCard key={t.id} task={t} />)}
        </div>
      )}
    </>
  )
}

function TaskCard({ task }: { task: TaskView }) {
  const [link, setLink] = useState(task.submission_url ?? '')
  const { run, pending } = useMutation()
  const overdue = task.due_date && task.due_date < todayET() && task.status !== 'submitted' && task.status !== 'done'

  async function update(status: TaskStatus, message: string) {
    if (status === 'submitted' && link && !/^https?:\/\//i.test(link.trim())) {
      return run(async () => { throw new Error('The link should start with https://') }, { refresh: false })
    }
    await run(async () => must(await createClient().from('tasks').update({ status, submission_url: link.trim() || null }).eq('id', task.id)), { success: message })
  }

  return (
    <article className="ui-card">
      <div className="ui-card-body" style={{ display: 'grid', gap: 12 }}>
        <div className="ui-spread" style={{ alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div className="ui-row" style={{ gap: 6, marginBottom: 4 }}>
              <Badge tone={TASK_STATUS[task.status].tone}>{TASK_STATUS[task.status].label}</Badge>
              <Badge>{TASK_KINDS[task.kind]}</Badge>
              {task.ticker && <Badge tone="navy">{task.ticker}</Badge>}
              {task.team === 'ppg' && <Badge tone="blue">PPG</Badge>}
            </div>
            <h3 style={{ fontFamily: 'var(--font-supporting)', fontSize: '1rem', fontWeight: 650, color: 'var(--ui-ink)' }}>{task.title}</h3>
            <div className="ui-small" style={{ color: overdue ? 'var(--ui-down)' : 'var(--ui-muted)', marginTop: 2 }}>
              {task.status === 'done' ? `Completed ${shortDate(task.completed_at)}` : dueLabel(task.due_date)}
              {task.assigner ? ` · from ${task.assigner}` : ''}
            </div>
          </div>
        </div>

        {task.description && <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-line', lineHeight: 1.55 }}>{task.description}</p>}

        {task.feedback && (
          <div className="ui-notice ui-notice-info">
            <MessageSquareText size={18} />
            <div><strong>Feedback:</strong> {task.feedback}</div>
          </div>
        )}

        {task.status === 'done' ? (
          task.submission_url && (
            <a href={task.submission_url} target="_blank" rel="noopener noreferrer" className="ui-link ui-small ui-row" style={{ gap: 4 }}>
              <ExternalLink size={14} /> Your submission
            </a>
          )
        ) : (
          <div className="ui-row" style={{ alignItems: 'stretch' }}>
            <input className="ui-input" style={{ flex: '1 1 260px' }} type="url" placeholder="Link to your Google Doc, slides or file"
              aria-label="Submission link" value={link} onChange={e => setLink(e.target.value)} />
            {task.status === 'todo' && (
              <button type="button" className="ui-btn ui-btn-secondary" disabled={pending} onClick={() => update('in_progress', 'Marked in progress')}>
                <Play size={15} /> Start
              </button>
            )}
            {(task.status === 'todo' || task.status === 'in_progress') && (
              <button type="button" className="ui-btn ui-btn-primary" disabled={pending || !link.trim()} onClick={() => update('submitted', 'Submitted for review')}
                title={!link.trim() ? 'Add a link to your work first' : undefined}>
                <Send size={15} /> Submit
              </button>
            )}
            {task.status === 'submitted' && (
              <>
                {link !== (task.submission_url ?? '') && (
                  <button type="button" className="ui-btn ui-btn-primary" disabled={pending} onClick={() => update('submitted', 'Link updated')}>
                    <CircleCheck size={15} /> Save link
                  </button>
                )}
                <button type="button" className="ui-btn ui-btn-ghost" disabled={pending} onClick={() => update('in_progress', 'Moved back to in progress')}>
                  <Undo2 size={15} /> Unsubmit
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
