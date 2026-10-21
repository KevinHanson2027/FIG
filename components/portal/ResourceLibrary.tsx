'use client'
import { useMemo, useRef, useState } from 'react'
import { ExternalLink, FileSpreadsheet, FileText, FolderOpen, Link2, Plus, Presentation, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AudienceOption } from '@/lib/audience'
import type { Resource } from '@/lib/types'

import { Modal } from './Modal'
import { friendlyError, must, useConfirm, useMutation, useToast } from './feedback'
import { audienceLabel } from './Announcements'
import { Badge, EmptyState } from './ui'
import { TimeAgo } from './TimeAgo'

export type ResourceView = Resource & { uploader: string | null }

function icon(type: string | null) {
  if (type === 'link') return <Link2 size={18} />
  if (type && ['xlsx', 'xls', 'csv'].includes(type)) return <FileSpreadsheet size={18} />
  if (type && ['ppt', 'pptx', 'key'].includes(type)) return <Presentation size={18} />
  return <FileText size={18} />
}

export function ResourceLibrary({ resources, uploadOptions, viewerId, isAdmin, title = 'Resources', description }: {
  resources: ResourceView[]
  uploadOptions: AudienceOption[]
  viewerId: string
  isAdmin: boolean
  title?: string
  description?: string
}) {
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('all-items')
  const { run } = useMutation()
  const toast = useToast()
  const confirm = useConfirm()

  const groups = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of resources) { const k = audienceLabel(r.audience, r.sector); m.set(k, (m.get(k) ?? 0) + 1) }
    return [...m.entries()]
  }, [resources])
  const list = filter === 'all-items' ? resources : resources.filter(r => audienceLabel(r.audience, r.sector) === filter)

  async function open(r: ResourceView) {
    if (r.file_url && !r.storage_path) { window.open(r.file_url, '_blank', 'noopener'); return }
    const w = window.open('', '_blank') // open now so popup blockers allow it
    const { data, error } = await createClient().storage.from('resources').createSignedUrl(r.storage_path!, 600)
    if (error || !data) { w?.close(); toast.error(error ? friendlyError(error) : 'Could not open this file.'); return }
    if (w) w.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }

  async function remove(r: ResourceView) {
    if (!(await confirm({ title: `Delete "${r.title}"?`, confirmLabel: 'Delete', danger: true }))) return
    await run(async () => {
      const supabase = createClient()
      if (r.storage_path) must(await supabase.storage.from('resources').remove([r.storage_path]))
      must(await supabase.from('resources').delete().eq('id', r.id))
    }, { success: 'Deleted' })
  }

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <div><h2><FolderOpen size={18} /> {title}</h2>{description && <p>{description}</p>}</div>
        {uploadOptions.length > 0 && <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setAdding(true)}><Plus size={15} /> Add</button>}
      </div>
      {groups.length > 1 && (
        <div className="ui-chips" style={{ padding: '12px 20px 0' }}>
          <button type="button" className={`ui-chip${filter === 'all-items' ? ' on' : ''}`} onClick={() => setFilter('all-items')}>All <span className="count">{resources.length}</span></button>
          {groups.map(([g, n]) => <button key={g} type="button" className={`ui-chip${filter === g ? ' on' : ''}`} onClick={() => setFilter(g)}>{g} <span className="count">{n}</span></button>)}
        </div>
      )}
      {list.length === 0 ? (
        <EmptyState icon={<FolderOpen size={22} />} title="Nothing here yet">
          {uploadOptions.length ? 'Share templates, models, guides or links with your audience.' : 'Files and links shared by leadership will appear here.'}
        </EmptyState>
      ) : (
        <ul className="ui-list" style={{ marginTop: 8 }}>
          {list.map(r => (
            <li key={r.id} className="ui-list-item">
              <span className="portal-action" style={{ padding: 0, border: 0, boxShadow: 'none', background: 'none' }}>
                <span className="dot blue">{icon(r.file_type)}</span>
              </span>
              <div className="ui-list-main">
                <button type="button" onClick={() => open(r)} className="ui-list-title" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', fontWeight: 600 }}>
                  {r.title}
                </button>
                {r.description && <div className="ui-list-sub">{r.description}</div>}
                <div className="ui-list-sub">{r.uploader ?? 'FIG'} · <TimeAgo iso={r.created_at} /></div>
              </div>
              {r.audience !== 'all' && <Badge tone="blue">{audienceLabel(r.audience, r.sector)}</Badge>}
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={`Open ${r.title}`} onClick={() => open(r)}><ExternalLink size={15} /></button>
              {(isAdmin || r.uploaded_by === viewerId) && (
                <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={`Delete ${r.title}`} onClick={() => remove(r)}><Trash2 size={15} /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {adding && <AddResource options={uploadOptions} onClose={() => setAdding(false)} />}
    </section>
  )
}

function AddResource({ options, onClose }: { options: AudienceOption[]; onClose: () => void }) {
  const [mode, setMode] = useState<'file' | 'link'>('file')
  const [f, setF] = useState({ title: '', description: '', key: options[0].key, url: '' })
  const [file, setFile] = useState<File | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const { run, pending } = useMutation()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const opt = options.find(o => o.key === f.key)!
    const ok = await run(async () => {
      const supabase = createClient()
      if (mode === 'link') {
        if (!/^https?:\/\//i.test(f.url.trim())) throw new Error('Links should start with https://')
        must(await supabase.from('resources').insert({ title: f.title.trim(), description: f.description.trim() || null, audience: opt.audience, sector: opt.sector, file_url: f.url.trim(), file_type: 'link' }))
        return true
      }
      if (!file) throw new Error('Choose a file to upload.')
      if (file.size > 25 * 1024 * 1024) throw new Error('Files must be 25 MB or smaller. Share a Google Drive link instead.')
      const ext = (file.name.split('.').pop() ?? '').toLowerCase()
      const folder = opt.audience === 'sector' ? `sector-${(opt.sector ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : opt.audience
      const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
      must(await supabase.storage.from('resources').upload(path, file, { upsert: false }))
      must(await supabase.from('resources').insert({ title: f.title.trim(), description: f.description.trim() || null, audience: opt.audience, sector: opt.sector, storage_path: path, file_type: ext }))
      return true
    }, { success: 'Shared' })
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title="Share a resource"
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="resource-form" className="ui-btn ui-btn-primary" disabled={pending || !f.title.trim()}>{pending ? 'Uploading…' : 'Share'}</button>
      </>}>
      <form id="resource-form" onSubmit={save} className="ui-form">
        <div className="ui-seg" role="tablist" style={{ alignSelf: 'flex-start' }}>
          <button type="button" className={mode === 'file' ? 'on' : ''} onClick={() => setMode('file')}>Upload a file</button>
          <button type="button" className={mode === 'link' ? 'on' : ''} onClick={() => setMode('link')}>Add a link</button>
        </div>
        <div className="ui-field">
          <label htmlFor="r-title">Title</label>
          <input id="r-title" className="ui-input" required value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="e.g. DCF model template" />
        </div>
        <div className="ui-field">
          <label htmlFor="r-desc">Description <span className="ui-muted">(optional)</span></label>
          <input id="r-desc" className="ui-input" value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} />
        </div>
        {mode === 'file' ? (
          <div className="ui-field">
            <span className="ui-label">File</span>
            <div className="ui-row">
              <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => input.current?.click()}>Choose file</button>
              <span className="ui-small ui-muted">{file ? file.name : 'PDF, Excel, Word, PowerPoint… up to 25 MB'}</span>
            </div>
            <input ref={input} type="file" hidden onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
        ) : (
          <div className="ui-field">
            <label htmlFor="r-url">Link</label>
            <input id="r-url" className="ui-input" type="url" required value={f.url} onChange={e => setF(x => ({ ...x, url: e.target.value }))} placeholder="https://drive.google.com/…" />
          </div>
        )}
        <div className="ui-field">
          <label htmlFor="r-aud">Who can see it?</label>
          <select id="r-aud" className="ui-select" value={f.key} onChange={e => setF(x => ({ ...x, key: e.target.value }))}>
            {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      </form>
    </Modal>
  )
}
