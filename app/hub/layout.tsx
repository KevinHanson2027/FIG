'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [sector, setSector] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? '')
        supabase.from('profiles').select('sector').eq('id', user.id).single().then(({ data }) => {
          setSector(data?.sector ?? '')
        })
      }
    })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navLinks = [
    { href: '/hub',             label: 'Dashboard' },
    { href: '/hub/resources',   label: 'Resources' },
    { href: '/hub/tools',       label: 'Market Tools' },
  ]

  return (
    <div className="hub-layout">
      <nav className="hub-nav">
        <Link href="/hub" className="hub-nav-brand">
          <div>
            <span>FIG Member Hub</span>
            {sector && <small>{sector}</small>}
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
          {userEmail && <span className="hub-nav-user">{userEmail}</span>}
          <button onClick={handleSignOut} className="hub-signout-btn">Sign Out</button>
        </div>
      </nav>
      <div className="hub-main">{children}</div>
    </div>
  )
}
