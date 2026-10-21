'use client'
import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, DoorClosed, DoorOpen, Trash2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Attendance, AttendanceStatus, Meeting, MeetingKind } from '@/lib/types'
import { newCheckinCode } from '@/lib/attendance'
import { day, todayET } from '@/lib/format'
import { Avatar } from './Avatar'
import { Modal } from './Modal'
import { friendlyError, must, useConfirm, useMutation, useToast } from './feedback'
import { Badge, EmptyState } from './ui'
import type { TeamMember } from './TaskManager'

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
  { value: 'absent', label: 'Absent' },
]
const KIND_LABEL: Record<MeetingKind, string> = { general: 'General', sector: 'Sector', ppg: 'PPG', event: 'Event' }

export function AttendanceManager({ meetings, records, members, createKinds, sector, editableMeetingIds, defaultTitle }: {
  meetings: Meeting[]
  records: Attendance[]
  members: TeamMember[]
  createKinds: MeetingKind[]
  sector: string | null
  editableMeetingIds: string[]
  defaultTitle: string
}) {
  const [selectedId, setSelectedId] = useState(meetings[0]?.id ?? '')
  const [creating, setCreating] = useState(false)
  const selected = meetings.find(m => m.id === selectedId) ?? meetings[0]

  useEffect(() => {
    if (!meetings.some(m => m.id === selectedId) && meetings[0]) setSelectedId(meetings[0].id)
  }, [meetings, selectedId])

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <div>
          <h2><Users size={18} /> Attendance</h2>
          <p>Open check-in during the meeting, then fill in anyone who didn&apos;t check in.</p>
        </div>
        {createKinds.length > 0 && (
          <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setCreating(true)}><CalendarPlus size={15} /> New meeting</button>
        )}
      </div>

      {meetings.length === 0 ? (
        <EmptyState icon={<CalendarPlus size={22} />} title="No meetings this term yet"
          action={createKinds.length ? <button type="button" className="ui-btn ui-btn-primary" onClick={() => setCreating(true)}>Create a meeting</button> : undefined}>
          {createKinds.length ? 'Create a meeting to take attendance or open self check-in.' : 'Meetings created by the co-presidents will appear here.'}
        </EmptyState>
      ) : (
        <div className="ui-card-body ui-stack" style={{ gap: 16 }}>
          <div className="ui-field" style={{ maxWidth: 420 }}>
            <label htmlFor="att-meeting">Meeting</label>
            <select id="att-meeting" className="ui-select" value={selected?.id} onChange={e => setSelectedId(e.target.value)}>
              {meetings.map(m => <option key={m.id} value={m.id}>{day(m.meeting_date)} · {m.title}</option>)}
            </select>
          </div>
          {selected && (
            <MeetingPanel key={selected.id} meeting={selected} members={members}
              records={records.filter(r => r.meeting_id === selected.id)}
              canManage={editableMeetingIds.includes(selected.id)} />
          )}
        </div>
      )}

      <NewMeetingModal open={creating} onClose={() => setCreating(false)} kinds={createKinds} sector={sector} defaultTitle={defaultTitle}
        onCreated={id => setSelectedId(id)} />
    </section>
  )
}

function MeetingPanel({ meeting, members, records, canManage }: { meeting: Meeting; members: TeamMember[]; records: Attendance[]; canManage: boolean }) {
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({})
  const { run, pending } = useMutation()
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    setMarks(Object.fromEntries(records.map(r => [r.member_id, r.status])))
  }, [records])

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, excused: 0, absent: 0, unmarked: 0 }
    for (const m of members) { const s = marks[m.id]; if (s) c[s]++; else c.unmarked++ }
    return c
  }, [marks, members])

  async function mark(memberId: string, status: AttendanceStatus) {
    const previous = marks[memberId]
    setMarks(m => ({ ...m, [memberId]: status }))
    const { error } = await createClient().from('attendance').upsert({ meeting_id: meeting.id, member_id: memberId, status }, { onConflict: 'meeting_id,member_id' })
    if (error) {
      setMarks(m => { const n = { ...m }; if (previous) n[memberId] = previous; else delete n[memberId]; return n })
      toast.error(friendlyError(error))
    }
  }

  async function markRestAbsent() {
    const rest = members.filter(m => !marks[m.id])
    if (rest.length === 0) return
    await run(async () => {
      must(await createClient().from('attendance').upsert(rest.map(m => ({ meeting_id: meeting.id, member_id: m.id, status: 'absent' as const })), { onConflict: 'meeting_id,member_id' }))
      setMarks(m => ({ ...m, ...Object.fromEntries(rest.map(r => [r.id, 'absent' as const])) }))
    }, { success: `Marked ${rest.length} absent` })
  }

  async function toggleCheckin() {
    const open = !meeting.checkin_open
    await run(async () => must(await createClient().from('meetings')
      .update({ checkin_open: open, ...(open && !meeting.checkin_code ? { checkin_code: newCheckinCode() } : {}) })
      .eq('id', meeting.id)), { success: open ? 'Check-in is open' : 'Check-in closed' })
  }

  async function remove() {
    if (!(await confirm({ title: `Delete "${meeting.title}"?`, body: 'Attendance recorded for this meeting will be deleted too.', confirmLabel: 'Delete', danger: true }))) return
    await run(async () => must(await createClient().from('meetings').delete().eq('id', meeting.id)), { success: 'Meeting deleted' })
  }

  return (
    <>
      <div className="ui-spread" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="ui-row" style={{ gap: 6 }}>
            <strong style={{ color: 'var(--ui-ink)', fontSize: '1rem' }}>{meeting.title}</strong>
            <Badge tone="blue">{meeting.kind === 'sector' ? meeting.sector ?? 'Sector' : KIND_LABEL[meeting.kind]}</Badge>
          </div>
          <div className="ui-small ui-muted" style={{ marginTop: 2 }}>
            {day(meeting.meeting_date)} · {counts.present} present · {counts.late} late · {counts.excused} excused · {counts.absent} absent{counts.unmarked ? ` · ${counts.unmarked} not marked` : ''}
          </div>
        </div>
        <div className="ui-row">
          {canManage && (
            <button type="button" className={`ui-btn ui-btn-sm ${meeting.checkin_open ? 'ui-btn-secondary' : 'ui-btn-dark'}`} onClick={toggleCheckin} disabled={pending}>
              {meeting.checkin_open ? <><DoorClosed size={15} /> Close check-in</> : <><DoorOpen size={15} /> Open check-in</>}
            </button>
          )}
          {canManage && <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label="Delete meeting" onClick={remove}><Trash2 size={15} /></button>}
        </div>
      </div>

      {meeting.checkin_open && meeting.checkin_code && (
        <div className="ui-notice ui-notice-success" style={{ alignItems: 'center' }}>
          <DoorOpen size={18} />
          <div style={{ flex: 1 }}>
            <strong>Check-in is open.</strong> Put this code on screen — members enter it from their portal home page.
          </div>
          <span className="checkin-code" aria-label={`Check-in code ${meeting.checkin_code.split('').join(' ')}`}>{meeting.checkin_code}</span>
        </div>
      )}

      {members.length === 0 ? (
        <EmptyState title="No members to mark" />
      ) : (
        <div style={{ border: '1px solid var(--ui-line)', borderRadius: 10 }}>
          <ul className="ui-list">
            {members.map(m => (
              <li key={m.id} className="ui-list-item" style={{ flexWrap: 'wrap', padding: '10px 14px' }}>
                <Avatar name={m.name} url={m.headshot_url} size="sm" />
                <div className="ui-list-main" style={{ minWidth: 120 }}><div className="ui-list-title">{m.name}</div></div>
                <div className="ui-seg" role="radiogroup" aria-label={`Attendance for ${m.name}`}>
                  {STATUSES.map(s => (
                    <button key={s.value} type="button" role="radio" aria-checked={marks[m.id] === s.value}
                      className={`${marks[m.id] === s.value ? `on ${s.value}` : ''}`} onClick={() => mark(m.id, s.value)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {counts.unmarked > 0 && (
        <div><button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={markRestAbsent} disabled={pending}>Mark {counts.unmarked} unmarked as absent</button></div>
      )}
    </>
  )
}

function NewMeetingModal({ open, onClose, kinds, sector, defaultTitle, onCreated }: {
  open: boolean; onClose: () => void; kinds: MeetingKind[]; sector: string | null; defaultTitle: string; onCreated: (id: string) => void
}) {
  const [f, setF] = useState({ title: defaultTitle, date: todayET(), kind: kinds[0] ?? 'general', openNow: true })
  const { run, pending } = useMutation()

  useEffect(() => { if (open) setF({ title: defaultTitle, date: todayET(), kind: kinds[0] ?? 'general', openNow: true }) }, [open, defaultTitle, kinds])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const created = await run(async () => {
      const { data, error } = await createClient().from('meetings').insert({
        title: f.title.trim(), meeting_date: f.date, kind: f.kind,
        sector: f.kind === 'sector' ? sector : null,
        checkin_open: f.openNow, checkin_code: newCheckinCode(),
      }).select('id').single()
      if (error) throw new Error(error.message)
      return data.id as string
    }, { success: 'Meeting created' })
    if (created) { onCreated(created); onClose() }
  }

  return (
    <Modal open={open} onClose={onClose} title="New meeting"
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="meeting-form" className="ui-btn ui-btn-primary" disabled={pending || !f.title.trim()}>Create</button>
      </>}>
      <form id="meeting-form" onSubmit={save} className="ui-form">
        <div className="ui-field">
          <label htmlFor="m-title">Title</label>
          <input id="m-title" className="ui-input" required value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} />
        </div>
        <div className="ui-form-grid">
          <div className="ui-field">
            <label htmlFor="m-date">Date</label>
            <input id="m-date" className="ui-input" type="date" required value={f.date} onChange={e => setF(x => ({ ...x, date: e.target.value }))} />
          </div>
          {kinds.length > 1 && (
            <div className="ui-field">
              <label htmlFor="m-kind">Type</label>
              <select id="m-kind" className="ui-select" value={f.kind} onChange={e => setF(x => ({ ...x, kind: e.target.value as MeetingKind }))}>
                {kinds.map(k => <option key={k} value={k}>{k === 'sector' ? `${sector} meeting` : `${KIND_LABEL[k]} ${k === 'event' ? '(optional attendance)' : 'meeting'}`}</option>)}
              </select>
            </div>
          )}
        </div>
        <label className="ui-check">
          <input type="checkbox" checked={f.openNow} onChange={e => setF(x => ({ ...x, openNow: e.target.checked }))} />
          Open self check-in now (members enter a code on their phone)
        </label>
      </form>
    </Modal>
  )
}
