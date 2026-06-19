'use client'
import { useState, useEffect } from 'react'
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

const fileIcon: Record<string, string> = {
  pdf: '📄', xlsx: '📊', xls: '📊', csv: '📈', docx: '📝', doc: '📝', link: '🔗', default: '📎',
}

const sectors = [
  'All', 'Consumers', 'Energy & Utilities', 'Financials', 'Fixed Income',
  'Healthcare', 'Industrials & Materials', 'Real Estate', 'Technology', 'Marketing', 'Executive Board',
]

export default function HubResourcesPage() {
  const supabase = createClient()
  const [resources, setResources] = useState<Resource[]>([])
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    supabase.from('resources').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setResources(data ?? []))
  }, [])

  const filtered = filter === 'All'
    ? resources
    : resources.filter(r => r.sector === filter || r.sector === null)

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#1a1a2e', margin: '0 0 0.25rem' }}>Resources</h1>
        <p style={{ color: '#666', fontSize: '0.9rem', margin: '0 0 1rem' }}>
          Files, spreadsheets, and links shared by FIG leadership.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {sectors.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                border: '1px solid',
                borderColor: filter === s ? '#C80F2E' : '#ddd',
                background: filter === s ? '#fee2e2' : 'white',
                color: filter === s ? '#C80F2E' : '#555',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="hub-card">
        {filtered.length === 0 ? (
          <div className="hub-empty"><p>No resources found.</p></div>
        ) : (
          filtered.map(r => {
            const ext = r.file_type ?? 'default'
            const icon = fileIcon[ext] ?? fileIcon.default
            return (
              <a
                key={r.id}
                href={r.file_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px', textDecoration: 'none', color: '#333', marginBottom: '0.75rem' }}
              >
                <div style={{ width: '44px', height: '44px', background: '#fee2e2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: '0.2rem' }}>{r.title}</div>
                  {r.description && <div style={{ fontSize: '0.85rem', color: '#666' }}>{r.description}</div>}
                  <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '0.25rem' }}>
                    {r.sector ?? 'All Members'} · {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{ color: '#C80F2E', fontSize: '0.85rem', flexShrink: 0, alignSelf: 'center' }}>
                  {r.file_type === 'link' ? 'Open →' : 'Download →'}
                </span>
              </a>
            )
          })
        )}
      </div>
    </>
  )
}
