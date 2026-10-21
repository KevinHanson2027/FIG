'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { joinFig, requestAccess, sendPasswordReset, startAccount } from './actions'

type Mode = 'signin' | 'start' | 'join' | 'reset' | 'request'

export default function LoginForm({ next, initialError, sectors }: { next: string; initialError: string; sectors: string[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [req, setReq] = useState({ classYear: '', note: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError)
  const [done, setDone] = useState('')

  const headings: Record<Mode, { title: string; sub: string }> = {
    signin: { title: 'Member Login', sub: 'Sign in to the FIG member portal' },
    start: { title: 'Set up your account', sub: "Enter your school email. Members on the roster get a link right away; new members can apply." },
    join: { title: 'Join the member portal', sub: `${email} isn't on the roster yet. Tell us who you are — you'll set up your roles next, and a co-president will approve you.` },
    reset: { title: 'Reset your password', sub: "Enter your email and we'll send you a link to choose a new password." },
    request: { title: 'Request access', sub: 'Tell us who you are and a co-president will approve you and send a link to set up your account.' },
  }

  function switchTo(m: Mode) {
    setMode(m)
    setError('')
    setDone('')
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await fn() } catch { setError('Something went wrong. Please try again.') }
    setBusy(false)
  }

  const signIn = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setError(/invalid login/i.test(error.message) ? "That email and password don't match. First time here? Set up your account below." : error.message)
      return
    }
    router.replace(next)
    router.refresh()
  }) }

  const start = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const res = await startAccount(email)
    if (res.status === 'sent') setDone(res.message)
    else if (res.status === 'join') setMode('join')
    else if (res.status === 'fallback') setMode('request')
    else setError(res.message)
  }) }

  const join = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const res = await joinFig({ email, name, sector })
    if (res.ok) setDone(res.message)
    else setError(res.message)
  }) }

  const reset = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const res = await sendPasswordReset(email)
    if (res.ok) setDone(res.message)
    else setError(res.message)
  }) }

  const request = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const res = await requestAccess({ name, email, sector, ...req })
    if (res.ok) setDone(res.message)
    else setError(res.message)
  }) }

  const h = headings[mode]
  const emailField = (id: string, autoFocus = true) => (
    <div className="ui-field">
      <label htmlFor={id}>{mode === 'signin' ? 'Email' : 'School email'}</label>
      <input id={id} className="ui-input" type="email" autoComplete="email" required autoFocus={autoFocus}
        value={email} onChange={e => setEmail(e.target.value)} placeholder="first.last@student.fairfield.edu" />
    </div>
  )
  const nameAndSector = (
    <>
      <div className="ui-field">
        <label htmlFor="j-name">Full name</label>
        <input id="j-name" className="ui-input" required maxLength={120} autoComplete="name" value={name} onChange={e => setName(e.target.value)} autoFocus />
      </div>
      <div className="ui-field">
        <label htmlFor="j-sector">Your sector / team</label>
        <select id="j-sector" className="ui-select" required value={sector} onChange={e => setSector(e.target.value)}>
          <option value="" disabled>Choose…</option>
          {sectors.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
    </>
  )
  const back = <button type="button" className="login-back" onClick={() => switchTo('signin')}><ArrowLeft size={16} /> Back to sign in</button>

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <Link href="/" aria-label="Back to the FIG website">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/Logos/FIG Logo.png" alt="Fairfield Investment Group" />
          </Link>
          <h1>{h.title}</h1>
          <p>{h.sub}</p>
        </div>

        {error && <div className="login-error" role="alert">{error}</div>}

        {done ? (
          <div className="login-done" role="status">
            <CircleCheck size={28} />
            <p>{done}</p>
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-block" onClick={() => switchTo('signin')}>Back to sign in</button>
          </div>
        ) : mode === 'signin' ? (
          <form onSubmit={signIn} className="ui-form">
            {emailField('email')}
            <div className="ui-field">
              <div className="ui-spread">
                <label htmlFor="password" className="ui-label">Password</label>
                <button type="button" className="login-text-btn" onClick={() => switchTo('reset')}>Forgot password?</button>
              </div>
              <input id="password" className="ui-input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={busy} style={{ height: 44 }}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <div className="login-alt">
              <span>First time here?</span>
              <button type="button" className="login-text-btn" onClick={() => switchTo('start')}>Set up your account</button>
            </div>
          </form>
        ) : mode === 'start' ? (
          <form onSubmit={start} className="ui-form">
            {emailField('start-email')}
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={busy} style={{ height: 44 }}>{busy ? 'Checking…' : 'Continue'}</button>
            {back}
          </form>
        ) : mode === 'join' ? (
          <form onSubmit={join} className="ui-form">
            {nameAndSector}
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={busy} style={{ height: 44 }}>{busy ? 'Creating…' : 'Create my account'}</button>
            <button type="button" className="login-back" onClick={() => switchTo('start')}><ArrowLeft size={16} /> Use a different email</button>
          </form>
        ) : mode === 'reset' ? (
          <form onSubmit={reset} className="ui-form">
            {emailField('reset-email')}
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={busy} style={{ height: 44 }}>{busy ? 'Sending…' : 'Email me a link'}</button>
            {back}
          </form>
        ) : (
          <form onSubmit={request} className="ui-form">
            {emailField('r-email', false)}
            {nameAndSector}
            <div className="ui-field">
              <label htmlFor="r-year">Graduation year</label>
              <input id="r-year" className="ui-input" inputMode="numeric" pattern="20[0-9]{2}" placeholder="2028" value={req.classYear} onChange={e => setReq(r => ({ ...r, classYear: e.target.value }))} />
            </div>
            <div className="ui-field">
              <label htmlFor="r-note">Your role in FIG <span className="ui-muted">(optional)</span></label>
              <textarea id="r-note" className="ui-textarea" rows={3} maxLength={2000} placeholder="e.g. Consumers analyst, PPG member" value={req.note} onChange={e => setReq(r => ({ ...r, note: e.target.value }))} />
            </div>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="ui-sr-only" value={req.website} onChange={e => setReq(r => ({ ...r, website: e.target.value }))} />
            <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={busy} style={{ height: 44 }}>{busy ? 'Sending…' : 'Send request'}</button>
            {back}
          </form>
        )}

        <div className="login-footer">
          <p>Not a member yet? <Link href="/get-involved" className="ui-link">See how to join FIG</Link></p>
        </div>
      </div>
    </div>
  )
}
