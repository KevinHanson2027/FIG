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

const MEMBER_HERO = '/Website Assets/About/Serious Group Photo.png'

export async function generateMetadata({
  params,
}: {
  params: { sector: string; id: string }
}): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('members_directory')
    .select('name, title')
    .eq('id', params.id)
    .maybeSingle()
  return {
    title: data?.name ?? 'Member Bio',
    description: data?.title ?? undefined,
  }
}

export default async function MemberBioPage({
  params,
}: {
  params: { sector: string; id: string }
}) {
  const slug       = params.sector
  const sectorName = sectorMap[slug] ?? slug

  const supabase = await createClient()
  const { data: member } = await supabase
    .from('members_directory')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (!member) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
        <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Member not found</h2>
        <Link href={`/members/${slug}`} className="btn">← Back to {sectorName}</Link>
      </div>
    )
  }

  // Split bio into paragraphs on newline boundaries
  const bioParagraphs = (member.bio ?? '')
    .split(/\n+/)
    .map((p: string) => p.trim())
    .filter(Boolean)

  return (
    <>
      {/* ── Small hero ──────────────────────────────────────── */}
      <section className="bio-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MEMBER_HERO} alt={sectorName} />
        <div className="bio-hero-overlay" />
        <div className="bio-hero-text">
          <h1>{member.name}</h1>
        </div>
      </section>

      {/* ── Bio layout ──────────────────────────────────────── */}
      <div className="bio-container">
        {/* Headshot */}
        <div className="bio-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={member.headshot_url ?? '/Website Assets/Logos/FIG Logo.png'}
            alt={member.name}
          />
        </div>

        {/* Content */}
        <div className="bio-content">
          <h2>{member.name}</h2>
          <h3>{member.title}</h3>

          {bioParagraphs.length > 0 ? (
            bioParagraphs.map((para: string, i: number) => (
              <p key={i} className="bio-text">{para}</p>
            ))
          ) : (
            <p className="bio-text" style={{ color: '#999' }}>
              Bio coming soon.
            </p>
          )}

          <div className="bio-links">
            {member.email && (
              <a href={`mailto:${member.email}`} className="bio-btn">
                Email
              </a>
            )}
            {member.linkedin_url && (
              <a
                href={member.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bio-btn"
                style={{ backgroundColor: '#0a66c2' }}
              >
                LinkedIn
              </a>
            )}
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <Link
              href={`/members/${slug}`}
              style={{ color: '#e62d2e', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}
            >
              ← Back to {sectorName}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
