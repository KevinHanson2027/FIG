'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navLinks = [
  { href: '/hub',           label: 'Dashboard' },
  { href: '/hub/resources', label: 'Resources' },
  { href: '/hub/tools',     label: 'Market Tools' },
]

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="hub-layout">
      <nav className="hub-nav">
        <Link href="/hub" className="hub-nav-brand">
          <div>
            <span>FIG Member Hub</span>
            <small>Fairfield Investment Group</small>
          </div>
        </Link>
        <div className="hub-nav-links">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="hub-nav-right">
          <button onClick={handleSignOut} className="hub-signout-btn">Sign Out</button>
        </div>
      </nav>
      <div className="hub-main">{children}</div>
    </div>
  )
}
