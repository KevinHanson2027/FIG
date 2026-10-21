'use client'
import { useState } from 'react'
import { CircleCheck, QrCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useMutation } from './feedback'

/** Members type the code shown at the meeting to mark themselves present. */
export function CheckIn({ openMeetings, compact }: { openMeetings: { id: string; title: string; checkedIn: boolean }[]; compact?: boolean }) {
  const [code, setCode] = useState('')
  const { run, pending } = useMutation()
  const allDone = openMeetings.length > 0 && openMeetings.every(m => m.checkedIn)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const title = await run(async () => {
      const { data, error } = await supabase.rpc('check_in', { p_code: code })
      if (error) throw new Error(error.message)
      return data as string
    })
    if (title) setCode('')
  }

  return (
    <section className="ui-card" style={{ marginBottom: compact ? 0 : 20 }}>
      <div className="ui-card-head">
        <div>
          <h2><QrCode size={18} /> Meeting check-in</h2>
          <p>{openMeetings.length ? openMeetings.map(m => m.title).join(' · ') : 'Enter the code shown at the meeting.'}</p>
        </div>
      </div>
      <div className="ui-card-body">
        {allDone ? (
          <div className="ui-row" style={{ color: 'var(--ui-green)', fontWeight: 600 }}>
            <CircleCheck size={18} /> You&apos;re checked in. Thanks!
          </div>
        ) : (
          <form onSubmit={submit} className="ui-row" style={{ flexWrap: 'nowrap' }}>
            <input
              className="ui-input"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Code, e.g. K7P2QX"
              aria-label="Check-in code"
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              style={{ letterSpacing: '0.15em', fontWeight: 600, maxWidth: 220 }}
            />
            <button type="submit" className="ui-btn ui-btn-primary" disabled={pending || code.trim().length < 4}>
              {pending ? 'Checking…' : 'Check in'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
