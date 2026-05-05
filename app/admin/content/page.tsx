'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

const pages = [
  { slug: 'home',               name: 'Homepage',            fields: [
    { key: 'stats_aum',         label: 'Assets Under Management (stat)',  type: 'text', placeholder: '$230K+' },
    { key: 'stats_members',     label: 'Active Members (stat)',           type: 'text', placeholder: '60+' },
    { key: 'stats_sectors',     label: 'Investment Sectors (stat)',       type: 'text', placeholder: '8' },
    { key: 'history_text',      label: 'History Paragraph',              type: 'textarea', placeholder: 'Fairfield Investment Group was founded in 2013…' },
  ]},
  { slug: 'about',              name: 'About',               fields: [
    { key: 'hero_subtitle',     label: 'Hero Subtitle',                  type: 'text', placeholder: 'Educating Fairfield students…' },
    { key: 'about_p1',         label: 'About Us — Paragraph 1',         type: 'textarea', placeholder: '' },
    { key: 'about_p2',         label: 'About Us — Paragraph 2',         type: 'textarea', placeholder: '' },
    { key: 'about_p3',         label: 'About Us — Paragraph 3',         type: 'textarea', placeholder: '' },
    { key: 'placements_class', label: 'Placements Class Label',          type: 'text', placeholder: 'Class of 2026' },
    { key: 'placements_list',  label: 'Recent Placements (one per line)', type: 'textarea', placeholder: 'Sara Wentland - Debt Capital Markets, BofA\nMatthew Byrnes - Wealth Mgmt, UBS' },
  ]},
  { slug: 'get-involved',       name: 'Get Involved',        fields: [
    { key: 'recruitment_date',  label: 'Recruitment Timeline Date',      type: 'text', placeholder: 'DATE TBD' },
    { key: 'recruitment_text',  label: 'Recruitment Description',        type: 'textarea', placeholder: '' },
    { key: 'interest_form_url', label: 'Interest Form URL',              type: 'text', placeholder: 'https://forms.gle/...' },
  ]},
  { slug: 'portfolio-reporting', name: 'Portfolio Reporting', fields: [
    { key: 'report_1_label',   label: 'Report 1 — Label',               type: 'text', placeholder: 'November 2025 Report' },
    { key: 'report_1_url',     label: 'Report 1 — PDF URL',             type: 'text', placeholder: '/Website Assets/Portfolio Reporting/...' },
    { key: 'report_2_label',   label: 'Report 2 — Label',               type: 'text', placeholder: 'December 2025 Report' },
    { key: 'report_2_url',     label: 'Report 2 — PDF URL',             type: 'text', placeholder: '' },
    { key: 'report_3_label',   label: 'Report 3 — Label',               type: 'text', placeholder: 'January 2026 Report' },
    { key: 'report_3_url',     label: 'Report 3 — PDF URL',             type: 'text', placeholder: '' },
    { key: 'report_4_label',   label: 'Report 4 — Label',               type: 'text', placeholder: 'February 2026 Report' },
    { key: 'report_4_url',     label: 'Report 4 — PDF URL',             type: 'text', placeholder: '' },
  ]},
  { slug: 'holdings',           name: 'Holdings',            fields: [
    { key: 'google_sheet_url', label: 'Google Sheet Embed URL',          type: 'text', placeholder: 'https://docs.google.com/spreadsheets/d/e/...' },
  ]},
]

function ContentEditor() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const initialPage = searchParams.get('page') ?? 'home'
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [values, setValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const pageConfig = pages.find(p => p.slug === currentPage) ?? pages[0]

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('page_content')
        .select('content')
        .eq('page_slug', currentPage)
        .maybeSingle()
      setValues((data?.content as Record<string, string>) ?? {})
    }
    load()
  }, [currentPage, supabase])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('page_content')
      .upsert({ page_slug: currentPage, content: values, updated_at: new Date().toISOString() }, { onConflict: 'page_slug' })
    if (error) setMessage('Error: ' + error.message)
    else setMessage('Saved! Changes will appear on the live site immediately.')
    setSaving(false)
  }

  return (
    <>
      <div className="admin-header">
        <h1>Page Content Editor</h1>
        <p>Edit the text content that appears on each public page.</p>
      </div>

      {message && (
        <div className={`admin-alert ${message.startsWith('Error') ? 'admin-alert-error' : 'admin-alert-success'}`}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {pages.map(p => (
          <button
            key={p.slug}
            onClick={() => { setCurrentPage(p.slug); setMessage('') }}
            className={`admin-btn ${currentPage === p.slug ? '' : 'admin-btn-secondary'}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>Editing: {pageConfig.name}</h2>
          <a href={currentPage === 'home' ? '/' : `/${currentPage}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-secondary">
            🌐 Preview Page
          </a>
        </div>

        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Fields left blank will use the default content from the original site. Fill in a field to override it.
        </p>

        {pageConfig.fields.map(field => (
          <div key={field.key} className="admin-form-group">
            <label>{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                value={values[field.key] ?? ''}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={4}
              />
            ) : (
              <input
                type="text"
                value={values[field.key] ?? ''}
                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
              />
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button className="admin-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>
          <button className="admin-btn admin-btn-secondary" onClick={() => setValues({})}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </>
  )
}

export default function ContentPage() {
  return (
    <Suspense fallback={<div className="admin-header"><h1>Loading…</h1></div>}>
      <ContentEditor />
    </Suspense>
  )
}
