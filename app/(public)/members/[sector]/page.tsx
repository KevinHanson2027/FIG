import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSectors } from '@/lib/data'
import { MEMBER_HERO, MemberCard, PmSpotlight, isPortfolioManager, type PublicMember } from '@/components/public/MemberProfile'

type Member = PublicMember & { sector: string; sort_order: number }

export async function generateMetadata({ params }: { params: { sector: string } }): Promise<Metadata> {
  const sector = (await getSectors()).find(s => s.slug === params.sector)
  return { title: sector?.name ?? 'Members' }
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="member-section-heading">
      <h2>{children}</h2>
    </div>
  )
}

export default async function SectorPage({ params }: { params: { sector: string } }) {
  const slug           = params.sector
  const sector         = (await getSectors()).find(s => s.slug === slug)
  if (!sector) notFound()
  const sectorName     = sector.name
  const isExecutiveBoard = sector.kind === 'leadership'
  const supabase       = await createClient()

  let { data: sectorMembers, error } = await supabase
    .from('members_directory')
    .select('*')
    .eq('sector', sectorName)
    .eq('status', 'active')
    .eq('is_public', true)
    .order('sort_order')
    .order('name')
  if (error) {
    // Database not upgraded yet (supabase/schema.sql): use the legacy flag.
    ;({ data: sectorMembers } = await supabase.from('members_directory').select('*').eq('sector', sectorName).eq('is_active', true).order('sort_order'))
  }

  // Executive Board also shows all sector PMs
  let allPMs: Member[] = []
  if (isExecutiveBoard) {
    let { data, error: pmError } = await supabase
      .from('members_directory')
      .select('*')
      .neq('sector', sectorName)
      .eq('status', 'active')
      .eq('is_public', true)
      .ilike('title', '%Portfolio Manager%')
      .order('sector')
    if (pmError) {
      ;({ data } = await supabase.from('members_directory').select('*').neq('sector', sectorName).eq('is_active', true).ilike('title', '%Portfolio Manager%').order('sector'))
    }
    allPMs = data ?? []
  }

  const members: Member[] = sectorMembers ?? []
  const pm       = members.filter(isPortfolioManager)
  const analysts = members.filter(m => !isPortfolioManager(m))

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
                // links stay under executive-board so the bio's back link returns here
                <MemberCard key={m.id} m={m} href={`/members/${slug}/${m.id}`} />
              ))}
            </div>

            {allPMs.length > 0 && (
              <>
                <SectionHeading>Portfolio Managers</SectionHeading>
                <div className="members-grid">
                  {allPMs.map(m => (
                    // links stay under executive-board so the bio's back link returns here
                    <MemberCard key={m.id} m={m} href={`/members/${slug}/${m.id}`} />
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
                  {pm.map(m => <PmSpotlight key={m.id} m={m} href={`/members/${slug}/${m.id}`} />)}
                </div>
              </>
            )}

            {/* Analysts — compact grid */}
            {analysts.length > 0 && (
              <>
                <SectionHeading>Analysts</SectionHeading>
                <div className="members-grid members-grid-analysts">
                  {analysts.map(m => <MemberCard key={m.id} m={m} href={`/members/${slug}/${m.id}`} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
