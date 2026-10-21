'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, UserRound, X } from 'lucide-react'

type SectorLink = { name: string; slug: string }

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/holdings', label: 'Holdings' },
  { href: '/portfolio-reporting', label: 'Portfolio Reporting' },
]
const TRAILING = [
  { href: '/resources', label: 'Resources' },
  { href: '/get-involved', label: 'Get Involved' },
]

export default function Header({ sectors }: { sectors: SectorLink[] }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const dropdown = useRef<HTMLLIElement>(null)
  const bar = useRef<HTMLElement>(null)
  const [barHeight, setBarHeight] = useState(70)

  useEffect(() => {
    if (!bar.current) return
    const ro = new ResizeObserver(() => setBarHeight(bar.current?.offsetHeight ?? 70))
    ro.observe(bar.current)
    return () => ro.disconnect()
  }, [])

  // Supabase keeps the session in an sb-…-auth-token cookie; enough to pick the button label.
  useEffect(() => { setSignedIn(/(^|; )sb-[^=]+-auth-token/.test(document.cookie)) }, [])
  useEffect(() => { setMenuOpen(false); setMembersOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); setMembersOpen(false) } }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  useEffect(() => {
    if (!membersOpen) return
    const onDown = (e: MouseEvent) => { if (!dropdown.current?.contains(e.target as Node)) setMembersOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [membersOpen])

  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
  const portalButton = (
    <Link href={signedIn ? '/portal' : '/login'} className="header-login">
      <UserRound size={16} aria-hidden /> {signedIn ? 'My Portal' : 'Member Login'}
    </Link>
  )

  return (
    <header ref={bar} className={`header${menuOpen ? ' menu-open' : ''}`} style={{ '--header-h': `${barHeight}px` } as React.CSSProperties}>
      <div className="header-content">
        <Link href="/" className="logo" aria-label="Fairfield Investment Group home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Website Assets/Logos/FIG Primary Logo.svg" alt="Fairfield Investment Group" style={{ height: '50px', width: 'auto' }} />
        </Link>

        <nav className="header-nav" aria-label="Main">
          <ul className="nav">
            {LINKS.map(l => <li key={l.href}><Link href={l.href} className={active(l.href) ? 'active' : ''}>{l.label}</Link></li>)}
            <li className={`dropdown${membersOpen ? ' open' : ''}`} ref={dropdown}>
              <button type="button" className={`dropbtn${pathname.startsWith('/members') ? ' active' : ''}`} aria-expanded={membersOpen} aria-haspopup="true" onClick={() => setMembersOpen(o => !o)}>
                Members <ChevronDown size={14} aria-hidden />
              </button>
              <ul className="dropdown-content">
                {sectors.map(s => <li key={s.slug}><Link href={`/members/${s.slug}`}>{s.name}</Link></li>)}
              </ul>
            </li>
            {TRAILING.map(l => <li key={l.href}><Link href={l.href} className={active(l.href) ? 'active' : ''}>{l.label}</Link></li>)}
          </ul>
          {portalButton}
        </nav>

        <button type="button" className="nav-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      <div id="mobile-menu" className="mobile-menu" hidden={!menuOpen}>
        <ul>
          {LINKS.map(l => <li key={l.href}><Link href={l.href} className={active(l.href) ? 'active' : ''}>{l.label}</Link></li>)}
          <li>
            <button type="button" className="mobile-group" aria-expanded={membersOpen} onClick={() => setMembersOpen(o => !o)}>
              Members <ChevronDown size={18} aria-hidden style={{ transform: membersOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
            </button>
            {membersOpen && (
              <ul className="mobile-sub">
                {sectors.map(s => <li key={s.slug}><Link href={`/members/${s.slug}`}>{s.name}</Link></li>)}
              </ul>
            )}
          </li>
          {TRAILING.map(l => <li key={l.href}><Link href={l.href} className={active(l.href) ? 'active' : ''}>{l.label}</Link></li>)}
        </ul>
        <div className="mobile-menu-foot">{portalButton}</div>
      </div>
    </header>
  )
}
