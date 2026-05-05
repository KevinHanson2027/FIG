import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <>
      <section className="about-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Website Assets/About/About Header Background.JPG" alt="Fairfield Investment Group - About Page" />
        <div className="about-hero-content">
          <h1>Established in 2013</h1>
          <p>Educating Fairfield students through real investing experience and financial leadership.</p>
        </div>
      </section>

      <section className="about-intro">
        <div className="about-content">
          <div className="about-text">
            <h2>About Us</h2>
            <p>
              The Fairfield Investment Group (FIG) is Fairfield University's premier student-run fund. The group was
              first established with a small group of ten students and has since grown exponentially, developing a
              robust network of alumni and maintaining a significant presence on campus.
            </p>
            <p>
              FIG's core mandate is to educate all students at Fairfield on the skills needed to become a proficient
              investor. We achieve this by providing a unique, hands-on opportunity to research and pitch investments,
              effectively bridging the gap between classroom theory and real-world application.
            </p>
            <p>
              Our analysts and members regularly spend time discussing the linkages in the economy, the impact of
              major market players, central bank policy, and other current events that actively affect financial
              markets.
            </p>
          </div>
          <div className="about-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/About/Serious Group Photo.png" alt="Fairfield Investment Group" />
          </div>
        </div>
      </section>

      <section className="about-group">
        <h2>About the Group</h2>
        <div className="group-grid">
          <div className="group-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/About/IEX Trip (2).jpeg" alt="Portfolio Performance Group" />
            <h3>Portfolio Performance Group</h3>
            <p>
              The Portfolio Performance Group focuses on analyzing and tracking FIG's portfolio performance across
              sectors, comparing returns to key benchmarks. Members gain experience in data analysis, financial
              modeling, and portfolio management while identifying opportunities and improving investment strategy.
            </p>
          </div>
          <div className="group-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/About/Alumni Panel.jpeg" alt="Meeting Details" />
            <h3>Meeting Details</h3>
            <p>
              FIG holds weekly general meetings where members discuss and vote on stock proposals and share insights
              on the economy, the Fed, and market trends. Students can also write for The Stag Market, FIG's weekly
              newsletter featuring key economic and market updates.
            </p>
          </div>
          <div className="group-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/About/IEX Trip.jpeg" alt="Special Events" />
            <h3>Special Events</h3>
            <p>
              FIG members and alumni bring experience from all areas of the financial services industry, offering
              opportunities for members to network and build connections. The club regularly hosts alumni panels and
              exclusive recruiting events to help members prepare for future careers.
            </p>
          </div>
        </div>
      </section>

      <section className="about-placements">
        <h2>Our Placements</h2>
        <p>
          FIG members represent Fairfield's most committed candidates for employment in finance. This section
          highlights our members' dedication and success in securing roles across top firms in investment banking,
          wealth management, and consulting.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Website Assets/About/Our Placements.png" alt="FIG Placements" />
      </section>

      <section className="section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
        <h2>Recent Summer Placements</h2>
        <h3>Class of 2026</h3>
        <div className="placements-logos">
          {[
            'Sara Wentland - Debt Capital Markets Analyst, Bank of America',
            'Matthew Byrnes - Wealth Management Intern, UBS',
            'Andrew Burke - Marketing/Sales Analyst, REX Financial',
            'Natalia Adamski - Real Estate & Private Markets Summer Analyst, UBS',
            'Kelsey Volker - Investment and Sales Analyst, PGIM Investments',
            'Lila Sullivan - Relationship Manager, MONECO Advisors',
            'Matthew Celentano - Audit Intern, Forvis Mazars',
            'Thomas Healey - Expert Services Analyst, Kroll',
            'Paul Knieriem - Financial Advisor, Equitable Advisors',
            'Brian Burke - Teaching Assistant Intern, Knopman Marks',
            'Margaux Doran - Wealth Management Intern, UBS',
            'Caleb Birchem - Sales Development Representative, GreenIRR',
          ].map((placement) => (
            <div key={placement} className="logo-item">{placement}</div>
          ))}
        </div>
      </section>
    </>
  )
}
