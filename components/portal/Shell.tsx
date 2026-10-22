'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity, ChartLine, ChevronsUpDown, FolderOpen, Globe, HeartHandshake, House, KeyRound, ListChecks,
  LogOut, Menu as MenuIcon, ShieldCheck, SquarePen, UserPlus, UserRound, Users, X,
} from 'lucide-react'
import type { Access } from '@/lib/roles'
import { Avatar } from './Avatar'
import { FeedbackProvider } from './feedback'

export type ShellBadges = { approvals: number; tasks: number; interviews: number; hasInterviews: boolean }

/** `match` lists the routes that belong to this item (its tabs). */
type NavItem = { href: string; label: string; icon: React.ReactNode; count?: number; tag?: string; exact?: boolean; match?: string[] }
type NavSection = { label?: string; items: NavItem[] }

const I = 18 // icon size

function buildNav(access: Access, badges: ShellBadges): NavSection[] {
  const sections: NavSection[] = [{
    items: [
      { href: '/portal', label: 'Home', icon: <House size={I} />, exact: true },
      { href: '/portal/portfolio', label: 'Portfolio', icon: <ChartLine size={I} />, match: ['/portal/portfolio', '/portal/tools'] },
      { href: '/portal/tasks', label: 'My Work', icon: <ListChecks size={I} />, count: badges.tasks + badges.interviews, match: ['/portal/tasks', '/portal/attendance', '/portal/interviews'] },
      { href: '/portal/resources', label: 'Resources', icon: <FolderOpen size={I} /> },
      { href: '/portal/profile', label: 'My Profile', icon: <UserRound size={I} />, match: ['/portal/profile', '/portal/account'] },
    ],
  }]

  const work: NavItem[] = []
  if (access.canManageTeams) {
    const label = access.pmSectors.length === 1 && !access.isAdmin ? `${access.pmSectors[0]} Team` : 'Sector Teams'
    work.push({ href: '/portal/team', label, icon: <Users size={I} /> })
  }
  if (access.hasPpg) work.push({ href: '/portal/ppg', label: 'Performance Group', icon: <Activity size={I} /> })
  if (access.canRecruit) work.push({ href: '/portal/recruiting', label: 'Recruiting', icon: <UserPlus size={I} /> })
  if (access.canEditContent) work.push({ href: '/portal/content', label: 'Website', icon: <SquarePen size={I} /> })
  if (access.canManageDonations) work.push({ href: '/portal/donors', label: 'Donor Relations', icon: <HeartHandshake size={I} />, tag: 'Beta' })
  if (access.isAdmin) work.push({ href: '/portal/admin', label: 'Control Panel', icon: <ShieldCheck size={I} />, count: badges.approvals })
  if (work.length) sections.push({ label: 'Workspaces', items: work })
  return sections
}

export function Shell({ member, access, badges, children }: {
  member: { name: string; headshot_url: string | null; roleLine: string }
  access: Access
  badges: ShellBadges
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const sections = buildNav(access, badges)

  // Close the drawer and menu whenever the page changes.
  useEffect(() => { setNavOpen(false); setMenuOpen(false) }, [pathname])

  useEffect(() => {
    document.body.classList.toggle('portal-lock', navOpen)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setNavOpen(false); setMenuOpen(false) } }
    document.addEventListener('keydown', onKey)
    return () => { document.body.classList.remove('portal-lock'); document.removeEventListener('keydown', onKey) }
  }, [navOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => { if (!userRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const under = (base: string) => pathname === base || pathname.startsWith(base + '/')
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : (item.match ?? [item.href]).some(under)

  return (
    <FeedbackProvider>
      <div className={`portal${navOpen ? ' nav-open' : ''}`}>
        <aside className="portal-sidebar" id="portal-nav" aria-label="Portal navigation">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/portal" className="portal-brand" style={{ flex: 1, borderBottom: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Website Assets/Logos/FIG Primary Logo.svg" alt="FIG" />
              <span>Member<br />Portal</span>
            </Link>
            <button type="button" className="portal-drawer-close" onClick={() => setNavOpen(false)} aria-label="Close menu" style={{ marginRight: 12 }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }} />

          <nav className="portal-nav">
            {sections.map((section, i) => (
              <div key={section.label ?? i}>
                {section.label && <div className="portal-nav-label">{section.label}</div>}
                {section.items.map(item => (
                  <Link key={item.href} href={item.href} className={isActive(item) ? 'active' : ''} aria-current={isActive(item) ? 'page' : undefined}>
                    {item.icon}
                    <span>{item.label}</span>
                    {item.count ? <span className="count" aria-label={`${item.count} pending`}>{item.count}</span> : null}
                    {item.tag && <span className="tag">{item.tag}</span>}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="portal-user" ref={userRef}>
            {menuOpen && (
              <div className="ui-menu-panel" role="menu">
                <Link href="/portal/profile" role="menuitem"><UserRound size={16} /> My profile</Link>
                <Link href="/portal/account" role="menuitem"><KeyRound size={16} /> Password &amp; sign-in</Link>
                <Link href="/" role="menuitem"><Globe size={16} /> Public website</Link>
                <hr />
                <form action="/auth/signout" method="post">
                  <button type="submit" role="menuitem" className="danger"><LogOut size={16} /> Sign out</button>
                </form>
              </div>
            )}
            <button type="button" className="portal-user-btn" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
              <Avatar name={member.name} url={member.headshot_url} />
              <div>
                <div className="portal-user-name">{member.name}</div>
                <div className="portal-user-role">{member.roleLine}</div>
              </div>
              <ChevronsUpDown size={16} />
            </button>
          </div>
        </aside>

        <div className="portal-backdrop" onClick={() => setNavOpen(false)} aria-hidden />

        <div className="portal-main">
          <header className="portal-topbar">
            <button type="button" onClick={() => setNavOpen(true)} aria-label="Open menu" aria-controls="portal-nav" aria-expanded={navOpen}>
              <MenuIcon size={22} />
            </button>
            <Link href="/portal" aria-label="Portal home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Website Assets/Logos/FIG Primary Logo.svg" alt="FIG" />
            </Link>
            <Link href="/portal/profile" aria-label="My profile">
              <Avatar name={member.name} url={member.headshot_url} size="sm" />
            </Link>
          </header>
          <main className="portal-content" id="main">{children}</main>
        </div>
      </div>
    </FeedbackProvider>
  )
}
