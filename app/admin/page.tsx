import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [membersRes, resourcesRes, usersRes, announcementsRes] = await Promise.all([
    supabase.from('members_directory').select('id', { count: 'exact', head: true }),
    supabase.from('resources').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('announcements').select('id', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Active Members',   value: membersRes.count ?? 0,       icon: '👥' },
    { label: 'Uploaded Files',   value: resourcesRes.count ?? 0,     icon: '📁' },
    { label: 'User Accounts',    value: usersRes.count ?? 0,          icon: '🔐' },
    { label: 'Announcements',    value: announcementsRes.count ?? 0,  icon: '📢' },
  ]

  const quickLinks = [
    { href: '/admin/members',       icon: '👥', label: 'Members',     desc: 'Add/edit member directory' },
    { href: '/admin/resources',     icon: '📁', label: 'Resources',   desc: 'Upload files for members' },
    { href: '/admin/content',       icon: '✏️', label: 'Content',     desc: 'Edit website page text' },
    { href: '/admin/users',         icon: '🔐', label: 'Users',       desc: 'Manage member accounts' },
    { href: '/admin/announcements', icon: '📢', label: 'Announce',    desc: 'Post to member hub' },
    { href: '/',                    icon: '🌐', label: 'View Site',   desc: 'Open public website' },
  ]

  return (
    <>
      <div className="admin-header">
        <h1>Dashboard</h1>
        <p>Welcome back, Kevin. Here's what's happening with FIG.</p>
      </div>

      <div className="admin-stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="admin-stat-card">
            <h3>{s.icon} {s.value}</h3>
            <p>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="admin-section">
        <div className="admin-section-header">
          <h2>Quick Actions</h2>
        </div>
        <div className="admin-quick-links">
          {quickLinks.map((link) => (
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
            <tr>
              <th>Page</th>
              <th>URL</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Homepage',            url: '/',                     slug: 'home' },
              { name: 'About',               url: '/about',                slug: 'about' },
              { name: 'Holdings',            url: '/holdings',             slug: 'holdings' },
              { name: 'Portfolio Reporting', url: '/portfolio-reporting',  slug: 'portfolio-reporting' },
              { name: 'Resources',           url: '/resources',            slug: 'resources' },
              { name: 'Get Involved',        url: '/get-involved',         slug: 'get-involved' },
            ].map((page) => (
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
