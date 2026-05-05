'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/admin',                icon: '📊', label: 'Dashboard' },
  { href: '/admin/members',        icon: '👥', label: 'Members Directory' },
  { href: '/admin/resources',      icon: '📁', label: 'Resources & Files' },
  { href: '/admin/content',        icon: '✏️', label: 'Page Content' },
  { href: '/admin/announcements',  icon: '📢', label: 'Announcements' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="admin-body">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <h2>FIG Admin</h2>
          <p>Fairfield Investment Group</p>
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={handleSignOut} className="admin-signout-btn">
            Sign Out
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
