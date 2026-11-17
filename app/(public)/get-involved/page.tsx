import type { Metadata } from 'next'
import Link from 'next/link'
import { getPageContent } from '@/lib/getPageContent'
import { getSettings } from '@/lib/data'

export const metadata: Metadata = { title: 'Get Involved' }

export default async function GetInvolvedPage() {
  const [db, settings] = await Promise.all([getPageContent('get-involved'), getSettings()])
  const c = (key: string, fallback: string) => db[key] || fallback
  // Recruiting sets the application form link in the portal; blank = the
  // built-in /apply form, shown only while applications are open.
  const applyUrl = settings.recruiting.form_url?.trim() || (settings.recruiting.applications_open ? '/apply' : '')

  const appSteps = c('app_steps', `Submit your application\nResume screening\nIn-person interview with a Portfolio Manager`)
    .split('\n').filter(Boolean)

  const offerItems = c('offer_items', `Hands-On Experience: Manage a live portfolio worth over $250K+.\nProfessional Development: Learn critical skills in financial modeling.\nExclusive Career & Networking Opportunities: Access alumni mentorship.`)
    .split('\n').filter(Boolean)

  return (
    <>
      <section className="hero small-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c('hero_image', '/Website Assets/Get Involved/Get Involved Background Header.png')} alt="Get Involved" />
        <div className="hero-content">
          <h1>{c('hero_title', 'Get Involved')}</h1>
          <p>{c('hero_subtitle', 'Join Fairfield Investment Group and start building your career in finance today.')}</p>
        </div>
      </section>

      <section className="info-section">
        <div className="info-content">
          <div className="info-text">
            <h2>{c('recruit_title', "Recruitment Timeline (Spring Semester 26')")}</h2>
            <p>{c('recruit_text', 'Applications open DATE TBD. Resume screenings and interviews will take place in early December. Final decisions are sent out over winter break.')}</p>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c('recruit_image', '/Website Assets/Get Involved/Alumni Panel.jpeg')} alt="FIG Recruitment" />
          </div>
        </div>
      </section>

      <section className="info-section alt-bg">
        <div className="info-content reverse">
          <div className="info-text">
            <h2>{c('app_title', 'Application Process')}</h2>
            <p>{c('app_text', 'The Fairfield Investment Group application process is designed to identify driven, collaborative students. The process includes:')}</p>
            <ul>
              {appSteps.map(step => <li key={step}>{step}</li>)}
            </ul>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c('app_image', '/Website Assets/Event Photos/Guy Adami/DSC_0197.JPG')} alt="Application Process" />
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-content">
          <div className="info-text">
            <h2>{c('offer_title', 'What We Offer')}</h2>
            <ul>
              {offerItems.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c('offer_image', '/Website Assets/Get Involved/IEX Trip.jpeg')} alt="What We Offer" />
          </div>
        </div>
      </section>

      <section id="apply" className="section" style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
        <div className="newsletter">
          <h3>{c('cta_title', 'Ready to Join?')}</h3>
          <p>{applyUrl ? 'Click Apply now to fill out our application.' : "Applications aren't open right now. Check back soon."}</p>
          <div className="newsletter-actions">
            {applyUrl.startsWith('/')
              ? <Link href={applyUrl} className="btn">Apply now</Link>
              : applyUrl && <a href={applyUrl} className="btn" target="_blank" rel="noopener noreferrer">Apply now</a>}
            <Link href="/resources" className="btn" style={{ backgroundColor: '#000' }}>
              View Resources
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
