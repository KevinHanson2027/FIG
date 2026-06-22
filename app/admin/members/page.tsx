'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageField } from '../ImageField'

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

type SortKey = 'name' | 'title' | 'sector' | 'email' | 'is_active'

const sectors = [
  'Executive Board', 'Consumers', 'Energy & Utilities', 'Financials',
  'Fixed Income', 'Healthcare', 'Industrials & Materials', 'Real Estate',
  'Technology', 'Marketing',
]

const emptyMember: Omit<Member, 'id'> = {
  name: '', title: '', sector: 'Consumers', email: '', linkedin_url: '',
  bio: '', headshot_url: '', is_active: true, sort_order: 0,
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const [errored, setErrored] = useState(false)
  if (url && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        onError={() => setErrored(true)}
        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee', flexShrink: 0 }}
      />
    )
  }
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', background: '#f0f0f0', color: '#888',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
    }}>
      {initials(name) || '?'}
    </div>
  )
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

  // Per-column filters
  const [searchName, setSearchName] = useState('')
  const [searchTitle, setSearchTitle] = useState('')
  const [searchEmail, setSearchEmail] = useState('')
  const [filterSector, setFilterSector] = useState('All')
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All')

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('sector')
  const [sortAsc, setSortAsc] = useState(true)

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

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return '↕'
    return sortAsc ? '↑' : '↓'
  }

  const filtered = useMemo(() => {
    let rows = members
    if (filterSector !== 'All') rows = rows.filter(m => m.sector === filterSector)
    if (filterStatus !== 'All') rows = rows.filter(m => (filterStatus === 'Active') === m.is_active)
    if (searchName.trim()) rows = rows.filter(m => m.name.toLowerCase().includes(searchName.trim().toLowerCase()))
    if (searchTitle.trim()) rows = rows.filter(m => (m.title ?? '').toLowerCase().includes(searchTitle.trim().toLowerCase()))
    if (searchEmail.trim()) rows = rows.filter(m => (m.email ?? '').toLowerCase().includes(searchEmail.trim().toLowerCase()))

    const sorted = [...rows].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortKey === 'is_active') { av = a.is_active ? 1 : 0; bv = b.is_active ? 1 : 0 }
      else { av = (a[sortKey] ?? '').toString().toLowerCase(); bv = (b[sortKey] ?? '').toString().toLowerCase() }
      if (av < bv) return sortAsc ? -1 : 1
      if (av > bv) return sortAsc ? 1 : -1
      return 0
    })
    return sorted
  }, [members, filterSector, filterStatus, searchName, searchTitle, searchEmail, sortKey, sortAsc])

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

      <div className="admin-section admin-section-wide">
        <div className="admin-section-header">
          <h2>All Members ({filtered.length} of {members.length})</h2>
          <button className="admin-btn" onClick={openAdd}>+ Add Member</button>
        </div>

        {loading ? (
          <p style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>Loading members…</p>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table admin-table-roomy">
              <thead>
                <tr>
                  <th className="admin-th-sortable" onClick={() => toggleSort('name')}>Name <span className="admin-sort-arrow">{sortArrow('name')}</span></th>
                  <th className="admin-th-sortable" onClick={() => toggleSort('title')}>Title <span className="admin-sort-arrow">{sortArrow('title')}</span></th>
                  <th className="admin-th-sortable" onClick={() => toggleSort('sector')}>Sector <span className="admin-sort-arrow">{sortArrow('sector')}</span></th>
                  <th className="admin-th-sortable" onClick={() => toggleSort('email')}>Email <span className="admin-sort-arrow">{sortArrow('email')}</span></th>
                  <th className="admin-th-sortable" onClick={() => toggleSort('is_active')}>Status <span className="admin-sort-arrow">{sortArrow('is_active')}</span></th>
                  <th>Actions</th>
                </tr>
                <tr className="admin-filter-row">
                  <th><input value={searchName} onChange={e => setSearchName(e.target.value)} placeholder="Search name…" /></th>
                  <th><input value={searchTitle} onChange={e => setSearchTitle(e.target.value)} placeholder="Search title…" /></th>
                  <th>
                    <select value={filterSector} onChange={e => setFilterSector(e.target.value)}>
                      <option value="All">All Sectors</option>
                      {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </th>
                  <th><input value={searchEmail} onChange={e => setSearchEmail(e.target.value)} placeholder="Search email…" /></th>
                  <th>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
                      <option value="All">All</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Avatar name={m.name} url={m.headshot_url} />
                        <strong>{m.name}</strong>
                      </div>
                    </td>
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
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No members match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
              <label>Headshot</label>
              <ImageField
                value={form.headshot_url ?? ''}
                onChange={v => setForm(f => ({ ...f, headshot_url: v }))}
                bucket="headshots"
                folder="members/"
              />
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
