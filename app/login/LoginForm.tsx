'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { claimAccount, emailSignIn, joinFig, requestAccess } from './actions'

// password: everyday sign-in · first: club code + choose a password (once)
// link: emailed sign-in link (only when email is set up) · forgot: help when it isn't
// join / request: people who aren't on the roster yet
type Mode = 'password' | 'first' | 'link' | 'forgot' | 'join' | 'request'

export default function LoginForm({ next, initialError, sectors, codeEnabled, emailEnabled }: {
  next: string
  initialError: string
  sectors: string[]
  codeEnabled: boolean
  emailEnabled: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [req, setReq] = useState({ classYear: '', note: '', website: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(initialError)
  const [notMember, setNotMember] = useState(false)
  const [done, setDone] = useState('')

  const firstTime: Mode | null = codeEnabled ? 'first' : emailEnabled ? 'link' : null
  const newMember: Mode = emailEnabled ? 'join' : 'request'

  const headings: Record<Mode, { title: string; sub: string }> = {
    password: { title: 'Member Login', sub: 'Sign in to the FIG member portal.' },
    first: { title: 'Set up your account', sub: 'Use the club code from the first meeting to choose your own password. You only do this once.' },
    link: { title: 'Sign in with an email link', sub: "We'll email you a link that signs you in. You can then choose a new password under My Profile." },
    forgot: { title: 'Forgot your password?', sub: 'A co-president can reset it for you.' },
    join: { title: 'Join the member portal', sub: `${email} isn't on the roster yet. Tell us who you are. You'll pick your roles next, and a co-president will approve you.` },
    request: { title: 'Request access', sub: "Tell us who you are. Once a co-president approves you, you'll be able to sign in." },
  }

  function switchTo(m: Mode) {
    setMode(m)
    setError('')
    setNotMember(false)
    setDone('')
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    setNotMember(false)
    try { await fn() } catch { setError('Something went wrong. Please try again.') }
    setBusy(false)
  }

  async function signInWith(pw: string) {
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password: pw })
    if (error) return error.message
    router.replace(next)
    router.refresh()
    return null
  }

  const signIn = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const problem = await signInWith(password)
    if (problem) {
      setError(/invalid login/i.test(problem)
        ? `That email and password don't match.${firstTime === 'first' ? ' First time here? Use “First time signing in?” below.' : ''}`
        : problem)
    }
  }) }

  const claim = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    if (password.length < 8) return setError('Choose a password with at least 8 characters.')
    if (password !== confirm) return setError("The passwords don't match.")
    const res = await claimAccount({ email, code, password })
    if (!res.ok) {
      setError(res.message)
      setNotMember(Boolean(res.notMember))
      return
    }
    const problem = await signInWith(password)
    if (problem) {
      // The password is saved; only the sign-in itself failed (e.g. busy Wi-Fi).
      setMode('password')
      setError('Your password is saved. Press Sign in to continue.')
    }
  }) }

  const sendLink = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const res = await emailSignIn(email)
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

  const request = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const res = await requestAccess({ name, email, sector, ...req })
    if (res.ok) setDone(res.message)
    else setError(res.message)
  }) }

  const h = headings[mode]
  const emailField = (id: string, autoFocus = true) => (
    <div className="ui-field">
      <label htmlFor={id}>School email</label>
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
  const submit = (label: string, busyLabel: string) => (
    <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={busy} style={{ height: 44 }}>{busy ? busyLabel : label}</button>
  )
  const back = <button type="button" className="login-back" onClick={() => switchTo('password')}><ArrowLeft size={16} /> Back to sign in</button>

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

        {error && (
          <div className="login-error" role="alert">
            {error}
            {notMember && <> <button type="button" className="login-text-btn" onClick={() => switchTo(newMember)}>New to FIG? Request access</button></>}
          </div>
        )}

        {done ? (
          <div className="login-done" role="status">
            <CircleCheck size={28} />
            <p>{done}</p>
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-block" onClick={() => switchTo('password')}>Back to sign in</button>
          </div>
        ) : mode === 'password' ? (
          <form onSubmit={signIn} className="ui-form">
            {emailField('email')}
            <div className="ui-field">
              <div className="ui-spread">
                <label htmlFor="password" className="ui-label">Password</label>
                <button type="button" className="login-text-btn" onClick={() => switchTo(emailEnabled ? 'link' : 'forgot')}>Forgot password?</button>
              </div>
              <input id="password" className="ui-input" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {submit('Sign in', 'Signing in…')}
            <div className="login-alt">
              <span>First time signing in?</span>
              {firstTime
                ? <button type="button" className="login-text-btn" onClick={() => switchTo(firstTime)}>Set up your account</button>
                : <span>Ask a co-president for the club code.</span>}
            </div>
          </form>
        ) : mode === 'first' ? (
          <form onSubmit={claim} className="ui-form">
            {emailField('first-email')}
            <div className="ui-field">
              <label htmlFor="first-code">Club code</label>
              <input id="first-code" className="ui-input" required autoComplete="off" autoCapitalize="characters" spellCheck={false}
                value={code} onChange={e => setCode(e.target.value)} />
              <span className="ui-hint">Shared at the first meeting. Capital letters don&apos;t matter.</span>
            </div>
            <div className="ui-field">
              <label htmlFor="first-pw">Choose a password</label>
              <input id="first-pw" className="ui-input" type="password" autoComplete="new-password" required minLength={8}
                value={password} onChange={e => setPassword(e.target.value)} />
              <span className="ui-hint">At least 8 characters. You&apos;ll use it to sign in from now on.</span>
            </div>
            <div className="ui-field">
              <label htmlFor="first-pw2">Confirm password</label>
              <input id="first-pw2" className="ui-input" type="password" autoComplete="new-password" required
                value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            {submit('Save password and sign in', 'Setting up…')}
            {emailEnabled && (
              <div className="login-alt">
                <span>No code?</span>
                <button type="button" className="login-text-btn" onClick={() => switchTo('link')}>Email me a sign-in link</button>
              </div>
            )}
            {back}
          </form>
        ) : mode === 'link' ? (
          <form onSubmit={sendLink} className="ui-form">
            {emailField('link-email')}
            {submit('Email me a sign-in link', 'Sending…')}
            {back}
          </form>
        ) : mode === 'forgot' ? (
          <div className="ui-form">
            <p className="ui-small" style={{ lineHeight: 1.6 }}>
              Ask a co-president to reset your password. Then come back, choose <strong>First time signing in?</strong>, and use the club code to pick a new one.
            </p>
            {back}
          </div>
        ) : mode === 'join' ? (
          <form onSubmit={join} className="ui-form">
            {nameAndSector}
            {submit('Create my account', 'Creating…')}
            <button type="button" className="login-back" onClick={() => switchTo('password')}><ArrowLeft size={16} /> Use a different email</button>
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
            {submit('Send request', 'Sending…')}
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
