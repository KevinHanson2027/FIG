import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-column">
          <div className="footer-logo">FIG</div>
        </div>
        <div className="footer-column">
          <h4>Pages</h4>
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/holdings">Holdings</Link>
          <Link href="/portfolio-reporting">Portfolio Reporting</Link>
          <Link href="/members/executive-board">Board</Link>
        </div>
        <div className="footer-column">
          <h4>Connect</h4>
          <Link href="/get-involved">Get Involved</Link>
          <Link href="/resources">Resources</Link>
        </div>
        <div className="footer-column">
          <h4>Socials</h4>
          <div className="social">
            <a
              href="https://www.linkedin.com/company/fairfield-investment-group/posts/?feedView=all"
              target="_blank"
              rel="noopener noreferrer"
            >
              in
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
