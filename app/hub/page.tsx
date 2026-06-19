'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const fileIcon: Record<string, string> = {
  pdf: '📄', xlsx: '📊', xls: '📊', csv: '📈', docx: '📝', link: '🔗', default: '📎',
}

type Resource     = { id: string; title: string; file_url: string | null; file_type: string | null; created_at: string }
type Announcement = { id: string; title: string; body: string; created_at: string }

export default function HubDashboard() {
  const supabase = createClient()
  const [resources, setResources] = useState<Resource[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  useEffect(() => {
    supabase.from('resources').select('id,title,file_url,file_type,created_at')
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setResources(data ?? []))

    supabase.from('announcements').select('id,title,body,created_at')
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setAnnouncements(data ?? []))
  }, [])

  return (
    <>
      <div className="hub-welcome">
        <h1>Welcome to the FIG Member Hub 👋</h1>
        <p>Access resources, financial tools, and team updates below.</p>
      </div>

      <div className="hub-grid">
        <div className="hub-card">
          <h3>📢 Announcements</h3>
          {announcements.length === 0 ? (
            <div className="hub-empty"><p>No announcements yet.</p></div>
          ) : (
            announcements.map(a => (
              <div key={a.id} className="hub-announcement">
                <h4>{a.title}</h4>
                <p>{a.body.slice(0, 120)}{a.body.length > 120 ? '…' : ''}</p>
                <time>{new Date(a.created_at).toLocaleDateString()}</time>
              </div>
            ))
          )}
        </div>

        <div className="hub-card">
          <h3>📁 Recent Resources</h3>
          {resources.length === 0 ? (
            <div className="hub-empty"><p>No files uploaded yet.</p></div>
          ) : (
            resources.map(r => {
              const icon = fileIcon[r.file_type ?? 'default'] ?? fileIcon.default
              return (
                <a key={r.id} href={r.file_url ?? '#'} target="_blank" rel="noopener noreferrer" className="hub-resource-item">
                  <div className="hub-resource-icon">{icon}</div>
                  <div className="hub-resource-info">
                    <div className="hub-resource-name">{r.title}</div>
                    <div className="hub-resource-meta">{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                </a>
              )
            })
          )}
          <Link href="/hub/resources" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#C80F2E', textDecoration: 'none' }}>
            View all resources →
          </Link>
        </div>

        <div className="hub-card">
          <h3>🔗 Quick Links</h3>
          {[
            { label: 'View Portfolio Holdings',  href: '/holdings' },
            { label: 'Portfolio Reports',         href: '/portfolio-reporting' },
            { label: 'Market Tools',              href: '/hub/tools' },
            { label: 'FIG LinkedIn',              href: 'https://www.linkedin.com/company/fairfield-investment-group/' },
            { label: 'Public Website',            href: '/' },
          ].map(link => (
            <a key={link.href} href={link.href} target={link.href.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer" className="hub-resource-item">
              <div className="hub-resource-icon">🌐</div>
              <div className="hub-resource-info">
                <div className="hub-resource-name">{link.label}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
