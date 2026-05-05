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

export async function generateMetadata({ params }: { params: { sector: string } }): Promise<Metadata> {
  const name = sectorMap[params.sector] ?? params.sector
  return { title: name }
}

export default async function SectorPage({ params }: { params: { sector: string } }) {
  const sectorName = sectorMap[params.sector] ?? params.sector
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('members_directory')
    .select('*')
    .eq('sector', sectorName)
    .eq('is_active', true)
    .order('sort_order')

  const portfolioManagers = members?.filter(m =>
    m.title?.toLowerCase().includes('portfolio manager') || m.title?.toLowerCase().includes('co-president')
  ) ?? []
  const analysts = members?.filter(m =>
    !m.title?.toLowerCase().includes('portfolio manager') && !m.title?.toLowerCase().includes('co-president')
  ) ?? []

  return (
    <>
      <section className="about-hero" style={{ height: '45vh' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Website Assets/About/Serious Group Photo.png" alt={`${sectorName} - Fairfield Investment Group`} />
        <div className="about-hero-content">
          <h1>{sectorName}</h1>
        </div>
      </section>

      <div className="main-content">
        {members?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>{sectorName}</h2>
            <p style={{ color: '#666' }}>Member profiles are being updated. Check back soon.</p>
            <Link href="/" className="btn" style={{ marginTop: '1.5rem' }}>Back to Home</Link>
          </div>
        ) : (
          <>
            {portfolioManagers.length > 0 && (
              <section className="section">
                <h2>{sectorName === 'Executive Board' ? 'Executive Board' : 'Portfolio Manager'}</h2>
                <div className="board-grid">
                  {portfolioManagers.map(m => (
                    <div key={m.id} className="board-member">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.headshot_url ?? '/Website Assets/Logos/FIG Logo.png'}
                        alt={m.name}
                      />
                      <h4>{m.name}</h4>
                      <p className="title">{m.title}</p>
                      <div className="bio">{m.bio?.slice(0, 200)}{(m.bio?.length ?? 0) > 200 ? '…' : ''}</div>
                      <div className="contact">
                        {m.email && <a href={`mailto:${m.email}`}>📧 Email</a>}
                        {m.linkedin_url && <> · <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {analysts.length > 0 && (
              <section className="section">
                <h2>Analysts</h2>
                <div className="board-grid">
                  {analysts.map(m => (
                    <div key={m.id} className="board-member">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.headshot_url ?? '/Website Assets/Logos/FIG Logo.png'}
                        alt={m.name}
                      />
                      <h4>{m.name}</h4>
                      <p className="title">{m.title}</p>
                      <div className="bio">{m.bio?.slice(0, 150)}{(m.bio?.length ?? 0) > 150 ? '…' : ''}</div>
                      <div className="contact">
                        {m.email && <a href={`mailto:${m.email}`}>📧 Email</a>}
                        {m.linkedin_url && <> · <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}
