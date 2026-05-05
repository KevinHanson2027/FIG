import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Get Involved' }

export default function GetInvolvedPage() {
  return (
    <>
      <section className="hero small-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Website Assets/Get Involved/Get Involved Background Header.png" alt="Get Involved - Fairfield Investment Group" />
        <div className="hero-content">
          <h1>Get Involved</h1>
          <p>Join Fairfield Investment Group and start building your career in finance today.</p>
        </div>
      </section>

      <section className="info-section">
        <div className="info-content">
          <div className="info-text">
            <h2>Recruitment Timeline (Spring Semester 26&apos;)</h2>
            <p>
              Applications open <strong>DATE TBD</strong>. Resume screenings and interviews will take place in early
              December. Final decisions are sent out over winter break, before our first spring meeting.
            </p>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/Get Involved/Alumni Panel.jpeg" alt="FIG Recruitment Process" />
          </div>
        </div>
      </section>

      <section className="info-section alt-bg">
        <div className="info-content reverse">
          <div className="info-text">
            <h2>Application Process</h2>
            <p>
              The Fairfield Investment Group application process is designed to identify driven, collaborative students
              who share a passion for investing and learning. The process includes:
            </p>
            <ul>
              <li>Submit your application</li>
              <li>Resume screening</li>
              <li>In-person interview with a Portfolio Manager</li>
            </ul>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/Event Photos/Guy Adami/DSC_0197.JPG" alt="Application Interview" />
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-content">
          <div className="info-text">
            <h2>What We Offer</h2>
            <ul>
              <li>
                <strong>Hands-On Experience:</strong> Manage a live portfolio worth over $250K+ contributing to real
                investment decisions that drive our fund's performance.
              </li>
              <li>
                <strong>Professional Development:</strong> Learn critical skills in financial modeling, analysis, and
                presentation under the guidance of experienced portfolio managers.
              </li>
              <li>
                <strong>Exclusive Career &amp; Networking Opportunities:</strong> Access alumni mentorship, internship
                pipelines, and recruiting events with leading financial firms.
              </li>
            </ul>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Website Assets/Get Involved/IEX Trip.jpeg" alt="Professional Development" />
          </div>
        </div>
      </section>

      <section className="section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
        <div className="newsletter">
          <h3>Ready to Join?</h3>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://forms.gle/84qCM2sGMZpJTaba8" className="btn" target="_blank" rel="noopener noreferrer">
              Interest Form
            </a>
            <Link href="/resources" className="btn" style={{ backgroundColor: '#000' }}>
              View Resources
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
