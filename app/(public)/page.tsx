import Link from 'next/link'

export const metadata = { title: 'Home' }

export default function HomePage() {
  return (
    <>
      <section className="hero hero-reporting-style">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Website Assets/Home/Dolan.jpeg" alt="Fairfield University Campus - Fairfield Investment Group" />
        <div className="hero-content">
          <h1>Fairfield Investment Group</h1>
          <Link href="/about" className="btn">Learn More</Link>
        </div>
      </section>

      <section id="history" className="history-section">
        <div className="history-content">
          <h2>Established in 2013</h2>
          <p>
            Fairfield Investment Group was founded in 2013 with $50,000 in seed money. The group was established to
            bring together motivated students who share a passion for investing and understanding the dynamics of
            financial markets. Since its inception, Fairfield Investment Group has challenged students through
            collaboration and hands-on experience, helping prepare them for future careers in the finance industry.
          </p>
        </div>
      </section>

      <section className="facts-section">
        <h2>Facts &amp; Figures</h2>
        <div className="facts-grid">
          <div className="fact-box">
            <h3>$230K+</h3>
            <p>Assets Under Management</p>
          </div>
          <div className="fact-box">
            <h3>60+</h3>
            <p>Active Members</p>
          </div>
          <div className="fact-box">
            <h3>8</h3>
            <p>Investment Sectors</p>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-content">
          <div className="info-text">
            <h2>About FIG</h2>
            <p>
              Discover the Fairfield Investment Group's mission, history, and vision. Learn how we provide
              unparalleled hands-on portfolio management experience, educational resources, and professional
              development opportunities to prepare students for successful careers in finance.
            </p>
            <Link href="/about" className="btn">Learn More</Link>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/Home/IEX Trip.jpeg" alt="About FIG" />
          </div>
        </div>
      </section>

      <section className="info-section alt-bg">
        <div className="info-content reverse">
          <div className="info-text">
            <h2>Our Holdings</h2>
            <p>
              See exactly how the Fairfield Investment Group manages its real-capital portfolio. This page provides
              full transparency into our current investments, including real-time performance data, asset
              allocation, and the rationale behind our investment decisions.
            </p>
            <Link href="/holdings" className="btn">View Holdings</Link>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/Home/Fairfield University Campus Home Background.png" alt="Holdings" />
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-content">
          <div className="info-text">
            <h2>Resources</h2>
            <p>
              Access a curated vault of exclusive materials, including protected educational documents, stock
              research guides, resume templates, and essential recruiting advice. These resources are designed to
              give our members a competitive edge in their finance careers.
            </p>
            <Link href="/resources" className="btn">Explore Resources</Link>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/Home/Alumni Panel.jpeg" alt="Resources" />
          </div>
        </div>
      </section>

      <section className="info-section alt-bg">
        <div className="info-content reverse">
          <div className="info-text">
            <h2>Get Involved</h2>
            <p>
              Ready to take your passion for finance to the next level? Learn more about the recruitment timeline,
              the application process, and the exclusive professional development and networking opportunities
              that come with being an active member of the Fairfield Investment Group.
            </p>
            <Link href="/get-involved" className="btn">Join Us</Link>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/Home/IEX Trip (2).jpeg" alt="Get Involved" />
          </div>
        </div>
      </section>
    </>
  )
}
