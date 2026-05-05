'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type Resource = {
  id: string
  title: string
  description: string | null
  file_url: string | null
  file_type: string | null
  sector: string | null
  created_at: string
}

const sectors = [
  'All Members', 'Executive Board', 'Consumers', 'Energy & Utilities', 'Financials',
  'Fixed Income', 'Healthcare', 'Industrials & Materials', 'Real Estate',
  'Technology', 'Marketing',
]

const fileIcon: Record<string, string> = {
  pdf: '📄', xlsx: '📊', xls: '📊', csv: '📈', docx: '📝', doc: '📝', pptx: '📋', default: '📎',
}

export default function AdminResourcesPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sector, setSector] = useState('All Members')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file')

  const fetchResources = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false })
    setResources(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchResources() }, [fetchResources])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setMessage('Please enter a title.'); return }
    if (uploadMode === 'file' && !selectedFile) { setMessage('Please select a file.'); return }
    if (uploadMode === 'link' && !externalUrl.trim()) { setMessage('Please enter a URL.'); return }

    setUploading(true)
    setMessage('')

    let fileUrl: string | null = null
    let fileType: string | null = null

    if (uploadMode === 'file' && selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() ?? ''
      const path = `${sector.replace(/[^a-z0-9]/gi, '-').toLowerCase()}/${Date.now()}-${selectedFile.name}`

      const { data: storageData, error: storageErr } = await supabase.storage
        .from('resources')
        .upload(path, selectedFile, { upsert: false })

      if (storageErr) {
        setMessage('Upload error: ' + storageErr.message + '. Make sure the "resources" storage bucket exists.')
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('resources').getPublicUrl(storageData.path)
      fileUrl = urlData.publicUrl
      fileType = ext
    } else {
      fileUrl = externalUrl.trim()
      fileType = 'link'
    }

    const { error: dbErr } = await supabase.from('resources').insert({
      title: title.trim(),
      description: description.trim() || null,
      file_url: fileUrl,
      file_type: fileType,
      sector: sector === 'All Members' ? null : sector,
    })

    if (dbErr) {
      setMessage('Database error: ' + dbErr.message)
    } else {
      setMessage('Resource added successfully!')
      setTitle('')
      setDescription('')
      setSelectedFile(null)
      setExternalUrl('')
      setSector('All Members')
      if (fileRef.current) fileRef.current.value = ''
      fetchResources()
    }
    setUploading(false)
  }

  async function handleDelete(id: string, fileUrl: string | null, fileType: string | null, title: string) {
    if (!confirm(`Delete "${title}"?`)) return
    if (fileUrl && fileType !== 'link') {
      const path = fileUrl.split('/resources/')[1]
      if (path) await supabase.storage.from('resources').remove([path])
    }
    await supabase.from('resources').delete().eq('id', id)
    fetchResources()
  }

  return (
    <>
      <div className="admin-header">
        <h1>Resources &amp; Files</h1>
        <p>Upload Excel sheets, PDFs, CSV files, and links for members to access.</p>
      </div>

      {message && (
        <div className={`admin-alert ${message.startsWith('Error') || message.startsWith('Upload') || message.startsWith('Database') ? 'admin-alert-error' : 'admin-alert-success'}`}>
          {message}
        </div>
      )}

      <div className="admin-section" style={{ marginBottom: '2rem' }}>
        <div className="admin-section-header">
          <h2>Add New Resource</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`admin-btn ${uploadMode === 'file' ? '' : 'admin-btn-secondary'}`}
              onClick={() => setUploadMode('file')}
            >
              📎 Upload File
            </button>
            <button
              className={`admin-btn ${uploadMode === 'link' ? '' : 'admin-btn-secondary'}`}
              onClick={() => setUploadMode('link')}
            >
              🔗 Add Link
            </button>
          </div>
        </div>

        <form onSubmit={handleUpload}>
          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Q1 2025 Portfolio Snapshot" />
            </div>
            <div className="admin-form-group">
              <label>Visible To</label>
              <select value={sector} onChange={e => setSector(e.target.value)}>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="admin-form-group">
            <label>Description (optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of this resource" />
          </div>
          {uploadMode === 'file' ? (
            <div className="admin-form-group">
              <label>File (Excel, CSV, PDF, etc.)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.pptx,.ppt"
                onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <small style={{ color: '#888', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                Files are stored in Supabase Storage. Max size depends on your plan.
              </small>
            </div>
          ) : (
            <div className="admin-form-group">
              <label>URL / Link</label>
              <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://docs.google.com/..." type="url" />
            </div>
          )}
          <button type="submit" className="admin-btn" disabled={uploading}>
            {uploading ? 'Uploading…' : '+ Add Resource'}
          </button>
        </form>
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>All Resources ({resources.length})</h2>
        </div>
        {loading ? (
          <p style={{ color: '#888', padding: '2rem', textAlign: 'center' }}>Loading…</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>File</th><th>Title</th><th>Sector</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {resources.map((r) => {
                const ext = r.file_type ?? 'default'
                const icon = fileIcon[ext] ?? fileIcon.default
                return (
                  <tr key={r.id}>
                    <td style={{ fontSize: '1.3rem' }}>{icon}</td>
                    <td>
                      <strong>{r.title}</strong>
                      {r.description && <div style={{ fontSize: '0.8rem', color: '#888' }}>{r.description}</div>}
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                          {r.file_type === 'link' ? '🔗 Open Link' : '⬇ Download'}
                        </a>
                      )}
                    </td>
                    <td>
                      <span className="admin-badge admin-badge-blue">{r.sector ?? 'All Members'}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#888' }}>
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="admin-btn admin-btn-danger" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }} onClick={() => handleDelete(r.id, r.file_url, r.file_type, r.title)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
              {resources.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No resources yet. Upload your first file above.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
