'use client'
import { useRef, useState } from 'react'
import { CircleCheck, FileUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ApplicationForm({ sectors, cycle, initialEmail }: { sectors: string[]; cycle: string; initialEmail: string }) {
  const [f, setF] = useState({
    name: '', email: initialEmail, classYear: '', major: '', sector: '', linkedin: '', resumeUrl: '',
    why: '', idea: '', experience: '', availability: '', website: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const year = new Date().getFullYear()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (f.website) { setDone(true); return }
    setError('')
    if (file && (file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024)) { setError('Please attach your résumé as a PDF under 5 MB.'); return }
    if (!file && !f.resumeUrl.trim()) { setError('Please attach your résumé (PDF) or paste a link to it.'); return }
    setBusy(true)
    const supabase = createClient()
    let resumePath: string | null = null
    if (file) {
      const folder = (cycle || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      resumePath = `resumes/${folder}/${crypto.randomUUID()}.pdf`
      const { error: upErr } = await supabase.storage.from('applications').upload(resumePath, file, { contentType: 'application/pdf', upsert: false })
      if (upErr) { setBusy(false); setError("We couldn't upload your résumé. Try again, or paste a link instead."); return }
    }
    const { error } = await supabase.rpc('submit_application', {
      p_name: f.name, p_email: f.email, p_class_year: f.classYear ? Number(f.classYear) : null, p_major: f.major,
      p_sector: f.sector || null, p_linkedin: f.linkedin || null, p_resume_path: resumePath, p_resume_url: f.resumeUrl || null,
      p_answers: { why: f.why.trim(), idea: f.idea.trim(), experience: f.experience.trim(), availability: f.availability.trim() },
    })
    setBusy(false)
    if (error) setError(error.message)
    else { setDone(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }

  if (done) {
    return (
      <div className="public-form-done" role="status">
        <CircleCheck size={36} />
        <h4>Application received — thank you!</h4>
        <p>We&apos;ll email you about next steps and interview times. Keep an eye on your inbox (and junk folder).</p>
      </div>
    )
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(x => ({ ...x, [k]: e.target.value }))
  return (
    <form onSubmit={submit} className="public-form ui-form" aria-label="Application">
      {error && <div className="login-error" role="alert">{error}</div>}
      <fieldset className="public-fieldset">
        <legend>About you</legend>
        <div className="ui-form-grid">
          <div className="ui-field"><label htmlFor="ap-name">Full name</label><input id="ap-name" className="ui-input" required maxLength={120} value={f.name} onChange={set('name')} /></div>
          <div className="ui-field"><label htmlFor="ap-email">School email</label><input id="ap-email" className="ui-input" type="email" required value={f.email} onChange={set('email')} /></div>
          <div className="ui-field">
            <label htmlFor="ap-year">Graduation year</label>
            <select id="ap-year" className="ui-select" required value={f.classYear} onChange={set('classYear')}>
              <option value="" disabled>Select…</option>
              {[0, 1, 2, 3, 4].map(i => <option key={i} value={year + i}>{year + i}</option>)}
            </select>
          </div>
          <div className="ui-field"><label htmlFor="ap-major">Major(s)</label><input id="ap-major" className="ui-input" required value={f.major} onChange={set('major')} /></div>
          <div className="ui-field">
            <label htmlFor="ap-sector">Sector interest</label>
            <select id="ap-sector" className="ui-select" value={f.sector} onChange={set('sector')}>
              <option value="">Not sure yet</option>{sectors.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="ui-field"><label htmlFor="ap-li">LinkedIn <span className="ui-muted">(optional)</span></label><input id="ap-li" className="ui-input" type="url" value={f.linkedin} onChange={set('linkedin')} placeholder="https://www.linkedin.com/in/…" /></div>
        </div>
      </fieldset>

      <fieldset className="public-fieldset">
        <legend>Résumé</legend>
        <div className="ui-row">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={() => input.current?.click()}><FileUp size={16} /> {file ? 'Change PDF' : 'Upload PDF'}</button>
          <span className="ui-small ui-muted">{file ? file.name : 'PDF, up to 5 MB'}</span>
        </div>
        <input ref={input} type="file" accept="application/pdf" hidden onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <div className="ui-field" style={{ marginTop: 12 }}>
          <label htmlFor="ap-rurl">…or a link to it <span className="ui-muted">(Google Drive, OneDrive)</span></label>
          <input id="ap-rurl" className="ui-input" type="url" value={f.resumeUrl} onChange={set('resumeUrl')} placeholder="https://…" />
        </div>
      </fieldset>

      <fieldset className="public-fieldset">
        <legend>A few questions</legend>
        <div className="ui-field"><label htmlFor="ap-why">Why do you want to join FIG?</label><textarea id="ap-why" className="ui-textarea" required rows={4} maxLength={3000} value={f.why} onChange={set('why')} /></div>
        <div className="ui-field"><label htmlFor="ap-idea">Tell us about a stock, company or market trend you find interesting.</label><textarea id="ap-idea" className="ui-textarea" required rows={4} maxLength={3000} value={f.idea} onChange={set('idea')} /></div>
        <div className="ui-field"><label htmlFor="ap-exp">Relevant experience <span className="ui-muted">(optional — no experience needed)</span></label><textarea id="ap-exp" className="ui-textarea" rows={3} maxLength={3000} value={f.experience} onChange={set('experience')} /></div>
        <div className="ui-field"><label htmlFor="ap-avail">When are you generally free for a 30-minute interview?</label><input id="ap-avail" className="ui-input" maxLength={300} value={f.availability} onChange={set('availability')} placeholder="e.g. weekday afternoons after 3pm" /></div>
      </fieldset>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="ui-sr-only" value={f.website} onChange={set('website')} />
      <button type="submit" className="btn" disabled={busy} style={{ alignSelf: 'center' }}>{busy ? 'Submitting…' : 'Submit application'}</button>
    </form>
  )
}
