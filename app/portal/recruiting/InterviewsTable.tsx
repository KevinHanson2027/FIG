import { MessagesSquare, Star } from 'lucide-react'
import { dateTime } from '@/lib/format'
import { Badge, EmptyState } from '@/components/portal/ui'
import type { CandidateView, InterviewView } from './Pipeline'

const RECOMMEND: Record<string, { label: string; tone: 'green' | 'blue' | 'amber' | 'red' }> = {
  strong_yes: { label: 'Strong yes', tone: 'green' }, yes: { label: 'Yes', tone: 'blue' },
  maybe: { label: 'Maybe', tone: 'amber' }, no: { label: 'No', tone: 'red' },
}

export default function InterviewsTable({ interviews, candidates }: { interviews: InterviewView[]; candidates: CandidateView[] }) {
  const names = new Map(candidates.map(c => [c.id, c.name]))
  const rows = [...interviews].sort((a, b) => {
    const order = (s: string) => (s === 'scheduled' ? 0 : s === 'completed' ? 1 : 2)
    return order(a.status) - order(b.status) || (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? '')
  })
  return (
    <section className="ui-card">
      <div className="ui-card-head"><h2><MessagesSquare size={18} /> All interviews</h2></div>
      {rows.length === 0 ? (
        <EmptyState title="No interviews scheduled yet">Schedule interviews from a candidate&apos;s card in the pipeline.</EmptyState>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead><tr><th>Candidate</th><th>Interviewer</th><th>When</th><th>Status</th><th className="num">Rating</th><th>Recommendation</th></tr></thead>
            <tbody>
              {rows.map(i => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600, color: 'var(--ui-ink)' }}>{names.get(i.candidate_id) ?? '—'}</td>
                  <td>{i.interviewer ?? '—'}</td>
                  <td className="nowrap">{i.scheduled_at ? dateTime(i.scheduled_at) : 'TBD'}{i.location ? <div className="ui-small ui-muted">{i.location}</div> : null}</td>
                  <td><Badge tone={i.status === 'completed' ? 'green' : i.status === 'scheduled' ? 'blue' : 'gray'}>{i.status === 'no_show' ? 'No-show' : i.status[0].toUpperCase() + i.status.slice(1)}</Badge></td>
                  <td className="num">{i.rating !== null ? <><Star size={12} style={{ verticalAlign: -1 }} /> {i.rating}</> : '—'}</td>
                  <td>{i.recommendation ? <Badge tone={RECOMMEND[i.recommendation].tone}>{RECOMMEND[i.recommendation].label}</Badge> : <span className="ui-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
