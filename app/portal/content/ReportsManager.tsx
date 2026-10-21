'use client'
import { useRef, useState } from 'react'
import { ExternalLink, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Report, ReportKind } from '@/lib/types'
import { day } from '@/lib/format'
import { Modal } from '@/components/portal/Modal'
import { must, useConfirm, useMutation } from '@/components/portal/feedback'
import { Badge, EmptyState } from '@/components/portal/ui'

const KINDS: { value: ReportKind; label: string }[] = [
  { value: 'monthly', label: 'Monthly report' }, { value: 'quarterly', label: 'Quarterly report' },
  { value: 'annual', label: 'Annual report' }, { value: 'newsletter', label: 'Newsletter' }, { value: 'other', label: 'Other' },
]

/** Path inside the public "reports" bucket, if the URL points there. */
function bucketPath(url: string) {
  const marker = '/storage/v1/object/public/reports/'
  const i = url.indexOf(marker)
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null
}

export default function ReportsManager({ reports }: { reports: Report[] }) {
  const [editing, setEditing] = useState<Report | 'new' | null>(null)
  const { run } = useMutation()
  const confirm = useConfirm()

  async function togglePublished(r: Report) {
    await run(async () => must(await createClient().from('reports').update({ is_published: !r.is_published }).eq('id', r.id)),
      { success: r.is_published ? 'Hidden from the website' : 'Published' })
  }

  async function remove(r: Report) {
    if (!(await confirm({ title: `Delete "${r.title}"?`, body: 'It disappears from the Portfolio Reporting page.', confirmLabel: 'Delete', danger: true }))) return
    await run(async () => {
      const supabase = createClient()
      const path = bucketPath(r.file_url)
      if (path) await supabase.storage.from('reports').remove([path])
      must(await supabase.from('reports').delete().eq('id', r.id))
    }, { success: 'Report deleted' })
  }

  return (
    <section className="ui-card">
      <div className="ui-card-head">
        <div><h2><FileText size={18} /> Reports</h2><p>Shown on the public Portfolio Reporting page, newest first.</p></div>
        <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setEditing('new')}><Plus size={15} /> Add report</button>
      </div>
      {reports.length === 0 ? (
        <EmptyState icon={<FileText size={22} />} title="No reports yet" action={<button type="button" className="ui-btn ui-btn-primary" onClick={() => setEditing('new')}>Add the first report</button>} />
      ) : (
        <ul className="ui-list">
          {reports.map(r => (
            <li key={r.id} className="ui-list-item" style={{ flexWrap: 'wrap' }}>
              <div className="ui-list-main" style={{ minWidth: 200 }}>
                <div className="ui-list-title">{r.title}</div>
                <div className="ui-list-sub">{KINDS.find(k => k.value === r.kind)?.label}{r.period_date ? ` · ${day(r.period_date)}` : ''}</div>
              </div>
              <Badge tone={r.is_published ? 'green' : 'gray'}>{r.is_published ? 'Published' : 'Hidden'}</Badge>
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => togglePublished(r)}>{r.is_published ? 'Hide' : 'Publish'}</button>
              <a className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" href={r.file_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${r.title}`}><ExternalLink size={15} /></a>
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={`Edit ${r.title}`} onClick={() => setEditing(r)}><Pencil size={15} /></button>
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm ui-btn-icon" aria-label={`Delete ${r.title}`} onClick={() => remove(r)}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
      {editing && <ReportForm report={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </section>
  )
}

function ReportForm({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const [f, setF] = useState({
    title: report?.title ?? '', kind: report?.kind ?? 'monthly' as ReportKind,
    period: report?.period_date?.slice(0, 7) ?? new Date().toISOString().slice(0, 7),
    summary: report?.summary ?? '', url: report?.file_url ?? '', published: report?.is_published ?? true,
  })
  const [file, setFile] = useState<File | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const { run, pending } = useMutation()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const ok = await run(async () => {
      const supabase = createClient()
      let fileUrl = f.url.trim()
      if (file) {
        if (file.type !== 'application/pdf') throw new Error('Please upload a PDF.')
        const path = `${f.period.slice(0, 4)}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
        must(await supabase.storage.from('reports').upload(path, file, { contentType: 'application/pdf', upsert: false }))
        fileUrl = supabase.storage.from('reports').getPublicUrl(path).data.publicUrl
      }
      if (!fileUrl) throw new Error('Upload a PDF or paste a link.')
      const row = { title: f.title.trim(), kind: f.kind, period_date: f.period ? `${f.period}-01` : null, summary: f.summary.trim() || null, file_url: fileUrl, is_published: f.published }
      must(report ? await supabase.from('reports').update(row).eq('id', report.id) : await supabase.from('reports').insert(row))
      return true
    }, { success: report ? 'Report updated' : 'Report added' })
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title={report ? 'Edit report' : 'Add a report'}
      footer={<>
        <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" form="report-form" className="ui-btn ui-btn-primary" disabled={pending || !f.title.trim()}>{pending ? 'Saving…' : 'Save'}</button>
      </>}>
      <form id="report-form" onSubmit={save} className="ui-form">
        <div className="ui-field">
          <label htmlFor="rp-title">Title (button text on the website)</label>
          <input id="rp-title" className="ui-input" required value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} placeholder="October 2026 Report" />
        </div>
        <div className="ui-form-grid">
          <div className="ui-field">
            <label htmlFor="rp-kind">Type</label>
            <select id="rp-kind" className="ui-select" value={f.kind} onChange={e => setF(x => ({ ...x, kind: e.target.value as ReportKind }))}>
              {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="rp-period">Month it covers</label>
            <input id="rp-period" className="ui-input" type="month" value={f.period} onChange={e => setF(x => ({ ...x, period: e.target.value }))} />
          </div>
        </div>
        <div className="ui-field">
          <span className="ui-label">PDF</span>
          <div className="ui-row">
            <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => input.current?.click()}>{file ? 'Change PDF' : report ? 'Replace PDF' : 'Upload PDF'}</button>
            <span className="ui-small ui-muted">{file ? file.name : f.url ? 'Current file kept' : 'Up to 25 MB'}</span>
          </div>
          <input ref={input} type="file" accept="application/pdf" hidden onChange={e => setFile(e.target.files?.[0] ?? null)} />
          {!file && (
            <input className="ui-input" style={{ marginTop: 8 }} value={f.url} onChange={e => setF(x => ({ ...x, url: e.target.value }))} placeholder="…or paste a link (Google Drive, etc.)" aria-label="Report link" />
          )}
        </div>
        <div className="ui-field">
          <label htmlFor="rp-summary">Short summary <span className="ui-muted">(optional)</span></label>
          <textarea id="rp-summary" className="ui-textarea" rows={2} value={f.summary} onChange={e => setF(x => ({ ...x, summary: e.target.value }))} />
        </div>
        <label className="ui-check">
          <input type="checkbox" checked={f.published} onChange={e => setF(x => ({ ...x, published: e.target.checked }))} />
          Show on the website
        </label>
      </form>
    </Modal>
  )
}
