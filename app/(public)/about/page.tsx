import type { Metadata } from 'next'
import { getPageContent } from '@/lib/getPageContent'

export const metadata: Metadata = { title: 'About' }

export default async function AboutPage() {
  const db = await getPageContent('about')
  const c = (key: string, fallback: string) => db[key] || fallback

  const placements = c('placements_list', `Sara Wentland - Debt Capital Markets Analyst, Bank of America
Matthew Byrnes - Wealth Management Intern, UBS
Andrew Burke - Marketing/Sales Analyst, REX Financial
Natalia Adamski - Real Estate & Private Markets Summer Analyst, UBS
Kelsey Volker - Investment and Sales Analyst, PGIM Investments
Lila Sullivan - Relationship Manager, MONECO Advisors
Matthew Celentano - Audit Intern, Forvis Mazars
Thomas Healey - Expert Services Analyst, Kroll
Paul Knieriem - Financial Advisor, Equitable Advisors
Brian Burke - Teaching Assistant Intern, Knopman Marks
Margaux Doran - Wealth Management Intern, UBS
Caleb Birchem - Sales Development Representative, GreenIRR`).split('\n').filter(Boolean)

  return (
    <>
      <section className="about-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c('hero_image', '/Website Assets/About/About Header Background.JPG')} alt="Fairfield Investment Group - About" />
        <div className="about-hero-content">
          <h1>{c('hero_title', 'Established in 2013')}</h1>
          <p>{c('hero_subtitle', 'Educating Fairfield students through real investing experience and financial leadership.')}</p>
        </div>
      </section>

      <section className="about-intro">
        <div className="about-content">
          <div className="about-text">
            <h2>{c('about_title', 'About Us')}</h2>
            <p>{c('about_p1', "The Fairfield Investment Group (FIG) is Fairfield University's premier student-run fund.")}</p>
            <p>{c('about_p2', "FIG's core mandate is to educate all students at Fairfield on the skills needed to become a proficient investor.")}</p>
            <p>{c('about_p3', 'Our analysts and members regularly spend time discussing the linkages in the economy.')}</p>
          </div>
          <div className="about-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c('about_image', '/Website Assets/Group Photos/Smiling Group Photo #1.JPG')} alt="FIG Group" />
          </div>
        </div>
      </section>

      <section className="about-group">
        <h2>About the Group</h2>
        <div className="group-grid">
          {[
            {
              img:   c('card1_image', '/Website Assets/About/IEX Trip (2).jpeg'),
              title: c('card1_title', 'Portfolio Performance Group'),
              text:  c('card1_text',  "The Portfolio Performance Group focuses on analyzing and tracking FIG's portfolio performance across sectors."),
            },
            {
              img:   c('card2_image', '/Website Assets/About/Alumni Panel.jpeg'),
              title: c('card2_title', 'Meeting Details'),
              text:  c('card2_text',  "FIG holds weekly general meetings where members discuss and vote on stock proposals."),
            },
            {
              img:   c('card3_image', '/Website Assets/About/IEX Trip.jpeg'),
              title: c('card3_title', 'Special Events'),
              text:  c('card3_text',  'FIG members and alumni bring experience from all areas of the financial services industry.'),
            },
          ].map(card => (
            <div key={card.title} className="group-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.img} alt={card.title} />
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about-placements">
        <h2>{c('placements_title', 'Our Placements')}</h2>
        <p>{c('placements_text', "FIG members represent Fairfield's most committed candidates for employment in finance.")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c('placements_image', '/Website Assets/About/Our Placements.png')} alt="FIG Placements" />
      </section>

      <section className="section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
        <h2>Recent Summer Placements</h2>
        <h3>{c('placements_class', 'Class of 2026')}</h3>
        <div className="placements-logos">
          {placements.map(p => <div key={p} className="logo-item">{p}</div>)}
        </div>
      </section>
    </>
  )
}
