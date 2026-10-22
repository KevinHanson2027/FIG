import { Suspense } from 'react'
import Link from 'next/link'
import { CalendarCheck, ChevronRight, ClipboardCheck, ImagePlus, Inbox, ListChecks, MessagesSquare, TriangleAlert } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors, getSettings } from '@/lib/data'
import { summarize } from '@/lib/attendance'
import { audienceOptions } from '@/lib/audience'
import { dateTime, daysUntil, dueLabel, firstName, greeting, pct, todayET } from '@/lib/format'
import type { Announcement, Attendance, Meeting, Task } from '@/lib/types'
import { Stat } from '@/components/portal/ui'
import { CheckIn } from '@/components/portal/CheckIn'
import { Announcements } from '@/components/portal/Announcements'
import { ReferButton } from '@/components/portal/ReferButton'
import { MarketTiles, SectorHoldings, SectorNews, StatSkeleton } from './_home/market'

export const metadata = { title: 'Home' }

type Action = { href: string; icon: React.ReactNode; tone?: string; text: React.ReactNode }

export default async function PortalHome() {
  const { member, access } = await requireMember()
  const supabase = await createClient()
  const [settings, sectors] = await Promise.all([getSettings(), getSectors()])
  const today = todayET()

  const [tasksRes, interviewsRes, meetingsRes, attendanceRes, announcementsRes, approvalCounts, toReview] = await Promise.all([
    supabase.from('tasks').select('*').eq('assigned_to', member.id).neq('status', 'done').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('interviews').select('id, scheduled_at, candidate:candidates(name)').eq('interviewer_id', member.id).eq('status', 'scheduled').order('scheduled_at'),
    supabase.from('meetings').select('*').gte('meeting_date', settings.term.starts_on).order('meeting_date', { ascending: false }),
    supabase.from('attendance').select('*').eq('member_id', member.id),
    supabase.from('announcements').select('*, author:members_directory(name)').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(4),
    access.isAdmin
      ? Promise.all(['members_directory', 'role_requests', 'profile_changes'].map(t =>
          supabase.from(t).select('id', { count: 'exact', head: true }).eq('status', 'pending')))
      : Promise.resolve([]),
    access.pmSectors.length
      ? supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('team', 'sector').in('sector', access.pmSectors).eq('status', 'submitted')
      : Promise.resolve({ count: 0 }),
  ])

  const tasks = (tasksRes.data ?? []) as Task[]
  const meetings = (meetingsRes.data ?? []) as Meeting[]
  const records = (attendanceRes.data ?? []) as Attendance[]
  const interviews = (interviewsRes.data ?? []) as unknown as { id: string; scheduled_at: string | null; candidate: { name: string } | null }[]
  const approvals = approvalCounts.reduce((s, r) => s + (r.count ?? 0), 0)
  const attendance = summarize(meetings, records, member, { inPpg: access.hasPpg, since: settings.term.starts_on, today })
  const announcements = ((announcementsRes.data ?? []) as (Announcement & { author: { name: string } | null })[])
    .map(a => ({ ...a, author: a.author?.name ?? null }))
  const postOptions = audienceOptions(access, sectors.map(s => s.name))

  const checkedIn = new Set(records.map(r => r.meeting_id))
  const openMeetings = meetings
    .filter(m => m.checkin_open && Math.abs(daysUntil(m.meeting_date)) <= 1)
    .filter(m => m.kind !== 'sector' || m.sector === member.sector)
    .filter(m => m.kind !== 'ppg' || access.hasPpg)
    .map(m => ({ id: m.id, title: m.title, checkedIn: checkedIn.has(m.id) }))

  // Everything that needs this person, most urgent first.
  const actions: Action[] = []
  if (approvals > 0) actions.push({ href: '/portal/admin', icon: <Inbox size={16} />, text: <><strong>{approvals}</strong> request{approvals === 1 ? '' : 's'} waiting for your approval</> })
  if ((toReview.count ?? 0) > 0) actions.push({ href: '/portal/team?tab=tasks', icon: <ClipboardCheck size={16} />, tone: 'blue', text: <><strong>{toReview.count}</strong> submission{toReview.count === 1 ? '' : 's'} from your team to review</> })
  for (const iv of interviews.slice(0, 2)) actions.push({ href: '/portal/interviews', icon: <MessagesSquare size={16} />, tone: 'blue', text: <>Interview <strong>{iv.candidate?.name ?? 'a candidate'}</strong> · {dateTime(iv.scheduled_at)}</> })
  for (const t of tasks.filter(t => t.status !== 'submitted').slice(0, 3)) {
    const overdue = Boolean(t.due_date && t.due_date < today)
    actions.push({ href: '/portal/tasks', icon: overdue ? <TriangleAlert size={16} /> : <ListChecks size={16} />, tone: overdue ? 'amber' : 'gray', text: <><strong>{t.title}</strong> · {dueLabel(t.due_date)}</> })
  }
  const moreTasks = tasks.filter(t => t.status !== 'submitted').length - 3
  if (moreTasks > 0) actions.push({ href: '/portal/tasks', icon: <ListChecks size={16} />, tone: 'gray', text: <>{moreTasks} more task{moreTasks === 1 ? '' : 's'}</> })
  if (!member.bio || !member.headshot_url) {
    actions.push({ href: '/portal/profile', icon: <ImagePlus size={16} />, tone: 'green', text: <>Add your {member.headshot_url ? 'bio' : member.bio ? 'photo' : 'photo and bio'} to the FIG website</> })
  }

  return (
    <>
      <div className="portal-hello">
        <div>
          <h1>{greeting()}, {firstName(member.name)}</h1>
          <p>{member.title ?? `${member.sector} Analyst`} · {settings.term.name}</p>
        </div>
        <ReferButton sectors={sectors.filter(s => s.kind === 'investment').map(s => s.name)} />
      </div>

      {openMeetings.length > 0 && <CheckIn openMeetings={openMeetings} />}

      {actions.length > 0 ? (
        <div className="portal-actions">
          {actions.map((a, i) => (
            <Link key={i} href={a.href} className="portal-action">
              <span className={`dot${a.tone ? ` ${a.tone}` : ''}`}>{a.icon}</span>
              <span>{a.text}</span>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      ) : (
        <p className="portal-allclear">You&apos;re all caught up.</p>
      )}

      <div className="ui-grid ui-grid-3" style={{ marginBottom: 20 }}>
        <Suspense fallback={<><StatSkeleton /><StatSkeleton /></>}>
          <MarketTiles sector={member.sector} />
        </Suspense>
        <Link href="/portal/attendance" className="portal-tile-link">
          <Stat
            label={`Attendance · ${settings.term.name}`}
            icon={<CalendarCheck size={15} />}
            value={attendance.rate === null ? '—' : pct(attendance.rate, 0, false)}
            sub={attendance.rows.length ? `${attendance.present + attendance.late} of ${attendance.present + attendance.late + attendance.absent} meetings` : 'No meetings yet'}
          />
        </Link>
      </div>

      {(announcements.length > 0 || postOptions.length > 0) && (
        <div style={{ marginBottom: 20 }}>
          <Announcements items={announcements} postOptions={postOptions} viewerId={member.id} isAdmin={access.isAdmin} />
        </div>
      )}

      <div className="ui-grid ui-grid-2">
        <Suspense fallback={<div className="ui-skeleton" style={{ height: 320 }} />}>
          <SectorHoldings sector={member.sector} />
        </Suspense>
        <Suspense fallback={<div className="ui-skeleton" style={{ height: 320 }} />}>
          <SectorNews sector={member.sector} />
        </Suspense>
      </div>
    </>
  )
}
