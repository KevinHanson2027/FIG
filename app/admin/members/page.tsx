'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Member = {
  id: string
  name: string
  title: string | null
  sector: string
  email: string | null
  linkedin_url: string | null
  bio: string | null
  headshot_url: string | null
  is_active: boolean
  sort_order: number
}

const sectors = [
  'Executive Board', 'Consumers', 'Energy & Utilities', 'Financials',
  'Fixed Income', 'Healthcare', 'Industrials & Materials', 'Real Estate',
  'Technology', 'Marketing',
]

const emptyMember: Omit<Member, 'id'> = {
  name: '', title: '', sector: 'Consumers', email: '', linkedin_url: '',
  bio: '', headshot_url: '', is_active: true, sort_order: 0,
}

export default function AdminMembersPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState(emptyMember)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filterSector, setFilterSector] = useState('All')

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('members_directory')
      .select('*')
      .order('sector')
      .order('sort_order')
    setMembers(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  function openAdd() {
    setEditing(null)
    setForm(emptyMember)
    setShowModal(true)
  }

  function openEdit(member: Member) {
    setEditing(member)
    setForm({ ...member })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    if (editing) {
      const { error } = await supabase.from('members_directory').update(form).eq('id', editing.id)
      if (error) setMessage('Error: ' + error.message)
      else setMessage('Member updated successfully.')
    } else {
      const { error } = await supabase.from('members_directory').insert(form)
      if (error) setMessage('Error: ' + error.message)
      else setMessage('Member added successfully.')
    }
    setSaving(false)
    setShowModal(false)
    fetchMembers()
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from the directory?`)) return
    await supabase.from('members_directory').delete().eq('id', id)
    fetchMembers()
  }

  const filtered = filterSector === 'All' ? members : members.filter(m => m.sector === filterSector)

  return (
    <>
      <div className="admin-header">
        <h1>Members Directory</h1>
        <p>Manage the public-facing member roster across all sectors.</p>
      </div>

      {message && (
        <div className={`admin-alert ${message.startsWith('Error') ? 'admin-alert-error' : 'admin-alert-success'}`}>
          {message}
        </div>
      )}

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>All Members ({members.length})</h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              value={filterSector}
              onChange={e => setFilterSector(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.85rem' }}
            >
              <option value="All">All Sectors</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="admin-btn" onClick={openAdd}>+ Add Member</button>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>Loading members…</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Sector</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.title ?? '—'}</td>
                  <td><span className="admin-badge admin-badge-blue">{m.sector}</span></td>
                  <td>{m.email ?? '—'}</td>
                  <td>
                    <span className={`admin-badge ${m.is_active ? 'admin-badge-green' : 'admin-badge-gray'}`}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="admin-btn admin-btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }} onClick={() => openEdit(m)}>Edit</button>
                    <button className="admin-btn admin-btn-danger" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }} onClick={() => handleDelete(m.id, m.name)}>Remove</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No members found. Click "Add Member" to get started.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Edit Member' : 'Add New Member'}</h3>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" />
              </div>
              <div className="admin-form-group">
                <label>Title / Role</label>
                <input value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Portfolio Manager" />
              </div>
            </div>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Sector *</label>
                <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Sort Order</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} placeholder="0" />
              </div>
            </div>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Email</label>
                <input value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jsmith@fairfield.edu" />
              </div>
              <div className="admin-form-group">
                <label>LinkedIn URL</label>
                <input value={form.linkedin_url ?? ''} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
              </div>
            </div>
            <div className="admin-form-group">
              <label>Headshot URL</label>
              <input value={form.headshot_url ?? ''} onChange={e => setForm(f => ({ ...f, headshot_url: e.target.value }))} placeholder="Upload via Supabase Storage, paste URL here" />
            </div>
            <div className="admin-form-group">
              <label>Bio</label>
              <textarea value={form.bio ?? ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Member biography…" rows={4} />
            </div>
            <div className="admin-form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 'auto' }} />
              <label htmlFor="is_active" style={{ margin: 0 }}>Active member (shows on public site)</label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="admin-btn" onClick={handleSave} disabled={saving || !form.name}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
