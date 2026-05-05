import Link from 'next/link'
import { getPageContent } from '@/lib/getPageContent'

export const metadata = { title: 'Home' }

export default async function HomePage() {
  const db = await getPageContent('home')
  const c = (key: string, fallback: string) => db[key] || fallback

  return (
    <>
      <section className="hero hero-reporting-style">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c('hero_image', '/Website Assets/Home/Dolan.jpeg')} alt="Fairfield University Campus" />
        <div className="hero-content">
          <h1>{c('hero_title', 'Fairfield Investment Group')}</h1>
          <Link href={c('hero_btn_url', '/about')} className="btn">
            {c('hero_btn_text', 'Learn More')}
          </Link>
        </div>
      </section>

      <section id="history" className="history-section">
        <div className="history-content">
          <h2>{c('history_title', 'Established in 2013')}</h2>
          <p>{c('history_text', 'Fairfield Investment Group was founded in 2013 with $50,000 in seed money. The group was established to bring together motivated students who share a passion for investing and understanding the dynamics of financial markets. Since its inception, Fairfield Investment Group has challenged students through collaboration and hands-on experience, helping prepare them for future careers in the finance industry.')}</p>
        </div>
      </section>

      <section className="facts-section">
        <h2>Facts &amp; Figures</h2>
        <div className="facts-grid">
          {[
            { v: c('stat_1_value', '$230K+'), l: c('stat_1_label', 'Assets Under Management') },
            { v: c('stat_2_value', '60+'),    l: c('stat_2_label', 'Active Members') },
            { v: c('stat_3_value', '8'),      l: c('stat_3_label', 'Investment Sectors') },
          ].map(s => (
            <div key={s.l} className="fact-box">
              <h3>{s.v}</h3>
              <p>{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="info-section">
        <div className="info-content">
          <div className="info-text">
            <h2>{c('about_title', 'About FIG')}</h2>
            <p>{c('about_text', "Discover the Fairfield Investment Group's mission, history, and vision.")}</p>
            <Link href="/about" className="btn">{c('about_btn', 'Learn More')}</Link>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c('about_image', '/Website Assets/Home/IEX Trip.jpeg')} alt="About FIG" />
          </div>
        </div>
      </section>

      <section className="info-section alt-bg">
        <div className="info-content reverse">
          <div className="info-text">
            <h2>{c('holdings_title', 'Our Holdings')}</h2>
            <p>{c('holdings_text', 'See exactly how the Fairfield Investment Group manages its real-capital portfolio.')}</p>
            <Link href="/holdings" className="btn">{c('holdings_btn', 'View Holdings')}</Link>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c('holdings_image', '/Website Assets/Home/Fairfield University Campus Home Background.png')} alt="Holdings" />
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="info-content">
          <div className="info-text">
            <h2>{c('resources_title', 'Resources')}</h2>
            <p>{c('resources_text', 'Access a curated vault of exclusive materials.')}</p>
            <Link href="/resources" className="btn">{c('resources_btn', 'Explore Resources')}</Link>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c('resources_image', '/Website Assets/Home/Alumni Panel.jpeg')} alt="Resources" />
          </div>
        </div>
      </section>

      <section className="info-section alt-bg">
        <div className="info-content reverse">
          <div className="info-text">
            <h2>{c('getinvolved_title', 'Get Involved')}</h2>
            <p>{c('getinvolved_text', 'Ready to take your passion for finance to the next level?')}</p>
            <Link href="/get-involved" className="btn">{c('getinvolved_btn', 'Join Us')}</Link>
          </div>
          <div className="info-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c('getinvolved_image', '/Website Assets/Home/IEX Trip (2).jpeg')} alt="Get Involved" />
          </div>
        </div>
      </section>
    </>
  )
}
