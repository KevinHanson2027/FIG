import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'

const sectorMap: Record<string, string> = {
  'executive-board':  'Executive Board',
  'consumers':        'Consumers',
  'energy-utilities': 'Energy & Utilities',
  'financials':       'Financials',
  'fixed-income':     'Fixed Income',
  'healthcare':       'Healthcare',
  'industrials':      'Industrials & Materials',
  'real-estate':      'Real Estate',
  'technology':       'Technology',
  'marketing':        'Marketing',
}

const MEMBER_HERO = '/Website Assets/Group Photos/Smiling Group Photo %231.JPG'

type Member = {
  id: string
  name: string
  title: string | null
  sector: string
  email: string | null
  linkedin_url: string | null
  bio: string | null
  headshot_url: string | null
  sort_order: number
}

export async function generateMetadata({ params }: { params: { sector: string } }): Promise<Metadata> {
  return { title: sectorMap[params.sector] ?? params.sector }
}

function isPM(m: Member) {
  return m.title?.toLowerCase().includes('portfolio manager') ?? false
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="member-section-heading">
      <h2>{children}</h2>
    </div>
  )
}

// ─── Compact card used in analyst grid ────────────────────────────────────────
function AnalystCard({ m, sectorSlug }: { m: Member; sectorSlug: string }) {
  const bioUrl = `/members/${sectorSlug}/${m.id}`
  return (
    <div className="member-card">
      <Link href={bioUrl} className="member-card-photo-link">
        <div className="member-card-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.headshot_url ?? '/Website Assets/Logos/FIG Logo.png'} alt={m.name} className="member-card-photo" />
        </div>
      </Link>
      <div className="member-card-body">
        <Link href={bioUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h4 className="member-card-name">{m.name}</h4>
        </Link>
        <p className="member-card-title">{m.title}</p>
        <div className="member-card-links">
          {m.email && <a href={`mailto:${m.email}`} className="member-card-btn member-card-btn-email">Email</a>}
          {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="member-card-btn member-card-btn-linkedin">LinkedIn</a>}
          <Link href={bioUrl} className="member-card-btn member-card-btn-bio">Bio</Link>
        </div>
      </div>
    </div>
  )
}

// ─── Spotlight card used for Portfolio Manager ────────────────────────────────
function PMSpotlight({ m, sectorSlug }: { m: Member; sectorSlug: string }) {
  const bioUrl = `/members/${sectorSlug}/${m.id}`
  return (
    <div className="pm-spotlight">
      <Link href={bioUrl} className="pm-spotlight-photo-link">
        <div className="pm-spotlight-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.headshot_url ?? '/Website Assets/Logos/FIG Logo.png'} alt={m.name} className="pm-spotlight-photo" />
        </div>
      </Link>
      <div className="pm-spotlight-body">
        <Link href={bioUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h3 className="pm-spotlight-name">{m.name}</h3>
        </Link>
        <p className="pm-spotlight-title">{m.title}</p>
        <div className="pm-spotlight-links">
          {m.email && <a href={`mailto:${m.email}`} className="member-card-btn member-card-btn-email">Email</a>}
          {m.linkedin_url && <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="member-card-btn member-card-btn-linkedin">LinkedIn</a>}
          <Link href={bioUrl} className="member-card-btn member-card-btn-bio">Full Bio</Link>
        </div>
      </div>
    </div>
  )
}

export default async function SectorPage({ params }: { params: { sector: string } }) {
  const slug           = params.sector
  const sectorName     = sectorMap[slug] ?? slug
  const isExecutiveBoard = slug === 'executive-board'
  const supabase       = await createClient()

  const { data: sectorMembers } = await supabase
    .from('members_directory')
    .select('*')
    .eq('sector', sectorName)
    .eq('is_active', true)
    .order('sort_order')

  // Executive Board also shows all sector PMs
  let allPMs: Member[] = []
  if (isExecutiveBoard) {
    const { data } = await supabase
      .from('members_directory')
      .select('*')
      .neq('sector', 'Executive Board')
      .eq('is_active', true)
      .ilike('title', '%Portfolio Manager%')
      .order('sector')
    allPMs = data ?? []
  }

  const members  = sectorMembers ?? []
  const pm       = members.filter(isPM)
  const analysts = members.filter(m => !isPM(m))

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="members-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MEMBER_HERO} alt={`${sectorName} — Fairfield Investment Group`} />
        <div className="members-hero-content">
          <h1>{sectorName}</h1>
        </div>
      </section>

      <div className="members-page-content">
        {/* ── Executive Board layout (unchanged) ──────────────── */}
        {isExecutiveBoard ? (
          <>
            <div className="members-grid members-grid-leadership">
              {members.map(m => (
                // sectorSlug = 'executive-board' so bio back-link returns here
                <AnalystCard key={m.id} m={m} sectorSlug={slug} />
              ))}
            </div>

            {allPMs.length > 0 && (
              <>
                <SectionHeading>Portfolio Managers</SectionHeading>
                <div className="members-grid">
                  {allPMs.map(m => (
                    // sectorSlug = 'executive-board' so back-link returns to this page
                    <AnalystCard key={m.id} m={m} sectorSlug={slug} />
                  ))}
                </div>
              </>
            )}
          </>

        ) : members.length === 0 ? (
          <div className="members-empty">
            <p>Member profiles are being updated. Check back soon.</p>
            <Link href="/" className="btn" style={{ marginTop: '1.5rem' }}>Back to Home</Link>
          </div>

        ) : (
          /* ── Sector layout (Blue Hen-inspired) ──────────────── */
          <>
            {/* Portfolio Manager — spotlight card, centred */}
            {pm.length > 0 && (
              <>
                <SectionHeading>Portfolio Manager</SectionHeading>
                <div className="pm-spotlight-wrap">
                  {pm.map(m => <PMSpotlight key={m.id} m={m} sectorSlug={slug} />)}
                </div>
              </>
            )}

            {/* Analysts — compact grid */}
            {analysts.length > 0 && (
              <>
                <SectionHeading>Analysts</SectionHeading>
                <div className="members-grid members-grid-analysts">
                  {analysts.map(m => <AnalystCard key={m.id} m={m} sectorSlug={slug} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
