'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })

    if (!res.ok) {
      setError('Incorrect access key. Please try again.')
      setLoading(false)
      return
    }

    const { role } = await res.json()
    router.push(role === 'admin' ? '/admin' : '/hub')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Website Assets/Logos/FIG Primary Logo.svg" alt="FIG Logo" />
          <h1>Fairfield Investment Group</h1>
          <p>Enter your access key to continue</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="admin-form-group">
            <label htmlFor="key">Access Key</label>
            <input
              id="key"
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              autoFocus
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Verifying…' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Need access? Contact your FIG administrator.</p>
        </div>
      </div>
    </div>
  )
}
