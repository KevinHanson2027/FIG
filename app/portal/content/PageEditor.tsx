'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, RotateCcw, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PAGES, type Field } from '@/lib/cms'

import { ImageUpload } from '@/components/portal/ImageUpload'
import { must, useConfirm, useMutation } from '@/components/portal/feedback'
import { TimeAgo } from '@/components/portal/TimeAgo'

function initialValues(slug: string, saved: Record<string, string>) {
  const out: Record<string, string> = {}
  for (const s of PAGES.find(p => p.slug === slug)!.sections) for (const f of s.fields) out[f.key] = saved[f.key] ?? f.default
  return out
}

export default function PageEditor({ pages, slug, saved, updatedAt }: {
  pages: { slug: string; name: string }[]
  slug: string
  saved: Record<string, string>
  updatedAt: string | null
}) {
  const config = PAGES.find(p => p.slug === slug)!
  const start = useMemo(() => initialValues(slug, saved), [slug, saved])
  const [values, setValues] = useState(start)
  const { run, pending } = useMutation()
  const confirm = useConfirm()
  const dirty = Object.keys(values).some(k => values[k] !== start[k])

  async function save() {
    // Keep any keys saved by older versions of the editor.
    const content = { ...saved, ...values }
    await run(async () => must(await createClient().from('page_content')
      .upsert({ page_slug: slug, content, updated_at: new Date().toISOString() }, { onConflict: 'page_slug' })), { success: 'Saved — the page is live' })
  }

  async function reset() {
    if (!(await confirm({ title: `Reset ${config.name} to the original text?`, body: 'This fills every field with its default. Nothing changes on the site until you save.', confirmLabel: 'Reset fields' }))) return
    setValues(initialValues(slug, {}))
  }

  function input(f: Field) {
    const v = values[f.key] ?? ''
    const set = (val: string) => setValues(x => ({ ...x, [f.key]: val }))
    if (f.type === 'image') return <ImageUpload value={v} onChange={set} bucket="images" pathPrefix="content/" allowUrl />
    if (f.type === 'select') {
      return <select id={f.key} className="ui-select" value={v} onChange={e => set(e.target.value)}>{f.options!.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
    }
    if (f.type === 'textarea') return <textarea id={f.key} className="ui-textarea" value={v} rows={f.default.length > 200 || f.default.includes('\n') ? 7 : 3} onChange={e => set(e.target.value)} />
    // Plain text even for links: relative paths like /about are valid here.
    return <input id={f.key} className="ui-input" type="text" value={v} onChange={e => set(e.target.value)} />
  }

  return (
    <div className="ui-stack">
      <div className="ui-spread">
        <div className="ui-chips" role="tablist" aria-label="Page">
          {pages.map(p => (
            <Link key={p.slug} href={`/portal/content?page=${p.slug}`} className={`ui-chip${p.slug === slug ? ' on' : ''}`} aria-current={p.slug === slug ? 'page' : undefined}>
              {p.name}
            </Link>
          ))}
        </div>
        <a href={config.previewPath} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn-ghost ui-btn-sm"><ExternalLink size={15} /> View live page</a>
      </div>

      {slug === 'portfolio-reporting' && (
        <div className="ui-notice ui-notice-info"><div>The report buttons on this page come from the <Link className="ui-link" href="/portal/content?tab=reports">Reports</Link> tab.</div></div>
      )}

      {config.sections.map(section => (
        <section key={section.title} className="ui-card">
          <div className="ui-card-head"><h2>{section.title}</h2></div>
          <div className="ui-card-body ui-form">
            {section.fields.map(f => (
              <div key={f.key} className="ui-field">
                <label htmlFor={f.key}>{f.label}</label>
                {f.hint && <span className="ui-hint" style={{ marginTop: -2 }}>{f.hint}</span>}
                {input(f)}
              </div>
            ))}
          </div>
        </section>
      ))}

      <div style={{ position: 'sticky', bottom: 12, zIndex: 20 }}>
        <div className="ui-card" style={{ padding: '12px 16px', boxShadow: 'var(--ui-shadow-2)' }}>
          <div className="ui-spread">
            <span className="ui-small ui-muted">
              {dirty ? 'You have unsaved changes' : updatedAt ? <>Last saved <TimeAgo iso={updatedAt} /></> : 'Showing the original website text'}
            </span>
            <div className="ui-row">
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={reset}><RotateCcw size={15} /> Reset to defaults</button>
              <button type="button" className="ui-btn ui-btn-primary" onClick={save} disabled={pending || !dirty}><Save size={16} /> {pending ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
