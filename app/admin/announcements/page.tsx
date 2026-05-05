'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Announcement = {
  id: string
  title: string
  body: string
  sector: string | null
  created_at: string
}

const sectors = [
  'All Members', 'Consumers', 'Energy & Utilities', 'Financials', 'Fixed Income',
  'Healthcare', 'Industrials & Materials', 'Real Estate', 'Technology', 'Marketing', 'Executive Board',
]

export default function AdminAnnouncementsPage() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sector, setSector] = useState('All Members')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    const { error } = await supabase.from('announcements').insert({
      title: title.trim(),
      body: body.trim(),
      sector: sector === 'All Members' ? null : sector,
    })
    if (error) setMessage('Error: ' + error.message)
    else {
      setMessage('Announcement posted!')
      setTitle('')
      setBody('')
      setSector('All Members')
      fetchAnnouncements()
    }
    setSaving(false)
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return
    await supabase.from('announcements').delete().eq('id', id)
    fetchAnnouncements()
  }

  return (
    <>
      <div className="admin-header">
        <h1>Announcements</h1>
        <p>Post updates and announcements visible to members in the hub.</p>
      </div>

      {message && (
        <div className={`admin-alert ${message.startsWith('Error') ? 'admin-alert-error' : 'admin-alert-success'}`}>
          {message}
        </div>
      )}

      <div className="admin-section" style={{ marginBottom: '2rem' }}>
        <div className="admin-section-header"><h2>Post New Announcement</h2></div>
        <form onSubmit={handlePost}>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Weekly Meeting Recap" />
            </div>
            <div className="admin-form-group">
              <label>Audience</label>
              <select value={sector} onChange={e => setSector(e.target.value)}>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="admin-form-group">
            <label>Message *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement here…" rows={5} />
          </div>
          <button type="submit" className="admin-btn" disabled={saving || !title.trim() || !body.trim()}>
            {saving ? 'Posting…' : '📢 Post Announcement'}
          </button>
        </form>
      </div>

      <div className="admin-section">
        <div className="admin-section-header"><h2>Posted Announcements</h2></div>
        {loading ? (
          <p style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>Loading…</p>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Title</th><th>Audience</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {announcements.map(a => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.2rem' }}>{a.body.slice(0, 100)}{a.body.length > 100 ? '…' : ''}</div>
                  </td>
                  <td><span className="admin-badge admin-badge-blue">{a.sector ?? 'All Members'}</span></td>
                  <td style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(a.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="admin-btn admin-btn-danger" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }} onClick={() => handleDelete(a.id, a.title)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {announcements.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No announcements yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
