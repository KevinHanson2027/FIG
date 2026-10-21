// Attendance rules shared by the member, PM and admin views.
import type { Attendance, AttendanceStatus, Meeting } from '@/lib/types'

export type AttendanceRow = { meeting: Meeting; status: AttendanceStatus | 'pending' }

export type AttendanceSummary = {
  rate: number | null          // (present + late) / meetings that count
  present: number
  late: number
  excused: number
  absent: number
  rows: AttendanceRow[]
}

/** Meetings a member is expected at: general meetings, their sector's
 *  meetings, and PPG meetings if they're in PPG. Events are optional. */
export function appliesTo(m: Meeting, member: { sector: string }, inPpg: boolean) {
  return m.kind === 'general' || (m.kind === 'sector' && m.sector === member.sector) || (m.kind === 'ppg' && inPpg)
}

export function summarize(
  meetings: Meeting[],
  records: Attendance[],
  member: { id: string; sector: string; created_at: string },
  opts: { inPpg: boolean; since: string; today: string },
): AttendanceSummary {
  const joined = member.created_at.slice(0, 10)
  const byMeeting = new Map(records.filter(r => r.member_id === member.id).map(r => [r.meeting_id, r.status]))
  const rows: AttendanceRow[] = meetings
    .filter(m => m.meeting_date >= opts.since && m.meeting_date <= opts.today && m.meeting_date >= joined)
    .filter(m => appliesTo(m, member, opts.inPpg) || byMeeting.has(m.id))
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date))
    .map(m => {
      const recorded = byMeeting.get(m.id)
      // No record yet on the day of the meeting = still pending, not absent.
      const status: AttendanceRow['status'] = recorded ?? (m.meeting_date === opts.today ? 'pending' : appliesTo(m, member, opts.inPpg) ? 'absent' : 'pending')
      return { meeting: m, status }
    })

  const count = (s: AttendanceStatus) => rows.filter(r => r.status === s && r.meeting.kind !== 'event').length
  const present = count('present'), late = count('late'), excused = count('excused'), absent = count('absent')
  const counted = present + late + absent
  return { rate: counted ? (present + late) / counted : null, present, late, excused, absent, rows }
}

export const STATUS_LABEL: Record<AttendanceStatus | 'pending', string> = {
  present: 'Present',
  late: 'Late',
  excused: 'Excused',
  absent: 'Absent',
  pending: 'Not recorded',
}

/** Short, unambiguous check-in codes (no 0/O/1/I/L). */
export function newCheckinCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}
