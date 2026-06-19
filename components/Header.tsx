'use client'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="header">
      <div className="header-content">
        <Link href="/" className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Website Assets/Logos/FIG Primary Logo.svg"
            alt="Fairfield Investment Group"
            style={{ height: '50px', width: 'auto' }}
          />
        </Link>
        <nav>
          <ul className="nav">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/holdings">Holdings</Link></li>
            <li><Link href="/portfolio-reporting">Portfolio Reporting</Link></li>
            <li className="dropdown">
              <a href="#" className="dropbtn">Members ▾</a>
              <ul className="dropdown-content">
                <li><Link href="/members/executive-board">Executive Board</Link></li>
                <li><Link href="/members/consumers">Consumer</Link></li>
                <li><Link href="/members/energy-utilities">Energy &amp; Utilities</Link></li>
                <li><Link href="/members/financials">Financials</Link></li>
                <li><Link href="/members/fixed-income">Fixed Income</Link></li>
                <li><Link href="/members/healthcare">Healthcare</Link></li>
                <li><Link href="/members/industrials">Industrials &amp; Materials</Link></li>
                <li><Link href="/members/real-estate">Real Estate</Link></li>
                <li><Link href="/members/technology">Technology</Link></li>
                <li><Link href="/members/marketing">Marketing</Link></li>
              </ul>
            </li>
            <li><Link href="/resources">Resources</Link></li>
            <li><Link href="/get-involved">Get Involved</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
