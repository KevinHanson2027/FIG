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

const sectorHeroes: Record<string, string> = {
  'executive-board':  '/Website Assets/Group Photos/Serious Group Photo #1.JPG',
  'consumers':        '/Website Assets/Group Photos/Smiling Group Photo #1.JPG',
  'energy-utilities': '/Website Assets/Group Photos/Serious Group Photo #2.JPG',
  'financials':       '/Website Assets/Group Photos/Smiling Group Photo #2.JPG',
  'fixed-income':     '/Website Assets/Group Photos/Serious Group Photo #3.JPG',
  'healthcare':       '/Website Assets/Group Photos/Smiling Group Photo #3.JPG',
  'industrials':      '/Website Assets/Group Photos/Group Photo Side Angel.JPG',
  'real-estate':      '/Website Assets/Group Photos/Smiling Group Photo #1.JPG',
  'technology':       '/Website Assets/Group Photos/Serious Group Photo #3.JPG',
  'marketing':        '/Website Assets/Group Photos/Smiling Group Photo #2.JPG',
}

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
  const name = sectorMap[params.sector] ?? params.sector
  return { title: name }
}

function isPM(m: Member) {
  return m.title?.toLowerCase().includes('portfolio manager') ?? false
}

function MemberCard({
  m,
  sectorSlug,
  bioLength = 180,
}: {
  m: Member
  sectorSlug: string
  bioLength?: number
}) {
  const truncatedBio = m.bio
    ? m.bio.slice(0, bioLength) + (m.bio.length > bioLength ? '…' : '')
    : ''
  const bioUrl = `/members/${sectorSlug}/${m.id}`

  return (
    <div className="member-card">
      {/* Clicking photo goes to bio page */}
      <Link href={bioUrl} className="member-card-photo-link">
        <div className="member-card-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.headshot_url ?? '/Website Assets/Logos/FIG Logo.png'}
            alt={m.name}
            className="member-card-photo"
          />
        </div>
      </Link>

      <div className="member-card-body">
        {/* Clicking name also goes to bio page */}
        <Link href={bioUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
          <h4 className="member-card-name">{m.name}</h4>
        </Link>
        <p className="member-card-title">{m.title}</p>
        {truncatedBio && <p className="member-card-bio">{truncatedBio}</p>}

        <div className="member-card-links">
          {m.email && (
            <a href={`mailto:${m.email}`} className="member-card-btn member-card-btn-email">
              Email
            </a>
          )}
          {m.linkedin_url && (
            <a
              href={m.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="member-card-btn member-card-btn-linkedin"
            >
              LinkedIn
            </a>
          )}
          <Link href={bioUrl} className="member-card-btn member-card-btn-bio">
            Bio
          </Link>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="member-section-heading">
      <h2>{children}</h2>
    </div>
  )
}

export default async function SectorPage({ params }: { params: { sector: string } }) {
  const slug       = params.sector
  const sectorName = sectorMap[slug] ?? slug
  const heroImage  = sectorHeroes[slug] ?? '/Website Assets/Group Photos/Serious Group Photo #1.JPG'
  const supabase   = await createClient()

  const isExecutiveBoard = slug === 'executive-board'

  // Fetch this sector's members
  const { data: sectorMembers } = await supabase
    .from('members_directory')
    .select('*')
    .eq('sector', sectorName)
    .eq('is_active', true)
    .order('sort_order')

  // For Executive Board: also fetch all PMs from other sectors
  let allPMs: Member[] = []
  if (isExecutiveBoard) {
    const { data: pmData } = await supabase
      .from('members_directory')
      .select('*')
      .neq('sector', 'Executive Board')
      .eq('is_active', true)
      .ilike('title', '%Portfolio Manager%')
      .order('sector')
    allPMs = pmData ?? []
  }

  const members = sectorMembers ?? []
  const pm        = members.filter(m => isPM(m))
  const analysts  = members.filter(m => !isPM(m))

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="members-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt={`${sectorName} — Fairfield Investment Group`} />
        <div className="members-hero-content">
          <h1>{sectorName}</h1>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="members-page-content">
        {members.length === 0 && !isExecutiveBoard ? (
          <div className="members-empty">
            <p>Member profiles are being updated. Check back soon.</p>
            <Link href="/" className="btn" style={{ marginTop: '1.5rem' }}>Back to Home</Link>
          </div>
        ) : isExecutiveBoard ? (
          <>
            {/* Executive Board — Sara + Matt, no header */}
            <div className="members-grid members-grid-leadership">
              {members.map(m => <MemberCard key={m.id} m={m} sectorSlug={slug} bioLength={280} />)}
            </div>

            {/* All Portfolio Managers */}
            {allPMs.length > 0 && (
              <>
                <SectionHeading>Portfolio Managers</SectionHeading>
                <div className="members-grid">
                  {allPMs.map(m => (
                    <MemberCard
                      key={m.id}
                      m={m}
                      sectorSlug={Object.entries(sectorMap).find(([, v]) => v === m.sector)?.[0] ?? slug}
                      bioLength={180}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Portfolio Manager */}
            {pm.length > 0 && (
              <>
                <SectionHeading>Portfolio Manager</SectionHeading>
                <div className="members-grid members-grid-pm">
                  {pm.map(m => <MemberCard key={m.id} m={m} sectorSlug={slug} bioLength={280} />)}
                </div>
              </>
            )}

            {/* Analysts */}
            {analysts.length > 0 && (
              <>
                <SectionHeading>Analysts</SectionHeading>
                <div className="members-grid">
                  {analysts.map(m => <MemberCard key={m.id} m={m} sectorSlug={slug} bioLength={180} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
