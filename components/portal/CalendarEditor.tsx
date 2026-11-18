'use client'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { addCalendarNote, removeCalendarNote, setFollowedTickers } from '@/app/portal/portfolio/calendar-actions'
import { day, todayET } from '@/lib/format'
import type { CalendarNote } from '@/lib/types'
import { useMutation } from './feedback'

/** Co-presidents and the PPG manager: add dates and follow extra tickers. */
export function CalendarEditor({ notes, watch }: { notes: CalendarNote[]; watch: string[] }) {
  const [date, setDate] = useState(todayET())
  const [title, setTitle] = useState('')
  const [ticker, setTicker] = useState('')
  const { run, pending } = useMutation()

  // Resolves true when saved; errors become a toast.
  const call = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => run(async () => {
    const res = await fn()
    if (!res.ok) throw new Error(res.error ?? 'Couldn’t save.')
    return true
  }, { success })

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (await call(() => addCalendarNote({ date, title }), 'Added to the calendar')) setTitle('')
  }

  async function follow(e: React.FormEvent) {
    e.preventDefault()
    const t = ticker.trim().toUpperCase()
    if (!t) return
    if (await call(() => setFollowedTickers([...watch, t]), `Following ${t} earnings`)) setTicker('')
  }

  return (
    <section className="ui-card">
      <div className="ui-card-head"><div><h2>Add to the calendar</h2><p>For dates that aren&apos;t automatic: an IPO, a speaker, a deadline.</p></div></div>
      <div className="ui-card-body">
        <form onSubmit={add} className="ui-form" style={{ gap: 10 }}>
          <div className="ui-row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="ui-field" style={{ flex: '0 0 150px' }}>
              <label htmlFor="cal-date">Date</label>
              <input id="cal-date" className="ui-input" type="date" required value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="ui-field" style={{ flex: '1 1 160px' }}>
              <label htmlFor="cal-title">What</label>
              <input id="cal-title" className="ui-input" required maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="Anthropic IPO" />
            </div>
            <button type="submit" className="ui-btn ui-btn-primary" disabled={pending || !title.trim()}><Plus size={16} /> Add</button>
          </div>
        </form>
        {notes.length > 0 && (
          <ul className="cal-notes">
            {notes.map(n => (
              <li key={n.id}>
                <span><strong>{n.title}</strong> <span className="ui-muted">· {day(n.date)}</span></span>
                <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={`Remove ${n.title}`} disabled={pending}
                  onClick={() => call(() => removeCalendarNote(n.id), 'Removed')}><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ borderTop: '1px solid var(--ui-line)', margin: '16px 0 12px' }} />
        <form onSubmit={follow} className="ui-form" style={{ gap: 8 }}>
          <label htmlFor="cal-ticker" className="ui-label">Also follow earnings for</label>
          <p className="ui-hint" style={{ marginTop: -4 }}>Every holding is followed automatically. Add market movers you watch, like NVDA.</p>
          <div className="ui-row">
            <input id="cal-ticker" className="ui-input" style={{ flex: '1 1 120px', textTransform: 'uppercase' }} maxLength={10} value={ticker} onChange={e => setTicker(e.target.value)} placeholder="NVDA" />
            <button type="submit" className="ui-btn ui-btn-secondary" disabled={pending || !ticker.trim()}>Follow</button>
          </div>
          {watch.length > 0 && (
            <div className="ui-chips">
              {watch.map(t => (
                <span key={t} className="ui-chip on" style={{ paddingRight: 4 }}>
                  {t}
                  <button type="button" className="cal-chip-x" aria-label={`Stop following ${t}`} disabled={pending}
                    onClick={() => call(() => setFollowedTickers(watch.filter(x => x !== t)), `Stopped following ${t}`)}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </form>
      </div>
    </section>
  )
}
