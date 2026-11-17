import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSectors, getSettings } from '@/lib/data'
import { day } from '@/lib/format'
import ApplicationForm from '@/components/public/ApplicationForm'
import InterestForm from '@/components/public/InterestForm'

export const metadata: Metadata = { title: 'Apply' }

export default async function ApplyPage({ searchParams }: { searchParams: { email?: string } }) {
  const [settings, sectors] = await Promise.all([getSettings(), getSectors()])
  const rec = settings.recruiting
  // When recruiting uses an outside form (e.g. Google Forms), /apply and the
  // application emails that link here go straight to it.
  if (rec.form_url?.trim()) redirect(rec.form_url.trim())
  const investment = sectors.filter(s => s.kind === 'investment').map(s => s.name)

  return (
    <>
      <section className="hero small-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Website Assets/Get Involved/Get Involved Background Header.png" alt="" />
        <div className="hero-content">
          <h1>Apply to FIG</h1>
          {rec.cycle && <p style={{ fontSize: '1.2rem', textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>{rec.cycle} recruiting</p>}
        </div>
      </section>

      <section className="public-form-section">
        {rec.applications_open ? (
          <>
            <div className="public-form-intro">
              <h2>Application</h2>
              {rec.intro && <p style={{ whiteSpace: 'pre-line' }}>{rec.intro}</p>}
              {rec.deadline && <p><strong>Deadline: {day(rec.deadline)}</strong></p>}
            </div>
            <ApplicationForm sectors={investment} cycle={rec.cycle} initialEmail={searchParams.email ?? ''} />
          </>
        ) : (
          <>
            <div className="public-form-intro">
              <h2>Applications are closed right now</h2>
              <p>Join our interest list and we&apos;ll email you as soon as the next application cycle opens.</p>
            </div>
            <InterestForm sectors={investment} />
          </>
        )}
      </section>
    </>
  )
}
