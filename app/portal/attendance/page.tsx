import { CalendarCheck } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/data'
import { STATUS_LABEL, summarize } from '@/lib/attendance'
import { day, daysUntil, pct, todayET } from '@/lib/format'
import type { Attendance, Meeting } from '@/lib/types'
import { Badge, Card, EmptyState, PageHeader, Stat } from '@/components/portal/ui'
import { CheckIn } from '@/components/portal/CheckIn'
import { WorkTabs } from '@/components/portal/SectionTabs'

export const metadata = { title: 'Attendance' }

const TONE = { present: 'green', late: 'amber', excused: 'blue', absent: 'red', pending: 'gray' } as const
const KIND = { general: 'General meeting', sector: 'Sector meeting', ppg: 'PPG meeting', event: 'Event' } as const

export default async function AttendancePage() {
  const { member, access } = await requireMember()
  const supabase = await createClient()
  const settings = await getSettings()
  const today = todayET()
  const [meetingsRes, recordsRes] = await Promise.all([
    supabase.from('meetings').select('*').gte('meeting_date', settings.term.starts_on).order('meeting_date', { ascending: false }),
    supabase.from('attendance').select('*').eq('member_id', member.id),
  ])
  const meetings = (meetingsRes.data ?? []) as Meeting[]
  const records = (recordsRes.data ?? []) as Attendance[]
  const s = summarize(meetings, records, member, { inPpg: access.hasPpg, since: settings.term.starts_on, today })
  const mine = new Set(records.map(r => r.meeting_id))
  const open = meetings
    .filter(m => m.checkin_open && Math.abs(daysUntil(m.meeting_date)) <= 1)
    .filter(m => (m.kind !== 'sector' || m.sector === member.sector) && (m.kind !== 'ppg' || access.hasPpg))
    .map(m => ({ id: m.id, title: m.title, checkedIn: mine.has(m.id) }))

  return (
    <>
      <PageHeader title="My Work" description={`Your attendance for ${settings.term.name}. Excused absences don't count against you.`} />
      <WorkTabs active="attendance" memberId={member.id} />
      {open.length > 0 && <CheckIn openMeetings={open} />}

      <div className="ui-grid ui-grid-4" style={{ marginBottom: 20 }}>
        <Stat label="Attendance rate" value={s.rate === null ? '—' : pct(s.rate, 0, false)} sub={`${s.rows.length} meeting${s.rows.length === 1 ? '' : 's'} this term`} />
        <Stat label="Present" value={s.present} sub={s.late ? `+ ${s.late} late` : 'On time'} />
        <Stat label="Excused" value={s.excused} sub="Not counted" />
        <Stat label="Absent" value={s.absent} sub={s.absent ? 'Talk to your PM if this is wrong' : 'Nice work'} />
      </div>

      <Card title={<><CalendarCheck size={18} /> Meeting history</>} tight>
        {s.rows.length === 0 ? (
          <EmptyState title="No meetings recorded yet this term" />
        ) : (
          <ul className="ui-list">
            {s.rows.map(r => (
              <li key={r.meeting.id} className="ui-list-item">
                <div className="ui-list-main">
                  <div className="ui-list-title">{r.meeting.title}</div>
                  <div className="ui-list-sub">{day(r.meeting.meeting_date)} · {r.meeting.kind === 'sector' ? `${r.meeting.sector} meeting` : KIND[r.meeting.kind]}</div>
                </div>
                <Badge tone={TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
