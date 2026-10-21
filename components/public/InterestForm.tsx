'use client'
import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Get Involved → interest list. Goes straight into the recruiting pipeline. */
export default function InterestForm({ sectors }: { sectors: string[] }) {
  const empty = { name: '', email: '', classYear: '', major: '', sector: '', note: '', website: '' }
  const [f, setF] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const year = new Date().getFullYear()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (f.website) { setDone(true); return } // bot
    setBusy(true)
    setError('')
    const { error } = await createClient().rpc('submit_interest', {
      p_name: f.name, p_email: f.email, p_class_year: f.classYear ? Number(f.classYear) : null,
      p_major: f.major || null, p_sector: f.sector || null, p_note: f.note || null,
    })
    setBusy(false)
    if (error) setError(error.message)
    else { setDone(true); setF(empty) }
  }

  if (done) {
    return (
      <div className="public-form-done" role="status">
        <CircleCheck size={32} />
        <h4>You&apos;re on the list!</h4>
        <p>We&apos;ll email you when applications open and about upcoming info sessions.</p>
      </div>
    )
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }))
  return (
    <form onSubmit={submit} className="public-form ui-form" aria-label="Interest form">
      {error && <div className="login-error" role="alert">{error}</div>}
      <div className="ui-form-grid">
        <div className="ui-field"><label htmlFor="if-name">Full name</label><input id="if-name" className="ui-input" required maxLength={120} value={f.name} onChange={set('name')} /></div>
        <div className="ui-field"><label htmlFor="if-email">School email</label><input id="if-email" className="ui-input" type="email" required value={f.email} onChange={set('email')} placeholder="first.last@student.fairfield.edu" /></div>
        <div className="ui-field">
          <label htmlFor="if-year">Graduation year</label>
          <select id="if-year" className="ui-select" value={f.classYear} onChange={set('classYear')}>
            <option value="">Select…</option>
            {[0, 1, 2, 3, 4].map(i => <option key={i} value={year + i}>{year + i}</option>)}
          </select>
        </div>
        <div className="ui-field"><label htmlFor="if-major">Major(s)</label><input id="if-major" className="ui-input" value={f.major} onChange={set('major')} placeholder="Finance, Accounting…" /></div>
        <div className="ui-field span-2">
          <label htmlFor="if-sector">Sector you&apos;re most interested in</label>
          <select id="if-sector" className="ui-select" value={f.sector} onChange={set('sector')}>
            <option value="">Not sure yet</option>
            {sectors.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="ui-field span-2"><label htmlFor="if-note">Anything you&apos;d like us to know? <span className="ui-muted">(optional)</span></label><textarea id="if-note" className="ui-textarea" rows={3} maxLength={2000} value={f.note} onChange={set('note')} /></div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="ui-sr-only" value={f.website} onChange={set('website')} />
      <button type="submit" className="btn" disabled={busy} style={{ alignSelf: 'center' }}>{busy ? 'Sending…' : 'Join the interest list'}</button>
    </form>
  )
}
