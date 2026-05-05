'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({ members: 0, resources: 0, announcements: 0 })

  useEffect(() => {
    Promise.all([
      supabase.from('members_directory').select('id', { count: 'exact', head: true }),
      supabase.from('resources').select('id', { count: 'exact', head: true }),
      supabase.from('announcements').select('id', { count: 'exact', head: true }),
    ]).then(([m, r, a]) => {
      setStats({ members: m.count ?? 0, resources: r.count ?? 0, announcements: a.count ?? 0 })
    })
  }, [])

  const statCards = [
    { label: 'Active Members',  value: stats.members,       icon: '👥' },
    { label: 'Uploaded Files',  value: stats.resources,     icon: '📁' },
    { label: 'Announcements',   value: stats.announcements, icon: '📢' },
  ]

  const quickLinks = [
    { href: '/admin/members',       icon: '👥', label: 'Members',     desc: 'Add/edit member directory' },
    { href: '/admin/resources',     icon: '📁', label: 'Resources',   desc: 'Upload files for members' },
    { href: '/admin/content',       icon: '✏️', label: 'Content',     desc: 'Edit website page text' },
    { href: '/admin/announcements', icon: '📢', label: 'Announce',    desc: 'Post to member hub' },
    { href: '/hub',                 icon: '👁', label: 'Member Hub',  desc: 'Preview what members see' },
    { href: '/',                    icon: '🌐', label: 'View Site',   desc: 'Open public website' },
  ]

  return (
    <>
      <div className="admin-header">
        <h1>Dashboard</h1>
        <p>Fairfield Investment Group — Admin Panel</p>
      </div>

      <div className="admin-stats-grid">
        {statCards.map(s => (
          <div key={s.label} className="admin-stat-card">
            <h3>{s.icon} {s.value}</h3>
            <p>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="admin-section">
        <div className="admin-section-header"><h2>Quick Actions</h2></div>
        <div className="admin-quick-links">
          {quickLinks.map(link => (
            <Link key={link.href} href={link.href} className="admin-quick-link">
              <span className="admin-quick-link-icon">{link.icon}</span>
              <span className="admin-quick-link-label">{link.label}</span>
              <span className="admin-quick-link-desc">{link.desc}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>Website Pages</h2>
          <Link href="/admin/content" className="admin-btn">Edit Content</Link>
        </div>
        <table className="admin-table">
          <thead>
            <tr><th>Page</th><th>URL</th><th>Action</th></tr>
          </thead>
          <tbody>
            {[
              { name: 'Homepage',            url: '/',                    slug: 'home' },
              { name: 'About',               url: '/about',               slug: 'about' },
              { name: 'Holdings',            url: '/holdings',            slug: 'holdings' },
              { name: 'Portfolio Reporting', url: '/portfolio-reporting', slug: 'portfolio-reporting' },
              { name: 'Resources',           url: '/resources',           slug: 'resources' },
              { name: 'Get Involved',        url: '/get-involved',        slug: 'get-involved' },
            ].map(page => (
              <tr key={page.slug}>
                <td><strong>{page.name}</strong></td>
                <td><code style={{ fontSize: '0.8rem', color: '#888' }}>{page.url}</code></td>
                <td>
                  <Link href={`/admin/content?page=${page.slug}`} className="admin-btn admin-btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
