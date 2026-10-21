import { Suspense } from 'react'
import Link from 'next/link'
import { CalendarCheck, ChevronRight, ClipboardCheck, ImagePlus, Inbox, ListChecks, MessagesSquare, Plus, TriangleAlert } from 'lucide-react'
import { requireMember } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getSectors, getSettings } from '@/lib/data'
import { summarize } from '@/lib/attendance'
import { audienceOptions } from '@/lib/audience'
import { dateTime, daysUntil, dueLabel, firstName, greeting, pct, todayET } from '@/lib/format'
import type { Announcement, Attendance, Meeting, Task } from '@/lib/types'
import { Card, EmptyState, Stat } from '@/components/portal/ui'
import { CheckIn } from '@/components/portal/CheckIn'
import { Announcements } from '@/components/portal/Announcements'
import { MarketTiles, SectorHoldings, SectorNews, StatSkeleton } from './_home/market'

export const metadata = { title: 'Home' }

export default async function PortalHome() {
  const { member, access } = await requireMember()
  const supabase = await createClient()
  const [settings, sectors] = await Promise.all([getSettings(), getSectors()])
  const today = todayET()
  const isAdmin = access.isAdmin

  const [tasksRes, interviewsRes, meetingsRes, attendanceRes, announcementsRes, pendingProfile, approvalCounts, toReview] = await Promise.all([
    supabase.from('tasks').select('*').eq('assigned_to', member.id).neq('status', 'done').order('due_date', { ascending: true, nullsFirst: false }),
    supabase.from('interviews').select('id, scheduled_at, candidate:candidates(name)').eq('interviewer_id', member.id).eq('status', 'scheduled').order('scheduled_at'),
    supabase.from('meetings').select('*').gte('meeting_date', settings.term.starts_on).order('meeting_date', { ascending: false }),
    supabase.from('attendance').select('*').eq('member_id', member.id),
    supabase.from('announcements').select('*, author:members_directory(name)').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(8),
    supabase.from('profile_changes').select('id').eq('member_id', member.id).eq('status', 'pending').maybeSingle(),
    isAdmin
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

  const checkedIn = new Set(records.map(r => r.meeting_id))
  const openMeetings = meetings
    .filter(m => m.checkin_open && Math.abs(daysUntil(m.meeting_date)) <= 1)
    .filter(m => m.kind !== 'sector' || m.sector === member.sector)
    .filter(m => m.kind !== 'ppg' || access.hasPpg)
    .map(m => ({ id: m.id, title: m.title, checkedIn: checkedIn.has(m.id) }))

  const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'submitted').length
  const announcements = ((announcementsRes.data ?? []) as (Announcement & { author: { name: string } | null })[])
    .map(a => ({ ...a, author: a.author?.name ?? null }))

  const actions: { href: string; icon: React.ReactNode; tone?: string; text: React.ReactNode }[] = []
  if (approvals > 0) actions.push({ href: '/portal/admin', icon: <Inbox size={16} />, text: <><strong>{approvals}</strong> request{approvals === 1 ? '' : 's'} waiting for your approval</> })
  if ((toReview.count ?? 0) > 0) actions.push({ href: '/portal/team?tab=tasks', icon: <ClipboardCheck size={16} />, tone: 'blue', text: <><strong>{toReview.count}</strong> submission{toReview.count === 1 ? '' : 's'} from your team to review</> })
  for (const iv of interviews.slice(0, 2)) actions.push({ href: '/portal/interviews', icon: <MessagesSquare size={16} />, tone: 'blue', text: <>Interview with <strong>{iv.candidate?.name ?? 'a candidate'}</strong> · {dateTime(iv.scheduled_at)}</> })
  if (overdue > 0) actions.push({ href: '/portal/tasks', icon: <TriangleAlert size={16} />, tone: 'amber', text: <><strong>{overdue}</strong> task{overdue === 1 ? ' is' : 's are'} overdue</> })
  if (!member.bio || !member.headshot_url) {
    actions.push(pendingProfile.data
      ? { href: '/portal/profile', icon: <ImagePlus size={16} />, tone: 'green', text: <>Your profile update is waiting for approval</> }
      : { href: '/portal/profile', icon: <ImagePlus size={16} />, tone: 'green', text: <>Add your {member.headshot_url ? 'bio' : member.bio ? 'photo' : 'bio and photo'} for the FIG website</> })
  }

  return (
    <>
      <div className="portal-hello">
        <div>
          <h1>{greeting()}, {firstName(member.name)}</h1>
          <p>{member.title ?? 'Analyst'} · {member.sector} · {settings.term.name}</p>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="portal-actions">
          {actions.map((a, i) => (
            <Link key={i} href={a.href} className="portal-action">
              <span className={`dot${a.tone ? ` ${a.tone}` : ''}`}>{a.icon}</span>
              <span>{a.text}</span>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      )}

      {openMeetings.length > 0 && <CheckIn openMeetings={openMeetings} />}

      <div className="ui-grid ui-grid-4" style={{ marginBottom: 20 }}>
        <Suspense fallback={<><StatSkeleton /><StatSkeleton /></>}>
          <MarketTiles sector={member.sector} />
        </Suspense>
        <Stat
          label="Attendance this term"
          icon={<CalendarCheck size={15} />}
          value={attendance.rate === null ? '—' : pct(attendance.rate, 0, false)}
          sub={attendance.rows.length ? `${attendance.present + attendance.late} of ${attendance.present + attendance.late + attendance.absent} meetings` : 'No meetings yet'}
        />
        <Stat
          label="Open tasks"
          icon={<ListChecks size={15} />}
          value={tasks.length}
          sub={tasks[0] ? dueLabel(tasks[0].due_date) : 'All caught up'}
        />
      </div>

      <div className="ui-grid ui-grid-main">
        <div className="ui-stack">
          <Suspense fallback={<div className="ui-skeleton" style={{ height: 320 }} />}>
            <SectorHoldings sector={member.sector} />
          </Suspense>
          <Announcements
            items={announcements}
            postOptions={audienceOptions(access, sectors.map(s => s.name))}
            viewerId={member.id}
            isAdmin={isAdmin}
          />
        </div>
        <div className="ui-stack">
          <Card
            title={<><ListChecks size={18} /> My tasks</>}
            actions={<Link href="/portal/tasks" className="ui-btn ui-btn-ghost ui-btn-sm">View all</Link>}
            tight
          >
            {tasks.length === 0 ? (
              <EmptyState title="You're all caught up">New assignments from your PM will appear here.</EmptyState>
            ) : (
              <ul className="ui-list">
                {tasks.slice(0, 5).map(t => (
                  <li key={t.id}>
                    <Link href="/portal/tasks" className="ui-list-item">
                      <div className="ui-list-main">
                        <div className="ui-list-title" style={{ whiteSpace: 'nowrap' }}>{t.title}</div>
                        <div className="ui-list-sub" style={t.due_date && t.due_date < today && t.status !== 'submitted' ? { color: 'var(--ui-down)' } : undefined}>
                          {t.status === 'submitted' ? 'Submitted — waiting for review' : dueLabel(t.due_date)}
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--ui-faint)' }} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Suspense fallback={<div className="ui-skeleton" style={{ height: 360 }} />}>
            <SectorNews sector={member.sector} />
          </Suspense>
          {access.canRecruit ? null : (
            <Link href="/portal/profile#refer" className="portal-action">
              <span className="dot green"><Plus size={16} /></span>
              <span>Know someone who&apos;d be great in FIG? <strong>Refer them</strong></span>
              <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
