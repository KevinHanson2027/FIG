// The public website's member card, PM spotlight and bio page. Shared by the
// Members pages and the live preview in the portal's profile editor, so the
// preview always matches the real site.
import Link from 'next/link'

export const FIG_PLACEHOLDER = '/Website Assets/Logos/FIG Logo.png'
export const MEMBER_HERO = '/Website Assets/Group Photos/Smiling Group Photo %231.JPG'

export type PublicMember = {
  id: string
  name: string
  title: string | null
  email: string | null
  linkedin_url: string | null
  bio: string | null
  headshot_url: string | null
}

export function isPortfolioManager(m: { title: string | null }) {
  return m.title?.toLowerCase().includes('portfolio manager') ?? false
}

/** Bio text split into paragraphs on line breaks. */
export function bioParagraphs(bio: string | null) {
  return (bio ?? '').split(/\n+/).map(p => p.trim()).filter(Boolean)
}

function Links({ m, bioHref, bioLabel }: { m: PublicMember; bioHref?: string; bioLabel?: string }) {
  return (
    <>
      {m.email && <a href={`mailto:${m.email}`} className="member-card-btn member-card-btn-email">Email</a>}
      {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="member-card-btn member-card-btn-linkedin">LinkedIn</a>}
      {bioHref && <Link href={bioHref} className="member-card-btn member-card-btn-bio">{bioLabel}</Link>}
    </>
  )
}

/** Compact card used in the analyst grid. */
export function MemberCard({ m, href }: { m: PublicMember; href: string }) {
  return (
    <div className="member-card">
      <Link href={href} className="member-card-photo-link">
        <div className="member-card-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.headshot_url || FIG_PLACEHOLDER} alt={m.name} className={m.headshot_url ? 'member-card-photo' : 'member-card-photo is-placeholder'} />
        </div>
      </Link>
      <div className="member-card-body">
        <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h4 className="member-card-name">{m.name}</h4>
        </Link>
        <p className="member-card-title">{m.title}</p>
        <div className="member-card-links"><Links m={m} bioHref={href} bioLabel="Bio" /></div>
      </div>
    </div>
  )
}

/** Spotlight card for a sector's Portfolio Manager. */
export function PmSpotlight({ m, href }: { m: PublicMember; href: string }) {
  return (
    <div className="pm-spotlight">
      <Link href={href} className="pm-spotlight-photo-link">
        <div className="pm-spotlight-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.headshot_url || FIG_PLACEHOLDER} alt={m.name} className={m.headshot_url ? 'pm-spotlight-photo' : 'pm-spotlight-photo is-placeholder'} />
        </div>
      </Link>
      <div className="pm-spotlight-body">
        <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="pm-spotlight-name">{m.name}</h3>
        </Link>
        <p className="pm-spotlight-title">{m.title}</p>
        <div className="pm-spotlight-links"><Links m={m} bioHref={href} bioLabel="Full Bio" /></div>
      </div>
    </div>
  )
}

/** The full bio page: hero banner, headshot, bio and links. */
export function MemberBio({ m, sectorName, backHref, heroHeight }: { m: PublicMember; sectorName: string; backHref: string; heroHeight?: number }) {
  const paragraphs = bioParagraphs(m.bio)
  return (
    <>
      <section className="bio-hero" style={heroHeight ? { height: heroHeight } : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MEMBER_HERO} alt={sectorName} />
        <div className="bio-hero-overlay" />
        <div className="bio-hero-text"><h1>{m.name}</h1></div>
      </section>

      <div className="bio-container">
        <div className="bio-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.headshot_url || FIG_PLACEHOLDER} alt={m.name} className={m.headshot_url ? undefined : 'is-placeholder'} />
        </div>
        <div className="bio-content">
          <h2>{m.name}</h2>
          <h3>{m.title}</h3>
          {paragraphs.length > 0
            ? paragraphs.map((p, i) => <p key={i} className="bio-text">{p}</p>)
            : <p className="bio-text" style={{ color: '#999' }}>Bio coming soon.</p>}
          <div className="bio-links">
            {m.email && <a href={`mailto:${m.email}`} className="bio-btn">Email</a>}
            {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="bio-btn">LinkedIn</a>}
          </div>
          <div style={{ marginTop: '2.5rem' }}>
            <Link href={backHref} style={{ color: '#C8102E', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
              ← Back to {sectorName}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
