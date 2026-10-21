'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useMutation } from '@/components/portal/feedback'

export default function PasswordForm({ setup, email }: { setup: boolean; email: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const { run, pending } = useMutation()
  const tooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && confirm !== password

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(async () => {
      const { error } = await createClient().auth.updateUser({ password, data: { password_set: true } })
      if (error) throw new Error(error.message)
      return true
    }, { success: 'Password saved', refresh: false })
    if (ok) {
      setPassword('')
      setConfirm('')
      if (setup) router.push('/portal')
    }
  }

  return (
    <form onSubmit={save} className="ui-card">
      <div className="ui-card-head"><h2><KeyRound size={18} /> {setup ? 'New password' : 'Change password'}</h2></div>
      <div className="ui-card-body ui-form">
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <div className="ui-field">
          <label htmlFor="pw-new">New password</label>
          <input id="pw-new" className="ui-input" type="password" autoComplete="new-password" required minLength={8}
            value={password} onChange={e => setPassword(e.target.value)} aria-describedby="pw-hint" />
          <span id="pw-hint" className="ui-hint" style={tooShort ? { color: 'var(--ui-down)' } : undefined}>At least 8 characters.</span>
        </div>
        <div className="ui-field">
          <label htmlFor="pw-confirm">Confirm password</label>
          <input id="pw-confirm" className="ui-input" type="password" autoComplete="new-password" required
            value={confirm} onChange={e => setConfirm(e.target.value)} />
          {mismatch && <span className="ui-hint" style={{ color: 'var(--ui-down)' }}>Passwords don&apos;t match.</span>}
        </div>
        <div>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={pending || password.length < 8 || password !== confirm}>
            {pending ? 'Saving…' : 'Save password'}
          </button>
        </div>
      </div>
    </form>
  )
}
