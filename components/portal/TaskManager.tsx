'use client'
import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronRight, ExternalLink, ListChecks, Plus, Trash2, Undo2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskKind, TaskTeam } from '@/lib/types'
import { TASK_KINDS, TASK_STATUS } from '@/lib/tasks'
import { dueLabel, todayET } from '@/lib/format'
import { Avatar } from './Avatar'
import { Modal } from './Modal'
import { must, useConfirm, useMutation } from './feedback'
import { Badge, EmptyState } from './ui'

export type TeamMember = { id: string; name: string; headshot_url: string | null }
export type ManagedTask = Task & { assignee: string | null }

type Group = { key: string; title: string; kind: TaskKind; ticker: string | null; due: string | null; description: string | null; tasks: ManagedTask[] }

function groupTasks(tasks: ManagedTask[]): Group[] {
  const groups = new Map<string, Group>()
  for (const t of tasks) {
    const key = t.batch_id ?? t.id
    const g = groups.get(key) ?? { key, title: t.title, kind: t.kind, ticker: t.ticker, due: t.due_date, description: t.description, tasks: [] }
    g.tasks.push(t)
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
}

export function TaskManager({ team, sector, members, tasks, tickers }: {
  team: TaskTeam
  sector: string | null
  members: TeamMember[]
  tasks: ManagedTask[]
  tickers: string[]
}) {
  const [view, setView] = useState<'open' | 'done'>('open')
  const [assigning, setAssigning] = useState(false)
  const groups = useMemo(() => groupTasks(tasks), [tasks])
  const openGroups = groups.filter(g => g.tasks.some(t => t.status !== 'done'))
  const doneGroups = groups.filter(g => g.tasks.every(t => t.status === 'done'))
  const list = view === 'open' ? openGroups : doneGroups
  const toReview = tasks.filter(t => t.status === 'submitted').length

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <div>
          <h2><ListChecks size={18} /> Assignments</h2>
          <p>{toReview ? `${toReview} submission${toReview === 1 ? '' : 's'} waiting for your review` : 'Assign earnings reports, one-pagers, pitches and more.'}</p>
        </div>
        <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setAssigning(true)} disabled={members.length === 0}>
          <Plus size={15} /> Assign task
        </button>
      </div>
      <div style={{ padding: '12px 20px 0' }}>
        <div className="ui-seg" role="tablist">
          <button type="button" className={view === 'open' ? 'on' : ''} onClick={() => setView('open')}>Open ({openGroups.length})</button>
          <button type="button" className={view === 'done' ? 'on' : ''} onClick={() => setView('done')}>Completed ({doneGroups.length})</button>
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<ListChecks size={22} />} title={view === 'open' ? 'No open assignments' : 'Nothing completed yet'}>
          {view === 'open' ? 'Use "Assign task" to give your team work — assign one person or everyone at once.' : undefined}
        </EmptyState>
      ) : (
        <div style={{ padding: '12px 20px 20px', display: 'grid', gap: 10 }}>
          {list.map(g => <TaskGroup key={g.key} group={g} />)}
        </div>
      )}
      <AssignModal open={assigning} onClose={() => setAssigning(false)} team={team} sector={sector} members={members} tickers={tickers} />
    </section>
  )
}

function TaskGroup({ group }: { group: Group }) {
  const [expanded, setExpanded] = useState(group.tasks.some(t => t.status === 'submitted'))
  const [sendingBack, setSendingBack] = useState<ManagedTask | null>(null)
  const [note, setNote] = useState('')
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  const submitted = group.tasks.filter(t => t.status === 'submitted').length
  const done = group.tasks.filter(t => t.status === 'done').length
  const overdue = group.due && group.due < todayET() && done < group.tasks.length

  async function markDone(t: ManagedTask) {
    await run(async () => must(await createClient().from('tasks').update({ status: 'done' }).eq('id', t.id)), { success: `Marked ${t.assignee ?? 'task'} done` })
  }

  async function sendBack(e: React.FormEvent) {
    e.preventDefault()
    if (!sendingBack) return
    const ok = await run(async () => must(await createClient().from('tasks').update({ status: 'in_progress', feedback: note.trim() || null }).eq('id', sendingBack.id)),
      { success: 'Sent back with feedback' })
    if (ok) setSendingBack(null)
  }

  async function removeGroup() {
    if (!(await confirm({ title: `Delete "${group.title}"?`, body: `This removes it for all ${group.tasks.length} assignee${group.tasks.length === 1 ? '' : 's'}.`, confirmLabel: 'Delete', danger: true }))) return
    await run(async () => must(await createClient().from('tasks').delete().in('id', group.tasks.map(t => t.id))), { success: 'Assignment deleted' })
  }

  return (
    <div style={{ border: '1px solid var(--ui-line)', borderRadius: 10 }}>
      <button type="button" onClick={() => setExpanded(e => !e)} aria-expanded={expanded}
        style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ui-row" style={{ gap: 6 }}>
            <strong style={{ color: 'var(--ui-ink)' }}>{group.title}</strong>
            <Badge>{TASK_KINDS[group.kind]}</Badge>
            {group.ticker && <Badge tone="navy">{group.ticker}</Badge>}
          </div>
          <div className="ui-small" style={{ color: overdue ? 'var(--ui-down)' : 'var(--ui-muted)', marginTop: 2 }}>
            {dueLabel(group.due)} · {done}/{group.tasks.length} done{submitted ? ` · ${submitted} to review` : ''}
          </div>
        </div>
        <div className="ui-meter" style={{ width: 90, flexShrink: 0 }} aria-hidden>
          <span style={{ width: `${(done / group.tasks.length) * 100}%` }} />
        </div>
      </button>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--ui-line)' }}>
          {group.description && <p className="ui-small" style={{ padding: '10px 14px 0', whiteSpace: 'pre-line', color: 'var(--ui-text)' }}>{group.description}</p>}
          <ul className="ui-list">
            {group.tasks.map(t => (
              <li key={t.id} className="ui-list-item" style={{ padding: '10px 14px', flexWrap: 'wrap' }}>
                <div className="ui-list-main" style={{ minWidth: 160 }}>
                  <div className="ui-list-title">{t.assignee ?? 'Member'}</div>
                  {t.feedback && t.status !== 'done' && <div className="ui-list-sub">Feedback: {t.feedback}</div>}
                </div>
                <Badge tone={TASK_STATUS[t.status].tone}>{TASK_STATUS[t.status].label}</Badge>
                {t.submission_url && /^https?:\/\//.test(t.submission_url) && (
                  <a href={t.submission_url} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-ghost ui-btn-sm"><ExternalLink size={14} /> Open</a>
                )}
                {t.status !== 'done' && (
                  <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" disabled={pending} onClick={() => markDone(t)}><Check size={14} /> Done</button>
                )}
                {t.status === 'submitted' && (
                  <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" disabled={pending} onClick={() => { setNote(t.feedback ?? ''); setSendingBack(t) }}><Undo2 size={14} /> Send back</button>
                )}
              </li>
            ))}
          </ul>
          <div style={{ padding: '8px 14px 12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={removeGroup} disabled={pending}><Trash2 size={14} /> Delete assignment</button>
          </div>
        </div>
      )}
      <Modal open={sendingBack !== null} onClose={() => setSendingBack(null)} title={`Send back to ${sendingBack?.assignee ?? 'member'}`}
        description="They'll see your feedback on their task and can resubmit."
        footer={<>
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setSendingBack(null)}>Cancel</button>
          <button type="submit" form="sendback-form" className="ui-btn ui-btn-primary" disabled={pending}>Send back</button>
        </>}>
        <form id="sendback-form" onSubmit={sendBack} className="ui-field">
          <label htmlFor="sb-note">What should change?</label>
          <textarea id="sb-note" className="ui-textarea" rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Add the margin bridge and a price target." />
        </form>
      </Modal>
    </div>
  )
}

function AssignModal({ open, onClose, team, sector, members, tickers }: {
  open: boolean; onClose: () => void; team: TaskTeam; sector: string | null; members: TeamMember[]; tickers: string[]
}) {
  const blank = { title: '', kind: (team === 'ppg' ? 'ppg_report' : 'earnings_report') as TaskKind, ticker: '', due: '', description: '' }
  const [f, setF] = useState(blank)
  const [who, setWho] = useState<Set<string>>(new Set())
  const { run, pending } = useMutation()
  const allChosen = who.size === members.length && members.length > 0

  function toggle(id: string) {
    setWho(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const batch = crypto.randomUUID()
    const rows = [...who].map(id => ({
      title: f.title.trim(), kind: f.kind, team, sector: team === 'sector' ? sector : null,
      ticker: f.ticker.trim().toUpperCase() || null, due_date: f.due || null,
      description: f.description.trim() || null, assigned_to: id, batch_id: batch,
    }))
    const ok = await run(async () => must(await createClient().from('tasks').insert(rows)), { success: `Assigned to ${rows.length} member${rows.length === 1 ? '' : 's'}` })
    if (ok) { setF(blank); setWho(new Set()); onClose() }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign a task" wide
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="assign-form" className="ui-btn ui-btn-primary" disabled={pending || !f.title.trim() || who.size === 0}>
          {pending ? 'Assigning…' : `Assign${who.size ? ` to ${who.size}` : ''}`}
        </button>
      </>}>
      <form id="assign-form" onSubmit={save} className="ui-form">
        <div className="ui-form-grid">
          <div className="ui-field span-2">
            <label htmlFor="t-title">Title</label>
            <input id="t-title" className="ui-input" required maxLength={160} value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))}
              placeholder={team === 'ppg' ? 'e.g. October performance attribution' : 'e.g. Q3 earnings report'} />
          </div>
          <div className="ui-field">
            <label htmlFor="t-kind">Type</label>
            <select id="t-kind" className="ui-select" value={f.kind} onChange={e => setF(x => ({ ...x, kind: e.target.value as TaskKind }))}>
              {(Object.keys(TASK_KINDS) as TaskKind[]).map(k => <option key={k} value={k}>{TASK_KINDS[k]}</option>)}
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="t-due">Due date</label>
            <input id="t-due" className="ui-input" type="date" value={f.due} min={todayET()} onChange={e => setF(x => ({ ...x, due: e.target.value }))} />
          </div>
          <div className="ui-field span-2">
            <label htmlFor="t-ticker">Holding <span className="ui-muted">(optional)</span></label>
            <input id="t-ticker" className="ui-input" list="t-tickers" value={f.ticker} onChange={e => setF(x => ({ ...x, ticker: e.target.value }))} placeholder="Ticker this is about" style={{ textTransform: 'uppercase' }} />
            <datalist id="t-tickers">{tickers.map(t => <option key={t} value={t} />)}</datalist>
          </div>
          <div className="ui-field span-2">
            <label htmlFor="t-desc">Instructions <span className="ui-muted">(optional)</span></label>
            <textarea id="t-desc" className="ui-textarea" rows={3} value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))}
              placeholder="What to cover, template link, format…" />
          </div>
        </div>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="ui-spread" style={{ marginBottom: 8 }}>
            <legend className="ui-label">Assign to</legend>
            <button type="button" className="login-text-btn" onClick={() => setWho(allChosen ? new Set() : new Set(members.map(m => m.id)))}>
              {allChosen ? 'Clear' : 'Select everyone'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
            {members.map(m => (
              <label key={m.id} className="ui-check" style={{ alignItems: 'center', padding: '6px 8px', border: '1px solid var(--ui-line)', borderRadius: 8, background: who.has(m.id) ? '#f6f8fd' : '#fff' }}>
                <input type="checkbox" checked={who.has(m.id)} onChange={() => toggle(m.id)} style={{ marginTop: 0 }} />
                <Avatar name={m.name} url={m.headshot_url} size="sm" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
