'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'member'
  sector: string | null
  created_at: string
}

const sectors = [
  'Consumers', 'Energy & Utilities', 'Financials', 'Fixed Income',
  'Healthcare', 'Industrials & Materials', 'Real Estate', 'Technology',
  'Marketing', 'Executive Board',
]

export default function AdminUsersPage() {
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteSector, setInviteSector] = useState('Consumers')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setProfiles(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  async function handleUpdateRole(id: string, newRole: 'admin' | 'member') {
    await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    fetchProfiles()
  }

  async function handleUpdateSector(id: string, newSector: string) {
    await supabase.from('profiles').update({ sector: newSector }).eq('id', id)
    fetchProfiles()
  }

  return (
    <>
      <div className="admin-header">
        <h1>User Accounts</h1>
        <p>
          Manage who can log in to the admin and member hub. To invite new members, create their account directly in
          your{' '}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#e62d2e' }}>
            Supabase Dashboard → Authentication → Users → Invite User
          </a>
          , then set their sector below.
        </p>
      </div>

      {message && (
        <div className={`admin-alert ${message.startsWith('Error') ? 'admin-alert-error' : 'admin-alert-success'}`}>
          {message}
        </div>
      )}

      <div className="admin-section" style={{ marginBottom: '2rem', background: '#f0fdf4', border: '1px solid #86efac' }}>
        <h2 style={{ fontSize: '1rem', color: '#16a34a', marginBottom: '1rem' }}>How to Add a New Member Login</h2>
        <ol style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#333', lineHeight: '1.8' }}>
          <li>Go to <strong>Supabase Dashboard → Authentication → Users</strong></li>
          <li>Click <strong>"Invite User"</strong> and enter their Fairfield email</li>
          <li>They'll receive an email to set their password</li>
          <li>Come back here and set their <strong>sector</strong> so they see the right resources</li>
          <li>To make someone an admin, change their role to <strong>"Admin"</strong> below</li>
        </ol>
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>All Users ({profiles.length})</h2>
        </div>

        {loading ? (
          <p style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>Loading…</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Email</th><th>Role</th><th>Sector</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.email}</strong>
                    {p.name && <div style={{ fontSize: '0.8rem', color: '#888' }}>{p.name}</div>}
                  </td>
                  <td>
                    <select
                      value={p.role}
                      onChange={e => handleUpdateRole(p.id, e.target.value as 'admin' | 'member')}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={p.sector ?? ''}
                      onChange={e => handleUpdateSector(p.id, e.target.value)}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                    >
                      <option value="">— No Sector —</option>
                      {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#888' }}>
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No users yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
